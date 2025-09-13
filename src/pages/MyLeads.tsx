import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import UpgradeToMyLeads from '@/components/payment/UpgradeToMyLeads';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  MapPin, 
  Building2,
  Crown,
  Lock,
  History,
  Users,
  Loader2
} from 'lucide-react';

interface SearchRecord {
  id: string;
  query: string;
  location: string;
  business_type: string;
  results_count: number;
  created_at: string;
  leads: any;
  is_premium: boolean;
}

interface UserProfile {
  subscription_status: string;
  free_searches_used: number;
}

const MyLeads = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchHistory, setSearchHistory] = useState<SearchRecord[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [filterBy, setFilterBy] = useState('all');

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchSearchHistory();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_status, free_searches_used')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data || { subscription_status: 'inactive', free_searches_used: 0 });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchSearchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSearchHistory(data || []);
    } catch (error) {
      console.error('Error fetching search history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load search history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isPremiumUser = profile?.subscription_status === 'active';
  const hasReachedLimit = (profile?.free_searches_used || 0) >= 3;

  const filteredHistory = searchHistory.filter(record => {
    const matchesSearch = record.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.business_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterBy === 'all') return matchesSearch;
    if (filterBy === 'premium') return matchesSearch && record.is_premium;
    if (filterBy === 'free') return matchesSearch && !record.is_premium;
    
    return matchesSearch;
  });

  const sortedHistory = filteredHistory.sort((a, b) => {
    switch (sortBy) {
      case 'results_count':
        return b.results_count - a.results_count;
      case 'location':
        return a.location.localeCompare(b.location);
      case 'business_type':
        return a.business_type.localeCompare(b.business_type);
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const FreeUserLimitCard = () => (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Lock className="w-5 h-5 text-amber-600" />
          <CardTitle className="text-amber-900">Free Plan Limits</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-amber-800">
            <div className="font-medium">Monthly Search Usage:</div>
            <div className="text-xs text-amber-700 mt-1">
              {profile?.free_searches_used || 0} / 3 searches used
            </div>
          </div>
          {hasReachedLimit && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              Monthly limit reached
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Access Required</CardTitle>
            <CardDescription>Please log in to access My Leads</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">My Leads</h1>
            {isPremiumUser && (
              <Badge className="bg-gradient-to-r from-primary to-primary/80">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Manage your lead generation searches and results
          </p>
        </div>

        <Tabs defaultValue={isPremiumUser ? "history" : "upgrade"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="history" 
              disabled={!isPremiumUser && searchHistory.length === 0}
              className="flex items-center space-x-2"
            >
              <History className="w-4 h-4" />
              <span>Search History</span>
              {!isPremiumUser && <Lock className="w-3 h-3" />}
            </TabsTrigger>
            <TabsTrigger value="upgrade" className="flex items-center space-x-2">
              <Crown className="w-4 h-4" />
              <span>{isPremiumUser ? 'Premium' : 'Upgrade'}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-6">
            {!isPremiumUser && <FreeUserLimitCard />}
            
            {/* Search and Filter Controls */}
            {(isPremiumUser || searchHistory.length > 0) && (
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search your history..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Latest First</SelectItem>
                    <SelectItem value="results_count">Most Results</SelectItem>
                    <SelectItem value="location">Location A-Z</SelectItem>
                    <SelectItem value="business_type">Business Type</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterBy} onValueChange={setFilterBy}>
                  <SelectTrigger className="w-full md:w-32">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Search History */}
            {sortedHistory.length === 0 ? (
              <Card className="text-center p-8">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="text-xl mb-2">No Search History</CardTitle>
                <CardDescription className="mb-4">
                  {searchTerm ? 'No searches match your filter criteria.' : 'You haven\'t performed any searches yet.'}
                </CardDescription>
                {!isPremiumUser && searchHistory.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Start searching for leads to see them here. Free users can see their last 3 searches.
                  </p>
                )}
              </Card>
            ) : (
              <div className="grid gap-4">
                {sortedHistory.map((record, index) => (
                  <Card key={record.id} className={`${!isPremiumUser && index >= 3 ? 'opacity-50' : ''}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Building2 className="w-5 h-5 text-primary" />
                          <div>
                            <CardTitle className="text-lg">{record.business_type}</CardTitle>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span>{record.location}</span>
                              <Calendar className="w-3 h-3 ml-2" />
                              <span>{new Date(record.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={record.is_premium ? "default" : "secondary"}>
                            {record.results_count} results
                          </Badge>
                          {record.is_premium && (
                            <Badge className="bg-gradient-to-r from-primary to-primary/80">
                              <Crown className="w-3 h-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {(!isPremiumUser && index >= 3) ? (
                      <CardContent>
                        <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
                          <Lock className="w-5 h-5 text-muted-foreground mr-2" />
                          <span className="text-sm text-muted-foreground">
                            Upgrade to access this search history
                          </span>
                        </div>
                      </CardContent>
                    ) : (
                      record.leads && Array.isArray(record.leads) && record.leads.length > 0 && (
                        <CardContent>
                          <div className="text-sm text-muted-foreground mb-2">
                            Sample results from this search:
                          </div>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {record.leads.slice(0, 3).map((lead: any, idx: number) => (
                              <div key={idx} className="text-xs bg-muted/30 p-2 rounded">
                                <div className="font-medium">{lead.name}</div>
                                {lead.email && (
                                  <div className="text-muted-foreground">{lead.email}</div>
                                )}
                              </div>
                            ))}
                            {record.leads.length > 3 && (
                              <div className="text-xs text-center text-muted-foreground">
                                +{record.leads.length - 3} more leads
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upgrade">
            {isPremiumUser ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Crown className="w-6 h-6 text-primary" />
                    <CardTitle>Premium Active</CardTitle>
                  </div>
                  <CardDescription>
                    You have full access to all premium features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-primary/10 rounded-lg">
                        <div className="text-2xl font-bold text-primary">Unlimited</div>
                        <div className="text-sm text-muted-foreground">Monthly Searches</div>
                      </div>
                      <div className="text-center p-4 bg-primary/10 rounded-lg">
                        <div className="text-2xl font-bold text-primary">∞</div>
                        <div className="text-sm text-muted-foreground">Search History</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <UpgradeToMyLeads />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyLeads;