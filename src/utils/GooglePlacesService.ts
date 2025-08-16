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
      // Since Google Places API doesn't support CORS for direct browser requests,
      // we'll validate the key format and save it for use with Google Maps JavaScript API
      if (!apiKey || !apiKey.trim()) {
        return false;
      }
      
      // Basic API key format validation for Google Cloud API keys
      const apiKeyPattern = /^AIza[0-9A-Za-z_-]{35}$/;
      const isValidFormat = apiKeyPattern.test(apiKey.trim());
      
      if (!isValidFormat) {
        console.error('Invalid Google Places API key format');
        return false;
      }
      
      // For now, we'll assume the key is valid if it matches the format
      // Real validation will happen when we make actual API calls during search
      return true;
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
      return {
        success: false,
        error: 'Google Places API key not configured. Please add your API key in Settings.'
      };
    }

    return {
      success: false,
      error: 'Google Places API requires server-side implementation due to CORS restrictions. Please use Firecrawl for web scraping instead.'
    };
  }
}