import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BusinessLead } from "@/utils/FirecrawlService";
import { LeadQualityService } from "@/utils/LeadQualityService";
import { ExportService } from "@/utils/ExportService";
import { useToast } from "@/hooks/use-toast";
import { Download, Save, Search, ExternalLink, Mail, Phone, Globe, Building, MapPin, Instagram, Star, Award, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Info, Crown, Target } from "lucide-react";

interface QualityGroupedResultsProps {
  leads: BusinessLead[];
  searchLocation: string;
  searchBusinessType: string;
}

const QualityGroupedResults = ({ leads, searchLocation, searchBusinessType }: QualityGroupedResultsProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("excellent");

  // Group leads by quality
  const groupedLeads = useMemo(() => {
    return LeadQualityService.groupLeadsByQuality(leads, searchLocation);
  }, [leads, searchLocation]);

  // Get quality statistics
  const qualityStats = useMemo(() => {
    return LeadQualityService.getQualityStats(leads, searchLocation);
  }, [leads, searchLocation]);

  // Filter leads based on search term
  const getFilteredLeads = (category: 'excellent' | 'okay' | 'poor') => {
    const categoryLeads = groupedLeads[category];
    if (!searchTerm) return categoryLeads;
    
    return categoryLeads.filter(({ lead }) =>
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm) ||
      lead.address?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSelectAll = (category: 'excellent' | 'okay' | 'poor') => {
    const categoryLeads = getFilteredLeads(category);
    const categoryIds = categoryLeads.map(({ lead }, index) => `${category}-${index}`);
    const newSelected = new Set(selectedLeads);
    
    const allSelected = categoryIds.every(id => newSelected.has(id));
    
    if (allSelected) {
      categoryIds.forEach(id => newSelected.delete(id));
    } else {
      categoryIds.forEach(id => newSelected.add(id));
    }
    
    setSelectedLeads(newSelected);
  };

  const getSelectedLeadsData = () => {
    const allLeads = [
      ...groupedLeads.excellent.map(({ lead }, index) => ({ lead, id: `excellent-${index}` })),
      ...groupedLeads.okay.map(({ lead }, index) => ({ lead, id: `okay-${index}` })),
      ...groupedLeads.poor.map(({ lead }, index) => ({ lead, id: `poor-${index}` }))
    ];
    
    return selectedLeads.size > 0
      ? allLeads.filter(({ id }) => selectedLeads.has(id)).map(({ lead }) => lead)
      : leads;
  };

  const handleExportCSV = () => {
    const selectedData = getSelectedLeadsData();
    ExportService.exportToCSV(selectedData, `${searchBusinessType}-${searchLocation}-leads.csv`);
    toast({
      title: "Export Successful",
      description: `Exported ${selectedData.length} leads to CSV`,
    });
  };

  const openWebsite = (url: string) => {
    if (url && !url.startsWith('http')) {
      url = 'https://' + url;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const getCategoryIcon = (category: 'excellent' | 'okay' | 'poor') => {
    switch (category) {
      case 'excellent':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'okay':
        return <Star className="h-4 w-4 text-blue-500" />;
      case 'poor':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: 'excellent' | 'okay' | 'poor') => {
    switch (category) {
      case 'excellent':
        return 'border-l-yellow-500 bg-yellow-50/50';
      case 'okay':
        return 'border-l-blue-500 bg-blue-50/50';
      case 'poor':
        return 'border-l-gray-500 bg-gray-50/50';
    }
  };

  const renderLeadTable = (category: 'excellent' | 'okay' | 'poor') => {
    const filteredLeads = getFilteredLeads(category);
    
    if (filteredLeads.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            {getCategoryIcon(category)}
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            No {category} leads found
          </h3>
          <p className="text-muted-foreground">
            {searchTerm ? "Try adjusting your search terms" : `No leads in the ${category} category`}
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={filteredLeads.length > 0 && filteredLeads.every((_, index) => 
                    selectedLeads.has(`${category}-${index}`)
                  )}
                  onChange={() => handleSelectAll(category)}
                  className="rounded border-gray-300"
                />
              </TableHead>
              <TableHead className="font-semibold">Business Name</TableHead>
              <TableHead className="font-semibold">Quality Score</TableHead>
              <TableHead className="font-semibold">Contact Info</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map(({ lead, quality }, index) => (
              <TableRow
                key={index}
                className={`transition-colors hover:bg-muted/50 border-l-4 ${getCategoryColor(category)} ${
                  selectedLeads.has(`${category}-${index}`) ? 'bg-primary/5' : ''
                }`}
                onClick={() => handleSelectLead(`${category}-${index}`)}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedLeads.has(`${category}-${index}`)}
                    onChange={() => handleSelectLead(`${category}-${index}`)}
                    className="rounded border-gray-300"
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{lead.name}</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="secondary" className="text-xs">
                            {quality.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="max-w-xs">
                            <p className="font-medium mb-2">Quality Breakdown:</p>
                            <ul className="text-xs space-y-1">
                              {quality.reasons.map((reason, idx) => (
                                <li key={idx}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {lead.category && (
                      <Badge variant="outline" className="text-xs">
                        {lead.category}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-lg">{quality.score}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <div>Contact: {quality.contactCompleteness}%</div>
                      <div>Location: {quality.locationRelevance}%</div>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-2">
                    {lead.email ? (
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail className="h-3 w-3 text-green-500" />
                        <a
                          href={`mailto:${lead.email}`}
                          className="text-primary hover:underline truncate max-w-[150px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {lead.email}
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3 text-red-400" />
                        <span>No email</span>
                      </div>
                    )}
                    
                    {lead.phone ? (
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-3 w-3 text-green-500" />
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {formatPhone(lead.phone)}
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3 text-red-400" />
                        <span>No phone</span>
                      </div>
                    )}
                    
                    {lead.website && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Globe className="h-3 w-3 text-green-500" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openWebsite(lead.website!);
                          }}
                          className="text-primary hover:underline truncate max-w-[120px]"
                        >
                          {lead.website.replace(/^https?:\/\//, '')}
                        </button>
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    {lead.address && (
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">{lead.address}</span>
                      </div>
                    )}
                    {lead.rating && (
                      <div className="flex items-center space-x-1 text-sm">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <span>{lead.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex space-x-1">
                    {lead.website && (
                      <EnhancedButton
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openWebsite(lead.website!);
                        }}
                        className="h-8 w-8 p-0"
                        title="Visit website"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </EnhancedButton>
                    )}
                    {lead.email && (
                      <EnhancedButton
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`mailto:${lead.email}`, '_blank');
                        }}
                        className="h-8 w-8 p-0"
                        title="Send email"
                      >
                        <Mail className="h-3 w-3" />
                      </EnhancedButton>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <Card className="shadow-medium border-0 animate-slide-up">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-primary" />
                <span>Quality-Grouped Results</span>
                <Badge variant="secondary">{leads.length} total leads</Badge>
              </CardTitle>
              <CardDescription>
                Leads organized by contact completeness and location relevance
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <EnhancedButton
                variant="success"
                size="sm"
                onClick={handleExportCSV}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export Selected</span>
              </EnhancedButton>
            </div>
          </div>

          {/* Quality Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-yellow-600" />
                <span className="text-2xl font-bold text-yellow-700">{qualityStats.excellent}</span>
              </div>
              <p className="text-sm text-yellow-600 font-medium">Excellent Leads</p>
              <p className="text-xs text-yellow-500">Complete info + perfect location</p>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold text-blue-700">{qualityStats.okay}</span>
              </div>
              <p className="text-sm text-blue-600 font-medium">Good Leads</p>
              <p className="text-xs text-blue-500">Partial info or nearby location</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-gray-600" />
                <span className="text-2xl font-bold text-gray-700">{qualityStats.poor}</span>
              </div>
              <p className="text-sm text-gray-600 font-medium">Basic Leads</p>
              <p className="text-xs text-gray-500">Limited info or distant location</p>
            </div>
            
            <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-primary">{qualityStats.averageScore}</span>
              </div>
              <p className="text-sm text-primary font-medium">Avg Quality</p>
              <p className="text-xs text-primary/70">Overall lead score</p>
            </div>
          </div>

          {/* Search Filter */}
          <div className="pt-4 border-t">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads across all categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="excellent" className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                <span>Excellent ({groupedLeads.excellent.length})</span>
              </TabsTrigger>
              <TabsTrigger value="okay" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                <span>Good ({groupedLeads.okay.length})</span>
              </TabsTrigger>
              <TabsTrigger value="poor" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Basic ({groupedLeads.poor.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="excellent" className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-800">Excellent Leads</h3>
                </div>
                <p className="text-sm text-yellow-700">
                  These leads have complete contact information (email, phone, website) and are located 
                  in your target area. They're your best prospects for immediate outreach.
                </p>
              </div>
              {renderLeadTable('excellent')}
            </TabsContent>

            <TabsContent value="okay" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">Good Leads</h3>
                </div>
                <p className="text-sm text-blue-700">
                  These leads have partial contact information or are in nearby areas. 
                  They may require additional research but are still valuable prospects.
                </p>
              </div>
              {renderLeadTable('okay')}
            </TabsContent>

            <TabsContent value="poor" className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-800">Basic Leads</h3>
                </div>
                <p className="text-sm text-gray-700">
                  These leads have limited contact information or are outside your target area. 
                  Use them for research or when you've exhausted higher-quality options.
                </p>
              </div>
              {renderLeadTable('poor')}
            </TabsContent>
          </Tabs>

          {/* Contact Information Summary */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Contact Information Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Mail className="h-5 w-5 text-green-500" />
                <div>
                  <div className="font-medium">{qualityStats.totalWithEmail}</div>
                  <div className="text-sm text-muted-foreground">Have Email</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Phone className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="font-medium">{qualityStats.totalWithPhone}</div>
                  <div className="text-sm text-muted-foreground">Have Phone</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Globe className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="font-medium">{qualityStats.totalWithWebsite}</div>
                  <div className="text-sm text-muted-foreground">Have Website</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default QualityGroupedResults;