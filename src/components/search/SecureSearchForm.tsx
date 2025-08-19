import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Search, Shield, AlertTriangle } from 'lucide-react';
import { BusinessLead } from '@/utils/FirecrawlService';

interface SecureSearchFormProps {
  onResults: (results: BusinessLead[]) => void;
}

export const SecureSearchForm = ({ onResults }: SecureSearchFormProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Input validation
  const validateInput = (input: string): boolean => {
    // Basic validation - alphanumeric, spaces, commas, hyphens
    const allowedPattern = /^[a-zA-Z0-9\s,.-]+$/;
    return allowedPattern.test(input) && input.length <= 100;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to perform searches",
        variant: "destructive",
      });
      return;
    }

    // Validate inputs
    if (!validateInput(location) || !validateInput(businessType)) {
      toast({
        title: "Invalid Input",
        description: "Please use only letters, numbers, spaces, commas, periods, and hyphens",
        variant: "destructive",
      });
      return;
    }

    if (!location.trim() || !businessType.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both location and business type",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    
    try {
      console.log('Starting secure search for:', { location, businessType });
      
      const { data, error } = await supabase.functions.invoke('search-business-leads', {
        body: {
          location: location.trim(),
          businessType: businessType.trim()
        }
      });

      if (error) {
        console.error('Search error:', error);
        throw error;
      }

      if (data?.success) {
        console.log('Search completed successfully:', data.leads?.length, 'leads found');
        onResults(data.leads || []);
        
        // Save to search history
        await supabase.from('search_history').insert({
          user_id: user.id,
          query: `${businessType} in ${location}`,
          location,
          business_type: businessType,
          results_count: data.leads?.length || 0
        });

        toast({
          title: "Search Complete",
          description: `Found ${data.leads?.length || 0} business leads`,
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

  if (authLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Authentication Required
          </CardTitle>
          <CardDescription>
            Please sign in to use the business lead search feature.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Secure Business Lead Search
        </CardTitle>
        <CardDescription>
          Search for business leads using our secure, authenticated system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Dublin, Ireland"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Input
                id="businessType"
                placeholder="e.g., restaurants, dental clinics"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                maxLength={100}
                required
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={isSearching}
            className="w-full"
          >
            <Search className="mr-2 h-4 w-4" />
            {isSearching ? 'Searching...' : 'Search Business Leads'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};