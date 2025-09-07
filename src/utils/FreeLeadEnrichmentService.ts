import { BusinessLead } from './FirecrawlService';

export class FreeLeadEnrichmentService {
  /**
   * Enriches leads using completely free methods - no paid APIs required
   */
  static async enrichLeads(leads: BusinessLead[], batchSize: number = 2): Promise<BusinessLead[]> {
    const enrichedLeads: BusinessLead[] = [];
    
    console.log(`🆓 Starting FREE enrichment for ${leads.length} leads (batch size: ${batchSize})`);

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      
      // Process batch in parallel but limit concurrency
      const batchPromises = batch.map(lead => this.enrichSingleLead(lead));
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Extract successful results
      const successfulResults = batchResults
        .filter((result): result is PromiseFulfilledResult<BusinessLead> => 
          result.status === 'fulfilled')
        .map(result => result.value);
      
      enrichedLeads.push(...successfulResults);
      
      // Add delay between batches to be respectful to free services
      if (i + batchSize < leads.length) {
        console.log(`⏳ Processed ${i + batchSize}/${leads.length} leads, waiting before next batch...`);
        await this.delay(3000); // Longer delay for free services
      }
    }

    console.log(`✅ FREE enrichment completed: ${enrichedLeads.length}/${leads.length} leads processed`);
    return enrichedLeads;
  }

  /**
   * Enriches a single lead using free methods
   */
  private static async enrichSingleLead(lead: BusinessLead): Promise<BusinessLead> {
    try {
      console.log(`🔍 FREE enriching: ${lead.name}`);
      
      let enrichedLead = { ...lead };

      // 1. Try to find contact info from existing website (if available)
      if (lead.website && (!lead.email || !lead.phone)) {
        const websiteData = await this.extractFromWebsite(lead.website);
        enrichedLead = this.mergeContactData(enrichedLead, websiteData);
      }

      // 2. Search for business using free search engines
      if (!lead.email || !lead.phone || !lead.website) {
        const searchData = await this.searchBusinessFree(lead.name, lead.address);
        enrichedLead = this.mergeContactData(enrichedLead, searchData);
      }

      // 3. Try to construct website from business name
      if (!enrichedLead.website) {
        const guessedWebsite = await this.guessBusinessWebsite(lead.name);
        if (guessedWebsite) {
          enrichedLead.website = guessedWebsite;
          // Try to extract info from guessed website
          const websiteData = await this.extractFromWebsite(guessedWebsite);
          enrichedLead = this.mergeContactData(enrichedLead, websiteData);
        }
      }

      console.log(`✅ FREE enriched ${lead.name}:`, {
        originalData: { email: lead.email, phone: lead.phone, website: lead.website },
        newData: { email: enrichedLead.email, phone: enrichedLead.phone, website: enrichedLead.website }
      });

      return enrichedLead;

    } catch (error) {
      console.error(`❌ Error in FREE enrichment for ${lead.name}:`, error);
      return lead;
    }
  }

  /**
   * Extract contact info from website using free CORS proxy
   */
  private static async extractFromWebsite(website: string): Promise<Partial<BusinessLead>> {
    try {
      // Use a free CORS proxy service
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(website)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`❌ Failed to fetch ${website}: ${response.status}`);
        return {};
      }

      const data = await response.json();
      const content = data.contents || '';

      return this.extractContactInfoFromText(content);

    } catch (error) {
      console.warn(`❌ Website extraction failed for ${website}:`, error);
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
   * Guess business website based on name
   */
  private static async guessBusinessWebsite(businessName: string): Promise<string | null> {
    try {
      // Clean business name for domain guessing
      const cleanName = businessName
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '')
        .replace(/\b(llc|inc|corp|company|ltd|limited|restaurant|cafe|coffee|shop|store)\b/g, '');

      const possibleDomains = [
        `https://www.${cleanName}.com`,
        `https://www.${cleanName}.ie`,
        `https://www.${cleanName}.co.uk`,
        `https://${cleanName}.com`,
        `https://${cleanName}.ie`
      ];

      // Test each domain with a quick HEAD request
      for (const domain of possibleDomains) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          // Use CORS proxy to test if website exists
          const testResponse = await fetch(
            `https://api.allorigins.win/get?url=${encodeURIComponent(domain)}`,
            { 
              signal: controller.signal,
              method: 'HEAD' // Faster than GET
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
        
        await this.delay(500); // Small delay between tests
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

    // Enhanced email patterns
    const emailPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
      /mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi,
      /"([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})"/gi,
      /email[:\s]+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi,
      /contact[:\s]+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi
    ];

    // Enhanced phone patterns (international support)
    const phonePatterns = [
      /\+\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{0,4}/g,
      /\(\d{3}\)\s*\d{3}[-.\s]\d{4}/g,
      /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g,
      /\+?[\d\s\-\(\)]{10,}/g,
      /phone[:\s]+([\+\d\s\-\(\)]{10,})/gi,
      /tel[:\s]+([\+\d\s\-\(\)]{10,})/gi,
      /call[:\s]+([\+\d\s\-\(\)]{10,})/gi
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