import { useState, useImperativeHandle, forwardRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Shield, AlertTriangle } from 'lucide-react';
import { BusinessLead } from '@/utils/FirecrawlService';
import { BusinessTypeSelector, getBusinessTypeKeywords } from './BusinessTypeSelector';
import { LocationSelector, getLocationSearchTerms } from './LocationSelector';

interface SecureSearchFormProps {
  onResults: (results: BusinessLead[]) => void;
}

export interface SearchFormRef {
  triggerSearch: (location: string, businessType: string) => void;
}

export const SecureSearchForm = forwardRef<SearchFormRef, SecureSearchFormProps>(
  ({ onResults }, ref) => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    triggerSearch: (newLocation: string, newBusinessType: string) => {
      setLocation(newLocation);
      setBusinessType(newBusinessType);
      // Trigger search with new values
      setTimeout(() => {
        performSearch(newLocation, newBusinessType);
      }, 100);
    }
  }));

  // Input validation
  const validateInput = (input: string): boolean => {
    // Basic validation - alphanumeric, spaces, commas, hyphens
    const allowedPattern = /^[a-zA-Z0-9\s,.-]+$/;
    return allowedPattern.test(input) && input.length <= 100;
  };

  const performSearch = async (searchLocation?: string, searchBusinessType?: string) => {
    const finalLocation = searchLocation || location;
    const finalBusinessType = searchBusinessType || businessType;

    // Validate inputs
    if (!validateInput(finalLocation) || !validateInput(finalBusinessType)) {
      toast({
        title: "Invalid Input",
        description: "Please use only letters, numbers, spaces, commas, periods, and hyphens",
        variant: "destructive",
      });
      return;
    }

    if (!finalLocation.trim() || !finalBusinessType.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both location and business type",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    
    try {
      console.log('Starting secure search for:', { location: finalLocation, businessType: finalBusinessType });
      console.log('User authenticated:', !!user, 'User ID:', user?.id);
      
      // Get optimized search terms
      const businessKeywords = getBusinessTypeKeywords(finalBusinessType);
      const locationTerms = getLocationSearchTerms(finalLocation);
      
      console.log('Search parameters:', {
        location: finalLocation.trim(),
        businessType: finalBusinessType.trim(),
        businessKeywords,
        locationTerms,
        keywordCount: businessKeywords.length,
        locationTermCount: locationTerms.length
      });
      
      const { data, error } = await supabase.functions.invoke('search-business-leads', {
        body: {
          location: finalLocation.trim(),
          businessType: finalBusinessType.trim(),
          businessKeywords,
          locationTerms
        }
      });
      
      console.log('Supabase function response:', { data, error });

      if (error) {
        console.error('Search error:', error);
        throw error;
      }

      if (data?.success) {
        console.log('Search completed successfully:', data.data?.length, 'leads found');
        onResults(data.data || []);
        
        // Save to search history only for authenticated users
        if (user) {
          await supabase.from('search_history').insert({
            user_id: user.id,
            query: `${finalBusinessType} in ${finalLocation}`,
            location: finalLocation,
            business_type: finalBusinessType,
            results_count: data.data?.length || 0
          });
        }

        toast({
          title: "Search Complete",
          description: `Found ${data.data?.length || 0} business leads`,
        });
      } else {
        throw new Error(data?.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSearch();
  };

  if (authLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Business Lead Search
          </CardTitle>
          <CardDescription>
            Try our business lead search! {!user && "Sign in to save your search history and results."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LocationSelector 
                value={location} 
                onValueChange={setLocation} 
              />
              <BusinessTypeSelector 
                value={businessType} 
                onValueChange={setBusinessType} 
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={isSearching || !location || !businessType}
              className="w-full"
            >
              <Search className="mr-2 h-4 w-4" />
              {isSearching ? 'Searching for 500+ leads...' : 'Search Business Leads (Target: 500+)'}
            </Button>
          </form>
        </CardContent>
      </Card>
  );
});