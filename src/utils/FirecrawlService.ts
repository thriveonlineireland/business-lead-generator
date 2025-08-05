import FirecrawlApp from '@mendable/firecrawl-js';

export interface BusinessLead {
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  description?: string;
  source: string;
}

interface ErrorResponse {
  success: false;
  error: string;
}

interface CrawlStatusResponse {
  success: true;
  status: string;
  completed: number;
  total: number;
  creditsUsed: number;
  expiresAt: string;
  data: any[];
}

type CrawlResponse = CrawlStatusResponse | ErrorResponse;

export class FirecrawlService {
  private static API_KEY_STORAGE_KEY = 'firecrawl_api_key';
  private static firecrawlApp: FirecrawlApp | null = null;

  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
    this.firecrawlApp = new FirecrawlApp({ apiKey });
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static clearApiKey(): void {
    localStorage.removeItem(this.API_KEY_STORAGE_KEY);
    this.firecrawlApp = null;
  }

  static async testApiKey(apiKey: string): Promise<boolean> {
    try {
      this.firecrawlApp = new FirecrawlApp({ apiKey });
      // Simple test to verify API key
      const testResponse = await this.firecrawlApp.scrapeUrl('https://example.com');
      return testResponse.success;
    } catch (error) {
      console.error('Error testing API key:', error);
      return false;
    }
  }

  static async searchBusinesses(
    location: string, 
    businessType: string,
    directory: string = 'yellowpages'
  ): Promise<{ success: boolean; error?: string; data?: BusinessLead[] }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { success: false, error: 'API key not found. Please configure your Firecrawl API key in settings.' };
    }

    try {
      if (!this.firecrawlApp) {
        this.firecrawlApp = new FirecrawlApp({ apiKey });
      }

      // Construct search URLs for different directories
      const searchUrls = this.getSearchUrls(location, businessType, directory);
      const allLeads: BusinessLead[] = [];

      for (const url of searchUrls) {
        try {
          console.log(`Crawling: ${url}`);
          const crawlResponse = await this.firecrawlApp.crawlUrl(url, {
            limit: 50,
            scrapeOptions: {
              formats: ['markdown', 'html'],
              onlyMainContent: true
            }
          }) as CrawlResponse;

          if (crawlResponse.success && crawlResponse.data) {
            const extractedLeads = this.extractBusinessLeads(crawlResponse.data, directory);
            allLeads.push(...extractedLeads);
          }
        } catch (urlError) {
          console.error(`Error crawling ${url}:`, urlError);
          // Continue with other URLs
        }
      }

      return { 
        success: true,
        data: this.removeDuplicateLeads(allLeads) 
      };
    } catch (error) {
      console.error('Error during business search:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to search businesses' 
      };
    }
  }

  private static getSearchUrls(location: string, businessType: string, directory: string): string[] {
    const encodedLocation = encodeURIComponent(location);
    const encodedBusinessType = encodeURIComponent(businessType);

    switch (directory) {
      case 'yellowpages':
        return [
          `https://www.yellowpages.com/search?search_terms=${encodedBusinessType}&geo_location_terms=${encodedLocation}`,
        ];
      case 'yelp':
        return [
          `https://www.yelp.com/search?find_desc=${encodedBusinessType}&find_loc=${encodedLocation}`,
        ];
      case 'bbb':
        return [
          `https://www.bbb.org/search?find_country=USA&find_text=${encodedBusinessType}&find_loc=${encodedLocation}`,
        ];
      case 'google':
        return [
          `https://www.google.com/search?q=${encodedBusinessType}+in+${encodedLocation}+contact+information`,
        ];
      default:
        return [
          `https://www.yellowpages.com/search?search_terms=${encodedBusinessType}&geo_location_terms=${encodedLocation}`,
        ];
    }
  }

  private static extractBusinessLeads(data: any[], source: string): BusinessLead[] {
    const leads: BusinessLead[] = [];

    for (const item of data) {
      if (item.markdown || item.html) {
        const content = item.markdown || item.html;
        const extractedLeads = this.extractFromContent(content, source, item.metadata?.url || '');
        leads.push(...extractedLeads);
      }
    }

    return leads;
  }

  private static extractFromContent(content: string, source: string, url: string): BusinessLead[] {
    const leads: BusinessLead[] = [];
    
    // Email regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    
    // Phone regex (various formats)
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
    
    // Website regex
    const websiteRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)/g;

    // Business name extraction (simplified - would need more sophisticated parsing for real use)
    const lines = content.split('\n');
    const businessPattern = /^[A-Z][a-zA-Z0-9\s&,-]+(?:LLC|Inc|Corp|Co|Company|Ltd|LTD)?$/;

    const emails = content.match(emailRegex) || [];
    const phones = content.match(phoneRegex) || [];
    const websites = content.match(websiteRegex) || [];

    // Try to extract business names from structured content
    const potentialBusinessNames = lines
      .filter(line => line.trim().length > 3 && line.trim().length < 100)
      .filter(line => businessPattern.test(line.trim()))
      .slice(0, 10); // Limit to avoid noise

    // Create leads by combining extracted information
    if (emails.length > 0 || phones.length > 0 || websites.length > 0) {
      for (let i = 0; i < Math.max(emails.length, phones.length, websites.length, potentialBusinessNames.length); i++) {
        const lead: BusinessLead = {
          name: potentialBusinessNames[i] || `Business ${i + 1}`,
          email: emails[i],
          phone: phones[i],
          website: websites[i],
          source: `${source} (${url})`,
          description: content.substring(0, 200) + '...'
        };

        // Only add if we have at least one contact method
        if (lead.email || lead.phone || lead.website) {
          leads.push(lead);
        }
      }
    }

    return leads;
  }

  private static removeDuplicateLeads(leads: BusinessLead[]): BusinessLead[] {
    const seen = new Set<string>();
    return leads.filter(lead => {
      const key = `${lead.name}-${lead.email || lead.phone || lead.website}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}