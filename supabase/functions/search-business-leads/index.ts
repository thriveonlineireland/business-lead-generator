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
  category?: string;
  latitude?: number;
  longitude?: number;
  source?: string;
}

// Business type mappings for OpenStreetMap
const OSM_BUSINESS_TYPES: Record<string, string[]> = {
  'restaurant': ['restaurant', 'fast_food', 'cafe', 'bistro', 'food_court'],
  'bar-pub': ['bar', 'pub', 'biergarten', 'nightclub', 'brewery'],
  'coffee-shop': ['cafe', 'coffee_shop'],
  'retail': ['shop', 'mall', 'department_store', 'supermarket', 'clothes'],
  'fitness': ['fitness_centre', 'gym', 'yoga', 'sports_centre'],
  'beauty': ['beauty_salon', 'hairdresser', 'nail_salon', 'cosmetics'],
  'medical': ['doctors', 'dentist', 'pharmacy', 'hospital', 'clinic'],
  'automotive': ['car_repair', 'car_wash', 'fuel', 'car_dealer'],
  'professional': ['office', 'lawyer', 'accountant', 'insurance'],
  'education': ['school', 'kindergarten', 'university', 'college']
};

serve(async (req) => {
  console.log(`🚀 Edge function called with method: ${req.method}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📝 Parsing request body...');
    const { location, businessType, businessKeywords, locationTerms } = await req.json();
    
    console.log('📍 Search parameters:', {
      location,
      businessType,
      maxResults: 500, // Increased limit
      keywordCount: businessKeywords?.length || 0,
      locationTermCount: locationTerms?.length || 0
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader && authHeader !== 'Bearer guest') {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: userData, error: authError } = await supabase.auth.getUser(token);
        if (!authError && userData.user) {
          userId = userData.user.id;
          console.log(`👤 Authenticated user: ${userData.user.email}`);
        }
      } catch (error) {
        console.log('⚠️ Auth token invalid, proceeding as guest');
      }
    }
    
    console.log(`🎯 Search mode: ${userId ? 'authenticated' : 'guest'}`);
    console.log(`🔍 Starting business search for: ${businessType} in ${location}, target: 500 results`);

    // Use free OpenStreetMap API
    const leads = await searchOpenStreetMap(location, businessType, 500);
    
    console.log(`🏆 Search completed. Total leads found: ${leads.length}`);

    // Save leads to database only for authenticated users
    if (leads.length > 0 && userId) {
      console.log(`💾 Saving ${leads.length} leads to database for user ${userId}`);
      
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
        google_place_id: null // OSM doesn't have Google place IDs
      }));

      const { error } = await supabase
        .from('business_leads')
        .insert(leadsData);

      if (error) {
        console.error('❌ Error saving leads to database:', error);
      } else {
        console.log('✅ Successfully saved leads to database');
      }
    } else if (leads.length > 0) {
      console.log('🔓 Guest search - results not saved to database');
    }

    console.log(`📤 Returning response with ${leads.length} leads`);

    return new Response(
      JSON.stringify({
        success: true,
        data: leads,
        totalFound: leads.length,
        canExpandSearch: leads.length >= 450, // Suggest expanding if we're close to limit
        message: `Found ${leads.length} business leads using free data sources`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('💥 Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        data: [],
        totalFound: 0 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

async function searchOpenStreetMap(location: string, businessType: string, maxResults: number): Promise<BusinessLead[]> {
  console.log(`🗺️ Searching OpenStreetMap for ${businessType} in ${location}`);
  
  const leads: BusinessLead[] = [];
  const osmTypes = OSM_BUSINESS_TYPES[businessType] || ['shop'];
  
  try {
    // First, geocode the location using Nominatim (free)
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1&addressdetails=1`;
    console.log(`📍 Geocoding location: ${location}`);
    
    const geocodeResponse = await fetch(geocodeUrl, {
      headers: {
        'User-Agent': 'BusinessLeadSearchApp/1.0 (contact@example.com)'
      }
    });
    
    if (!geocodeResponse.ok) {
      console.error(`❌ Geocoding failed: ${geocodeResponse.status}`);
      return [];
    }
    
    const geocodeData = await geocodeResponse.json();
    if (!geocodeData || geocodeData.length === 0) {
      console.error('❌ Location not found');
      return [];
    }
    
    const { lat, lon, boundingbox } = geocodeData[0];
    console.log(`✅ Found coordinates: ${lat}, ${lon}`);
    
    // Create a reasonable search radius around the location
    const latRange = 0.08; // approximately 8km - expanded range
    const lonRange = 0.08;
    const minLat = parseFloat(lat) - latRange;
    const maxLat = parseFloat(lat) + latRange;
    const minLon = parseFloat(lon) - lonRange;
    const maxLon = parseFloat(lon) + lonRange;
    
    // Search for businesses using Overpass API (completely free)
    for (const osmType of osmTypes) {
      if (leads.length >= maxResults) break;
      
      console.log(`🔍 Searching for ${osmType} businesses`);
      
      // Create Overpass query for both amenity and shop tags
      const overpassQuery = `
        [out:json][timeout:25];
        (
          nwr["amenity"="${osmType}"](${minLat},${minLon},${maxLat},${maxLon});
          nwr["shop"="${osmType}"](${minLat},${minLon},${maxLat},${maxLon});
        );
        out center meta;
      `;
      
      const overpassUrl = 'https://overpass-api.de/api/interpreter';
      
      try {
        const response = await fetch(overpassUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'BusinessLeadSearchApp/1.0'
          },
          body: `data=${encodeURIComponent(overpassQuery)}`
        });
        
        if (!response.ok) {
          console.error(`❌ Overpass API error: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        console.log(`📊 Found ${data.elements?.length || 0} results for ${osmType}`);
        
        if (data.elements) {
          for (const element of data.elements) {
            if (leads.length >= maxResults) break;
            
            const tags = element.tags || {};
            const name = tags.name || tags.brand || `${osmType} Business`;
            
            // Skip if we already have this business (check by name and location)
            if (leads.some(lead => 
              lead.name.toLowerCase() === name.toLowerCase() && 
              Math.abs((lead.latitude || 0) - (element.lat || element.center?.lat || 0)) < 0.001
            )) {
              continue;
            }
            
            const address = formatAddress(tags);
            const lat = element.lat || element.center?.lat;
            const lon = element.lon || element.center?.lon;
            
            const lead: BusinessLead = {
              name,
              address,
              phone: tags.phone || tags['contact:phone'] || undefined,
              website: tags.website || tags['contact:website'] || undefined,
              category: tags.amenity || tags.shop || osmType,
              latitude: lat,
              longitude: lon,
              source: 'OpenStreetMap (Free)'
            };
            
            leads.push(lead);
            console.log(`✅ Added: ${name} at ${address}`);
          }
        }
        
        // Be respectful to free APIs - add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error searching for ${osmType}:`, error);
      }
    }
    
    // If we didn't find many results, try a broader search with generic terms
    if (leads.length < 20) {
      console.log(`🔄 Trying broader search for more results`);
      await searchBroaderCategories(minLat, minLon, maxLat, maxLon, businessType, leads, maxResults);
    }
    
  } catch (error) {
    console.error('❌ OpenStreetMap search error:', error);
  }
  
  console.log(`✅ OpenStreetMap search completed. Found ${leads.length} leads`);
  return leads;
}

async function searchBroaderCategories(
  minLat: number, 
  minLon: number, 
  maxLat: number, 
  maxLon: number, 
  businessType: string, 
  existingLeads: BusinessLead[], 
  maxResults: number
): Promise<void> {
  // Broader search categories
  const broadCategories = [
    'amenity', 'shop', 'office', 'leisure', 'tourism'
  ];
  
  for (const category of broadCategories) {
    if (existingLeads.length >= maxResults) break;
    
    const overpassQuery = `
      [out:json][timeout:20];
      (
        nwr["${category}"](${minLat},${minLon},${maxLat},${maxLon});
      );
      out center meta;
    `;
    
    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'BusinessLeadSearchApp/1.0'
        },
        body: `data=${encodeURIComponent(overpassQuery)}`
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (data.elements) {
        for (const element of data.elements) {
          if (existingLeads.length >= maxResults) break;
          
          const tags = element.tags || {};
          const name = tags.name || tags.brand;
          
          if (!name) continue; // Skip unnamed places
          
          // Check if this business might be relevant to the search
          const categoryValue = tags[category];
          if (isRelevantBusiness(businessType, categoryValue, name)) {
            // Skip if already exists
            if (existingLeads.some(lead => 
              lead.name.toLowerCase() === name.toLowerCase()
            )) {
              continue;
            }
            
            const address = formatAddress(tags);
            const lat = element.lat || element.center?.lat;
            const lon = element.lon || element.center?.lon;
            
            const lead: BusinessLead = {
              name,
              address,
              phone: tags.phone || tags['contact:phone'] || undefined,
              website: tags.website || tags['contact:website'] || undefined,
              category: categoryValue || category,
              latitude: lat,
              longitude: lon,
              source: 'OpenStreetMap (Free)'
            };
            
            existingLeads.push(lead);
            console.log(`✅ Added (broader): ${name}`);
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error in broader search for ${category}:`, error);
    }
  }
}

function isRelevantBusiness(businessType: string, categoryValue: string, name: string): boolean {
  if (!categoryValue && !name) return false;
  
  const searchTerms = businessType.toLowerCase().split(/[-\s]/);
  const checkText = `${categoryValue || ''} ${name}`.toLowerCase();
  
  // Check if any of the business type terms match
  return searchTerms.some(term => checkText.includes(term));
}

function formatAddress(tags: any): string {
  const parts = [];
  
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
  if (tags['addr:country']) parts.push(tags['addr:country']);
  
  if (parts.length > 0) {
    return parts.join(', ');
  }
  
  // Fallback to other address formats
  return tags.address || 'Address not available';
}