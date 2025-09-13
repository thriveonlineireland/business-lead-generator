import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StorageService, SearchHistory, SavedSearch } from "@/utils/StorageService";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { History, Save, Search, Trash2, Download, Calendar, MapPin, Building, AlertCircle, Eye, Crown } from "lucide-react";
import { ExportService } from "@/utils/ExportService";
import { BusinessLead } from "@/utils/FirecrawlService";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FreemiumResultsTable from "@/components/search/FreemiumResultsTable";

const SearchHistoryPage = () => {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [supabaseLeads, setSupabaseLeads] = useState<any[]>([]);
  const [supabaseSearchHistory, setSupabaseSearchHistory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingResults, setViewingResults] = useState<{
    leads: BusinessLead[];
    searchInfo: any;
  } | null>(null);

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, user]);

  const loadData = async () => {
    // Always load local storage data as backup
    setSearchHistory(StorageService.getSearchHistory());
    setSavedSearches(StorageService.getSavedSearches());

    // Load Supabase data if authenticated
    if (user) {
      await loadSupabaseData();
    }
  };

  const loadSupabaseData = async () => {
    try {
      // Load leads from Supabase
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadsError) {
        console.error('Error loading leads:', leadsError);
      } else {
        setSupabaseLeads(leads || []);
      }

      // Load search history from Supabase
      const { data: searchHistory, error: historyError } = await supabase
        .from('search_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (historyError) {
        console.error('Error loading search history:', historyError);
      } else {
        setSupabaseSearchHistory(searchHistory || []);
      }
    } catch (error) {
      console.error('Error in loadSupabaseData:', error);
    }
  };

  const loadLocalData = () => {
    setSearchHistory(StorageService.getSearchHistory());
    setSavedSearches(StorageService.getSavedSearches());
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all search history?")) {
      StorageService.clearSearchHistory();
      setSearchHistory([]);
      toast({
        title: "History Cleared",
        description: "All search history has been deleted",
      });
    }
  };

  const deleteSavedSearch = (id: string) => {
    if (confirm("Are you sure you want to delete this saved search?")) {
      StorageService.deleteSavedSearch(id);
      setSavedSearches(prev => prev.filter(search => search.id !== id));
      toast({
        title: "Search Deleted",
        description: "Saved search has been removed",
      });
    }
  };

  const exportSavedSearch = (savedSearch: SavedSearch) => {
    ExportService.exportToCSV(savedSearch.leads, `${savedSearch.name}-leads.csv`);
    toast({
      title: "Export Successful",
      description: `Exported ${savedSearch.leads.length} leads from "${savedSearch.name}"`,
    });
  };

  const viewPremiumResults = (searchItem: any) => {
    if (!searchItem.leads || !searchItem.is_premium) {
      toast({
        title: "No premium data available",
        description: "This search doesn't have saved lead data.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Parse leads from JSON if needed
      const leads = Array.isArray(searchItem.leads) ? searchItem.leads : JSON.parse(searchItem.leads);
      setViewingResults({
        leads: leads as BusinessLead[],
        searchInfo: searchItem
      });
    } catch (error) {
      toast({
        title: "Error loading results",
        description: "Failed to load premium search results.",
        variant: "destructive",
      });
    }
  };

  const filteredHistory = searchHistory.filter(
    item =>
      item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.businessType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.directory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSaved = savedSearches.filter(
    item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.businessType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getDirectoryBadgeColor = (directory: string) => {
    const colors: { [key: string]: string } = {
      yellowpages: "bg-yellow-100 text-yellow-800",
      yelp: "bg-red-100 text-red-800",
      bbb: "bg-blue-100 text-blue-800",
      google: "bg-green-100 text-green-800"
    };
    return colors[directory] || "bg-gray-100 text-gray-800";
  };

  if (isMobile) {
    return (
      <div className="bg-background overflow-y-auto">
        {/* Mobile Header */}
        <div className="sticky top-0 bg-background/80 backdrop-blur border-b border-border/50 z-10 p-4">
          <h1 className="text-xl font-bold">Search History</h1>
          <p className="text-sm text-muted-foreground">View past searches</p>
          
          <div className="mt-4">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {!user && !authLoading && (
            <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center space-x-2 text-sm">
                <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" />
                <span>Sign in to access cloud history</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          <Tabs defaultValue={user ? "leads" : "history"} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 mb-6">
              {user && (
                <TabsTrigger value="leads" className="text-sm">
                  <Eye className="h-4 w-4 mr-2" />
                  My Leads
                </TabsTrigger>
              )}
              <TabsTrigger value="history" className="text-sm">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            {user && (
              <TabsContent value="leads" className="space-y-4">
                {supabaseLeads.length > 0 ? (
                  <div className="space-y-3">
                    {supabaseLeads.map((lead) => (
                      <Card key={lead.id} className="border-0 shadow-soft">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <h3 className="font-semibold">{lead.name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {lead.business_type}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              {lead.email && (
                                <div className="flex items-center space-x-2">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate">{lead.email}</span>
                                </div>
                              )}
                              {lead.phone && (
                                <div className="flex items-center space-x-2">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <span>{lead.phone}</span>
                                </div>
                              )}
                              {lead.location && (
                                <div className="flex items-center space-x-2">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate">{lead.location}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex justify-between items-center pt-2 border-t border-border/50">
                              <span className="text-xs text-muted-foreground">
                                {new Date(lead.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Eye className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">No leads found</h3>
                    <p className="text-sm text-muted-foreground">
                      Start searching to see your leads here
                    </p>
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="history" className="space-y-4">
              {filteredHistory.length > 0 ? (
                <div className="space-y-3">
                  {filteredHistory.map((item, index) => (
                    <Card key={index} className="border-0 shadow-soft">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold text-sm">{item.businessType}</h3>
                            <Badge variant="outline" className="text-xs">
                              {item.resultsCount} results
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{item.location}</span>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t border-border/50">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(item.timestamp)}
                            </span>
                            <Badge className={getDirectoryBadgeColor(item.directory)} variant="secondary">
                              {item.directory}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No search history</h3>
                  <p className="text-sm text-muted-foreground">
                    Your searches will appear here
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-0 bg-background overflow-y-auto">
      {/* Desktop Header */}
      <div className="container mx-auto p-8 space-y-8 animate-fade-in max-w-7xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
          <h1 className="text-4xl font-bold">Search History & Saved Searches</h1>
            <p className="text-xl text-muted-foreground">
              View your past searches and manage saved lead collections
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 w-80 h-12"
              />
            </div>
          </div>
        </div>

      {/* Authentication Notice */}
      {!user && !authLoading && (
        <Card className="border-warning bg-warning/10">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-warning" />
              <span className="text-base font-medium">
                You're not logged in. Only local search history is shown. Sign in to access your cloud-saved leads and search history.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={user ? "leads" : "history"} className="w-full">
        <TabsList className="inline-flex h-12 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
          {user && (
            <TabsTrigger value="leads" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-3 text-sm font-medium transition-all">
              <Eye className="mr-2 h-4 w-4" />
              My Leads
            </TabsTrigger>
          )}
          {user && (
            <TabsTrigger value="supabase-history" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-3 text-sm font-medium transition-all">
              <History className="mr-2 h-4 w-4" />
              Cloud History
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-3 text-sm font-medium transition-all">
            <History className="mr-2 h-4 w-4" />
            Local History
          </TabsTrigger>
          <TabsTrigger value="saved" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-3 text-sm font-medium transition-all">
            <Save className="mr-2 h-4 w-4" />
            Saved Searches
          </TabsTrigger>
        </TabsList>

        {/* My Leads Tab */}
        {user && (
          <TabsContent value="leads" className="space-y-6">
            <Card className="shadow-medium border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <span>My Leads</span>
                  <Badge variant="secondary">{supabaseLeads.length}</Badge>
                </CardTitle>
                <CardDescription>
                  All your business leads saved to the cloud database
                </CardDescription>
              </CardHeader>
              <CardContent>
                {supabaseLeads.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Business Name</TableHead>
                          <TableHead className="font-semibold">Contact Info</TableHead>
                          <TableHead className="font-semibold">Location</TableHead>
                          <TableHead className="font-semibold">Date Added</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supabaseLeads.map((lead) => (
                          <TableRow key={lead.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{lead.name}</div>
                                <div className="text-sm text-muted-foreground">{lead.business_type}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                {lead.email && <div>📧 {lead.email}</div>}
                                {lead.phone && <div>📞 {lead.phone}</div>}
                                {lead.website && <div>🌐 {lead.website}</div>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2 text-sm">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span>{lead.location}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2 text-sm">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Eye className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No leads found</h3>
                    <p className="text-muted-foreground">
                      Start searching for businesses to see your leads here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Cloud Search History Tab */}
        {user && (
          <TabsContent value="supabase-history" className="space-y-6">
            <Card className="shadow-medium border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <History className="h-5 w-5 text-primary" />
                  <span>Cloud Search History</span>
                  <Badge variant="secondary">{supabaseSearchHistory.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Your search history saved to the cloud database
                </CardDescription>
              </CardHeader>
              <CardContent>
                {supabaseSearchHistory.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                       <TableHeader>
                         <TableRow className="bg-muted/50">
                           <TableHead className="font-semibold">Search Query</TableHead>
                           <TableHead className="font-semibold">Results</TableHead>
                           <TableHead className="font-semibold">Date</TableHead>
                           <TableHead className="font-semibold">Actions</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {supabaseSearchHistory.map((item) => (
                           <TableRow key={item.id} className="hover:bg-muted/50">
                             <TableCell>
                               <div className="space-y-1">
                                 <div className="flex items-center space-x-2">
                                   <span className="font-medium">{item.query}</span>
                                   {item.is_premium && (
                                     <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 flex items-center space-x-1">
                                       <Crown className="h-3 w-3" />
                                       <span>Premium</span>
                                     </Badge>
                                   )}
                                 </div>
                                 <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                   <MapPin className="h-3 w-3" />
                                   <span>{item.location}</span>
                                 </div>
                               </div>
                             </TableCell>
                             <TableCell>
                               <span className="font-medium">{item.results_count}</span>
                               <span className="text-muted-foreground"> leads</span>
                             </TableCell>
                             <TableCell>
                               <div className="flex items-center space-x-2 text-sm">
                                 <Calendar className="h-3 w-3 text-muted-foreground" />
                                 <span>{new Date(item.created_at).toLocaleDateString()}</span>
                               </div>
                             </TableCell>
                             <TableCell>
                               {item.is_premium && item.leads ? (
                                 <EnhancedButton
                                   variant="outline"
                                   size="sm"
                                   onClick={() => viewPremiumResults(item)}
                                   className="flex items-center space-x-2"
                                 >
                                   <Eye className="h-4 w-4" />
                                   <span>View Results</span>
                                 </EnhancedButton>
                               ) : (
                                 <span className="text-xs text-muted-foreground">No saved data</span>
                               )}
                             </TableCell>
                           </TableRow>
                         ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No cloud search history</h3>
                    <p className="text-muted-foreground">
                      Your search history will appear here when you're logged in
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="history" className="space-y-6">
          <Card className="shadow-medium border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <History className="h-5 w-5 text-primary" />
                    <span>Recent Searches</span>
                    <Badge variant="secondary">{filteredHistory.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Your search history from the past 30 days
                  </CardDescription>
                </div>
                {searchHistory.length > 0 && (
                  <EnhancedButton
                    variant="outline"
                    size="sm"
                    onClick={clearHistory}
                    className="flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Clear History</span>
                  </EnhancedButton>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredHistory.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Search Details</TableHead>
                        <TableHead className="font-semibold">Directory</TableHead>
                        <TableHead className="font-semibold">Results</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{item.businessType}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{item.location}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getDirectoryBadgeColor(item.directory)}>
                              {item.directory}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{item.resultsCount}</span>
                            <span className="text-muted-foreground"> leads</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span>{formatDate(item.timestamp)}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No search history</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? "No matches found for your search" : "Start searching to see your history here"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saved" className="space-y-6">
          <Card className="shadow-medium border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Save className="h-5 w-5 text-primary" />
                <span>Saved Searches</span>
                <Badge variant="secondary">{filteredSaved.length}</Badge>
              </CardTitle>
              <CardDescription>
                Your saved lead collections with export options
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredSaved.length > 0 ? (
                <div className="space-y-4">
                  {filteredSaved.map((savedSearch) => (
                    <Card key={savedSearch.id} className="border shadow-soft">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <h3 className="font-semibold text-lg">{savedSearch.name}</h3>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-2">
                                <Building className="h-3 w-3" />
                                <span>{savedSearch.businessType}</span>
                                <span>•</span>
                                <MapPin className="h-3 w-3" />
                                <span>{savedSearch.location}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-3 w-3" />
                                <span>Created {formatDate(savedSearch.createdAt)}</span>
                                {savedSearch.updatedAt.getTime() !== savedSearch.createdAt.getTime() && (
                                  <>
                                    <span>•</span>
                                    <span>Updated {formatDate(savedSearch.updatedAt)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline">
                              {savedSearch.leads.length} leads
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-2">
                            <EnhancedButton
                              variant="success"
                              size="sm"
                              onClick={() => exportSavedSearch(savedSearch)}
                              className="flex items-center space-x-2"
                            >
                              <Download className="h-4 w-4" />
                              <span>Export</span>
                            </EnhancedButton>
                            
                            <EnhancedButton
                              variant="outline"
                              size="sm"
                              onClick={() => deleteSavedSearch(savedSearch.id)}
                              className="flex items-center space-x-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Delete</span>
                            </EnhancedButton>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Save className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No saved searches</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? "No matches found for your search" : "Save your search results to access them later"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Premium Results Dialog */}
      <Dialog open={!!viewingResults} onOpenChange={() => setViewingResults(null)}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              <span>Premium Search Results</span>
            </DialogTitle>
            <DialogDescription>
              {viewingResults && (
                <>Search: {viewingResults.searchInfo.query} - {viewingResults.leads.length} leads found</>
              )}
            </DialogDescription>
          </DialogHeader>
          {viewingResults && (
            <div className="overflow-auto">
              <FreemiumResultsTable 
                leads={viewingResults.leads} 
                onUpgrade={() => {}} 
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default SearchHistoryPage;