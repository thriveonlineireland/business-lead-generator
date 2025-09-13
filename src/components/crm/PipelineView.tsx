import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Phone, Mail, Globe, Euro, BarChart3, TrendingUp, Search, Filter, SortAsc, SortDesc } from "lucide-react";

interface BusinessLead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  status: string;
  priority: string;
  estimated_value?: number;
  business_type?: string;
}

const PIPELINE_STAGES = [
  { id: 'new', title: 'New Leads', color: 'bg-blue-50 border-blue-200' },
  { id: 'contacted', title: 'Contacted', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'qualified', title: 'Qualified', color: 'bg-green-50 border-green-200' },
  { id: 'closed', title: 'Closed', color: 'bg-gray-50 border-gray-200' }
];

const PipelineView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<BusinessLead[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user]);

  // Filter and organize leads by stage
  useEffect(() => {
    let filtered = [...leads];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(lead => 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.business_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Priority filter  
    if (priorityFilter !== "all") {
      filtered = filtered.filter(lead => lead.priority === priorityFilter);
    }

    // Sort leads within each stage
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof BusinessLead];
      let bValue: any = b[sortBy as keyof BusinessLead];
      
      if (sortBy === "estimated_value") {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }
      
      if (sortBy === "created_at") {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredLeads(filtered);
  }, [leads, searchTerm, priorityFilter, sortBy, sortOrder]);

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

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;

    // Update local state immediately for better UX
    setLeads(leads.map(lead => 
      lead.id === draggableId ? { ...lead, status: newStatus } : lead
    ));

    // Update database
    const { error } = await supabase
      .from('business_leads')
      .update({ status: newStatus })
      .eq('id', draggableId);

    if (error) {
      // Revert on error
      setLeads(leads);
      toast({ title: "Error", description: "Failed to update lead status", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Lead moved successfully" });
    }
  };

  const getLeadsByStatus = (status: string) => {
    return filteredLeads.filter(lead => lead.status === status);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-300';
    }
  };

  const getTotalValue = (status: string) => {
    return getLeadsByStatus(status)
      .reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 bg-background/80 backdrop-blur border-b border-border/50 z-10 p-4">
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold">Sales Pipeline</h1>
              <p className="text-sm text-muted-foreground">Track your leads through stages</p>
            </div>

            {/* Mobile Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="flex-1 h-10">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="font-bold text-lg">{filteredLeads.length}</div>
                <div className="text-xs text-muted-foreground">Filtered Leads</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="font-bold text-lg text-green-600">
                  €{filteredLeads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Total Value</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse">Loading pipeline...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {PIPELINE_STAGES.map((stage) => (
                <div key={stage.id} className="space-y-3">
                  <div className={`p-4 rounded-lg ${stage.color}`}>
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">{stage.title}</h3>
                      <Badge variant="secondary">{getLeadsByStatus(stage.id).length}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      €{getTotalValue(stage.id).toLocaleString()}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {getLeadsByStatus(stage.id).length > 0 ? (
                      getLeadsByStatus(stage.id).map((lead, index) => (
                        <Card
                          key={lead.id}
                          className={`border-l-4 ${getPriorityColor(lead.priority)} shadow-soft`}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <h4 className="font-medium leading-tight">{lead.name}</h4>
                                <Badge 
                                  className={`text-xs ${
                                    lead.priority === 'high' ? 'bg-red-100 text-red-800' :
                                    lead.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {lead.priority}
                                </Badge>
                              </div>
                              
                              {lead.business_type && (
                                <Badge variant="outline" className="text-xs w-fit">
                                  {lead.business_type}
                                </Badge>
                              )}

                              <div className="space-y-2">
                                {lead.email && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">{lead.email}</span>
                                  </div>
                                )}
                                {lead.phone && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    <span>{lead.phone}</span>
                                  </div>
                                )}
                              </div>

                              {lead.estimated_value && (
                                <div className="flex items-center gap-1 font-medium text-green-600">
                                  <Euro className="h-3 w-3" />
                                  <span>{lead.estimated_value.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <div className="text-sm">No leads in {stage.title.toLowerCase()}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && leads.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No leads in pipeline</h3>
              <p className="text-sm text-muted-foreground">
                Add some leads to see your sales pipeline
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop Layout
  if (loading) {
    return <div className="p-8"><div className="animate-pulse text-xl">Loading pipeline...</div></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Sales Pipeline</h2>
          <p className="text-muted-foreground mt-2">Track your leads through the sales process</p>
        </div>
        <div className="flex gap-8 text-base">
          <div className="text-center">
            <div className="font-bold text-2xl">{leads.length}</div>
            <div className="text-muted-foreground">Total Leads</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-2xl text-green-600">
              €{leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0).toLocaleString()}
            </div>
            <div className="text-muted-foreground">Total Value</div>
          </div>
        </div>
      </div>

      {leads.length > 0 ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid lg:grid-cols-4 gap-8">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.id} className="space-y-6">
                <div className={`p-6 rounded-lg ${stage.color}`}>
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">{stage.title}</h3>
                    <Badge variant="secondary" className="text-sm">{getLeadsByStatus(stage.id).length}</Badge>
                  </div>
                  <div className="text-base text-muted-foreground mt-2">
                    €{getTotalValue(stage.id).toLocaleString()}
                  </div>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-4 min-h-[300px] p-3 rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-muted/50' : ''
                      }`}
                    >
                      {getLeadsByStatus(stage.id).map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`border-l-4 ${getPriorityColor(lead.priority)} ${
                                snapshot.isDragging ? 'shadow-xl' : 'shadow-medium'
                              } cursor-move hover:shadow-strong transition-shadow`}
                            >
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <h4 className="font-medium leading-tight">{lead.name}</h4>
                                  
                                  {lead.business_type && (
                                    <Badge variant="outline" className="text-xs">
                                      {lead.business_type}
                                    </Badge>
                                  )}

                                  <div className="space-y-2">
                                    {lead.email && (
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Mail className="h-3 w-3" />
                                        <span className="truncate">{lead.email}</span>
                                      </div>
                                    )}
                                    {lead.phone && (
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Phone className="h-3 w-3" />
                                        <span>{lead.phone}</span>
                                      </div>
                                    )}
                                    {lead.website && (
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Globe className="h-3 w-3" />
                                        <span className="truncate">{lead.website}</span>
                                      </div>
                                    )}
                                  </div>

                                  {lead.estimated_value && (
                                    <div className="flex items-center gap-1 font-medium text-green-600">
                                      <Euro className="h-4 w-4" />
                                      <span>{lead.estimated_value.toLocaleString()}</span>
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center">
                                    <Badge 
                                      className={
                                        lead.priority === 'high' ? 'bg-red-100 text-red-800' :
                                        lead.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-green-100 text-green-800'
                                      }
                                    >
                                      {lead.priority}
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <div className="text-center py-20">
          <TrendingUp className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
          <h3 className="text-2xl font-medium mb-4">No leads in pipeline</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Start adding business leads to track them through your sales process and manage your pipeline effectively.
          </p>
        </div>
      )}
    </div>
  );
};

export default PipelineView;