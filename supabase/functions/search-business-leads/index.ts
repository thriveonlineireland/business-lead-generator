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
    
    console.log(`Starting business search for: ${businessType} in ${location}, max results: ${maxResults}`);
    
    if (!location || !businessType) {
      return new Response(
        JSON.stringify({ error: 'Location and business type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!googleApiKey) {
      console.error('Google Places API key not configured');
      return new Response(
        JSON.stringify({ error: 'Google Places API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = user?.id;
      } catch (error) {
        console.log('Could not authenticate user:', error);
      }
    }

    const leads: BusinessLead[] = [];
    const processedPlaceIds = new Set<string>(); // Prevent duplicates
    
    try {
      // Create multiple search variations for greater coverage
      const searchVariations = createSearchVariations(location, businessType);
      
      console.log(`Created ${searchVariations.length} search variations for comprehensive coverage`);
      
      for (const [index, searchQuery] of searchVariations.entries()) {
        console.log(`\n--- Search Variation ${index + 1}/${searchVariations.length} ---`);
        console.log(`Query: "${searchQuery}"`);
        
        let nextPageToken: string | undefined;
        let currentPage = 0;
        const maxPagesPerVariation = 3; // Limit pages per variation to manage API calls
        
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
        if (index < searchVariations.length - 1) {
          console.log('Waiting before next search variation...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Stop if we've reached our target
        if (leads.length >= maxResults) {
          console.log(`Reached target of ${maxResults} leads, stopping search`);
          break;
        }
      }

      console.log(`Search completed. Total leads found: ${leads.length}`);

      // Save leads to database if user is authenticated
      if (userId && leads.length > 0) {
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
          
          // Try to extract email from website if available
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
      'Terenure Dublin', 'Dundrum Dublin', 'Stillorgan Dublin', 'Dalkey Dublin'
    ];
    
    // Add main city search
    variations.push(`${businessType} in Dublin Ireland`);
    variations.push(`${businessType} Dublin`);
    variations.push(`${businessType} Greater Dublin Area`);
    
    // Add specific area searches (limit to avoid too many API calls)
    const selectedAreas = dublinAreas.slice(0, 15); // Use first 15 areas
    selectedAreas.forEach(area => {
      variations.push(`${businessType} in ${area}`);
    });
    
    // Add county-wide searches
    variations.push(`${businessType} in County Dublin Ireland`);
    variations.push(`${businessType} near Dublin Ireland`);
    
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
    // Basic email extraction patterns
    const emailPatterns = [
      /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    ];
    
    // Try to fetch the website and extract email
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(website, { 
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadGenerator/1.0)' }
    });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const html = await response.text();
      
      for (const pattern of emailPatterns) {
        const match = html.match(pattern);
        if (match) {
          const email = match[1] || match[0];
          // Validate email format
          if (email.includes('@') && email.includes('.')) {
            return email.toLowerCase();
          }
        }
      }
    }
  } catch (error) {
    // Silently fail - email extraction is optional
    console.log(`Could not extract email from ${website}:`, error.message);
  }
  
  return undefined;
}