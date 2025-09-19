import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BusinessLead } from "@/utils/FirecrawlService";
import { ExportService } from "@/utils/ExportService";
import { StorageService } from "@/utils/StorageService";
import { useToast } from "@/hooks/use-toast";
import { Download, Save, Search, ExternalLink, Mail, Phone, Globe, Building, Instagram, Lock, Crown, AlertCircle, CheckCircle, Info } from "lucide-react";

interface FreemiumResultsTableProps {
  leads: BusinessLead[];
  onUpgrade: () => void;
}

const FreemiumResultsTable = ({ leads, onUpgrade }: FreemiumResultsTableProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());

  // Calculate data completeness stats - define this first so we can use it below
  const getDataCompleteness = (lead: BusinessLead) => {
    const hasEmail = lead.email && lead.email.trim() !== '' && lead.email.includes('@');
    const hasPhone = lead.phone && lead.phone.trim() !== '' && lead.phone.length >= 10;
    const hasWebsite = lead.website && lead.website.trim() !== '' && lead.website.includes('.');
    
    const fields = [hasEmail, hasPhone, hasWebsite].filter(Boolean);
    return {
      score: fields.length,
      total: 3,
      percentage: Math.round((fields.length / 3) * 100),
      missing: [
        !hasEmail && 'Email',
        !hasPhone && 'Phone', 
        !hasWebsite && 'Website'
      ].filter(Boolean)
    };
  };

  // Show 10% of total results as freemium preview (minimum 5, maximum 15)
  // But prioritize leads with complete contact information
  const freeLeadLimit = Math.max(5, Math.min(15, Math.floor(leads.length * 0.1)));
  
  // Sort all leads by data completeness (complete leads first)
  const leadsByCompleteness = [...leads].sort((a, b) => {
    const scoreA = getDataCompleteness(a).score;
    const scoreB = getDataCompleteness(b).score;
    if (scoreA !== scoreB) {
      return scoreB - scoreA; // Higher completeness first
    }
    // If same completeness, sort alphabetically
    return a.name.localeCompare(b.name);
  });
  
  const freeLeads = leadsByCompleteness.slice(0, freeLeadLimit);
  const hiddenLeadsCount = Math.max(0, leads.length - freeLeadLimit);

  const dataQualityStats = {
    complete: freeLeads.filter(lead => getDataCompleteness(lead).score === 3).length,
    partial: freeLeads.filter(lead => {
      const score = getDataCompleteness(lead).score;
      return score > 0 && score < 3;
    }).length,
    minimal: freeLeads.filter(lead => getDataCompleteness(lead).score === 0).length
  };

  const filteredLeads = freeLeads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone?.includes(searchTerm) ||
    lead.website?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.instagram?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "email":
        return (a.email || "").localeCompare(b.email || "");
      case "phone":
        return (a.phone || "").localeCompare(b.phone || "");
      default:
        return 0;
    }
  });

  const handleSelectAll = () => {
    if (selectedLeads.size === sortedLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(sortedLeads.map((_, index) => index)));
    }
  };

  const handleSelectLead = (index: number) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedLeads(newSelected);
  };

  const getSelectedLeads = () => {
    return selectedLeads.size > 0
      ? Array.from(selectedLeads).map(index => sortedLeads[index])
      : sortedLeads;
  };

  const handleExportCSV = () => {
    const selectedData = getSelectedLeads();
    ExportService.exportToCSV(selectedData);
    toast({
      title: "Export Successful",
      description: `Exported ${selectedData.length} leads to CSV`,
    });
  };

  const handleExportJSON = () => {
    const selectedData = getSelectedLeads();
    ExportService.exportToJSON(selectedData);
    toast({
      title: "Export Successful",
      description: `Exported ${selectedData.length} leads to JSON`,
    });
  };

  const handleSaveSearch = () => {
    const searchName = prompt("Enter a name for this saved search:");
    if (searchName) {
      StorageService.saveSearch({
        name: searchName,
        location: "Current Search",
        businessType: "Mixed",
        directory: "mixed",
        leads: sortedLeads
      });
      toast({
        title: "Search Saved",
        description: `Saved search "${searchName}" with ${sortedLeads.length} leads`,
      });
    }
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

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Data Quality Summary */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Info className="h-4 w-4" />
              Data Quality Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-2xl font-bold text-green-600">{dataQualityStats.complete}</span>
                </div>
                <p className="text-xs text-muted-foreground">Complete Contact Info</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-2xl font-bold text-yellow-600">{dataQualityStats.partial}</span>
                </div>
                <p className="text-xs text-muted-foreground">Partial Contact Info</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-2xl font-bold text-red-600">{dataQualityStats.minimal}</span>
                </div>
                <p className="text-xs text-muted-foreground">Name Only</p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>💡 Tip:</strong> Leads with missing contact info can still be valuable. Try searching for them on LinkedIn, 
                Google, or their business directory listings to find phone numbers and email addresses.
              </p>
            </div>
          </CardContent>
        </Card>
      <Card className="shadow-medium border-0 animate-slide-up">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-primary" />
                <span>Search Results</span>
                <Badge variant="secondary">{freeLeads.length} of {leads.length} leads</Badge>
              </CardTitle>
              <CardDescription>
                Showing 10% of total results ({freeLeads.length}/{leads.length}). {selectedLeads.size > 0 
                  ? `${selectedLeads.size} leads selected`
                  : "Click on rows to select leads for export"
                }
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
                <span>Export CSV</span>
              </EnhancedButton>

              <EnhancedButton
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export JSON</span>
              </EnhancedButton>

              <EnhancedButton
                variant="outline"
                size="sm"
                onClick={handleSaveSearch}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save Search</span>
              </EnhancedButton>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="email">Sort by Email</SelectItem>
                <SelectItem value="phone">Sort by Phone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="rounded-lg border overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedLeads.size === sortedLeads.length && sortedLeads.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead className="font-semibold min-w-[200px]">Business Name</TableHead>
                  <TableHead className="font-semibold min-w-[180px]">Contact</TableHead>
                  <TableHead className="font-semibold min-w-[120px]">Website</TableHead>
                  <TableHead className="font-semibold min-w-[100px]">Source</TableHead>
                  <TableHead className="font-semibold w-24 min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLeads.map((lead, index) => (
                  <TableRow
                    key={index}
                    className={`transition-colors hover:bg-muted/50 ${
                      selectedLeads.has(index) ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => handleSelectLead(index)}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedLeads.has(index)}
                        onChange={() => handleSelectLead(index)}
                        className="rounded border-gray-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{lead.name}</span>
                          {(() => {
                            const completeness = getDataCompleteness(lead);
                            if (completeness.score === 3) {
                              return (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                      Complete
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Has email, phone, and website</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            } else if (completeness.score > 0) {
                              return (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
                                      {completeness.percentage}%
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Missing: {completeness.missing.join(', ')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            } else {
                              return (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                                      Name Only
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="max-w-xs">
                                      <p className="font-medium mb-1">Missing all contact info</p>
                                      <p className="text-xs">Try searching:</p>
                                      <ul className="text-xs list-disc list-inside mt-1">
                                        <li>"{lead.name}" + "contact"</li>
                                        <li>Google Maps or business directories</li>
                                        <li>LinkedIn company page</li>
                                      </ul>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            }
                          })()}
                        </div>
                        {lead.address && (
                          <div className="text-sm text-muted-foreground">{lead.address}</div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-2">
                        {lead.email ? (
                          <div className="flex items-center space-x-2 text-sm">
                            <Mail className="h-3 w-3 text-green-500" />
                            <a
                              href={`mailto:${lead.email}`}
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {lead.email}
                            </a>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3 text-red-400" />
                            <span>No email found</span>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3 w-3" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Try searching "{lead.name} email" or check their website's contact page</p>
                              </TooltipContent>
                            </Tooltip>
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
                            <span>No phone found</span>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3 w-3" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Check Google Maps, Yellow Pages, or business directories</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {lead.website ? (
                        <div className="flex items-center space-x-2">
                          <Globe className="h-3 w-3 text-green-500" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openWebsite(lead.website!);
                            }}
                            className="text-primary hover:underline text-sm truncate max-w-[150px]"
                          >
                            {lead.website.replace(/^https?:\/\//, '')}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Globe className="h-3 w-3 text-red-400" />
                          <span>No website</span>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Try searching "{lead.name}.com" or "{lead.name}" + website</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                      {lead.instagram && (
                        <div className="flex items-center space-x-2 mt-1">
                          <Instagram className="h-3 w-3 text-muted-foreground" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openWebsite(lead.instagram!);
                            }}
                            className="text-primary hover:underline text-sm"
                          >
                            Instagram
                          </button>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {lead.source ? lead.source.split(' ')[0] : 'Google Places'}
                      </Badge>
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {sortedLeads.length === 0 && (
            <div className="text-center py-12">
              <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No results found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Try adjusting your search terms" : "No leads found for this search"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Premium Upgrade Prompt */}
      {hiddenLeadsCount > 0 && (
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 shadow-strong">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Crown className="h-8 w-8 text-primary" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold mb-2">Unlock {hiddenLeadsCount} More High-Quality Leads</h3>
            <p className="text-lg text-muted-foreground mb-6">
              We found <span className="font-semibold text-primary">{leads.length} total leads</span> for your search. 
              You're seeing 10% as a preview. Upgrade to access all leads with complete contact information.
            </p>
            
            <div className="bg-card/50 rounded-lg p-6 mb-6 backdrop-blur-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center justify-center space-x-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span>{hiddenLeadsCount} Premium Leads</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>Complete Contact Info</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span>Full Export Access</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <EnhancedButton
                variant="gradient"
                size="lg"
                onClick={onUpgrade}
                className="flex items-center space-x-2"
              >
                <Crown className="h-5 w-5" />
                <span>Get All {leads.length} Leads - €{Math.ceil(leads.length / 100) * 10}</span>
              </EnhancedButton>
              
              <div className="text-sm text-muted-foreground">
                Pay per lead • No subscriptions
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </TooltipProvider>
  );
};

export default FreemiumResultsTable;