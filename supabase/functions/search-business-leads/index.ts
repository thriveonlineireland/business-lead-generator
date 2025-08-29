import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BusinessLead {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  rating?: number;
  google_place_id?: string;
  source?: string;
}

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  types: string[];
  business_status?: string;
}

serve(async (req) => {
  console.log('Edge function called with method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Parsing request body...');
    const { location, businessType, maxResults = 500, businessKeywords = [], locationTerms = [] } = await req.json();
    
    // Input validation
    if (!location || !businessType) {
      return new Response(
        JSON.stringify({ success: false, error: 'Location and business type are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input format (basic security check)
    const allowedPattern = /^[a-zA-Z0-9\s,.-]+$/;
    if (!allowedPattern.test(location) || !allowedPattern.test(businessType)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid characters in input' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (location.length > 100 || businessType.length > 100) {
      return new Response(
        JSON.stringify({ success: false, error: 'Input too long' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Starting business search for: ${businessType} in ${location}, max results: ${maxResults}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header - authentication is optional for guest searches
    const authHeader = req.headers.get('Authorization');
    let user = null;
    
    if (authHeader && authHeader !== 'Bearer guest') {
      try {
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (!userError && authUser) {
          user = authUser;
          console.log('Authenticated user:', user.email);
        } else {
          console.log('Invalid auth token, continuing as guest user');
        }
      } catch (error) {
        console.log('Authentication optional - continuing as guest user');
      }
    } else {
      console.log('No auth header or guest token - continuing as guest user');
    }
    
    console.log('Search mode:', user ? 'authenticated' : 'guest');

    // Use centralized Google Places API key
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    
    if (!googleApiKey) {
      console.error('Google Places API key not configured in environment');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Service configuration error. Please contact support.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userId = user?.id;

    const leads: BusinessLead[] = [];
    const processedPlaceIds = new Set<string>(); // Prevent duplicates
    
    try {
      // Use optimized search strategy with provided keywords and terms
      const searchVariations = createOptimizedSearchVariations(
        location, 
        businessType, 
        businessKeywords.length > 0 ? businessKeywords : [businessType],
        locationTerms.length > 0 ? locationTerms : [location]
      );
      console.log(`Using ${searchVariations.length} optimized search variations to find ${maxResults} leads`);
      
      const allPlaces: PlaceResult[] = [];
      
      // Process search variations in batches to respect API limits
      const maxVariations = Math.min(searchVariations.length, 15); // Limit variations to prevent timeout
      
      for (let i = 0; i < maxVariations && allPlaces.length < maxResults; i++) {
        const searchQuery = searchVariations[i];
        console.log(`Search ${i + 1}/${maxVariations}: "${searchQuery}"`);
        
        try {
          // Initial search
          let nextPageToken: string | undefined;
          let pageCount = 0;
          const maxPagesPerQuery = 3; // Each page gives up to 20 results
          
          do {
            let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${googleApiKey}`;
            if (nextPageToken) {
              url += `&pagetoken=${nextPageToken}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();

            console.log(`API response status: ${data.status}, page ${pageCount + 1}`);

            if (data.status === 'OK' && data.results && data.results.length > 0) {
              console.log(`Found ${data.results.length} places on page ${pageCount + 1}`);
              
              // Filter out duplicates and add to allPlaces
              const newPlaces = data.results.filter((place: PlaceResult) => 
                !processedPlaceIds.has(place.place_id)
              );
              
              newPlaces.forEach((place: PlaceResult) => {
                processedPlaceIds.add(place.place_id);
                allPlaces.push(place);
              });
              
              console.log(`Total unique places so far: ${allPlaces.length}`);
              
              // Check for next page
              nextPageToken = data.next_page_token;
              pageCount++;
              
              // Stop if we have enough results
              if (allPlaces.length >= maxResults) break;
              
              // Required delay between pagination requests
              if (nextPageToken && pageCount < maxPagesPerQuery) {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            } else if (data.status === 'ZERO_RESULTS') {
              console.log(`No results for query: ${searchQuery}`);
              break;
            } else {
              console.error(`API error for query "${searchQuery}":`, data.status, data.error_message);
              break;
            }
          } while (nextPageToken && pageCount < maxPagesPerQuery && allPlaces.length < maxResults);
          
        } catch (searchError) {
          console.error(`Search ${i + 1} failed:`, searchError);
          continue; // Continue with next search
        }
        
        // Small delay between different search queries
        if (i < maxVariations - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`Search phase completed. Found ${allPlaces.length} unique places`);

      // Get detailed information for all places (phone, website, email)
      if (allPlaces.length > 0) {
        console.log(`Getting detailed information for ${allPlaces.length} places...`);
        const detailedLeads = await getDetailedPlaceInfo(allPlaces, googleApiKey);
        leads.push(...detailedLeads);
        console.log(`Processed ${detailedLeads.length} leads with detailed information`);
      }

      console.log(`Search completed. Total leads found: ${leads.length}`);

      // Save leads to database only for authenticated users
      if (leads.length > 0 && user && userId) {
        console.log(`Saving ${leads.length} leads to database for user ${userId}`);
        
        const leadsData = leads.map(lead => ({
          user_id: userId,
          name: lead.name,
          address: lead.address,
          phone: lead.phone,
          website: lead.website,
          email: lead.email,
          business_type: businessType,
          location_searched: location,
          rating: lead.rating,
          google_place_id: lead.google_place_id
        }));

        const { error } = await supabase
          .from('business_leads')
          .insert(leadsData);

        if (error) {
          console.error('Error saving leads to database:', error);
        } else {
          console.log('Successfully saved leads to database');
        }
      } else if (leads.length > 0) {
        console.log('Guest search - results not saved to database');
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: leads,
          totalFound: leads.length,
          message: `Found ${leads.length} business leads`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Error during business search:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to search businesses',
          details: error.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in search-business-leads function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getDetailedPlaceInfo(places: PlaceResult[], apiKey: string): Promise<BusinessLead[]> {
  const leads: BusinessLead[] = [];
  
  // Process places in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < places.length; i += batchSize) {
    const batch = places.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (place) => {
      try {
        // Get detailed place information
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,business_status&key=${apiKey}`;
        
        const response = await fetch(detailsUrl);
        const data = await response.json();
        
        if (data.status === 'OK' && data.result) {
          const result = data.result;
          
          // Try to extract email from website if available (with timeout)
          let email: string | undefined;
          if (result.website) {
            email = await extractEmailFromWebsite(result.website);
          }
          
          const lead: BusinessLead = {
            name: result.name || place.name,
            address: result.formatted_address,
            phone: result.formatted_phone_number,
            website: result.website,
            email: email,
            rating: result.rating,
            google_place_id: place.place_id,
            source: 'Google Places'
          };
          
          return lead;
        }
      } catch (error) {
        console.error(`Error fetching details for place ${place.place_id}:`, error);
      }
      
      return null;
    });
    
    const batchResults = await Promise.all(batchPromises);
    const validLeads = batchResults.filter((lead): lead is BusinessLead => lead !== null);
    leads.push(...validLeads);
    
    // Small delay between batches to respect rate limits
    if (i + batchSize < places.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return leads;
}

function createOptimizedSearchVariations(
  location: string, 
  businessType: string, 
  businessKeywords: string[],
  locationTerms: string[]
): string[] {
  const variations: string[] = [];
  
  console.log(`Creating optimized searches with ${businessKeywords.length} business keywords and ${locationTerms.length} location terms`);
  
  // Create comprehensive combinations of business keywords and location terms
  for (const locationTerm of locationTerms) {
    for (const businessKeyword of businessKeywords) {
      // Primary variations
      variations.push(`${businessKeyword} in ${locationTerm}`);
      variations.push(`${businessKeyword} ${locationTerm}`);
      variations.push(`${businessKeyword} near ${locationTerm}`);
      
      // Add "best" prefix for quality results
      variations.push(`best ${businessKeyword} in ${locationTerm}`);
      
      // Add plural variations
      const pluralBusiness = businessKeyword.endsWith('s') ? businessKeyword : `${businessKeyword}s`;
      variations.push(`${pluralBusiness} in ${locationTerm}`);
    }
  }
  
  // Add original fallback variations
  variations.push(`${businessType} in ${location}`);
  variations.push(`${businessType} ${location}`);
  
  // Remove duplicates and limit to prevent timeout
  const uniqueVariations = [...new Set(variations)];
  console.log(`Generated ${uniqueVariations.length} unique search variations`);
  
  // Return up to 20 variations for optimal coverage without timeout
  return uniqueVariations.slice(0, 20);
}

function createSearchVariations(location: string, businessType: string): string[] {
  const variations: string[] = [];
  
  // Determine if this is Dublin and create comprehensive search strategy
  if (location.toLowerCase().includes('dublin')) {
    const dublinAreas = [
      'Dublin City Centre',
      'Dublin 1', 'Dublin 2', 'Dublin 3', 'Dublin 4', 'Dublin 5', 'Dublin 6', 'Dublin 7', 'Dublin 8',
      'Dublin 9', 'Dublin 10', 'Dublin 11', 'Dublin 12', 'Dublin 13', 'Dublin 14', 'Dublin 15',
      'Dublin 16', 'Dublin 17', 'Dublin 18', 'Dublin 20', 'Dublin 22', 'Dublin 24',
      'Ballymun Dublin', 'Blackrock Dublin', 'Blanchardstown Dublin', 'Booterstown Dublin',
      'Clontarf Dublin', 'Dun Laoghaire Dublin', 'Finglas Dublin', 'Glasnevin Dublin',
      'Howth Dublin', 'Kilmainham Dublin', 'Lucan Dublin', 'Malahide Dublin',
      'Rathmines Dublin', 'Rathgar Dublin', 'Sandyford Dublin', 'Swords Dublin',
      'Tallaght Dublin', 'Temple Bar Dublin', 'Ballsbridge Dublin', 'Donnybrook Dublin',
      'Terenure Dublin', 'Dundrum Dublin', 'Stillorgan Dublin', 'Dalkey Dublin',
      'Wicklow near Dublin', 'Kildare near Dublin', 'Meath near Dublin'
    ];
    
    // Add main city searches with priority on Greater Dublin Area coverage
    variations.push(`${businessType} in Dublin Ireland`);
    variations.push(`${businessType} Dublin`);
    variations.push(`${businessType} Greater Dublin Area`);
    variations.push(`${businessType} Dublin Metro Area`);
    variations.push(`${businessType} in County Dublin Ireland`);
    variations.push(`${businessType} near Dublin Ireland`);
    
    // Add specific area searches - prioritize most populated areas first, then add more comprehensive coverage
    const priorityAreas = [
      'Dublin City Centre', 'Dublin 1', 'Dublin 2', 'Dublin 4', 'Dublin 6', 
      'Tallaght Dublin', 'Blanchardstown Dublin', 'Swords Dublin'
    ];
    
    // Add more comprehensive area coverage for better results
    const additionalAreas = [
      'Dublin 3', 'Dublin 5', 'Dublin 7', 'Dublin 8', 'Dublin 9', 'Dublin 10',
      'Dublin 11', 'Dublin 12', 'Dublin 13', 'Dublin 14', 'Dublin 15', 'Dublin 16',
      'Dublin 17', 'Dublin 18', 'Dublin 20', 'Dublin 22', 'Dublin 24',
      'Rathmines Dublin', 'Rathgar Dublin', 'Sandyford Dublin', 'Dundrum Dublin',
      'Blackrock Dublin', 'Dun Laoghaire Dublin', 'Clontarf Dublin', 'Howth Dublin',
      'Malahide Dublin', 'Ballsbridge Dublin', 'Donnybrook Dublin', 'Terenure Dublin'
    ];
    
    // Add all priority areas
    priorityAreas.forEach(area => {
      variations.push(`${businessType} in ${area}`);
    });
    
    // Add additional areas for comprehensive coverage
    additionalAreas.forEach(area => {
      variations.push(`${businessType} in ${area}`);
    });
    
  } else {
    // For other locations, create general variations
    variations.push(`${businessType} in ${location}`);
    variations.push(`${businessType} near ${location}`);
    variations.push(`${businessType} ${location}`);
    
    // Try to extract city/state for broader searches
    const locationParts = location.split(',').map(part => part.trim());
    if (locationParts.length > 1) {
      variations.push(`${businessType} in ${locationParts[0]}`);
      variations.push(`${businessType} ${locationParts[0]}`);
    }
  }
  
  return variations;
}

async function extractEmailFromWebsite(website: string): Promise<string | undefined> {
  try {
    console.log(`Extracting email from: ${website}`);
    
    // Security: Domain whitelist for email extraction
    const allowedDomains = ['.com', '.ie', '.co.uk', '.org', '.net', '.eu'];
    const isAllowedDomain = allowedDomains.some(domain => website.includes(domain));
    
    if (!isAllowedDomain) {
      console.log(`Domain not allowed for email extraction: ${website}`);
      return undefined;
    }
    
    // Basic URL validation
    if (!website.startsWith('http://') && !website.startsWith('https://')) {
      website = 'https://' + website;
    }
    
    const emailPatterns = [
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    ];
    
    // Try to fetch the website with shorter timeout for efficiency
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(website, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BusinessLeadBot/1.0)',
      }
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`Failed to fetch ${website}: ${response.status}`);
      return undefined;
    }
    
    const html = await response.text();
    
    // Try each email pattern
    for (const pattern of emailPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const email = match[1].toLowerCase();
        // Basic email validation
        if (email.includes('@') && email.includes('.')) {
          console.log(`Found email: ${email}`);
          return email;
        }
      }
    }
    
    return undefined;
  } catch (error: any) {
    console.log(`Could not extract email from ${website}: ${error.message}`);
    return undefined;
  }
}