import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StorageService, SearchHistory, SavedSearch } from "@/utils/StorageService";
import { useToast } from "@/hooks/use-toast";
import { History, Save, Search, Trash2, Download, Calendar, MapPin, Building } from "lucide-react";
import { ExportService } from "@/utils/ExportService";

const SearchHistoryPage = () => {
  const { toast } = useToast();
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
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

  return (
    <div className="container mx-auto p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Search History & Saved Searches</h1>
          <p className="text-muted-foreground">
            View your past searches and manage saved lead collections
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>Search History</span>
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>Saved Searches</span>
          </TabsTrigger>
        </TabsList>

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
    </div>
  );
};

export default SearchHistoryPage;