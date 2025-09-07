import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SecureSearchForm, SearchFormRef } from "@/components/search/SecureSearchForm";
import FreemiumResultsTable from "@/components/search/FreemiumResultsTable";
import { BusinessLead } from "@/utils/FirecrawlService";
import { Card, CardContent } from "@/components/ui/card";
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

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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

  const handleUpgrade = (leadCount: number) => {
    console.log('User wants to purchase leads:', leadCount);
    // TODO: Implement Stripe checkout for pay-per-leads
    toast({
      title: "Payment Coming Soon!",
      description: `Payment for ${leadCount} leads (€${Math.ceil(leadCount / 100) * 10}) will be available soon.`,
      duration: 4000,
    });
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

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Business Lead Dashboard</h1>
        <p className="text-muted-foreground">
          Search and manage your business leads with our secure platform
        </p>
      </div>

      <Tabs defaultValue="search" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            Search Leads
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-2">
            <Users className="h-4 w-4" />
            Manage Leads
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Sales Pipeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-8">

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

      {searchResults.length > 0 ? (
        <>
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
            hiddenLeadsCount={Math.max(0, searchResults.length - Math.max(5, Math.min(50, Math.floor(searchResults.length * 0.1))))}
          />
        </>
      ) : (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Ready to Find Business Leads</h3>
                  <p className="text-muted-foreground">
                    Use the search form above or try one of the quick actions to get started.
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