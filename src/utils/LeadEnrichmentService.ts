import { BusinessLead } from './FirecrawlService';

export class LeadEnrichmentService {
  /**
   * Enriches a business lead by scraping its website for additional contact information
   */
  static async enrichLead(lead: BusinessLead): Promise<BusinessLead> {
    if (!lead.website) {
      return lead; // Can't enrich without a website
    }

    try {
      console.log(`🔍 Enriching lead: ${lead.name} - ${lead.website}`);
      
      // Create an AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        // Use a simple proxy/CORS service to fetch the website content
        const response = await fetch(
          `https://api.allorigins.win/get?url=${encodeURIComponent(lead.website)}`,
          { 
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.warn(`❌ HTTP ${response.status} for ${lead.website}`);
          return lead;
        }

        const data = await response.json();
        const content = data.contents;

        if (!content || typeof content !== 'string') {
          console.warn(`❌ No content received for ${lead.website}`);
          return lead;
        }

        // Extract additional contact information
        const enrichedData = this.extractContactInfo(content);

        // Merge the enriched data with the existing lead
        const enrichedLead: BusinessLead = {
          ...lead,
          email: lead.email || enrichedData.email,
          phone: lead.phone || enrichedData.phone,
          address: lead.address || enrichedData.address,
          description: lead.description || enrichedData.description,
          instagram: lead.instagram || enrichedData.instagram
        };

        console.log(`✅ Enriched ${lead.name}:`, {
          originalEmail: lead.email,
          newEmail: enrichedData.email,
          originalPhone: lead.phone,
          newPhone: enrichedData.phone,
          foundInstagram: enrichedData.instagram
        });

        return enrichedLead;
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.warn(`⏱️ Request timeout for ${lead.name} - ${lead.website}`);
        } else if (fetchError instanceof TypeError && fetchError.message === 'Failed to fetch') {
          console.warn(`🚫 CORS/Network error for ${lead.name} - ${lead.website}`);
        } else {
          console.warn(`❌ Fetch error for ${lead.name}:`, fetchError);
        }
        
        return lead; // Return original lead on any fetch error
      }

    } catch (error) {
      console.error(`Error enriching lead ${lead.name}:`, error);
      return lead; // Return original lead if enrichment fails
    }
  }

  /**
   * Enriches multiple leads in batches to avoid overwhelming the services
   */
  static async enrichLeads(leads: BusinessLead[], batchSize: number = 3): Promise<BusinessLead[]> {
    const enrichedLeads: BusinessLead[] = [];
    
    console.log(`🔄 Starting enrichment for ${leads.length} leads (batch size: ${batchSize})`);

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      
      // Process batch in parallel but limit concurrency
      const batchPromises = batch.map(lead => this.enrichLead(lead));
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Extract successful results
      const successfulResults = batchResults
        .filter((result): result is PromiseFulfilledResult<BusinessLead> => 
          result.status === 'fulfilled')
        .map(result => result.value);
      
      enrichedLeads.push(...successfulResults);
      
      // Add delay between batches to be respectful
      if (i + batchSize < leads.length) {
        console.log(`⏳ Processed ${i + batchSize}/${leads.length} leads, waiting before next batch...`);
        await this.delay(2000);
      }
    }

    console.log(`✅ Enrichment completed: ${enrichedLeads.length}/${leads.length} leads processed`);
    return enrichedLeads;
  }

  private static extractContactInfo(content: string): Partial<BusinessLead> {
    const result: Partial<BusinessLead> = {};

    // Email extraction with multiple patterns
    const emailPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
      /mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi,
      /"([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})"/gi
    ];

    // Phone extraction with international support
    const phonePatterns = [
      /\+?[\d\s\-\(\)]{10,}/g,
      /\(\d{3}\)\s*\d{3}-\d{4}/g,
      /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g,
      /\+\d{1,4}[\s\-]?\(?\d{1,4}\)?[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{0,4}/g
    ];

    // Extract emails
    for (const pattern of emailPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        // Clean and validate email
        let email = matches[0].replace(/^mailto:/, '').replace(/['"]/g, '');
        if (email.includes('@') && email.includes('.') && !email.includes(' ')) {
          result.email = email.toLowerCase();
          break;
        }
      }
    }

    // Extract phones
    for (const pattern of phonePatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        // Clean phone number
        let phone = matches[0].replace(/[^\d\+\-\(\)\s]/g, '').trim();
        if (phone.length >= 10) {
          result.phone = phone;
          break;
        }
      }
    }

    // Extract address (look for common address patterns)
    const addressPatterns = [
      /\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl)[A-Za-z0-9\s,.-]*\d{5}/gi,
      /[A-Za-z0-9\s,.-]+,\s*[A-Za-z]{2}\s+\d{5}/gi
    ];

    for (const pattern of addressPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        result.address = matches[0].trim();
        break;
      }
    }

    // Extract description from meta description or first paragraph
    const descriptionPatterns = [
      /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/gi,
      /<p[^>]*>([^<]+)</gi
    ];

    for (const pattern of descriptionPatterns) {
      const matches = pattern.exec(content);
      if (matches && matches[1]) {
        result.description = matches[1].trim().substring(0, 200);
        break;
      }
    }

    // Extract Instagram profile
    const instagramPatterns = [
      /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)\/?/gi,
      /instagram\.com\/([a-zA-Z0-9_.]+)/gi,
      /@([a-zA-Z0-9_.]+)\s*(?:on\s+)?instagram/gi
    ];

    for (const pattern of instagramPatterns) {
      const matches = pattern.exec(content);
      if (matches) {
        const username = matches[1];
        if (username && username.length > 0 && username.length < 30) {
          result.instagram = `https://instagram.com/${username}`;
          break;
        }
      }
    }

    return result;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validates if enrichment improved the lead quality
   */
  static hasImprovedData(original: BusinessLead, enriched: BusinessLead): boolean {
    return (
      (!original.email && !!enriched.email) ||
      (!original.phone && !!enriched.phone) ||
      (!original.address && !!enriched.address) ||
      (!original.description && !!enriched.description) ||
      (!original.instagram && !!enriched.instagram)
    );
  }
}