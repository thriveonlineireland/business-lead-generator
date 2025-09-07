import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, Globe, Euro } from "lucide-react";

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
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user]);

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
    return leads.filter(lead => lead.status === status);
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

  if (loading) {
    return <div className="p-6"><div className="animate-pulse">Loading pipeline...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sales Pipeline</h2>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-lg">{leads.length}</div>
            <div className="text-muted-foreground">Total Leads</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-green-600">
              €{leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0).toLocaleString()}
            </div>
            <div className="text-muted-foreground">Total Value</div>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid lg:grid-cols-4 gap-6">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.id} className="space-y-4">
              <div className={`p-4 rounded-lg ${stage.color}`}>
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{stage.title}</h3>
                  <Badge variant="secondary">{getLeadsByStatus(stage.id).length}</Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  €{getTotalValue(stage.id).toLocaleString()}
                </div>
              </div>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 min-h-[200px] p-2 rounded-lg transition-colors ${
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
                              snapshot.isDragging ? 'shadow-lg' : ''
                            } cursor-move hover:shadow-md transition-shadow`}
                          >
                            <CardContent className="p-3">
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm leading-tight">{lead.name}</h4>
                                
                                {lead.business_type && (
                                  <Badge variant="outline" className="text-xs">
                                    {lead.business_type}
                                  </Badge>
                                )}

                                <div className="space-y-1">
                                  {lead.email && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Mail className="h-3 w-3" />
                                      <span className="truncate">{lead.email}</span>
                                    </div>
                                  )}
                                  {lead.phone && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Phone className="h-3 w-3" />
                                      <span>{lead.phone}</span>
                                    </div>
                                  )}
                                  {lead.website && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Globe className="h-3 w-3" />
                                      <span className="truncate">{lead.website}</span>
                                    </div>
                                  )}
                                </div>

                                {lead.estimated_value && (
                                  <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                                    <Euro className="h-3 w-3" />
                                    {lead.estimated_value.toLocaleString()}
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
    </div>
  );
};

export default PipelineView;