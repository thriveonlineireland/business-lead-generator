import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SecureSearchForm, SearchFormRef } from "@/components/search/SecureSearchForm";
import ResultsTable from "@/components/search/ResultsTable";
import { BusinessLead } from "@/utils/FirecrawlService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import QuickActions from "@/components/search/QuickActions";

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState<BusinessLead[]>([]);
  const [searchStats, setSearchStats] = useState<{
    totalFound: number;
    searchTime: number;
    creditsUsed: number;
  } | null>(null);
  const searchFormRef = useRef<SearchFormRef>(null);

  // Remove auth requirement - allow both authenticated and guest users

  const handleSearchResults = (results: BusinessLead[]) => {
    setSearchResults(results);
    
    const searchTime = 1.5; // Estimate since we don't track this in SecureSearchForm
    setSearchStats({
      totalFound: results.length,
      searchTime,
      creditsUsed: Math.ceil(results.length / 10) // Estimate
    });
  };

  const handleQuickSearch = (location: string, businessType: string) => {
    // Trigger search by calling the SecureSearchForm's method
    if (searchFormRef.current) {
      searchFormRef.current.triggerSearch(location, businessType);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard now works for both authenticated and guest users

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Business Lead Dashboard</h1>
        <p className="text-muted-foreground">
          {user ? 'Search and manage your business leads with our secure platform' : 'Try our lead search - sign in to save your results'}
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions onQuickSearch={handleQuickSearch} />

      <SecureSearchForm 
        ref={searchFormRef}
        onResults={handleSearchResults} 
      />

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

      {searchResults.length > 0 && (
        <ResultsTable leads={searchResults} />
      )}
    </div>
  );
};

export default Dashboard;