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
    directory: string = 'all'
  ): Promise<{ success: boolean; error?: string; data?: BusinessLead[] }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { success: false, error: 'API key not found. Please configure your Firecrawl API key in settings.' };
    }

    try {
      if (!this.firecrawlApp) {
        this.firecrawlApp = new FirecrawlApp({ apiKey });
      }

      // Search across all directories simultaneously if 'all' is selected
      const directoriesToSearch = directory === 'all' 
        ? ['yellowpages', 'yelp', 'google'] // Removed BBB for speed, focus on faster sources
        : [directory];
      
      const allLeads: BusinessLead[] = [];
      
      // Use Promise.allSettled for parallel execution with error handling
      const searchPromises = directoriesToSearch.flatMap(dir => {
        const searchUrls = this.getSearchUrls(location, businessType, dir);
        return searchUrls.map(url => this.crawlUrl(url, dir));
      });

      console.log(`Starting parallel search across ${searchPromises.length} URLs...`);
      const results = await Promise.allSettled(searchPromises);
      
      // Process results and collect leads
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allLeads.push(...result.value);
          console.log(`URL ${index + 1} returned ${result.value.length} leads`);
        } else if (result.status === 'rejected') {
          console.error(`URL ${index + 1} failed:`, result.reason);
        }
      });

      const uniqueLeads = this.removeDuplicateLeads(allLeads);
      console.log(`Found ${uniqueLeads.length} total unique leads from ${directoriesToSearch.length} directories`);

      return { 
        success: true,
        data: uniqueLeads 
      };
    } catch (error) {
      console.error('Error during business search:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to search businesses' 
      };
    }
  }

  private static async crawlUrl(url: string, source: string): Promise<BusinessLead[]> {
    try {
      console.log(`Crawling: ${url}`);
      const crawlResponse = await this.firecrawlApp!.crawlUrl(url, {
        limit: 15, // Reduced limit for faster results
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true,
          waitFor: 1000 // Reduced wait time
        }
      }) as CrawlResponse;

      if (crawlResponse.success && crawlResponse.data) {
        return this.extractBusinessLeads(crawlResponse.data, source);
      }
      return [];
    } catch (error) {
      console.error(`Failed to crawl ${url}:`, error);
      return [];
    }
  }

  private static getSearchUrls(location: string, businessType: string, directory: string): string[] {
    const encodedLocation = encodeURIComponent(location);
    const encodedBusinessType = encodeURIComponent(businessType);
    
    // Normalize location and business type for better search results
    const normalizedLocation = this.normalizeLocation(location);
    const normalizedBusinessType = this.normalizeBusinessType(businessType);
    const encodedNormalizedLocation = encodeURIComponent(normalizedLocation);
    const encodedNormalizedBusinessType = encodeURIComponent(normalizedBusinessType);

    switch (directory) {
      case 'yellowpages':
        return [
          `https://www.yellowpages.com/search?search_terms=${encodedNormalizedBusinessType}&geo_location_terms=${encodedNormalizedLocation}`,
          `https://www.yellowpages.com/${encodedNormalizedLocation.toLowerCase().replace(/\s+/g, '-')}/${encodedNormalizedBusinessType.toLowerCase().replace(/\s+/g, '-')}`
        ];
      case 'yelp':
        return [
          `https://www.yelp.com/search?find_desc=${encodedNormalizedBusinessType}&find_loc=${encodedNormalizedLocation}`,
          `https://www.yelp.com/${encodedNormalizedLocation.toLowerCase().replace(/\s+/g, '-')}/${encodedNormalizedBusinessType.toLowerCase().replace(/\s+/g, '-')}`
        ];
      case 'bbb':
        return [
          `https://www.bbb.org/search?find_country=USA&find_text=${encodedNormalizedBusinessType}&find_loc=${encodedNormalizedLocation}`,
        ];
      case 'google':
        return [
          `https://www.google.com/search?q="${normalizedBusinessType}"+in+"${normalizedLocation}"+contact+phone+email`,
          `https://www.google.com/search?q="${normalizedBusinessType}"+"${normalizedLocation}"+directory+listings`
        ];
      default:
        return [
          `https://www.yellowpages.com/search?search_terms=${encodedNormalizedBusinessType}&geo_location_terms=${encodedNormalizedLocation}`,
        ];
    }
  }

  private static normalizeLocation(location: string): string {
    // Add state abbreviations if missing common city names
    const locationMap: { [key: string]: string } = {
      'new york': 'New York, NY',
      'los angeles': 'Los Angeles, CA',
      'chicago': 'Chicago, IL',
      'houston': 'Houston, TX',
      'phoenix': 'Phoenix, AZ',
      'philadelphia': 'Philadelphia, PA',
      'san antonio': 'San Antonio, TX',
      'san diego': 'San Diego, CA',
      'dallas': 'Dallas, TX',
      'san jose': 'San Jose, CA'
    };

    const lowerLocation = location.toLowerCase().trim();
    return locationMap[lowerLocation] || location;
  }

  private static normalizeBusinessType(businessType: string): string {
    // Expand common abbreviations and improve search terms
    const typeMap: { [key: string]: string } = {
      'restaurant': 'restaurants dining food',
      'lawyer': 'lawyers attorneys legal services',
      'doctor': 'doctors physicians medical',
      'dentist': 'dentists dental care',
      'plumber': 'plumbers plumbing services',
      'electrician': 'electricians electrical services',
      'mechanic': 'auto repair mechanics automotive',
      'salon': 'hair salons beauty services',
      'gym': 'gyms fitness centers',
      'store': 'retail stores shopping',
      'contractor': 'contractors construction services',
      'real estate': 'real estate agents realtors'
    };

    const lowerType = businessType.toLowerCase().trim();
    for (const [key, value] of Object.entries(typeMap)) {
      if (lowerType.includes(key)) {
        return value;
      }
    }
    return businessType;
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
    
    // Enhanced email regex patterns for better coverage
    const emailPatterns = [
      // Standard email pattern
      /\b[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}\b/g,
      // Email with 'mailto:' prefix
      /mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi,
      // Email in text like "email: example@domain.com"
      /(?:email|e-mail|contact)[\s:]+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi,
      // Email in parentheses or brackets
      /[\(\[]([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})[\)\]]/g
    ];
    
    // Phone regex (various formats)
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
    
    // Website regex
    const websiteRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)/g;

    // Business name extraction - improved patterns
    const lines = content.split('\n');
    const businessPatterns = [
      /^[A-Z][a-zA-Z0-9\s&,'.-]+(?:LLC|Inc|Corp|Co|Company|Ltd|LTD|Services|Group|Associates|Partners)\.?$/,
      /^[A-Z][a-zA-Z0-9\s&,'.-]{3,50}$/
    ];

    // Extract emails using multiple patterns
    const emails = new Set<string>();
    emailPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(match => {
        // Clean up mailto: prefix and extract email
        const cleanEmail = match.replace(/^mailto:/i, '').replace(/[^\w@.-]/g, '');
        if (cleanEmail.includes('@') && cleanEmail.includes('.')) {
          emails.add(cleanEmail.toLowerCase());
        }
      });
    });

    const phones = content.match(phoneRegex) || [];
    const websites = content.match(websiteRegex) || [];

    // Try to extract business names from structured content
    const potentialBusinessNames = lines
      .filter(line => line.trim().length > 3 && line.trim().length < 100)
      .filter(line => businessPatterns.some(pattern => pattern.test(line.trim())))
      .slice(0, 10); // Limit to avoid noise

    // Convert Set to Array for easier handling
    const emailsArray = Array.from(emails);

    // Create leads by combining extracted information
    if (emailsArray.length > 0 || phones.length > 0 || websites.length > 0) {
      // Create individual leads for each email found (prioritize emails)
      const maxItems = Math.max(emailsArray.length, phones.length, websites.length, potentialBusinessNames.length);
      
      for (let i = 0; i < maxItems; i++) {
        const lead: BusinessLead = {
          name: potentialBusinessNames[i] || `Business ${i + 1}`,
          email: emailsArray[i],
          phone: phones[i],
          website: websites[i],
          source: `${source} (${url})`,
          description: content.substring(0, 200) + '...'
        };

        // Only add if we have at least one contact method, prioritizing emails
        if (lead.email || lead.phone || lead.website) {
          leads.push(lead);
        }
      }

      // If we have more emails than other contact methods, create additional leads for extra emails
      if (emailsArray.length > Math.max(phones.length, websites.length)) {
        for (let i = Math.max(phones.length, websites.length); i < emailsArray.length; i++) {
          const lead: BusinessLead = {
            name: potentialBusinessNames[i] || `Email Contact ${i + 1}`,
            email: emailsArray[i],
            source: `${source} (${url})`,
            description: content.substring(0, 200) + '...'
          };
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