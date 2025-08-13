import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FirecrawlService, BusinessLead } from "@/utils/FirecrawlService";
import { GooglePlacesService } from "@/utils/GooglePlacesService";
import { StorageService } from "@/utils/StorageService";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, Building, Globe, Download, Save, AlertCircle } from "lucide-react";
import ResultsTable from "@/components/search/ResultsTable";
import QuickActions from "@/components/search/QuickActions";

const Dashboard = () => {
  const { toast } = useToast();
  const [searchForm, setSearchForm] = useState({
    location: "",
    businessType: "",
    directory: "all",
    dataSource: "google-places" // Add data source selection
  });
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [results, setResults] = useState<BusinessLead[]>([]);
  const [searchStats, setSearchStats] = useState<{
    totalFound: number;
    searchTime: number;
    creditsUsed: number;
  } | null>(null);

  const majorCities = [
    // US Cities
    { value: "New York, NY", label: "New York, NY", country: "USA" },
    { value: "Los Angeles, CA", label: "Los Angeles, CA", country: "USA" },
    { value: "Chicago, IL", label: "Chicago, IL", country: "USA" },
    { value: "Houston, TX", label: "Houston, TX", country: "USA" },
    { value: "Phoenix, AZ", label: "Phoenix, AZ", country: "USA" },
    { value: "Philadelphia, PA", label: "Philadelphia, PA", country: "USA" },
    { value: "San Antonio, TX", label: "San Antonio, TX", country: "USA" },
    { value: "San Diego, CA", label: "San Diego, CA", country: "USA" },
    { value: "Dallas, TX", label: "Dallas, TX", country: "USA" },
    { value: "San Jose, CA", label: "San Jose, CA", country: "USA" },
    { value: "Austin, TX", label: "Austin, TX", country: "USA" },
    { value: "Jacksonville, FL", label: "Jacksonville, FL", country: "USA" },
    { value: "Miami, FL", label: "Miami, FL", country: "USA" },
    { value: "Atlanta, GA", label: "Atlanta, GA", country: "USA" },
    { value: "Seattle, WA", label: "Seattle, WA", country: "USA" },
    { value: "Denver, CO", label: "Denver, CO", country: "USA" },
    { value: "Las Vegas, NV", label: "Las Vegas, NV", country: "USA" },
    // International Cities
    { value: "London, UK", label: "London, UK", country: "UK" },
    { value: "Dublin, Ireland", label: "Dublin, Ireland", country: "Ireland" },
    { value: "Manchester, UK", label: "Manchester, UK", country: "UK" },
    { value: "Birmingham, UK", label: "Birmingham, UK", country: "UK" },
    { value: "Toronto, Canada", label: "Toronto, Canada", country: "Canada" },
    { value: "Vancouver, Canada", label: "Vancouver, Canada", country: "Canada" },
    { value: "Sydney, Australia", label: "Sydney, Australia", country: "Australia" },
    { value: "Melbourne, Australia", label: "Melbourne, Australia", country: "Australia" },
  ];

  const directories = [
    { value: "all", label: "All Directories", description: "Search across all sources simultaneously" },
    { value: "yellowpages", label: "Yellow Pages", description: "Comprehensive business directory" },
    { value: "yelp", label: "Yelp", description: "Local business reviews and info" },
    { value: "bbb", label: "Better Business Bureau", description: "Verified business profiles" },
    { value: "google", label: "Google Search", description: "General business search" }
  ];

  const dataSources = [
    { value: "google-places", label: "Google Places API", description: "High-quality business data (500+ results)" },
    { value: "firecrawl", label: "Firecrawl Web Scraping", description: "Web scraping approach (limited results)" }
  ];

  // Supabase functions
  const saveLeadsToSupabase = async (leads: BusinessLead[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user, skipping Supabase save');
        return;
      }

      const leadsData = leads.map(lead => ({
        user_id: user.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        website: lead.website,
        address: lead.address,
        business_type: searchForm.businessType,
        location: searchForm.location,
        source_url: lead.source
      }));

      const { error } = await supabase
        .from('leads')
        .insert(leadsData);

      if (error) {
        console.error('Error saving leads to Supabase:', error);
        toast({
          title: "Warning",
          description: "Leads saved locally but not to cloud database. Please ensure you're logged in.",
          variant: "destructive",
        });
      } else {
        console.log('Successfully saved leads to Supabase');
      }
    } catch (error) {
      console.error('Error in saveLeadsToSupabase:', error);
    }
  };

  const saveSearchHistoryToSupabase = async (searchData: { location: string; businessType: string; resultsCount: number }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user, skipping search history save');
        return;
      }

      const { error } = await supabase
        .from('search_history')
        .insert({
          user_id: user.id,
          query: `${searchData.businessType} in ${searchData.location}`,
          location: searchData.location,
          business_type: searchData.businessType,
          results_count: searchData.resultsCount
        });

      if (error) {
        console.error('Error saving search history to Supabase:', error);
      } else {
        console.log('Successfully saved search history to Supabase');
      }
    } catch (error) {
      console.error('Error in saveSearchHistoryToSupabase:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchForm.location.trim() || !searchForm.businessType.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both location and business type fields.",
        variant: "destructive",
      });
      return;
    }

    // Check API keys based on data source
    if (searchForm.dataSource === "google-places") {
      const googleApiKey = GooglePlacesService.getApiKey();
      if (!googleApiKey) {
        toast({
          title: "Google Places API Key Required",
          description: "Please configure your Google Places API key in settings.",
          variant: "destructive",
        });
        return;
      }
    } else {
      const firecrawlApiKey = FirecrawlService.getApiKey();
      if (!firecrawlApiKey) {
        toast({
          title: "Firecrawl API Key Required",
          description: "Please configure your Firecrawl API key in settings.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    setProgress(0);
    setProgressMessage("Initializing search...");
    setResults([]);
    setSearchStats(null);

    try {
      const startTime = Date.now();
      
      // Enhanced progress tracking
      const progressUpdates = [
        { progress: 20, message: "Preparing search URLs..." },
        { progress: 40, message: "Crawling business directories..." },
        { progress: 60, message: "Extracting contact information..." },
        { progress: 80, message: "Processing leads..." },
        { progress: 95, message: "Finalizing results..." }
      ];

      let currentStep = 0;
      const progressInterval = setInterval(() => {
        if (currentStep < progressUpdates.length) {
          const update = progressUpdates[currentStep];
          setProgress(update.progress);
          setProgressMessage(update.message);
          currentStep++;
        }
      }, 1000);

      let result;
      if (searchForm.dataSource === "google-places") {
        result = await GooglePlacesService.searchBusinesses(
          searchForm.location,
          searchForm.businessType,
          500 // Request up to 500 results
        );
      } else {
        result = await FirecrawlService.searchBusinesses(
          searchForm.location,
          searchForm.businessType,
          searchForm.directory
        );
      }

      clearInterval(progressInterval);
      setProgress(100);
      setProgressMessage("Search completed!");

      if (result.success && result.data) {
        setResults(result.data);
        const endTime = Date.now();
        const searchTime = (endTime - startTime) / 1000;
        
        setSearchStats({
          totalFound: result.data.length,
          searchTime,
          creditsUsed: Math.ceil(result.data.length / 10) // Estimate
        });

        // Save leads and search history to Supabase
        await saveLeadsToSupabase(result.data);
        await saveSearchHistoryToSupabase({
          location: searchForm.location,
          businessType: searchForm.businessType,
          resultsCount: result.data.length
        });

        // Also add to local storage as backup
        StorageService.addToSearchHistory({
          location: searchForm.location,
          businessType: searchForm.businessType,
          directory: searchForm.directory,
          resultsCount: result.data.length
        });

        toast({
          title: "Search Completed",
          description: `Found ${result.data.length} business leads in ${searchTime.toFixed(1)}s`,
        });
      } else {
        toast({
          title: "Search Failed",
          description: result.error || "An error occurred during the search",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Search Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSearch = (location: string, businessType: string) => {
    setSearchForm(prev => ({ ...prev, location, businessType }));
  };

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Business Lead Generator</h1>
        <p className="text-muted-foreground">
          Find and extract contact information from local business directories
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions onQuickSearch={handleQuickSearch} />

      {/* Search Form */}
      <Card className="shadow-medium border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-primary" />
            <span>Search Parameters</span>
          </CardTitle>
          <CardDescription>
            Configure your search criteria to find relevant business leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Location</span>
              </Label>
              <div className="space-y-2">
                <Select 
                  value={searchForm.location} 
                  onValueChange={(value) => setSearchForm(prev => ({ ...prev, location: value }))}
                >
                  <SelectTrigger className="transition-all duration-200 focus:shadow-soft bg-background z-50">
                    <SelectValue placeholder="Select a major city or enter custom location" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50 max-h-60">
                    {majorCities.map((city) => (
                      <SelectItem key={city.value} value={city.value}>
                        <div className="flex justify-between items-center w-full">
                          <span>{city.label}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {city.country}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Or enter custom location (e.g., Small Town, State)"
                  value={searchForm.location}
                  onChange={(e) => setSearchForm(prev => ({ ...prev, location: e.target.value }))}
                  className="transition-all duration-200 focus:shadow-soft text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType" className="flex items-center space-x-2">
                <Building className="h-4 w-4" />
                <span>Business Type</span>
              </Label>
              <Input
                id="businessType"
                placeholder="e.g., restaurants, dental clinics, law firms"
                value={searchForm.businessType}
                onChange={(e) => setSearchForm(prev => ({ ...prev, businessType: e.target.value }))}
                className="transition-all duration-200 focus:shadow-soft"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataSource" className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>Data Source</span>
            </Label>
            <Select value={searchForm.dataSource} onValueChange={(value) => setSearchForm(prev => ({ ...prev, dataSource: value }))}>
              <SelectTrigger className="transition-all duration-200 focus:shadow-soft">
                <SelectValue placeholder="Select data source" />
              </SelectTrigger>
              <SelectContent>
                {dataSources.map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    <div>
                      <div className="font-medium">{source.label}</div>
                      <div className="text-sm text-muted-foreground">{source.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {searchForm.dataSource === "firecrawl" && (
            <div className="space-y-2">
              <Label htmlFor="directory" className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span>Directory Source</span>
              </Label>
              <Select value={searchForm.directory} onValueChange={(value) => setSearchForm(prev => ({ ...prev, directory: value }))}>
                <SelectTrigger className="transition-all duration-200 focus:shadow-soft">
                  <SelectValue placeholder="Select a directory" />
                </SelectTrigger>
                <SelectContent>
                  {directories.map((dir) => (
                    <SelectItem key={dir.value} value={dir.value}>
                      <div>
                        <div className="font-medium">{dir.label}</div>
                        <div className="text-sm text-muted-foreground">{dir.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isLoading && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{progressMessage}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="transition-all duration-500" />
              <div className="text-xs text-muted-foreground text-center">
                {searchForm.directory === 'all' 
                  ? 'Searching across multiple directories for comprehensive results'
                  : `Searching ${searchForm.directory} directory`
                }
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <EnhancedButton
              onClick={handleSearch}
              disabled={isLoading || !searchForm.location.trim() || !searchForm.businessType.trim()}
              size="lg"
              variant="gradient"
              className="min-w-[200px]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Find Business Leads
                </>
              )}
            </EnhancedButton>
          </div>

          {!GooglePlacesService.getApiKey() && searchForm.dataSource === "google-places" && (
            <div className="flex items-center space-x-2 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-warning" />
              <span className="text-sm">
                No Google Places API key configured. Please set up your API key in settings to use this feature.
              </span>
            </div>
          )}

          {!FirecrawlService.getApiKey() && searchForm.dataSource === "firecrawl" && (
            <div className="flex items-center space-x-2 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-warning" />
              <span className="text-sm">
                No Firecrawl API key configured. Please set up your API key in settings to use this feature.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Stats */}
      {searchStats && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-primary">{searchStats.totalFound}</div>
              <div className="text-sm text-muted-foreground">Leads Found</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-success">{searchStats.searchTime.toFixed(1)}s</div>
              <div className="text-sm text-muted-foreground">Search Time</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-accent">{searchStats.creditsUsed}</div>
              <div className="text-sm text-muted-foreground">Est. Credits Used</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && <ResultsTable leads={results} />}
    </div>
  );
};

export default Dashboard;