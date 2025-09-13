import { BusinessLead } from './FirecrawlService';

export class FreeLeadEnrichmentService {
  /**
   * Enriches leads using completely free methods - optimized for speed
   */
  static async enrichLeads(leads: BusinessLead[], batchSize: number = 1): Promise<BusinessLead[]> {
    const enrichedLeads: BusinessLead[] = [];
    
    console.log(`🆓 Starting optimized enrichment for ${leads.length} leads (batch size: ${batchSize})`);

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      
      // Process batch in parallel with timeout
      const batchPromises = batch.map(lead => 
        Promise.race([
          this.enrichSingleLead(lead),
          new Promise<BusinessLead>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 12000) // Increased to 12s
          )
        ]).catch(() => lead) // Return original on error
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Extract successful results
      const successfulResults = batchResults
        .filter((result): result is PromiseFulfilledResult<BusinessLead> => 
          result.status === 'fulfilled')
        .map(result => result.value);
      
      enrichedLeads.push(...successfulResults);
      
      // Shorter delay for better UX (was 3000ms)
      if (i + batchSize < leads.length) {
        console.log(`⏳ Processed ${i + batchSize}/${leads.length} leads...`);
        await this.delay(1000); // Reduced from 3000ms
      }
    }

    console.log(`✅ Optimized enrichment completed: ${enrichedLeads.length}/${leads.length} leads processed`);
    return enrichedLeads;
  }

  /**
   * Enriches a single lead using free methods - with strict timeout
   */
  private static async enrichSingleLead(lead: BusinessLead): Promise<BusinessLead> {
    try {
      console.log(`🔍 FREE enriching: ${lead.name}`);
      
      let enrichedLead = { ...lead };

      // Set overall timeout for this lead
      const timeoutPromise = new Promise<BusinessLead>((_, reject) => 
        setTimeout(() => reject(new Error('Lead enrichment timeout')), 8000) // Increased to 8s
      );

      const enrichmentPromise = this.performEnrichment(lead);
      
      enrichedLead = await Promise.race([enrichmentPromise, timeoutPromise]);

      console.log(`✅ FREE enriched ${lead.name}:`, {
        originalData: { email: lead.email, phone: lead.phone, website: lead.website },
        newData: { email: enrichedLead.email, phone: enrichedLead.phone, website: enrichedLead.website }
      });

      return enrichedLead;

    } catch (error) {
      if (error.message.includes('timeout')) {
        console.warn(`⏰ Timeout enriching ${lead.name}`);
      } else {
        console.error(`❌ Error in FREE enrichment for ${lead.name}:`, error);
      }
      return lead; // Return original on any error
    }
  }

  /**
   * Performs basic enrichment using business name patterns and known conventions
   */
  private static performBasicEnrichment(lead: BusinessLead): Partial<BusinessLead> {
    const result: Partial<BusinessLead> = {};
    
    if (!lead.email && lead.name) {
      // Try to guess common email patterns
      const businessName = lead.name.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '')
        .replace(/\b(llc|inc|corp|company|ltd|limited|restaurant|cafe|coffee|shop|store|bar|pub)\b/g, '');
      
      // Common email patterns for Irish businesses
      const emailGuesses = [
        `info@${businessName}.ie`,
        `info@${businessName}.com`,
        `contact@${businessName}.ie`,
        `hello@${businessName}.ie`
      ];
      
      // Don't actually assign guessed emails as they might be wrong
      // This is just a placeholder for future enhancement
    }
    
    return result;
  }

  /**
   * Performs the actual enrichment logic
   */
  private static async performEnrichment(lead: BusinessLead): Promise<BusinessLead> {
    let enrichedLead = { ...lead };

    // 1. First try basic enrichment from existing data
    if (!lead.email || !lead.phone) {
      const basicEnrichment = this.performBasicEnrichment(lead);
      enrichedLead = this.mergeContactData(enrichedLead, basicEnrichment);
    }

    // 2. Try to find contact info from existing website (if available)
    if (lead.website && (!enrichedLead.email || !enrichedLead.phone)) {
      const websiteData = await this.extractFromWebsite(lead.website);
      enrichedLead = this.mergeContactData(enrichedLead, websiteData);
      
      // If we found contact info, return early to save time
      if (websiteData.email || websiteData.phone) {
        return enrichedLead;
      }
    }

    // 3. Only try website guessing if we still need contact info and don't have a website
    if (!enrichedLead.website && (!enrichedLead.email || !enrichedLead.phone)) {
      const guessedWebsite = await this.guessBusinessWebsite(lead.name);
      if (guessedWebsite) {
        enrichedLead.website = guessedWebsite;
        // Try to extract info from guessed website
        const websiteData = await this.extractFromWebsite(guessedWebsite);
        enrichedLead = this.mergeContactData(enrichedLead, websiteData);
      }
    }

    return enrichedLead;
  }

  /**
   * Extract contact info from website using free CORS proxy - optimized for speed
   */
  private static async extractFromWebsite(website: string): Promise<Partial<BusinessLead>> {
    try {
      // Try multiple CORS proxy services for better reliability
      const proxyServices = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(website)}`,
        `https://corsproxy.io/?${encodeURIComponent(website)}`,
        `https://cors-anywhere.herokuapp.com/${website}`
      ];
      
      // Use the first available proxy
      for (const proxyUrl of proxyServices) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased to 5s
          
          const response = await fetch(proxyUrl, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json, text/html, */*',
              'User-Agent': 'Mozilla/5.0 (compatible; LeadBot/1.0)'
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            continue; // Try next proxy
          }

          let content = '';
          const contentType = response.headers.get('content-type') || '';
          
          if (contentType.includes('application/json')) {
            const data = await response.json();
            content = data.contents || data.data || '';
          } else {
            content = await response.text();
          }

          if (!content || content.length < 100) {
            continue; // Try next proxy
          }

          // Limit content size and extract contact info
          const limitedContent = content.substring(0, 100000); // Increased limit
          const contactInfo = this.extractContactInfoFromText(limitedContent);
          
          if (contactInfo.email || contactInfo.phone) {
            console.log(`✅ Successfully extracted from ${website} using ${proxyUrl.split('?')[0]}`);
            return contactInfo;
          }
          
        } catch (proxyError) {
          console.warn(`❌ Proxy failed: ${proxyUrl.split('?')[0]} - ${proxyError.message}`);
          continue; // Try next proxy
        }
      }

      console.warn(`⚠️ All proxies failed for ${website}`);
      return {};

    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`⏰ Timeout extracting from ${website}`);
      } else {
        console.warn(`❌ Website extraction failed for ${website}:`, error.message);
      }
      return {};
    }
  }

  /**
   * Search for business information using free search methods
   */
  private static async searchBusinessFree(businessName: string, address?: string): Promise<Partial<BusinessLead>> {
    try {
      // Create search queries
      const searchQueries = [
        `"${businessName}" contact email phone`,
        `"${businessName}" ${address || ''} website`,
        `${businessName.replace(/[^\w\s]/g, '')} business contact`
      ];

      for (const query of searchQueries) {
        try {
          // Use DuckDuckGo Instant Answer API (free, no API key needed)
          const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
          
          const response = await fetch(searchUrl);
          if (response.ok) {
            const data = await response.json();
            
            // Extract contact info from search results
            const searchText = JSON.stringify(data);
            const contactInfo = this.extractContactInfoFromText(searchText);
            
            if (contactInfo.email || contactInfo.phone || contactInfo.website) {
              return contactInfo;
            }
          }
          
          await this.delay(1000); // Rate limiting
          
        } catch (error) {
          console.warn(`Search query failed: ${query}`, error);
        }
      }

      return {};

    } catch (error) {
      console.error('Free search failed:', error);
      return {};
    }
  }

  /**
   * Guess business website based on name - simplified version
   */
  private static async guessBusinessWebsite(businessName: string): Promise<string | null> {
    try {
      // Clean business name for domain guessing
      const cleanName = businessName
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '')
        .replace(/\b(llc|inc|corp|company|ltd|limited|restaurant|cafe|coffee|shop|store|bar|pub)\b/g, '');

      // Only try the most common domain patterns
      const possibleDomains = [
        `https://www.${cleanName}.com`,
        `https://www.${cleanName}.ie`
      ];

      // Test only first 2 domains to save time
      for (const domain of possibleDomains.slice(0, 2)) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // Very short timeout
          
          // Use CORS proxy to test if website exists
          const testResponse = await fetch(
            `https://api.allorigins.win/get?url=${encodeURIComponent(domain)}`,
            { 
              signal: controller.signal,
              method: 'GET' // Changed from HEAD to GET for better compatibility
            }
          );
          
          clearTimeout(timeoutId);
          
          if (testResponse.ok) {
            console.log(`✅ Found potential website: ${domain}`);
            return domain;
          }
          
        } catch (error) {
          // Continue to next domain
        }
        
        await this.delay(200); // Very small delay between tests
      }

      return null;

    } catch (error) {
      console.error('Website guessing failed:', error);
      return null;
    }
  }

  /**
   * Extract contact information from text content
   */
  private static extractContactInfoFromText(text: string): Partial<BusinessLead> {
    const result: Partial<BusinessLead> = {};

    // Enhanced email patterns - more comprehensive
    const emailPatterns = [
      /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b/gi,
      /mailto:([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,})/gi,
      /"([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,})"/gi,
      /'([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,})'/gi,
      /email[:\s]*([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,})/gi,
      /contact[:\s]*([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,})/gi,
      /info[:\s]*([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,})/gi,
      /enquiries[:\s]*([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,})/gi,
      /reservations[:\s]*([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,})/gi,
      /bookings[:\s]*([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,})/gi,
      /href="mailto:([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,})"/gi
    ];

    // Enhanced phone patterns (international support + Irish numbers)
    const phonePatterns = [
      /\+353[-.\s]?\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/g, // Irish format +353
      /\+\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{0,4}/g,
      /\(\d{3}\)\s*\d{3}[-.\s]\d{4}/g,
      /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g,
      /0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/g, // Irish mobile/landline format
      /\+?[\d\s\-\(\)]{10,}/g,
      /phone[:\s]+([\+\d\s\-\(\)]{10,})/gi,
      /tel[:\s]+([\+\d\s\-\(\)]{10,})/gi,
      /call[:\s]+([\+\d\s\-\(\)]{10,})/gi,
      /mobile[:\s]+([\+\d\s\-\(\)]{10,})/gi,
      /contact[:\s]+us[:\s]+([\+\d\s\-\(\)]{10,})/gi
    ];

    // Website patterns
    const websitePatterns = [
      /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)/g,
      /www\.[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)/g,
      /website[:\s]+((?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6})/gi
    ];

    // Extract emails
    for (const pattern of emailPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        let email = matches[0].replace(/^mailto:/, '').replace(/['"]/g, '').replace(/^(email|contact)[:\s]+/i, '');
        if (email.includes('@') && email.includes('.') && !email.includes(' ') && email.length < 100) {
          result.email = email.toLowerCase();
          break;
        }
      }
    }

    // Extract phones
    for (const pattern of phonePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        let phone = matches[0].replace(/^(phone|tel|call)[:\s]+/i, '').trim();
        // Clean but preserve formatting
        if (phone.length >= 10 && phone.length <= 20) {
          result.phone = phone;
          break;
        }
      }
    }

    // Extract websites
    for (const pattern of websitePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        let website = matches[0].replace(/^website[:\s]+/i, '');
        if (!website.startsWith('http')) {
          website = 'https://' + website;
        }
        if (website.includes('.') && website.length > 10 && website.length < 200) {
          result.website = website;
          break;
        }
      }
    }

    return result;
  }

  /**
   * Merge contact data, preserving existing data
   */
  private static mergeContactData(lead: BusinessLead, newData: Partial<BusinessLead>): BusinessLead {
    return {
      ...lead,
      email: lead.email || newData.email,
      phone: lead.phone || newData.phone,
      website: lead.website || newData.website,
      address: lead.address || newData.address
    };
  }

  /**
   * Delay utility
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if enrichment was successful
   */
  static hasImprovedData(original: BusinessLead, enriched: BusinessLead): boolean {
    return (
      (!original.email && !!enriched.email) ||
      (!original.phone && !!enriched.phone) ||
      (!original.website && !!enriched.website) ||
      (!original.address && !!enriched.address)
    );
  }
}