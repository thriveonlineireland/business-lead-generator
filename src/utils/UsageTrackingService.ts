import { supabase } from '@/integrations/supabase/client';

interface UsageStatus {
  canSearch: boolean;
  searchesRemaining: number;
  isPremium: boolean;
  error?: string;
}

export class UsageTrackingService {
  
  static async checkUsageStatus(userId: string): Promise<UsageStatus> {
    try {
      // First check if user is premium
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status, free_searches_used, last_search_reset')
        .eq('user_id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Create profile if it doesn't exist
      if (!profile) {
        const { error: createError } = await supabase
          .from('profiles')
          .insert([{
            user_id: userId,
            free_searches_used: 0,
            last_search_reset: new Date().toISOString().split('T')[0]
          }]);

        if (createError) throw createError;

        return {
          canSearch: true,
          searchesRemaining: 3,
          isPremium: false
        };
      }

      const isPremium = profile.subscription_status === 'active';

      // Premium users have unlimited searches
      if (isPremium) {
        return {
          canSearch: true,
          searchesRemaining: -1, // -1 indicates unlimited
          isPremium: true
        };
      }

      // Check if we need to reset monthly counter
      const today = new Date().toISOString().split('T')[0];
      const lastReset = profile.last_search_reset;
      let currentUsage = profile.free_searches_used || 0;

      if (lastReset !== today) {
        // Reset the counter
        const { error: resetError } = await supabase
          .from('profiles')
          .update({
            free_searches_used: 0,
            last_search_reset: today
          })
          .eq('user_id', userId);

        if (resetError) throw resetError;
        currentUsage = 0;
      }

      const searchesRemaining = Math.max(0, 3 - currentUsage);
      const canSearch = searchesRemaining > 0;

      return {
        canSearch,
        searchesRemaining,
        isPremium: false
      };

    } catch (error) {
      console.error('Error checking usage status:', error);
      return {
        canSearch: false,
        searchesRemaining: 0,
        isPremium: false,
        error: 'Unable to check usage status'
      };
    }
  }

  static async incrementUsage(userId: string): Promise<void> {
    try {
      // Get current profile with usage check
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, free_searches_used')
        .eq('user_id', userId)
        .single();

      // Don't increment for premium users
      if (profile?.subscription_status === 'active') {
        return;
      }

      // Increment usage counter
      const { error } = await supabase
        .from('profiles')
        .update({
          free_searches_used: (profile?.free_searches_used || 0) + 1
        })
        .eq('user_id', userId);

      if (error) throw error;

    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw error;
    }
  }

  static async limitFreeResults(results: any[], isPremium: boolean): Promise<any[]> {
    if (isPremium) {
      return results; // Return all results for premium users
    }

    // For free users: return only 10% of results, max 25
    const limitedCount = Math.min(Math.ceil(results.length * 0.1), 25);
    return results.slice(0, limitedCount);
  }
}