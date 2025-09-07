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
import { Plus, Phone, Mail, Globe, MapPin, Calendar, Tag, MessageSquare } from "lucide-react";

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
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<BusinessLead | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [leadTags, setLeadTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeadDialog, setShowLeadDialog] = useState(false);
  const [showInteractionDialog, setShowInteractionDialog] = useState(false);

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
      .select('tag_id, lead_tags(name, color)')
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
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
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
      toast({ title: "Error", description: "Failed to update priority", variant: "destructive" });
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
        scheduled_follow_up: newInteraction.followUp ? new Date(newInteraction.followUp).toISOString() : null
      });

    if (error) {
      toast({ title: "Error", description: "Failed to add interaction", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Interaction added" });
      fetchLeadInteractions(selectedLead.id);
      setNewInteraction({ type: "email", subject: "", content: "", outcome: "", followUp: "" });
      setShowInteractionDialog(false);

      // Update last contact date
      await supabase
        .from('business_leads')
        .update({ 
          last_contact_date: new Date().toISOString(),
          next_follow_up: newInteraction.followUp ? new Date(newInteraction.followUp).toISOString() : null
        })
        .eq('id', selectedLead.id);
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

  if (loading) {
    return <div className="p-6"><div className="animate-pulse">Loading leads...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Lead Management</h2>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Lead
        </Button>
      </div>

      <div className="grid gap-4">
        {leads.map((lead) => (
          <Card key={lead.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => selectLead(lead)}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{lead.name}</h3>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {lead.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</div>}
                    {lead.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</div>}
                    {lead.website && <div className="flex items-center gap-1"><Globe className="h-3 w-3" />{lead.website}</div>}
                  </div>
                  {lead.address && <div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3 w-3" />{lead.address}</div>}
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                    <Badge className={getPriorityColor(lead.priority)}>{lead.priority}</Badge>
                  </div>
                  {lead.estimated_value && (
                    <div className="text-sm font-medium text-green-600">
                      €{lead.estimated_value.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={showLeadDialog} onOpenChange={setShowLeadDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLead?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-6">
              {/* Lead Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
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
                    <label className="text-sm font-medium">Priority</label>
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

                <div className="space-y-2">
                  {selectedLead.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4" /><span>{selectedLead.email}</span></div>}
                  {selectedLead.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" /><span>{selectedLead.phone}</span></div>}
                  {selectedLead.website && <div className="flex items-center gap-2"><Globe className="h-4 w-4" /><span>{selectedLead.website}</span></div>}
                  {selectedLead.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>{selectedLead.address}</span></div>}
                  {selectedLead.next_follow_up && (
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>Follow up: {new Date(selectedLead.next_follow_up).toLocaleDateString()}</span></div>
                  )}
                </div>
              </div>

              {/* Interactions */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Interactions</h3>
                  <Dialog open={showInteractionDialog} onOpenChange={setShowInteractionDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Interaction
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Interaction</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Type</label>
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
                          <label className="text-sm font-medium">Subject</label>
                          <Input 
                            value={newInteraction.subject} 
                            onChange={(e) => setNewInteraction({...newInteraction, subject: e.target.value})}
                            placeholder="Subject or title"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Content</label>
                          <Textarea 
                            value={newInteraction.content} 
                            onChange={(e) => setNewInteraction({...newInteraction, content: e.target.value})}
                            placeholder="Details of the interaction"
                            rows={3}
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Outcome</label>
                          <Input 
                            value={newInteraction.outcome} 
                            onChange={(e) => setNewInteraction({...newInteraction, outcome: e.target.value})}
                            placeholder="Result or next steps"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Follow-up Date</label>
                          <Input 
                            type="datetime-local"
                            value={newInteraction.followUp} 
                            onChange={(e) => setNewInteraction({...newInteraction, followUp: e.target.value})}
                          />
                        </div>
                        
                        <Button onClick={addInteraction} className="w-full">
                          Add Interaction
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {interactions.map((interaction) => (
                    <Card key={interaction.id}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            <span className="font-medium capitalize">{interaction.interaction_type}</span>
                            {interaction.subject && <span className="text-sm text-muted-foreground">- {interaction.subject}</span>}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(interaction.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {interaction.content && <p className="text-sm mb-2">{interaction.content}</p>}
                        {interaction.outcome && (
                          <div className="text-sm">
                            <span className="font-medium">Outcome:</span> {interaction.outcome}
                          </div>
                        )}
                        {interaction.scheduled_follow_up && (
                          <div className="text-sm text-blue-600">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Follow up: {new Date(interaction.scheduled_follow_up).toLocaleDateString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  
                  {interactions.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No interactions yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadManagement;