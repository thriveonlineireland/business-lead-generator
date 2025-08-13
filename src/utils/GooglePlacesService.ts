import { BusinessLead } from './FirecrawlService';

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

interface PlacesResponse {
  results: PlaceResult[];
  next_page_token?: string;
  status: string;
}

export class GooglePlacesService {
  private static API_KEY_STORAGE_KEY = 'google_places_api_key';

  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static clearApiKey(): void {
    localStorage.removeItem(this.API_KEY_STORAGE_KEY);
  }

  static async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=test&key=${apiKey}`
      );
      const data = await response.json();
      return data.status === 'OK' || data.status === 'ZERO_RESULTS';
    } catch (error) {
      console.error('Error testing Google Places API key:', error);
      return false;
    }
  }

  static async searchBusinesses(
    location: string,
    businessType: string,
    maxResults: number = 500
  ): Promise<{ success: boolean; error?: string; data?: BusinessLead[] }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { success: false, error: 'Google Places API key not found. Please configure it in settings.' };
    }

    try {
      console.log(`Starting Google Places search: ${businessType} in ${location}`);
      
      const allLeads: BusinessLead[] = [];
      let nextPageToken: string | undefined;
      let pageCount = 0;
      const maxPages = Math.ceil(maxResults / 20); // Google returns ~20 results per page

      do {
        const query = `${businessType} in ${location}`;
        let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
        
        if (nextPageToken) {
          url += `&pagetoken=${nextPageToken}`;
          // Wait 2 seconds before using page token (Google requirement)
          await this.delay(2000);
        }

        console.log(`Fetching page ${pageCount + 1} of results...`);
        const response = await fetch(url);
        const data: PlacesResponse = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          console.error('Google Places API error:', data.status);
          break;
        }

        if (data.results && data.results.length > 0) {
          // Get detailed info for each place
          const detailedLeads = await this.getDetailedPlaceInfo(data.results, apiKey);
          allLeads.push(...detailedLeads);
          console.log(`Added ${detailedLeads.length} leads. Total: ${allLeads.length}`);
        }

        nextPageToken = data.next_page_token;
        pageCount++;

        // Stop if we have enough results or reached max pages
        if (allLeads.length >= maxResults || pageCount >= maxPages) {
          break;
        }

      } while (nextPageToken && pageCount < maxPages);

      console.log(`Google Places search completed. Found ${allLeads.length} total leads.`);

      return {
        success: true,
        data: allLeads.slice(0, maxResults) // Ensure we don't exceed maxResults
      };

    } catch (error) {
      console.error('Error in Google Places search:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search Google Places'
      };
    }
  }

  private static async getDetailedPlaceInfo(places: PlaceResult[], apiKey: string): Promise<BusinessLead[]> {
    const leads: BusinessLead[] = [];
    
    // Process places in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < places.length; i += batchSize) {
      const batch = places.slice(i, i + batchSize);
      const batchPromises = batch.map(place => this.getPlaceDetails(place.place_id, apiKey));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            const place = batch[index];
            const details = result.value;
            
            leads.push({
              name: place.name,
              email: this.extractEmailFromWebsite(details.website),
              phone: details.formatted_phone_number,
              website: details.website,
              address: place.formatted_address,
              description: `${place.types.join(', ')} - Rating: ${place.rating || 'N/A'}`,
              source: 'Google Places API'
            });
          }
        });
      } catch (error) {
        console.error('Error processing batch:', error);
      }

      // Add delay between batches
      if (i + batchSize < places.length) {
        await this.delay(1000);
      }
    }

    return leads;
  }

  private static async getPlaceDetails(placeId: string, apiKey: string): Promise<any> {
    try {
      const fields = 'formatted_phone_number,website,formatted_address,rating,business_status';
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        return data.result;
      }
      return null;
    } catch (error) {
      console.error(`Error getting details for place ${placeId}:`, error);
      return null;
    }
  }

  private static extractEmailFromWebsite(website?: string): string | undefined {
    // In a real implementation, you might want to scrape the website for email
    // For now, we'll generate a likely email based on the domain
    if (!website) return undefined;
    
    try {
      const domain = new URL(website).hostname.replace('www.', '');
      // Common email patterns
      const commonEmails = [
        `info@${domain}`,
        `contact@${domain}`,
        `hello@${domain}`
      ];
      return commonEmails[0]; // Return the most common one
    } catch {
      return undefined;
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}