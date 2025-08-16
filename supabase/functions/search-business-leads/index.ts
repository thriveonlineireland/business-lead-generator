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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    let nextPageToken: string | undefined;
    const maxPages = Math.ceil(maxResults / 20); // Google returns max 20 per request
    let currentPage = 0;

    try {
      // Search for businesses using Google Places Text Search
      while (currentPage < maxPages && leads.length < maxResults) {
        console.log(`Searching page ${currentPage + 1} of up to ${maxPages}`);
        
        const searchQuery = `${businessType} in ${location}`;
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
          console.log(`Found ${data.results.length} places on page ${currentPage + 1}`);
          
          // Get detailed place information in batches
          const detailedLeads = await getDetailedPlaceInfo(data.results, googleApiKey);
          leads.push(...detailedLeads);
          
          console.log(`Total leads collected so far: ${leads.length}`);
        }

        nextPageToken = data.next_page_token;
        currentPage++;

        // If no more pages available, break
        if (!nextPageToken) {
          console.log('No more pages available');
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
            google_place_id: place.place_id
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