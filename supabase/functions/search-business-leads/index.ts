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
  'beauty-salon': ['beauty_salon', 'spa', 'cosmetics'],
  'hair-salon': ['hairdresser', 'beauty_salon'],
  'medical': ['doctors', 'dentist', 'pharmacy', 'hospital', 'clinic'],
  'dentist': ['dentist', 'dental', 'orthodontist'],
  'doctor': ['doctors', 'clinic', 'hospital', 'medical'],
  'automotive': ['car_repair', 'car_wash', 'fuel', 'car_dealer'],
  'professional': ['office', 'lawyer', 'accountant', 'insurance', 'consultant'],
  'accountant': ['office', 'accountant', 'accounting', 'bookkeeper', 'tax_advisor'],
  'lawyer': ['office', 'lawyer', 'legal', 'attorney'],
  'law-firm': ['lawyer', 'legal', 'office'],
  'real-estate': ['estate_agent', 'real_estate_agent', 'office'],
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
    let isPremiumUser = false;
    
    if (authHeader && authHeader !== 'Bearer guest') {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: userData, error: authError } = await supabase.auth.getUser(token);
        if (!authError && userData.user) {
          userId = userData.user.id;
          console.log(`👤 Authenticated user: ${userData.user.email}`);
          
          // Check user subscription status and usage limits
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('subscription_status, free_searches_used, last_search_reset')
            .eq('user_id', userId)
            .single();

          if (profileError) {
            console.log('⚠️ Profile lookup error:', profileError.message);
            // Continue as guest if profile lookup fails
          } else {
            isPremiumUser = profile?.subscription_status === 'active';
            
            // Check usage limits for free users
            if (!isPremiumUser) {
              const today = new Date().toISOString().split('T')[0];
              let currentUsage = profile?.free_searches_used || 0;
              
              // Reset counter if it's a new day
              if (profile?.last_search_reset !== today) {
                try {
                  await supabase
                    .from('profiles')
                    .update({
                      free_searches_used: 0,
                      last_search_reset: today
                    })
                    .eq('user_id', userId);
                  currentUsage = 0;
                } catch (updateError) {
                  console.log('⚠️ Profile update error:', updateError);
                  // Continue with existing usage count
                }
              }
              
              // Check if user has reached their limit
              if (currentUsage >= 3) {
                console.log(`❌ User ${userId} has reached their free search limit`);
                return new Response(
                  JSON.stringify({
                    success: false,
                    error: 'You have reached your monthly limit of 3 free searches. Upgrade to Premium for unlimited searches.',
                    data: [],
                    totalFound: 0,
                    requiresUpgrade: true
                  }),
                  { 
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                  }
                );
              }
            }
          }
        } catch (error) {
          console.log('⚠️ Profile check failed, proceeding as guest:', error);
        }
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

    // No artificial limits - provide full high-quality results to everyone
    let finalResults = leads;
    console.log(`📊 Providing full results: ${finalResults.length} high-quality leads`);

    // Save leads to database and search history for authenticated users
    if (userId) {
      console.log(`💾 Saving leads and search history for user ${userId}`);
      
      // Save search history
      await supabase
        .from('search_history')
        .insert({
          user_id: userId,
          query: `${businessType} in ${location}`,
          location: location,
          business_type: businessType,
          results_count: leads.length,
          leads: finalResults,
          is_premium: isPremiumUser
        });

      // Increment usage counter for free users
      if (!isPremiumUser) {
        await supabase
          .from('profiles')
          .update({
            free_searches_used: (await supabase
              .from('profiles')
              .select('free_searches_used')
              .eq('user_id', userId)
              .single()
            ).data?.free_searches_used + 1 || 1
          })
          .eq('user_id', userId);
      }

      // Save individual leads to business_leads table
      if (leads.length > 0) {
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
          google_place_id: null
        }));

        await supabase
          .from('business_leads')
          .insert(leadsData);
      }
    }

    console.log(`📤 Returning response with ${finalResults.length} leads`);

    return new Response(
      JSON.stringify({
        success: true,
        data: finalResults,
        totalFound: leads.length,
        returnedCount: finalResults.length,
        isPremium: isPremiumUser,
        canExpandSearch: leads.length >= 450,
        message: `Found ${leads.length} high-quality business leads`
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
  
  // Get the correct OSM types for this business type
  const osmTypes = OSM_BUSINESS_TYPES[businessType.toLowerCase()] || 
                   OSM_BUSINESS_TYPES[businessType.toLowerCase().replace(/s$/, '')] || // Try singular form
                   ['office']; // Default fallback for professional services
  
  console.log(`🎯 Using OSM types for '${businessType}':`, osmTypes);
  
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
    
    // Create an expanded search radius for comprehensive coverage
    const latRange = 0.15; // approximately 15km - expanded range for better coverage
    const lonRange = 0.15;
    const minLat = parseFloat(lat) - latRange;
    const maxLat = parseFloat(lat) + latRange;
    const minLon = parseFloat(lon) - lonRange;
    const maxLon = parseFloat(lon) + lonRange;
    
    // Search for businesses using Overpass API (completely free)
    for (const osmType of osmTypes) {
      if (leads.length >= maxResults) break;
      
      console.log(`🔍 Searching for ${osmType} businesses`);
      
      // Enhanced queries with comprehensive contact info extraction
      const overpassQueries = [
        // Primary query with extended contact fields
        `[out:json][timeout:30];
        (
          nwr["amenity"="${osmType}"](${minLat},${minLon},${maxLat},${maxLon});
          nwr["shop"="${osmType}"](${minLat},${minLon},${maxLat},${maxLon});
          nwr["healthcare"="${osmType}"](${minLat},${minLon},${maxLat},${maxLon});
          nwr["healthcare:speciality"="${osmType}"](${minLat},${minLon},${maxLat},${maxLon});
        );
        out center meta;`,
        // Secondary query with regex matching for medical/dental practices
        `[out:json][timeout:30];
        (
          nwr["amenity"~"${osmType}"](${minLat},${minLon},${maxLat},${maxLon});
          nwr["healthcare"~"${osmType}"](${minLat},${minLon},${maxLat},${maxLon});
          nwr["name"~"${businessType}"i](${minLat},${minLon},${maxLat},${maxLon});
        );
        out center meta;`
      ];
      
      for (const overpassQuery of overpassQueries) {
        if (leads.length >= maxResults) break;
        
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
          console.log(`📊 Found ${data.elements?.length || 0} results for ${osmType} query`);
          
          if (data.elements) {
            for (const element of data.elements) {
              if (leads.length >= maxResults) break;
              
              const tags = element.tags || {};
              const name = tags.name || tags.brand || `${businessType} Business`;
              
              // Filter out results that don't match the business type
              if (!isRelevantToBusinessType(businessType, name, tags)) {
                console.log(`❌ Skipping irrelevant result: ${name} (${tags.amenity || tags.shop || tags.healthcare})`);
                continue;
              }
              
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
              
              // Enhanced contact info extraction from OSM tags
              const contactInfo = extractEnhancedContactInfo(tags);
              
              const lead: BusinessLead = {
                name,
                address,
                phone: contactInfo.phone,
                website: contactInfo.website,
                email: contactInfo.email,
                category: tags.amenity || tags.shop || tags.healthcare || osmType,
                latitude: lat,
                longitude: lon,
                source: 'OpenStreetMap (Free)'
              };
              
              leads.push(lead);
              console.log(`✅ Added: ${name} at ${address}`);
            }
          }
          
          // Be respectful to free APIs - add delay between requests
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`❌ Error searching for ${osmType}:`, error);
        }
      }
    }
    
    // Always try broader searches for comprehensive results
    if (leads.length < 200) {
      console.log(`🔄 Found ${leads.length} results. Expanding with broader search for comprehensive coverage`);
      await searchBroaderCategories(minLat, minLon, maxLat, maxLon, businessType, leads, maxResults);
    }

    // Always supplement with free directory searches for maximum coverage
    if (leads.length < maxResults * 0.9) {
      console.log(`🔍 Supplementing with free directory searches for comprehensive results`);
      const directoryLeads = await searchFreeDirectories(location, businessType, maxResults - leads.length);
      leads.push(...directoryLeads);
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
      [out:json][timeout:30];
      (
        nwr["${category}"](${minLat},${minLon},${maxLat},${maxLon});
      );
      out center meta 1000;
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

// Function to check if a business is relevant to the search type
function isRelevantToBusinessType(businessType: string, name: string, tags: any): boolean {
  const searchTerm = businessType.toLowerCase();
  const businessName = name.toLowerCase();
  
  // Direct name matching
  if (businessName.includes(searchTerm)) {
    return true;
  }
  
  // Check specific business type mappings
  const relevantTags = [
    tags.amenity?.toLowerCase(),
    tags.shop?.toLowerCase(), 
    tags.healthcare?.toLowerCase(),
    tags['healthcare:speciality']?.toLowerCase(),
    tags.office?.toLowerCase()
  ].filter(Boolean);
  
  // Business type specific checks
  switch (searchTerm) {
    case 'dentist':
    case 'dental':
      return businessName.includes('dental') || 
             businessName.includes('dentist') || 
             businessName.includes('orthodont') ||
             relevantTags.includes('dentist') ||
             relevantTags.includes('dental') ||
             tags['healthcare:speciality'] === 'dentistry';
             
    case 'doctor':
    case 'medical':
      return businessName.includes('doctor') || 
             businessName.includes('medical') || 
             businessName.includes('clinic') ||
             relevantTags.includes('doctors') ||
             relevantTags.includes('clinic') ||
             relevantTags.includes('hospital');
             
    case 'accountant':
    case 'accounting':
      return businessName.includes('accountant') || 
             businessName.includes('accounting') || 
             businessName.includes('bookkeep') ||
             businessName.includes('tax') ||
             relevantTags.includes('accountant');
             
    case 'lawyer':
    case 'legal':
      return businessName.includes('lawyer') || 
             businessName.includes('legal') || 
             businessName.includes('attorney') ||
             businessName.includes('solicitor') ||
             relevantTags.includes('lawyer');
             
    case 'cafe':
    case 'coffee':
      return businessName.includes('cafe') || 
             businessName.includes('coffee') ||
             relevantTags.includes('cafe') ||
             relevantTags.includes('coffee_shop');
             
    default:
      // For other business types, use generic matching
      return relevantTags.some(tag => tag?.includes(searchTerm)) ||
             businessName.includes(searchTerm);
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

// Enhanced contact info extraction from OSM tags
function extractEnhancedContactInfo(tags: any): { phone?: string; website?: string; email?: string } {
  const result: { phone?: string; website?: string; email?: string } = {};
  
  // Phone extraction - check multiple OSM contact fields
  const phoneFields = [
    'phone', 'contact:phone', 'phone:mobile', 'contact:mobile',
    'telephone', 'contact:telephone', 'fax', 'contact:fax'
  ];
  
  for (const field of phoneFields) {
    if (tags[field]) {
      // Clean and validate phone number
      let phone = tags[field].toString().trim();
      // Remove common prefixes and clean format
      phone = phone.replace(/^tel:/, '').replace(/^phone:/, '');
      if (phone.length >= 10 && /[\d\+\-\(\)\s]/.test(phone)) {
        result.phone = phone;
        break;
      }
    }
  }
  
  // Website extraction - check multiple OSM website fields
  const websiteFields = [
    'website', 'contact:website', 'url', 'contact:url',
    'website:en', 'website:official', 'homepage', 'contact:homepage'
  ];
  
  for (const field of websiteFields) {
    if (tags[field]) {
      let website = tags[field].toString().trim();
      // Ensure proper URL format
      if (!website.startsWith('http')) {
        website = 'https://' + website;
      }
      if (website.includes('.') && website.length > 10) {
        result.website = website;
        break;
      }
    }
  }
  
  // Email extraction - check multiple OSM email fields
  const emailFields = [
    'email', 'contact:email', 'contact:e-mail', 'e-mail',
    'email:info', 'contact:info', 'email:contact'
  ];
  
  for (const field of emailFields) {
    if (tags[field]) {
      let email = tags[field].toString().trim().toLowerCase();
      // Clean email format
      email = email.replace(/^mailto:/, '');
      if (email.includes('@') && email.includes('.') && !email.includes(' ')) {
        result.email = email;
        break;
      }
    }
  }
  
  return result;
}

// Free directory search function
async function searchFreeDirectories(location: string, businessType: string, maxResults: number): Promise<BusinessLead[]> {
  const directoryLeads: BusinessLead[] = [];
  
  try {
    // Use public APIs and free data sources
    console.log(`🌐 Searching free directories for ${businessType} in ${location}`);
    
    // 1. Search using public business directory APIs (where available)
    const publicLeads = await searchPublicBusinessAPIs(location, businessType, Math.min(maxResults, 50));
    directoryLeads.push(...publicLeads);
    
    if (directoryLeads.length < maxResults) {
      // 2. Use government open data sources
      const govLeads = await searchGovernmentOpenData(location, businessType, maxResults - directoryLeads.length);
      directoryLeads.push(...govLeads);
    }
    
  } catch (error) {
    console.error('❌ Error in free directory search:', error);
  }
  
  console.log(`✅ Free directory search found ${directoryLeads.length} additional leads`);
  return directoryLeads.slice(0, maxResults);
}

// Search public business APIs (free tier usage)
async function searchPublicBusinessAPIs(location: string, businessType: string, maxResults: number): Promise<BusinessLead[]> {
  const leads: BusinessLead[] = [];
  
  try {
    // Use Wikipedia/Wikidata for business information (completely free)
    const wikiLeads = await searchWikipediaBusinesses(location, businessType, maxResults);
    leads.push(...wikiLeads);
    
  } catch (error) {
    console.error('❌ Error searching public APIs:', error);
  }
  
  return leads;
}

// Search Wikipedia/Wikidata for business information
async function searchWikipediaBusinesses(location: string, businessType: string, maxResults: number): Promise<BusinessLead[]> {
  const leads: BusinessLead[] = [];
  
  try {
    // Search Wikipedia for businesses in the location
    const searchQuery = `${businessType} ${location} business company services`;
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/search?q=${encodeURIComponent(searchQuery)}&limit=${Math.min(maxResults, 20)}`;
    
    const response = await fetch(wikiUrl, {
      headers: {
        'User-Agent': 'BusinessLeadSearchApp/1.0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.pages) {
        for (const page of data.pages.slice(0, 10)) {
          // Only include if it looks like a business
          const title = page.title.toLowerCase();
          const description = (page.description || '').toLowerCase();
          
          if (title.includes(businessType.toLowerCase()) || 
              title.includes('company') || title.includes('services') ||
              title.includes('firm') || title.includes('llc') ||
              description.includes('business') || description.includes(businessType.toLowerCase())) {
            
            leads.push({
              name: page.title,
              address: location,
              source: 'Wikipedia (Free)',
              website: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
              category: businessType
            });
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error searching Wikipedia:', error);
  }
  
  return leads;
}

// Search government open data sources
async function searchGovernmentOpenData(location: string, businessType: string, maxResults: number): Promise<BusinessLead[]> {
  const leads: BusinessLead[] = [];
  
  try {
    // This would integrate with various government open data APIs
    // For now, return empty but structure is ready for implementation
    console.log(`🏛️ Government open data search for ${businessType} in ${location} (placeholder)`);
    
    // Example: UK Companies House API, US business registries, etc.
    // Implementation would depend on the specific location and available APIs
    
  } catch (error) {
    console.error('❌ Error searching government data:', error);
  }
  
  return leads;
}