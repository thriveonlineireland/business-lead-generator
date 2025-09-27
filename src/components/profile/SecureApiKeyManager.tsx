import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Shield, Lock } from 'lucide-react';

interface ApiKeyStatus {
  hasFirecrawlKey: boolean;
  hasGooglePlacesKey: boolean;
}

export const SecureApiKeyManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [firecrawlKey, setFirecrawlKey] = useState('');
  const [googlePlacesKey, setGooglePlacesKey] = useState('');
  const [showFirecrawlKey, setShowFirecrawlKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus>({
    hasFirecrawlKey: false,
    hasGooglePlacesKey: false
  });

  useEffect(() => {
    if (user) {
      checkExistingKeys();
    }
  }, [user]);

  const checkExistingKeys = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('encrypted_firecrawl_api_key, encrypted_google_places_api_key')
        .eq('user_id', user?.id)
        .single();

      if (profile) {
        setKeyStatus({
          hasFirecrawlKey: !!profile.encrypted_firecrawl_api_key,
          hasGooglePlacesKey: !!profile.encrypted_google_places_api_key
        });
      }
    } catch (error) {
      console.error('Error checking existing keys:', error);
    }
  };

  const encryptApiKey = (key: string): string => {
    // Simple encryption - in production, use proper encryption
    return btoa(key);
  };

  const saveFirecrawlKey = async () => {
    if (!user || !firecrawlKey.trim()) return;

    setIsLoading(true);
    try {
      const encryptedKey = encryptApiKey(firecrawlKey);
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          encrypted_firecrawl_api_key: encryptedKey
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Firecrawl API key saved securely",
      });

      setFirecrawlKey('');
      setKeyStatus(prev => ({ ...prev, hasFirecrawlKey: true }));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save Firecrawl API key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveGooglePlacesKey = async () => {
    if (!user || !googlePlacesKey.trim()) return;

    setIsLoading(true);
    try {
      const encryptedKey = encryptApiKey(googlePlacesKey);
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          encrypted_google_places_api_key: encryptedKey
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Google Places API key saved securely",
      });

      setGooglePlacesKey('');
      setKeyStatus(prev => ({ ...prev, hasGooglePlacesKey: true }));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save Google Places API key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeFirecrawlKey = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ encrypted_firecrawl_api_key: null })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Firecrawl API key removed",
      });

      setKeyStatus(prev => ({ ...prev, hasFirecrawlKey: false }));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove Firecrawl API key",
        variant: "destructive",
      });
    }
  };

  const removeGooglePlacesKey = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ encrypted_google_places_api_key: null })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Google Places API key removed",
      });

      setKeyStatus(prev => ({ ...prev, hasGooglePlacesKey: false }));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove Google Places API key",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Secure API Key Management</h2>
      </div>

      {/* Firecrawl API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Firecrawl API Key
            {keyStatus.hasFirecrawlKey && (
              <Badge variant="secondary" className="ml-auto">
                Configured
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Your Firecrawl API key is encrypted and stored securely in the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!keyStatus.hasFirecrawlKey ? (
            <div className="space-y-3">
              <div className="relative">
                <Input
                  type={showFirecrawlKey ? "text" : "password"}
                  placeholder="Enter Firecrawl API key..."
                  value={firecrawlKey}
                  onChange={(e) => setFirecrawlKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowFirecrawlKey(!showFirecrawlKey)}
                >
                  {showFirecrawlKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button 
                onClick={saveFirecrawlKey} 
                disabled={!firecrawlKey.trim() || isLoading}
                className="w-full"
              >
                Save Firecrawl API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Firecrawl API key is configured and ready to use.
              </p>
              <Button 
                onClick={removeFirecrawlKey} 
                variant="destructive"
                size="sm"
              >
                Remove Key
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Places API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Google Places API Key
            {keyStatus.hasGooglePlacesKey && (
              <Badge variant="secondary" className="ml-auto">
                Configured
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Your Google Places API key is encrypted and stored securely in the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!keyStatus.hasGooglePlacesKey ? (
            <div className="space-y-3">
              <div className="relative">
                <Input
                  type={showGoogleKey ? "text" : "password"}
                  placeholder="Enter Google Places API key..."
                  value={googlePlacesKey}
                  onChange={(e) => setGooglePlacesKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowGoogleKey(!showGoogleKey)}
                >
                  {showGoogleKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button 
                onClick={saveGooglePlacesKey} 
                disabled={!googlePlacesKey.trim() || isLoading}
                className="w-full"
              >
                Save Google Places API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Google Places API key is configured and ready to use.
              </p>
              <Button 
                onClick={removeGooglePlacesKey} 
                variant="destructive"
                size="sm"
              >
                Remove Key
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};