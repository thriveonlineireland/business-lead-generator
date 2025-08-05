import { BusinessLead } from './FirecrawlService';

export interface SearchHistory {
  id: string;
  location: string;
  businessType: string;
  directory: string;
  timestamp: Date;
  resultsCount: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  location: string;
  businessType: string;
  directory: string;
  leads: BusinessLead[];
  createdAt: Date;
  updatedAt: Date;
}

export class StorageService {
  private static SEARCH_HISTORY_KEY = 'lead_gen_search_history';
  private static SAVED_SEARCHES_KEY = 'lead_gen_saved_searches';

  // Search History
  static getSearchHistory(): SearchHistory[] {
    const history = localStorage.getItem(this.SEARCH_HISTORY_KEY);
    if (!history) return [];
    
    try {
      const parsed = JSON.parse(history);
      return parsed.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
    } catch {
      return [];
    }
  }

  static addToSearchHistory(search: Omit<SearchHistory, 'id' | 'timestamp'>): void {
    const history = this.getSearchHistory();
    const newSearch: SearchHistory = {
      ...search,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    
    // Add to beginning and limit to 50 items
    history.unshift(newSearch);
    const limitedHistory = history.slice(0, 50);
    
    localStorage.setItem(this.SEARCH_HISTORY_KEY, JSON.stringify(limitedHistory));
  }

  static clearSearchHistory(): void {
    localStorage.removeItem(this.SEARCH_HISTORY_KEY);
  }

  // Saved Searches
  static getSavedSearches(): SavedSearch[] {
    const saved = localStorage.getItem(this.SAVED_SEARCHES_KEY);
    if (!saved) return [];
    
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      }));
    } catch {
      return [];
    }
  }

  static saveSearch(search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>): string {
    const savedSearches = this.getSavedSearches();
    const newSearch: SavedSearch = {
      ...search,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    savedSearches.push(newSearch);
    localStorage.setItem(this.SAVED_SEARCHES_KEY, JSON.stringify(savedSearches));
    
    return newSearch.id;
  }

  static updateSavedSearch(id: string, updates: Partial<SavedSearch>): boolean {
    const savedSearches = this.getSavedSearches();
    const index = savedSearches.findIndex(search => search.id === id);
    
    if (index === -1) return false;
    
    savedSearches[index] = {
      ...savedSearches[index],
      ...updates,
      updatedAt: new Date()
    };
    
    localStorage.setItem(this.SAVED_SEARCHES_KEY, JSON.stringify(savedSearches));
    return true;
  }

  static deleteSavedSearch(id: string): boolean {
    const savedSearches = this.getSavedSearches();
    const filtered = savedSearches.filter(search => search.id !== id);
    
    if (filtered.length === savedSearches.length) return false;
    
    localStorage.setItem(this.SAVED_SEARCHES_KEY, JSON.stringify(filtered));
    return true;
  }
}