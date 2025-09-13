import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { SecureSearchForm, SearchFormRef } from "@/components/search/SecureSearchForm";
import FreemiumResultsTable from "@/components/search/FreemiumResultsTable";
import { BusinessLead } from "@/utils/FirecrawlService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, BarChart3 } from "lucide-react";
import QuickActions from "@/components/search/QuickActions";
import { ExpandSearchDialog } from "@/components/search/ExpandSearchDialog";
import UpgradeModal from "@/components/pricing/UpgradeModal";
import { useToast } from "@/hooks/use-toast";
import LeadManagement from "@/components/crm/LeadManagement";
import PipelineView from "@/components/crm/PipelineView";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchResults, setSearchResults] = useState<BusinessLead[]>([]);
  const [searchStats, setSearchStats] = useState<{
    totalFound: number;
    searchTime: number;
    creditsUsed: number;
  } | null>(null);
  const [showExpandDialog, setShowExpandDialog] = useState(false);
  const [currentSearchParams, setCurrentSearchParams] = useState<{location: string, businessType: string} | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const searchFormRef = useRef<SearchFormRef>(null);

  // Redirect unauthenticated users to auth page
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  const handleSearchResults = (results: BusinessLead[], location?: string, businessType?: string, canExpandSearch?: boolean) => {
    console.log('📈 Dashboard received results:', results?.length, 'leads');
    if (results?.length > 0) {
      console.log('📋 Sample result:', results[0]);
    }
    setSearchResults(results);
    setCurrentSearchParams(location && businessType ? { location, businessType } : null);
    
    const searchTime = 1.5; // Estimate since we don't track this in SecureSearchForm
    setSearchStats({
      totalFound: results.length,
      searchTime,
      creditsUsed: Math.ceil(results.length / 10) // Estimate
    });
    
    // Show expand dialog if we can get more results
    if (canExpandSearch && results.length >= 400) {
      setShowExpandDialog(true);
    }
    
    console.log('✅ Dashboard state updated with', results.length, 'results');

    // Start background enrichment process (non-blocking)
    if (results.length > 0) {
      enrichLeadsInBackground(results);
    }
  };

  const enrichLeadsInBackground = async (leads: BusinessLead[]) => {
    // Only enrich leads that have websites but are missing contact info
    const leadsToEnrich = leads.filter(lead => 
      lead.website && (!lead.email || !lead.phone)
    );

    if (leadsToEnrich.length === 0) {
      console.log('🔍 No leads need enrichment');
      return;
    }

    // Limit enrichment to prevent timeouts
    const maxLeadsToEnrich = Math.min(leadsToEnrich.length, 5);
    const limitedLeads = leadsToEnrich.slice(0, maxLeadsToEnrich);

    console.log(`🔄 Starting background enrichment for ${maxLeadsToEnrich} leads (limited to prevent timeouts)...`);
    
    try {
      // Process leads one by one with timeout protection
      const enrichedLeads: BusinessLead[] = [];
      
      for (const lead of limitedLeads) {
        try {
          // Set a strict timeout for each lead
          const timeoutPromise = new Promise<BusinessLead>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          );
          
          const { FreeLeadEnrichmentService } = await import('@/utils/FreeLeadEnrichmentService');
          const enrichmentPromise = FreeLeadEnrichmentService.enrichLeads([lead], 1);
          
          const result = await Promise.race([enrichmentPromise, timeoutPromise]);
          if (result && Array.isArray(result) && result.length > 0) {
            enrichedLeads.push(result[0]);
          }
        } catch (error) {
          console.warn(`⚠️ Enrichment failed for ${lead.name}:`, error.message);
          // Continue with next lead
        }
      }
      
      if (enrichedLeads.length > 0) {
        const { FreeLeadEnrichmentService } = await import('@/utils/FreeLeadEnrichmentService');
        
        // Update only the leads that were actually improved
        setSearchResults(currentResults => {
          return currentResults.map(lead => {
            const enrichedLead = enrichedLeads.find(e => e.name === lead.name && e.website === lead.website);
            return enrichedLead && FreeLeadEnrichmentService.hasImprovedData(lead, enrichedLead) 
              ? enrichedLead 
              : lead;
          });
        });

        const improvedCount = enrichedLeads.filter(enriched => {
          const original = leads.find(l => l.name === enriched.name && l.website === enriched.website);
          return original && FreeLeadEnrichmentService.hasImprovedData(original, enriched);
        }).length;

        if (improvedCount > 0) {
          console.log(`✅ Enhanced ${improvedCount} leads with additional contact information`);
          toast({
            title: "Leads Enhanced",
            description: `Found additional contact information for ${improvedCount} leads`,
            duration: 3000,
          });
        }
      }

      // Show info about remaining leads
      if (leadsToEnrich.length > maxLeadsToEnrich) {
        toast({
          title: "Partial Enhancement",
          description: `Enhanced ${maxLeadsToEnrich} of ${leadsToEnrich.length} leads to prevent timeouts. Search again to enhance more.`,
          duration: 5000,
        });
      }
      
    } catch (error) {
      console.error('❌ Background enrichment failed:', error);
      // Don't show error toast for background process
    }
  };

  const handleQuickSearch = (location: string, businessType: string) => {
    // Trigger search by calling the SecureSearchForm's method
    if (searchFormRef.current) {
      searchFormRef.current.triggerSearch(location, businessType);
    }
  };

  const handleExpandSearch = async () => {
    setShowExpandDialog(false);
    if (currentSearchParams && searchFormRef.current) {
      // Show loading toast
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Expanding Search Area",
        description: "Searching wider area for more leads...",
      });
      
      // Trigger a new search with expanded parameters
      searchFormRef.current.triggerSearch(
        currentSearchParams.location, 
        currentSearchParams.businessType
      );
    }
  };

  const handleUpgrade = async (leadCount: number) => {
    console.log('User wants to purchase leads:', leadCount);
    
    if (!searchResults || searchResults.length === 0 || !currentSearchParams) {
      toast({
        title: "No search results",
        description: "Please perform a search first before upgrading.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save the search as premium with lead data
      const lastSearchQuery = `${currentSearchParams.businessType} in ${currentSearchParams.location}`;
      
      const { error } = await supabase.from('search_history').insert({
        user_id: user?.id,
        query: lastSearchQuery,
        location: currentSearchParams.location,
        business_type: currentSearchParams.businessType,
        results_count: searchResults.length,
        is_premium: true,
        leads: JSON.parse(JSON.stringify(searchResults)) // Convert to JSON-compatible format
      });

      if (error) throw error;

      toast({
        title: "Premium Access Granted! 🎉",
        description: `Full access to all ${searchResults.length} leads has been saved to your history.`,
        duration: 5000,
      });
      
      setShowUpgradeModal(false);
    } catch (error) {
      console.error('Error saving premium search:', error);
      toast({
        title: "Error",
        description: "Failed to save premium search. Please try again.",
        variant: "destructive",
      });
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

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  if (isMobile) {
    // Mobile Layout - Stack everything vertically with thumb-friendly design
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <div className="sticky top-0 bg-background/80 backdrop-blur border-b border-border/50 z-10">
          <div className="p-4">
            <h1 className="text-xl font-bold">Lead Dashboard</h1>
            <p className="text-sm text-muted-foreground">Find & manage leads</p>
          </div>
          
          {/* Mobile Tab Pills */}
          <div className="px-4 pb-4">
            <Tabs defaultValue="search" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50">
                <TabsTrigger value="search" className="gap-2 text-sm font-medium">
                  <Search className="h-4 w-4" />
                  Search
                </TabsTrigger>
                <TabsTrigger value="manage" className="gap-2 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  CRM
                </TabsTrigger>
                <TabsTrigger value="pipeline" className="gap-2 text-sm font-medium">
                  <BarChart3 className="h-4 w-4" />
                  Pipeline
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="search" className="space-y-6 mt-6">
                <QuickActions onQuickSearch={handleQuickSearch} />
                <SecureSearchForm ref={searchFormRef} onResults={handleSearchResults} />
                
                {searchStats && (
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="border-0 shadow-soft">
                      <CardContent className="p-4 text-center">
                        <div className="text-xl font-bold text-primary">{searchStats.totalFound}</div>
                        <div className="text-xs text-muted-foreground">Leads</div>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-soft">
                      <CardContent className="p-4 text-center">
                        <div className="text-xl font-bold text-success">{searchStats.searchTime.toFixed(1)}s</div>
                        <div className="text-xs text-muted-foreground">Time</div>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-soft">
                      <CardContent className="p-4 text-center">
                        <div className="text-xl font-bold text-accent">{searchStats.creditsUsed}</div>
                        <div className="text-xs text-muted-foreground">Credits</div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {searchResults.length > 0 ? (
                  <div className="space-y-4">
                    <FreemiumResultsTable 
                      leads={searchResults} 
                      onUpgrade={() => setShowUpgradeModal(true)}
                    />
                    <ExpandSearchDialog
                      open={showExpandDialog}
                      onOpenChange={setShowExpandDialog}
                      onExpandSearch={handleExpandSearch}
                      currentCount={searchResults.length}
                      location={currentSearchParams?.location || ''}
                      businessType={currentSearchParams?.businessType || ''}
                    />
                    <UpgradeModal
                      isOpen={showUpgradeModal}
                      onClose={() => setShowUpgradeModal(false)}
                      onPurchase={handleUpgrade}
        hiddenLeadsCount={Math.max(0, searchResults.length - Math.max(5, Math.min(25, Math.floor(searchResults.length * 0.1))))}
                    />
                  </div>
                ) : (
                  <Card className="border-0 shadow-soft">
                    <CardContent className="p-8 text-center">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">Start Your Search</h3>
                      <p className="text-muted-foreground text-sm">
                        Tap a quick action above or use the search form
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="manage" className="mt-6">
                <LeadManagement />
              </TabsContent>

              <TabsContent value="pipeline" className="mt-6">
                <PipelineView />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Layout - Side-by-side panels with more complex UI
  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Business Lead Dashboard</h1>
          <p className="text-muted-foreground">
            Search and manage your business leads with our secure platform
          </p>
        </div>
        {searchStats && (
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{searchStats.totalFound}</div>
              <div className="text-sm text-muted-foreground">Total Leads</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{searchStats.searchTime.toFixed(1)}s</div>
              <div className="text-sm text-muted-foreground">Search Time</div>
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="search" className="space-y-6">
        <TabsList className="inline-flex h-12 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
          <TabsTrigger value="search" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2 text-sm font-medium transition-all">
            <Search className="mr-2 h-4 w-4" />
            Lead Search
          </TabsTrigger>
          <TabsTrigger value="manage" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2 text-sm font-medium transition-all">
            <Users className="mr-2 h-4 w-4" />
            Lead Management
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2 text-sm font-medium transition-all">
            <BarChart3 className="mr-2 h-4 w-4" />
            Sales Pipeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <QuickActions onQuickSearch={handleQuickSearch} />
              <SecureSearchForm ref={searchFormRef} onResults={handleSearchResults} />
            </div>
            
            <div className="space-y-6">
              {searchStats && (
                <Card className="border-0 shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-lg">Search Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Leads Found</span>
                      <span className="text-2xl font-bold text-primary">{searchStats.totalFound}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Search Time</span>
                      <span className="text-lg font-semibold text-success">{searchStats.searchTime.toFixed(1)}s</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Credits Used</span>
                      <span className="text-lg font-semibold text-accent">{searchStats.creditsUsed}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg">Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>• Use specific business types for better results</p>
                  <p>• Try nearby cities to expand your search</p>
                  <p>• Export leads to CSV for external tools</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {searchResults.length > 0 ? (
            <div className="space-y-6">
              <FreemiumResultsTable 
                leads={searchResults} 
                onUpgrade={() => setShowUpgradeModal(true)}
              />
              <ExpandSearchDialog
                open={showExpandDialog}
                onOpenChange={setShowExpandDialog}
                onExpandSearch={handleExpandSearch}
                currentCount={searchResults.length}
                location={currentSearchParams?.location || ''}
                businessType={currentSearchParams?.businessType || ''}
              />
              <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                onPurchase={handleUpgrade}
                hiddenLeadsCount={Math.max(0, searchResults.length - Math.max(5, Math.min(25, Math.floor(searchResults.length * 0.1))))}
              />
            </div>
          ) : (
            <Card className="border-0 shadow-soft">
              <CardContent className="p-12 text-center">
                <div className="space-y-4">
                  <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center">
                    <Search className="h-10 w-10 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium mb-2">Ready to Find Business Leads</h3>
                    <p className="text-muted-foreground">
                      Use the search form or try one of the quick actions to get started with your lead generation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manage">
          <LeadManagement />
        </TabsContent>

        <TabsContent value="pipeline">
          <PipelineView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;