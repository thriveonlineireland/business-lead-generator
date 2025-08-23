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
    const { location, businessType, maxResults = 500 } = await req.json();
    
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

    // Get user from auth header - authentication required
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    const userId = user.id;

    const leads: BusinessLead[] = [];
    const processedPlaceIds = new Set<string>(); // Prevent duplicates
    
    try {
      // Create limited search variations to stay within resource limits
      const searchVariations = createSearchVariations(location, businessType);
      const maxVariations = 8; // Limit total variations to avoid CPU timeout
      const limitedVariations = searchVariations.slice(0, maxVariations);
      
      console.log(`Created ${limitedVariations.length} search variations (limited from ${searchVariations.length} for efficiency)`);
      
      for (const [index, searchQuery] of limitedVariations.entries()) {
        console.log(`\n--- Search Variation ${index + 1}/${limitedVariations.length} ---`);
        console.log(`Query: "${searchQuery}"`);
        
        let nextPageToken: string | undefined;
        let currentPage = 0;
        const maxPagesPerVariation = 2; // Reduce pages per variation to manage CPU time
        
        do {
          console.log(`Searching page ${currentPage + 1} of variation ${index + 1}`);
          
          let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${googleApiKey}`;
          
          if (nextPageToken) {
            url += `&pagetoken=${nextPageToken}`;
            // Wait for 2 seconds as required by Google Places API when using page tokens
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          const response = await fetch(url);
          const data = await response.json();

          console.log(`Google Places API response status: ${data.status}`);

          if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            console.error('Google Places API error:', data.error_message || data.status);
            break;
          }

          if (data.results && data.results.length > 0) {
            console.log(`Found ${data.results.length} places on page ${currentPage + 1} of variation ${index + 1}`);
            
            // Filter out already processed places to avoid duplicates
            const newPlaces = data.results.filter((place: PlaceResult) => 
              !processedPlaceIds.has(place.place_id)
            );
            
            console.log(`${newPlaces.length} new unique places (${data.results.length - newPlaces.length} duplicates filtered)`);
            
            if (newPlaces.length > 0) {
              // Mark places as processed
              newPlaces.forEach((place: PlaceResult) => 
                processedPlaceIds.add(place.place_id)
              );
              
              // Get detailed place information
              const detailedLeads = await getDetailedPlaceInfo(newPlaces, googleApiKey);
              leads.push(...detailedLeads);
              
              console.log(`Total unique leads collected so far: ${leads.length}`);
            }
          }

          nextPageToken = data.next_page_token;
          currentPage++;

          // If no more pages available for this variation, break
          if (!nextPageToken) {
            console.log(`No more pages available for variation ${index + 1}`);
            break;
          }
        } while (currentPage < maxPagesPerVariation && leads.length < maxResults && nextPageToken);
        
        // Small delay between search variations to respect rate limits
        if (index < limitedVariations.length - 1) {
          console.log('Waiting before next search variation...');
          await new Promise(resolve => setTimeout(resolve, 500)); // Reduce delay
        }
        
        // Stop if we've reached our target
        if (leads.length >= maxResults) {
          console.log(`Reached target of ${maxResults} leads, stopping search`);
          break;
        }
      }

      console.log(`Search completed. Total leads found: ${leads.length}`);

      // Save leads to database (user is already authenticated)
      if (leads.length > 0) {
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
    
    // Add specific area searches - prioritize most populated areas
    const priorityAreas = [
      'Dublin City Centre', 'Dublin 1', 'Dublin 2', 'Dublin 4', 'Dublin 6', 
      'Tallaght Dublin', 'Blanchardstown Dublin', 'Swords Dublin'
    ];
    priorityAreas.forEach(area => {
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