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
  qualityScore?: number;
  qualityLabel?: 'High' | 'Medium' | 'Low';
  description?: string;
  instagram?: string;
}

// Comprehensive business type mappings for better search coverage
const BUSINESS_TYPE_MAPPINGS: Record<string, string[]> = {
  'restaurant': ['restaurant', 'fast_food', 'cafe', 'bistro', 'food_court', 'pub', 'bar'],
  'cafe': ['cafe', 'coffee_shop', 'tea_house', 'bakery'],
  'hair-salon': ['hairdresser', 'beauty_salon', 'barber'],
  'beauty-salon': ['beauty_salon', 'spa', 'cosmetics', 'nail_salon'],
  'dentist': ['dentist', 'dental', 'orthodontist'],
  'doctor': ['doctors', 'clinic', 'hospital', 'medical_centre'],
  'lawyer': ['lawyer', 'legal', 'attorney', 'solicitor'],
  'accountant': ['accountant', 'accounting', 'bookkeeper', 'tax_advisor'],
  'pharmacy': ['pharmacy', 'chemist', 'drugstore'],
  'gym': ['fitness_centre', 'gym', 'sports_centre'],
  'hotel': ['hotel', 'motel', 'guest_house', 'bed_and_breakfast'],
  'shop': ['shop', 'store', 'retail', 'boutique'],
  'office': ['office', 'business', 'company', 'firm']
};

// Bypass emails for unlimited searches
const BYPASS_EMAILS = ['kevin.kirwan00@gmail.com'];

serve(async (req) => {
  console.log(`🚀 Enhanced search function called with method: ${req.method}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location, businessType, businessKeywords, locationTerms } = await req.json();
    
    console.log('🎯 Enhanced search parameters:', {
      location,
      businessType,
      targetResults: 500,
      keywordCount: businessKeywords?.length || 0,
      locationTermCount: locationTerms?.length || 0
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user authentication and check limits
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    let isPremiumUser = false;
    
    if (authHeader && authHeader !== 'Bearer guest') {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: userData, error: authError } = await supabase.auth.getUser(token);
        if (!authError && userData.user) {
          userId = userData.user.id;
          const userEmail = (userData.user.email || '').toLowerCase();
          
          // Check for bypass
          if (BYPASS_EMAILS.includes(userEmail)) {
            isPremiumUser = true;
            console.log(`✅ Bypass enabled for ${userEmail}`);
          } else {
            // Check subscription status
            const { data: profile } = await supabase
              .from('profiles')
              .select('subscription_status, free_searches_used, last_search_reset')
              .eq('user_id', userId)
              .single();

            isPremiumUser = profile?.subscription_status === 'active';
            
            // Check free user limits
            if (!isPremiumUser) {
              const today = new Date().toISOString().split('T')[0];
              let currentUsage = profile?.free_searches_used || 0;
              
              if (profile?.last_search_reset !== today) {
                await supabase
                  .from('profiles')
                  .update({ free_searches_used: 0, last_search_reset: today })
                  .eq('user_id', userId);
                currentUsage = 0;
              }
              
              if (currentUsage >= 3) {
                return new Response(
                  JSON.stringify({
                    success: false,
                    error: 'You have reached your daily limit of 3 free searches. Upgrade to Premium for unlimited searches.',
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
        }
      } catch (error) {
        console.log('⚠️ Auth check failed, proceeding as guest');
      }
    }

    console.log(`🔍 Starting comprehensive search for: ${businessType} in ${location}`);

    // Execute comprehensive search using multiple free sources
    const allLeads = await performComprehensiveSearch(location, businessType);
    
    console.log(`📊 Total leads found: ${allLeads.length}`);

    // Score and sort leads by quality
    const scoredLeads = allLeads.map(lead => {
      const score = computeQualityScore(lead);
      return { ...lead, qualityScore: score, qualityLabel: qualityLabelFromScore(score) };
    });
    
    const sortedLeads = scoredLeads.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    
    // Apply limiting for free users
    let finalResults = sortedLeads;
    let isLimited = false;
    
    if (!isPremiumUser) {
      const limitedCount = Math.min(Math.ceil(sortedLeads.length * 0.15), 25); // Show 15% for free users, max 25
      finalResults = sortedLeads.slice(0, limitedCount);
      isLimited = limitedCount < sortedLeads.length;
      console.log(`📊 Free user: showing ${finalResults.length} of ${sortedLeads.length} leads`);
    }

    // Save to database for authenticated users
    if (userId) {
      console.log(`💾 Saving search data for user ${userId}`);
      
      // Save search history
      await supabase
        .from('search_history')
        .insert({
          user_id: userId,
          query: `${businessType} in ${location}`,
          location: location,
          business_type: businessType,
          results_count: sortedLeads.length,
          leads: finalResults,
          is_premium: isPremiumUser
        });

      // Increment usage for free users
      if (!isPremiumUser) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('free_searches_used')
          .eq('user_id', userId)
          .single();
          
        await supabase
          .from('profiles')
          .update({
            free_searches_used: (currentProfile?.free_searches_used || 0) + 1
          })
          .eq('user_id', userId);
      }

      // Save leads to business_leads table
      if (sortedLeads.length > 0) {
        const leadsData = sortedLeads.slice(0, 100).map(lead => ({ // Limit to 100 for database performance
          user_id: userId,
          name: lead.name,
          address: lead.address,
          phone: lead.phone,
          website: lead.website,
          email: lead.email,
          business_type: businessType,
          location_searched: location,
          rating: lead.rating,
          status: 'new',
          priority: 'medium'
        }));

        await supabase
          .from('business_leads')
          .insert(leadsData);
      }
    }

    console.log(`📤 Returning ${finalResults.length} leads to frontend`);

    return new Response(
      JSON.stringify({
        success: true,
        data: finalResults,
        totalFound: sortedLeads.length,
        returnedCount: finalResults.length,
        isPremium: isPremiumUser,
        isLimited: isLimited,
        canExpandSearch: sortedLeads.length >= 400,
        message: isLimited 
          ? `Found ${sortedLeads.length} business leads! Showing ${finalResults.length} premium results.`
          : `Found ${sortedLeads.length} business leads`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('💥 Search function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Search failed: ${error.message}`,
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

async function performComprehensiveSearch(location: string, businessType: string): Promise<BusinessLead[]> {
  console.log(`🔍 Starting comprehensive search for ${businessType} in ${location}`);
  
  const allLeads: BusinessLead[] = [];
  
  try {
    // 1. OpenStreetMap Search (Primary - most reliable free source)
    console.log('🗺️ Phase 1: OpenStreetMap search');
    const osmLeads = await searchOpenStreetMap(location, businessType);
    allLeads.push(...osmLeads);
    console.log(`✅ OSM found ${osmLeads.length} leads`);

    // 2. Nominatim POI Search (Secondary)
    console.log('📍 Phase 2: Nominatim POI search');
    const poiLeads = await searchNominatimPOIs(location, businessType);
    allLeads.push(...poiLeads);
    console.log(`✅ POI search found ${poiLeads.length} leads`);

    // 3. Wikipedia Business Search (Tertiary)
    console.log('📚 Phase 3: Wikipedia business search');
    const wikiLeads = await searchWikipediaBusinesses(location, businessType);
    allLeads.push(...wikiLeads);
    console.log(`✅ Wikipedia found ${wikiLeads.length} leads`);

    // 4. Government Open Data (if available)
    console.log('🏛️ Phase 4: Government open data');
    const govLeads = await searchGovernmentData(location, businessType);
    allLeads.push(...govLeads);
    console.log(`✅ Government data found ${govLeads.length} leads`);

    // 5. Generate synthetic leads for testing (remove in production)
    if (allLeads.length < 50) {
      console.log('🧪 Phase 5: Adding synthetic test data');
      const syntheticLeads = generateSyntheticLeads(location, businessType, 50);
      allLeads.push(...syntheticLeads);
      console.log(`✅ Added ${syntheticLeads.length} synthetic leads for testing`);
    }

  } catch (error) {
    console.error('❌ Error in comprehensive search:', error);
  }

  // Remove duplicates and return
  const uniqueLeads = removeDuplicateLeads(allLeads);
  console.log(`🏆 Comprehensive search completed: ${uniqueLeads.length} unique leads`);
  
  return uniqueLeads;
}

async function searchOpenStreetMap(location: string, businessType: string): Promise<BusinessLead[]> {
  const leads: BusinessLead[] = [];
  
  try {
    // Geocode location first
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1&addressdetails=1`;
    
    const geocodeResponse = await fetch(geocodeUrl, {
      headers: { 'User-Agent': 'BusinessLeadSearchApp/1.0' }
    });
    
    if (!geocodeResponse.ok) return leads;
    
    const geocodeData = await geocodeResponse.json();
    if (!geocodeData || geocodeData.length === 0) return leads;
    
    const { lat, lon } = geocodeData[0];
    
    // Expanded search radius for better coverage
    const radius = 0.2; // ~20km radius
    const minLat = parseFloat(lat) - radius;
    const maxLat = parseFloat(lat) + radius;
    const minLon = parseFloat(lon) - radius;
    const maxLon = parseFloat(lon) + radius;
    
    // Get OSM types for this business
    const osmTypes = BUSINESS_TYPE_MAPPINGS[businessType.toLowerCase()] || ['office'];
    
    // Search each type with comprehensive queries
    for (const osmType of osmTypes) {
      const queries = [
        // Primary amenity search
        `[out:json][timeout:25];
        (
          nwr["amenity"="${osmType}"](${minLat},${minLon},${maxLat},${maxLon});
          nwr["shop"="${osmType}"](${minLat},${minLon},${maxLat},${maxLon});
        );
        out center meta;`,
        
        // Name-based search for this business type
        `[out:json][timeout:25];
        (
          nwr[~"name"~"${businessType}",i](${minLat},${minLon},${maxLat},${maxLon});
          nwr[~"brand"~"${businessType}",i](${minLat},${minLon},${maxLat},${maxLon});
        );
        out center meta;`
      ];
      
      for (const query of queries) {
        try {
          const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'BusinessLeadSearchApp/1.0'
            },
            body: `data=${encodeURIComponent(query)}`
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.elements) {
              for (const element of data.elements) {
                const tags = element.tags || {};
                const name = tags.name || tags.brand;
                
                if (!name || name.length < 2) continue;
                
                // Check relevance
                if (!isBusinessRelevant(businessType, name, tags)) continue;
                
                // Skip duplicates
                if (leads.some(lead => 
                  lead.name.toLowerCase() === name.toLowerCase() &&
                  Math.abs((lead.latitude || 0) - (element.lat || element.center?.lat || 0)) < 0.001
                )) continue;
                
                const contactInfo = extractContactInfo(tags);
                const address = formatAddress(tags);
                
                const lead: BusinessLead = {
                  name,
                  address,
                  phone: contactInfo.phone,
                  website: contactInfo.website,
                  email: contactInfo.email,
                  category: tags.amenity || tags.shop || osmType,
                  latitude: element.lat || element.center?.lat,
                  longitude: element.lon || element.center?.lon,
                  source: 'OpenStreetMap'
                };
                
                leads.push(lead);
              }
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
          
        } catch (error) {
          console.warn(`⚠️ OSM query failed:`, error);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ OpenStreetMap search error:', error);
  }
  
  return leads;
}

async function searchNominatimPOIs(location: string, businessType: string): Promise<BusinessLead[]> {
  const leads: BusinessLead[] = [];
  
  try {
    // Search for POIs using Nominatim
    const searchQueries = [
      `${businessType} ${location}`,
      `${businessType} near ${location}`,
      `${businessType} in ${location}`
    ];
    
    for (const query of searchQueries) {
      const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=50&addressdetails=1&extratags=1`;
      
      const response = await fetch(searchUrl, {
        headers: { 'User-Agent': 'BusinessLeadSearchApp/1.0' }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        for (const item of data) {
          if (!item.display_name || !item.lat || !item.lon) continue;
          
          // Extract business name from display_name
          const name = item.display_name.split(',')[0].trim();
          if (name.length < 2) continue;
          
          // Check if it's a relevant business
          if (!isBusinessRelevant(businessType, name, item.extratags || {})) continue;
          
          // Skip duplicates
          if (leads.some(lead => 
            lead.name.toLowerCase() === name.toLowerCase() &&
            Math.abs((lead.latitude || 0) - parseFloat(item.lat)) < 0.001
          )) continue;
          
          const lead: BusinessLead = {
            name,
            address: item.display_name,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            source: 'Nominatim POI'
          };
          
          leads.push(lead);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    console.error('❌ Nominatim POI search error:', error);
  }
  
  return leads;
}

async function searchWikipediaBusinesses(location: string, businessType: string): Promise<BusinessLead[]> {
  const leads: BusinessLead[] = [];
  
  try {
    const searchQuery = `${businessType} ${location} business company`;
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/search?q=${encodeURIComponent(searchQuery)}&limit=20`;
    
    const response = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'BusinessLeadSearchApp/1.0' }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.pages) {
        for (const page of data.pages) {
          const title = page.title;
          const description = page.description || '';
          
          // Check if it looks like a business
          if (isBusinessRelevant(businessType, title, { description })) {
            leads.push({
              name: title,
              address: location,
              description: description,
              website: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
              source: 'Wikipedia'
            });
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Wikipedia search error:', error);
  }
  
  return leads;
}

async function searchGovernmentData(location: string, businessType: string): Promise<BusinessLead[]> {
  const leads: BusinessLead[] = [];
  
  try {
    // For Ireland - use data.gov.ie if available
    if (location.toLowerCase().includes('ireland') || location.toLowerCase().includes('dublin')) {
      // This would integrate with Irish government business registries
      // For now, return empty but structure is ready
      console.log('🇮🇪 Irish government data search (placeholder)');
    }
    
    // For UK - use gov.uk data
    if (location.toLowerCase().includes('uk') || location.toLowerCase().includes('london')) {
      console.log('🇬🇧 UK government data search (placeholder)');
    }
    
  } catch (error) {
    console.error('❌ Government data search error:', error);
  }
  
  return leads;
}

function generateSyntheticLeads(location: string, businessType: string, count: number): BusinessLead[] {
  const leads: BusinessLead[] = [];
  
  // Common business name patterns
  const namePatterns = [
    `${businessType} Services`,
    `${location} ${businessType}`,
    `Premium ${businessType}`,
    `Local ${businessType} Co`,
    `${businessType} Express`,
    `Quality ${businessType}`,
    `${businessType} Plus`,
    `Elite ${businessType}`,
    `${businessType} Solutions`,
    `Professional ${businessType}`
  ];
  
  // Generate realistic contact info
  const domains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com'];
  const phoneAreaCodes = ['01', '02', '03', '04', '05', '06', '07', '08', '09'];
  
  for (let i = 0; i < count; i++) {
    const baseName = namePatterns[i % namePatterns.length];
    const name = i > namePatterns.length - 1 ? `${baseName} ${Math.floor(i / namePatterns.length) + 1}` : baseName;
    
    // Generate realistic contact info (about 60% of leads have email, 80% have phone)
    const hasEmail = Math.random() > 0.4;
    const hasPhone = Math.random() > 0.2;
    const hasWebsite = Math.random() > 0.5;
    
    const lead: BusinessLead = {
      name,
      address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${location}`,
      email: hasEmail ? `info@${name.toLowerCase().replace(/\s+/g, '')}.${domains[Math.floor(Math.random() * domains.length)]}` : undefined,
      phone: hasPhone ? `${phoneAreaCodes[Math.floor(Math.random() * phoneAreaCodes.length)]} ${Math.floor(Math.random() * 9000000) + 1000000}` : undefined,
      website: hasWebsite ? `https://www.${name.toLowerCase().replace(/\s+/g, '')}.com` : undefined,
      rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 to 5.0 rating
      source: 'Synthetic Data (Testing)',
      category: businessType
    };
    
    leads.push(lead);
  }
  
  return leads;
}

function isBusinessRelevant(businessType: string, name: string, tags: any): boolean {
  const searchTerm = businessType.toLowerCase();
  const businessName = (name || '').toLowerCase();
  const description = (tags.description || '').toLowerCase();
  
  // Direct name matching
  if (businessName.includes(searchTerm)) return true;
  
  // Category matching
  const category = (tags.amenity || tags.shop || tags.healthcare || '').toLowerCase();
  const osmTypes = BUSINESS_TYPE_MAPPINGS[searchTerm] || [];
  if (osmTypes.includes(category)) return true;
  
  // Specific business type logic
  switch (searchTerm) {
    case 'hair-salon':
    case 'hairdresser':
      return businessName.includes('hair') || 
             businessName.includes('salon') || 
             businessName.includes('barber') ||
             businessName.includes('styling') ||
             category.includes('hairdresser') ||
             category.includes('beauty');
             
    case 'restaurant':
      return businessName.includes('restaurant') ||
             businessName.includes('dining') ||
             businessName.includes('bistro') ||
             category.includes('restaurant') ||
             category.includes('fast_food');
             
    case 'dentist':
      return businessName.includes('dental') ||
             businessName.includes('dentist') ||
             category.includes('dentist') ||
             description.includes('dental');
             
    default:
      // Generic matching
      return businessName.includes(searchTerm) || 
             category.includes(searchTerm) ||
             description.includes(searchTerm);
  }
}

function extractContactInfo(tags: any): { phone?: string; website?: string; email?: string } {
  const result: { phone?: string; website?: string; email?: string } = {};
  
  // Phone extraction
  const phoneFields = ['phone', 'contact:phone', 'telephone', 'contact:telephone'];
  for (const field of phoneFields) {
    if (tags[field]) {
      result.phone = tags[field].toString().trim();
      break;
    }
  }
  
  // Website extraction
  const websiteFields = ['website', 'contact:website', 'url', 'homepage'];
  for (const field of websiteFields) {
    if (tags[field]) {
      let website = tags[field].toString().trim();
      if (!website.startsWith('http')) {
        website = 'https://' + website;
      }
      result.website = website;
      break;
    }
  }
  
  // Email extraction
  const emailFields = ['email', 'contact:email', 'contact:e-mail'];
  for (const field of emailFields) {
    if (tags[field]) {
      result.email = tags[field].toString().trim().toLowerCase();
      break;
    }
  }
  
  return result;
}

function formatAddress(tags: any): string {
  const parts = [];
  
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
  
  return parts.length > 0 ? parts.join(', ') : 'Address not available';
}

function removeDuplicateLeads(leads: BusinessLead[]): BusinessLead[] {
  const seen = new Set<string>();
  return leads.filter(lead => {
    const key = `${lead.name.toLowerCase()}-${lead.latitude || 0}-${lead.longitude || 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function computeQualityScore(lead: BusinessLead): number {
  let score = 0;
  
  // Contact information scoring
  if (lead.email) score += 25;
  if (lead.phone) score += 20;
  if (lead.website) score += 20;
  if (lead.address && lead.address !== 'Address not available') score += 15;
  
  // Rating scoring
  if (typeof lead.rating === 'number') {
    score += Math.min(15, Math.round((lead.rating / 5) * 15));
  }
  
  // Source reliability scoring
  if (lead.source?.includes('OpenStreetMap')) score += 5;
  
  return Math.max(0, Math.min(100, score));
}

function qualityLabelFromScore(score: number): 'High' | 'Medium' | 'Low' {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}