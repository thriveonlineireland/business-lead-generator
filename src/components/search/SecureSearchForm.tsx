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
import { SearchProgressModal } from './SearchProgressModal';

interface SecureSearchFormProps {
  onResults: (results: BusinessLead[], location?: string, businessType?: string, canExpandSearch?: boolean) => void;
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
  const [showProgressModal, setShowProgressModal] = useState(false);

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

    console.log('🔍 Starting search:', { finalLocation, finalBusinessType });

    // Validate inputs
    if (!validateInput(finalLocation) || !validateInput(finalBusinessType)) {
      console.error('❌ Validation failed - Invalid characters');
      toast({
        title: "Invalid Input",
        description: "Please use only letters, numbers, spaces, commas, periods, and hyphens",
        variant: "destructive",
      });
      return;
    }

    if (!finalLocation.trim() || !finalBusinessType.trim()) {
      console.error('❌ Validation failed - Missing information');
      toast({
        title: "Missing Information",
        description: "Please enter both location and business type",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Validation passed, starting search...');

    setIsSearching(true);
    setShowProgressModal(true);
    
    try {
      // Get optimized search terms
      const businessKeywords = getBusinessTypeKeywords(finalBusinessType);
      const locationTerms = getLocationSearchTerms(finalLocation);
      
      const searchParams = {
        location: finalLocation.trim(),
        businessType: finalBusinessType.trim(),
        businessKeywords,
        locationTerms
      };
      
      console.log('📡 Calling edge function with params:', searchParams);
      
      const result = await supabase.functions.invoke('search-business-leads', {
        body: searchParams
      });
      
      const { data, error } = result;
      console.log('📨 Function response:', { 
        success: data?.success, 
        dataLength: data?.data?.length, 
        error: error?.message || error 
      });

      if (error) {
        console.error('❌ Search error:', error);
        toast({
          title: "Search Failed", 
          description: error.message || "Unknown error occurred",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        const foundLeads = data.data || [];
        console.log('✅ Search completed successfully:', foundLeads.length, 'leads found');
        console.log('📊 Sample lead:', foundLeads[0]);
        
        // Call onResults to update the parent component
        onResults(foundLeads, finalLocation, finalBusinessType, data.canExpandSearch);
        
        // Save to search history for authenticated users
        if (user) {
          console.log('💾 Saving search history for authenticated user');
          await supabase.from('search_history').insert({
            user_id: user.id,
            query: `${finalBusinessType} in ${finalLocation}`,
            location: finalLocation,
            business_type: finalBusinessType,
            results_count: foundLeads.length
          });
        }

        toast({
          title: "Search Complete",
          description: `Found ${foundLeads.length} business leads`,
        });
      } else {
        console.error('❌ Search failed:', data?.error || 'No data returned');
        toast({
          title: "Search Failed",
          description: data?.error || 'No results found',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Search failed with exception:', error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      console.log('🏁 Search process complete');
      setIsSearching(false);
      setShowProgressModal(false);
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Business Lead Search
          </CardTitle>
          <CardDescription>
            Search for business leads and save your results to your account.
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
      
      <SearchProgressModal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        location={location}
        businessType={businessType}
        onCancel={() => {
          setIsSearching(false);
          setShowProgressModal(false);
        }}
      />
    </>
  );
});