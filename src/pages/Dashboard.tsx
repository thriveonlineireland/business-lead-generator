import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { SecureSearchForm, SearchFormRef } from "@/components/search/SecureSearchForm";
import ResultsTable from "@/components/search/ResultsTable";
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
  const [loading, setLoading] = useState(false);
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
    console.log('📈 Dashboard received results:', results?.length, 'leads', results);
    
    if (!results || !Array.isArray(results)) {
      console.error('❌ Invalid results received:', results);
      toast({
        title: "Search Error",
        description: "Invalid search results received. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (results?.length > 0) {
      console.log('📋 Sample result:', results[0]);
      
      // Show success message with quality breakdown
      const qualityStats = {
        complete: results.filter(lead => lead.email && lead.phone && lead.website).length,
        partial: results.filter(lead => (lead.email || lead.phone || lead.website) && !(lead.email && lead.phone && lead.website)).length,
        minimal: results.filter(lead => !lead.email && !lead.phone && !lead.website).length
      };
      
      toast({
        title: "Search Completed Successfully! 🎉",
        description: `Found ${results.length} leads: ${qualityStats.complete} complete, ${qualityStats.partial} partial, ${qualityStats.minimal} minimal`,
        duration: 5000,
      });
    } else {
      toast({
        title: "No Results Found",
        description: "Try adjusting your search location or business type for better results.",
        variant: "destructive",
      });
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
      setLoading(true);
      
      // Determine price based on lead count
      let priceId: string;
      let priceAmount: number;
      
      if (leadCount <= 100) {
        priceId = 'price_1S6pan4NzcsVhTOXYVDJAVsc'; // €5 for up to 100 leads
        priceAmount = 5;
      } else if (leadCount <= 500) {
        priceId = 'price_1S6pan4NzcsVhTOXYVDJAVsc'; // €15 for up to 500 leads (need to create this price)
        priceAmount = 15;
      } else {
        priceId = 'price_1S6pan4NzcsVhTOXYVDJAVsc'; // €25 for up to 1000 leads (need to create this price)
        priceAmount = 25;
      }

      // Create metadata for the purchase
      const purchaseMetadata = {
        type: 'lead_purchase',
        user_id: user?.id,
        search_query: `${currentSearchParams.businessType} in ${currentSearchParams.location}`,
        location: currentSearchParams.location,
        business_type: currentSearchParams.businessType,
        lead_count: leadCount,
        search_results: JSON.stringify(searchResults)
      };

      // Call edge function to create one-time payment checkout session
      const { data, error } = await supabase.functions.invoke('create-lead-checkout', {
        body: {
          priceId,
          leadCount,
          amount: priceAmount,
          searchData: purchaseMetadata,
          successUrl: `${window.location.origin}/dashboard?payment=success&leads=purchased`,
          cancelUrl: `${window.location.origin}/dashboard?payment=cancelled`,
        },
      });

      if (error) throw error;

      if (data?.sessionUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.sessionUrl;
      } else {
        throw new Error('No checkout session URL received');
      }
    } catch (error) {
      console.error('Lead purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: "Unable to start checkout process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
                {/* Mobile Quick Actions - Redesigned */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-base">Quick Search</h3>
                  <QuickActions onQuickSearch={handleQuickSearch} />
                </div>
                
                {/* Mobile Search Form */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-base">Custom Search</h3>
                  <SecureSearchForm ref={searchFormRef} onResults={handleSearchResults} />
                </div>
                
                {searchStats && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">Search Results</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <Card className="border-0 shadow-soft bg-primary/5">
                        <CardContent className="p-4 text-center">
                          <div className="text-xl font-bold text-primary">{searchStats.totalFound}</div>
                          <div className="text-xs text-muted-foreground">Leads Found</div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-soft bg-success/5">
                        <CardContent className="p-4 text-center">
                          <div className="text-xl font-bold text-success">{searchStats.searchTime.toFixed(1)}s</div>
                          <div className="text-xs text-muted-foreground">Search Time</div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-soft bg-accent/5">
                        <CardContent className="p-4 text-center">
                          <div className="text-xl font-bold text-accent">{searchStats.creditsUsed}</div>
                          <div className="text-xs text-muted-foreground">Credits Used</div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {searchResults.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-base">Lead Results</h3>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-sm">
                          {searchResults.length} leads
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {searchResults.filter(lead => lead.email && lead.phone).length} complete
                        </Badge>
                      </div>
                    </div>
                    <ResultsTable 
                      leads={searchResults}
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
                       hiddenLeadsCount={0}
                     />
                  </div>
                ) : (
                  <Card className="border-0 shadow-soft bg-muted/20 border-dashed">
                    <CardContent className="p-8 text-center">
                      <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">Ready to Find Leads?</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Use quick actions above or create a custom search
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Auto-focus the search form
                          const searchInput = document.querySelector('input[placeholder*="location"]');
                          if (searchInput) {
                            (searchInput as HTMLInputElement).focus();
                          }
                        }}
                      >
                        Start Searching
                      </Button>
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
          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-6">
              {/* Desktop Search Section */}
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Lead Search
                  </CardTitle>
                  <CardDescription>
                    Use quick actions or create a custom search to find business leads
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Quick Search</h3>
                    <QuickActions onQuickSearch={handleQuickSearch} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Custom Search</h3>
                    <SecureSearchForm ref={searchFormRef} onResults={handleSearchResults} />
                  </div>
                </CardContent>
              </Card>

              {/* Desktop Results Section */}
              {searchResults.length > 0 && (
                <Card className="border-0 shadow-soft">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Search Results
                      </CardTitle>
                      <Badge variant="secondary" className="text-sm">
                        {searchResults.length} leads found
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResultsTable 
                      leads={searchResults}
                    />
                  </CardContent>
                </Card>
              )}

              {searchResults.length === 0 && (
                <Card className="border-0 shadow-soft bg-muted/20 border-dashed">
                  <CardContent className="p-12 text-center">
                    <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-medium mb-3">Ready to Find Business Leads?</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Start with a quick search or create a custom search to find leads in your target market
                    </p>
                    <Button 
                      onClick={() => {
                        const searchInput = document.querySelector('input[placeholder*="location"]');
                        if (searchInput) {
                          (searchInput as HTMLInputElement).focus();
                        }
                      }}
                    >
                      Start Searching
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div className="space-y-6">
              {searchStats && (
                <Card className="border-0 shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Search Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Leads Found</span>
                          <span className="text-2xl font-bold text-primary">{searchStats.totalFound}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-success/5 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Search Time</span>
                          <span className="text-lg font-semibold text-success">{searchStats.searchTime.toFixed(1)}s</span>
                        </div>
                      </div>
                      <div className="p-3 bg-accent/5 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Credits Used</span>
                          <span className="text-lg font-semibold text-accent">{searchStats.creditsUsed}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-lg">Search Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-2">
                    <p className="text-muted-foreground">
                      💡 <strong>Be specific:</strong> Use exact locations and business types for better results
                    </p>
                    <p className="text-muted-foreground">
                      🎯 <strong>Quick actions:</strong> Try the preset searches for common industries
                    </p>
                    <p className="text-muted-foreground">
                      📊 <strong>Export leads:</strong> Save your results for follow-up campaigns
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Dialogs */}
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
             hiddenLeadsCount={0}
           />
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