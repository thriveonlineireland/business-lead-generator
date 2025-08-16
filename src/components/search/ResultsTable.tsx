import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BusinessLead } from "@/utils/FirecrawlService";
import { ExportService } from "@/utils/ExportService";
import { StorageService } from "@/utils/StorageService";
import { useToast } from "@/hooks/use-toast";
import { Download, Save, Search, ExternalLink, Mail, Phone, Globe, Building } from "lucide-react";

interface ResultsTableProps {
  leads: BusinessLead[];
}

const ResultsTable = ({ leads }: ResultsTableProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone?.includes(searchTerm) ||
    lead.website?.toLowerCase().includes(searchTerm.toLowerCase())
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
        location: "Current Search", // You might want to pass this from props
        businessType: "Mixed", // You might want to pass this from props
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
    // Basic phone number formatting
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <Card className="shadow-medium border-0 animate-slide-up">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-primary" />
              <span>Search Results</span>
              <Badge variant="secondary">{sortedLeads.length} leads</Badge>
            </CardTitle>
            <CardDescription>
              {selectedLeads.size > 0 
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

      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
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
                <TableHead className="font-semibold">Business Name</TableHead>
                <TableHead className="font-semibold">Contact</TableHead>
                <TableHead className="font-semibold">Website</TableHead>
                <TableHead className="font-semibold">Source</TableHead>
                <TableHead className="font-semibold w-24">Actions</TableHead>
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
                      <div className="font-medium text-foreground">{lead.name}</div>
                      {lead.address && (
                        <div className="text-sm text-muted-foreground">{lead.address}</div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-2">
                      {lead.email && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {lead.email}
                          </a>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {formatPhone(lead.phone)}
                          </a>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {lead.website && (
                      <div className="flex items-center space-x-2">
                        <Globe className="h-3 w-3 text-muted-foreground" />
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
  );
};

export default ResultsTable;