import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, Phone, Mail, Globe, MapPin, Calendar, Tag, MessageSquare, Users, ArrowLeft, Search, Filter, SortAsc, SortDesc } from "lucide-react";

interface BusinessLead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  business_type?: string;
  status: string;
  priority: string;
  notes?: string;
  estimated_value?: number;
  last_contact_date?: string;
  next_follow_up?: string;
  created_at: string;
}

interface Interaction {
  id: string;
  interaction_type: string;
  subject?: string;
  content?: string;
  outcome?: string;
  created_at: string;
  scheduled_follow_up?: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

const LeadManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<BusinessLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<BusinessLead | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [leadTags, setLeadTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeadDialog, setShowLeadDialog] = useState(false);
  const [showInteractionDialog, setShowInteractionDialog] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // New interaction form
  const [newInteraction, setNewInteraction] = useState({
    type: "email",
    subject: "",
    content: "",
    outcome: "",
    followUp: ""
  });

  useEffect(() => {
    if (user) {
      fetchLeads();
      fetchTags();
    }
  }, [user]);

  // Filter leads based on search term, status, and priority
  useEffect(() => {
    let filtered = [...leads];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(lead => 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.business_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // Priority filter  
    if (priorityFilter !== "all") {
      filtered = filtered.filter(lead => lead.priority === priorityFilter);
    }

    // Sort leads
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof BusinessLead];
      let bValue: any = b[sortBy as keyof BusinessLead];
      
      if (sortBy === "estimated_value") {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }
      
      if (sortBy === "created_at" || sortBy === "last_contact_date") {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredLeads(filtered);
  }, [leads, searchTerm, statusFilter, priorityFilter, sortBy, sortOrder]);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from('business_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error);
      toast({ title: "Error", description: "Failed to fetch leads", variant: "destructive" });
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from('lead_tags')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching tags:', error);
    } else {
      setTags(data || []);
    }
  };

  const fetchLeadInteractions = async (leadId: string) => {
    const { data, error } = await supabase
      .from('lead_interactions')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching interactions:', error);
    } else {
      setInteractions(data || []);
    }
  };

  const fetchLeadTags = async (leadId: string) => {
    const { data, error } = await supabase
      .from('lead_tag_assignments')
      .select('tag_id')
      .eq('lead_id', leadId);

    if (error) {
      console.error('Error fetching lead tags:', error);
    } else {
      setLeadTags(data?.map(item => item.tag_id) || []);
    }
  };

  const updateLeadStatus = async (leadId: string, status: string) => {
    const { error } = await supabase
      .from('business_leads')
      .update({ status })
      .eq('id', leadId);

    if (error) {
      toast({ title: "Error", description: "Failed to update lead status", variant: "destructive" });
    } else {
      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, status } : lead
      ));
      toast({ title: "Success", description: "Lead status updated" });
    }
  };

  const updateLeadPriority = async (leadId: string, priority: string) => {
    const { error } = await supabase
      .from('business_leads')
      .update({ priority })
      .eq('id', leadId);

    if (error) {
      toast({ title: "Error", description: "Failed to update lead priority", variant: "destructive" });
    } else {
      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, priority } : lead
      ));
      toast({ title: "Success", description: "Lead priority updated" });
    }
  };

  const addInteraction = async () => {
    if (!selectedLead || !newInteraction.type) return;

    const { error } = await supabase
      .from('lead_interactions')
      .insert({
        lead_id: selectedLead.id,
        user_id: user?.id,
        interaction_type: newInteraction.type,
        subject: newInteraction.subject,
        content: newInteraction.content,
        outcome: newInteraction.outcome,
        scheduled_follow_up: newInteraction.followUp || null
      });

    if (error) {
      toast({ title: "Error", description: "Failed to add interaction", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Interaction added successfully" });
      setShowInteractionDialog(false);
      setNewInteraction({ type: "email", subject: "", content: "", outcome: "", followUp: "" });
      fetchLeadInteractions(selectedLead.id);
    }
  };

  const selectLead = (lead: BusinessLead) => {
    setSelectedLead(lead);
    fetchLeadInteractions(lead.id);
    fetchLeadTags(lead.id);
    setShowLeadDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 bg-background/80 backdrop-blur border-b border-border/50 z-10 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">Lead Management</h1>
              <p className="text-sm text-muted-foreground">{filteredLeads.length} of {leads.length} leads</p>
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Mobile Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="flex-1 h-10">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date Created</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="estimated_value">Value</SelectItem>
                  <SelectItem value="last_contact_date">Last Contact</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="h-10 px-3"
              >
                {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse">Loading leads...</div>
            </div>
          ) : filteredLeads.length > 0 ? (
            filteredLeads.map((lead) => (
              <Card key={lead.id} className="border-0 shadow-soft cursor-pointer hover:shadow-medium transition-shadow" onClick={() => selectLead(lead)}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold">{lead.name}</h3>
                      <div className="flex gap-1">
                        <Badge className={`text-xs ${getStatusColor(lead.status)}`}>{lead.status}</Badge>
                        <Badge className={`text-xs ${getPriorityColor(lead.priority)}`}>{lead.priority}</Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {lead.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                      {lead.address && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate">{lead.address}</span>
                        </div>
                      )}
                      {lead.business_type && (
                        <div className="flex items-center gap-2 text-sm">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          <span className="capitalize">{lead.business_type}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                      {lead.estimated_value && (
                        <span className="text-sm font-medium text-success">
                          €{lead.estimated_value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No leads found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" || priorityFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "Add your first lead to get started"}
              </p>
            </div>
          )}
        </div>

        {/* Mobile Lead Detail Dialog */}
        <Dialog open={showLeadDialog} onOpenChange={setShowLeadDialog}>
          <DialogContent className="max-w-sm mx-4">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedLead?.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setShowLeadDialog(false)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            {selectedLead && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium block mb-2">Status</label>
                    <Select value={selectedLead.status} onValueChange={(value) => updateLeadStatus(selectedLead.id, value)}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-2">Priority</label>
                    <Select value={selectedLead.priority} onValueChange={(value) => updateLeadPriority(selectedLead.id, value)}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedLead.email && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm break-all">{selectedLead.email}</span>
                    </div>
                  )}
                  {selectedLead.phone && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedLead.phone}</span>
                    </div>
                  )}
                  {selectedLead.website && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm break-all">{selectedLead.website}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Interactions</h3>
                    <Button size="sm" onClick={() => setShowInteractionDialog(true)} className="gap-2">
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                  
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {interactions.map((interaction) => (
                      <Card key={interaction.id} className="border border-border/50">
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="font-medium text-sm capitalize">{interaction.interaction_type}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(interaction.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {interaction.subject && <p className="text-sm font-medium">{interaction.subject}</p>}
                            {interaction.content && <p className="text-sm text-muted-foreground">{interaction.content}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {interactions.length === 0 && (
                      <p className="text-center text-muted-foreground py-4 text-sm">No interactions yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Mobile Add Interaction Dialog */}
        <Dialog open={showInteractionDialog} onOpenChange={setShowInteractionDialog}>
          <DialogContent className="max-w-sm mx-4">
            <DialogHeader>
              <DialogTitle>Add Interaction</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Type</label>
                <Select value={newInteraction.type} onValueChange={(value) => setNewInteraction({...newInteraction, type: value})}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-2">Subject</label>
                <Input 
                  value={newInteraction.subject} 
                  onChange={(e) => setNewInteraction({...newInteraction, subject: e.target.value})}
                  placeholder="Subject"
                  className="h-12"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-2">Content</label>
                <Textarea 
                  value={newInteraction.content} 
                  onChange={(e) => setNewInteraction({...newInteraction, content: e.target.value})}
                  placeholder="Interaction details..."
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowInteractionDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={addInteraction} className="flex-1">
                  Add
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Desktop Layout
  if (loading) {
    return <div className="p-8"><div className="animate-pulse text-xl">Loading leads...</div></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Lead Management</h2>
          <p className="text-muted-foreground mt-2">Manage and track your business leads</p>
        </div>
        <Button className="gap-2 h-12 px-6">
          <Plus className="h-5 w-5" />
          Add Lead
        </Button>
      </div>

      {/* Desktop Filters */}
      <Card className="border-border/50 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date Created</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="estimated_value">Value</SelectItem>
                  <SelectItem value="last_contact_date">Last Contact</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-3"
              >
                {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Showing {filteredLeads.length} of {leads.length} leads</span>
            {(searchTerm || statusFilter !== "all" || priorityFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setPriorityFilter("all");
                }}
                className="h-8 px-2 lg:px-3"
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Desktop Leads Grid */}
      {filteredLeads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="border-border/50 shadow-soft hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => selectLead(lead)}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg">{lead.name}</h3>
                    <div className="flex gap-2">
                      <Badge className={`text-xs ${getStatusColor(lead.status)}`}>{lead.status}</Badge>
                      <Badge className={`text-xs ${getPriorityColor(lead.priority)}`}>{lead.priority}</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {lead.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate">{lead.email}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.phone}</span>
                      </div>
                    )}
                    {lead.website && (
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate">{lead.website}</span>
                      </div>
                    )}
                    {lead.address && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate">{lead.address}</span>
                      </div>
                    )}
                    {lead.business_type && (
                      <div className="flex items-center gap-3">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm capitalize">{lead.business_type}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                    {lead.estimated_value && (
                      <span className="text-sm font-semibold text-success">
                        €{lead.estimated_value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/50 shadow-soft">
          <CardContent className="text-center py-12">
            <Users className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold text-foreground mb-3">No leads found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || statusFilter !== "all" || priorityFilter !== "all" 
                ? "Try adjusting your filters to see more results" 
                : "Get started by adding your first business lead"}
            </p>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Lead
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Desktop Lead Detail Dialog */}
      <Dialog open={showLeadDialog} onOpenChange={setShowLeadDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedLead?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedLead && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">Status</label>
                    <Select value={selectedLead.status} onValueChange={(value) => updateLeadStatus(selectedLead.id, value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-2">Priority</label>
                    <Select value={selectedLead.priority} onValueChange={(value) => updateLeadPriority(selectedLead.id, value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Contact Information</h3>
                  <div className="space-y-3">
                    {selectedLead.email && (
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <span>{selectedLead.email}</span>
                      </div>
                    )}
                    {selectedLead.phone && (
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <span>{selectedLead.phone}</span>
                      </div>
                    )}
                    {selectedLead.website && (
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <span className="break-all">{selectedLead.website}</span>
                      </div>
                    )}
                    {selectedLead.address && (
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <span>{selectedLead.address}</span>
                      </div>
                    )}
                    {selectedLead.business_type && (
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <Tag className="h-5 w-5 text-muted-foreground" />
                        <span className="capitalize">{selectedLead.business_type}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">Interactions</h3>
                    <Button onClick={() => setShowInteractionDialog(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Interaction
                    </Button>
                  </div>
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {interactions.map((interaction) => (
                      <Card key={interaction.id} className="border border-border/50">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <span className="font-medium capitalize">{interaction.interaction_type}</span>
                              <span className="text-sm text-muted-foreground">
                                {new Date(interaction.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {interaction.subject && <p className="font-medium">{interaction.subject}</p>}
                            {interaction.content && <p className="text-muted-foreground">{interaction.content}</p>}
                            {interaction.outcome && (
                              <div className="bg-muted/50 p-2 rounded">
                                <p className="text-sm"><strong>Outcome:</strong> {interaction.outcome}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {interactions.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No interactions yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Desktop Add Interaction Dialog */}
      <Dialog open={showInteractionDialog} onOpenChange={setShowInteractionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Interaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Type</label>
              <Select value={newInteraction.type} onValueChange={(value) => setNewInteraction({...newInteraction, type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-2">Subject</label>
              <Input 
                value={newInteraction.subject} 
                onChange={(e) => setNewInteraction({...newInteraction, subject: e.target.value})}
                placeholder="Subject"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-2">Content</label>
              <Textarea 
                value={newInteraction.content} 
                onChange={(e) => setNewInteraction({...newInteraction, content: e.target.value})}
                placeholder="Interaction details..."
                rows={4}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-2">Outcome</label>
              <Input 
                value={newInteraction.outcome} 
                onChange={(e) => setNewInteraction({...newInteraction, outcome: e.target.value})}
                placeholder="What was the result?"
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowInteractionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addInteraction}>
                Add Interaction
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadManagement;