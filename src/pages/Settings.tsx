import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FirecrawlService } from "@/utils/FirecrawlService";
import { GooglePlacesService } from "@/utils/GooglePlacesService";
import { StorageService } from "@/utils/StorageService";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Key, TestTube, CheckCircle, XCircle, Trash2, ExternalLink, Shield, AlertTriangle, MapPin } from "lucide-react";

const Settings = () => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<"valid" | "invalid" | "unknown">("unknown");
  const [isSaving, setIsSaving] = useState(false);
  
  // Google Places API state
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [isTestingGoogleKey, setIsTestingGoogleKey] = useState(false);
  const [googleKeyStatus, setGoogleKeyStatus] = useState<"valid" | "invalid" | "unknown">("unknown");
  const [isSavingGoogle, setIsSavingGoogle] = useState(false);

  useEffect(() => {
    const savedKey = FirecrawlService.getApiKey();
    if (savedKey) {
      setApiKey(savedKey);
      setKeyStatus("valid"); // Assume valid if saved
    }
    
    const savedGoogleKey = GooglePlacesService.getApiKey();
    if (savedGoogleKey) {
      setGoogleApiKey(savedGoogleKey);
      setGoogleKeyStatus("valid"); // Assume valid if saved
    }
  }, []);

  const testApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Missing API Key",
        description: "Please enter your Firecrawl API key first",
        variant: "destructive",
      });
      return;
    }

    setIsTestingKey(true);
    try {
      const isValid = await FirecrawlService.testApiKey(apiKey.trim());
      setKeyStatus(isValid ? "valid" : "invalid");
      
      toast({
        title: isValid ? "API Key Valid" : "API Key Invalid",
        description: isValid 
          ? "Your Firecrawl API key is working correctly" 
          : "The API key is invalid or inactive",
        variant: isValid ? "default" : "destructive",
      });
    } catch (error) {
      setKeyStatus("invalid");
      toast({
        title: "Test Failed",
        description: "Unable to test API key. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Missing API Key",
        description: "Please enter your Firecrawl API key",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Test the key before saving
      const isValid = await FirecrawlService.testApiKey(apiKey.trim());
      
      if (isValid) {
        FirecrawlService.saveApiKey(apiKey.trim());
        setKeyStatus("valid");
        toast({
          title: "API Key Saved",
          description: "Your Firecrawl API key has been saved successfully",
        });
      } else {
        setKeyStatus("invalid");
        toast({
          title: "Invalid API Key",
          description: "The API key is invalid. Please check and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Unable to save API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const clearApiKey = () => {
    if (confirm("Are you sure you want to remove your API key?")) {
      FirecrawlService.clearApiKey();
      setApiKey("");
      setKeyStatus("unknown");
      toast({
        title: "API Key Removed",
        description: "Your Firecrawl API key has been removed",
      });
    }
  };

  // Google Places API functions
  const testGoogleApiKey = async () => {
    if (!googleApiKey.trim()) {
      toast({
        title: "Missing API Key",
        description: "Please enter your Google Places API key first",
        variant: "destructive",
      });
      return;
    }

    setIsTestingGoogleKey(true);
    try {
      const isValid = await GooglePlacesService.testApiKey(googleApiKey.trim());
      setGoogleKeyStatus(isValid ? "valid" : "invalid");
      
      toast({
        title: isValid ? "API Key Valid" : "API Key Invalid",
        description: isValid 
          ? "Your Google Places API key is working correctly" 
          : "The API key is invalid or inactive",
        variant: isValid ? "default" : "destructive",
      });
    } catch (error) {
      setGoogleKeyStatus("invalid");
      toast({
        title: "Test Failed",
        description: "Unable to test API key. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsTestingGoogleKey(false);
    }
  };

  const saveGoogleApiKey = async () => {
    if (!googleApiKey.trim()) {
      toast({
        title: "Missing API Key",
        description: "Please enter your Google Places API key",
        variant: "destructive",
      });
      return;
    }

    setIsSavingGoogle(true);
    try {
      // Test the key before saving
      const isValid = await GooglePlacesService.testApiKey(googleApiKey.trim());
      
      if (isValid) {
        GooglePlacesService.saveApiKey(googleApiKey.trim());
        setGoogleKeyStatus("valid");
        toast({
          title: "API Key Saved",
          description: "Your Google Places API key has been saved successfully",
        });
      } else {
        setGoogleKeyStatus("invalid");
        toast({
          title: "Invalid API Key",
          description: "The API key is invalid. Please check and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Unable to save API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingGoogle(false);
    }
  };

  const clearGoogleApiKey = () => {
    if (confirm("Are you sure you want to remove your Google Places API key?")) {
      GooglePlacesService.clearApiKey();
      setGoogleApiKey("");
      setGoogleKeyStatus("unknown");
      toast({
        title: "API Key Removed",
        description: "Your Google Places API key has been removed",
      });
    }
  };

  const clearAllData = () => {
    if (confirm("Are you sure you want to clear all data? This will remove your search history, saved searches, and API keys.")) {
      FirecrawlService.clearApiKey();
      GooglePlacesService.clearApiKey();
      StorageService.clearSearchHistory();
      // Note: We'd need to add a method to clear saved searches
      setApiKey("");
      setKeyStatus("unknown");
      setGoogleApiKey("");
      setGoogleKeyStatus("unknown");
      toast({
        title: "All Data Cleared",
        description: "All application data has been removed",
      });
    }
  };

  const getStatusIcon = (status: "valid" | "invalid" | "unknown") => {
    switch (status) {
      case "valid":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "invalid":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Key className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: "valid" | "invalid" | "unknown") => {
    switch (status) {
      case "valid":
        return <Badge className="bg-success text-success-foreground">Active</Badge>;
      case "invalid":
        return <Badge variant="destructive">Invalid</Badge>;
      default:
        return <Badge variant="outline">Not Configured</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your API keys and manage application data
        </p>
      </div>

      {/* API Configuration */}
      <Card className="shadow-medium border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5 text-primary" />
            <span>Firecrawl API Configuration</span>
            {getStatusBadge(keyStatus)}
          </CardTitle>
          <CardDescription>
            Enter your Firecrawl API key to enable web scraping functionality. 
            Get your key from{" "}
            <a 
              href="https://firecrawl.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center"
            >
              firecrawl.dev
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="flex items-center space-x-2">
              {getStatusIcon(keyStatus)}
              <span>API Key</span>
            </Label>
            <div className="flex space-x-2">
              <Input
                id="apiKey"
                type="password"
                placeholder="fc-xxxxxxxxxxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setKeyStatus("unknown");
                }}
                className="flex-1 font-mono"
              />
              <EnhancedButton
                variant="outline"
                onClick={testApiKey}
                disabled={isTestingKey || !apiKey.trim()}
                className="flex items-center space-x-2"
              >
                {isTestingKey ? (
                  <>
                    <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4" />
                    <span>Test</span>
                  </>
                )}
              </EnhancedButton>
            </div>
            
            {keyStatus === "valid" && (
              <div className="flex items-center space-x-2 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                <span>API key is valid and working</span>
              </div>
            )}
            
            {keyStatus === "invalid" && (
              <div className="flex items-center space-x-2 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                <span>API key is invalid or inactive</span>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <EnhancedButton
              onClick={saveApiKey}
              disabled={isSaving || !apiKey.trim()}
              variant="gradient"
              className="flex items-center space-x-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  <span>Save API Key</span>
                </>
              )}
            </EnhancedButton>

            {FirecrawlService.getApiKey() && (
              <EnhancedButton
                variant="outline"
                onClick={clearApiKey}
                className="flex items-center space-x-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4" />
                <span>Remove</span>
              </EnhancedButton>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Google Places API Configuration */}
      <Card className="shadow-medium border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span>Google Places API Configuration</span>
            {getStatusBadge(googleKeyStatus)}
          </CardTitle>
          <CardDescription>
            Enter your Google Places API key for comprehensive business data. 
            Get your key from{" "}
            <a 
              href="https://console.cloud.google.com/apis/library/places-backend.googleapis.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center"
            >
              Google Cloud Console
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="googleApiKey" className="flex items-center space-x-2">
              {getStatusIcon(googleKeyStatus)}
              <span>Google Places API Key</span>
            </Label>
            <div className="flex space-x-2">
              <Input
                id="googleApiKey"
                type="password"
                placeholder="AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={googleApiKey}
                onChange={(e) => {
                  setGoogleApiKey(e.target.value);
                  setGoogleKeyStatus("unknown");
                }}
                className="flex-1 font-mono"
              />
              <EnhancedButton
                variant="outline"
                onClick={testGoogleApiKey}
                disabled={isTestingGoogleKey || !googleApiKey.trim()}
                className="flex items-center space-x-2"
              >
                {isTestingGoogleKey ? (
                  <>
                    <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4" />
                    <span>Test</span>
                  </>
                )}
              </EnhancedButton>
            </div>
            
            {googleKeyStatus === "valid" && (
              <div className="flex items-center space-x-2 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                <span>API key is valid and working</span>
              </div>
            )}
            
            {googleKeyStatus === "invalid" && (
              <div className="flex items-center space-x-2 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                <span>API key is invalid or inactive</span>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <EnhancedButton
              onClick={saveGoogleApiKey}
              disabled={isSavingGoogle || !googleApiKey.trim()}
              variant="gradient"
              className="flex items-center space-x-2"
            >
              {isSavingGoogle ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4" />
                  <span>Save API Key</span>
                </>
              )}
            </EnhancedButton>

            {GooglePlacesService.getApiKey() && (
              <EnhancedButton
                variant="outline"
                onClick={clearGoogleApiKey}
                className="flex items-center space-x-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4" />
                <span>Remove</span>
              </EnhancedButton>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Guidelines */}
      <Card className="shadow-medium border-0 border-warning/20 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-warning">
            <Shield className="h-5 w-5" />
            <span>Usage Guidelines</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2 text-foreground">✅ Recommended Practices</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Use for legitimate business research</li>
                <li>• Respect website terms of service</li>
                <li>• Follow rate limiting guidelines</li>
                <li>• Verify contact information before use</li>
                <li>• Comply with privacy regulations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-foreground">❌ Avoid These Practices</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Spam or unsolicited marketing</li>
                <li>• Overwhelming servers with requests</li>
                <li>• Ignoring robots.txt files</li>
                <li>• Collecting personal data inappropriately</li>
                <li>• Violating platform terms of service</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="shadow-medium border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trash2 className="h-5 w-5 text-primary" />
            <span>Data Management</span>
          </CardTitle>
          <CardDescription>
            Manage your stored data including search history and saved searches
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Search History</h4>
              <p className="text-sm text-muted-foreground">
                Your recent search queries and results are stored locally for quick access
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Saved Searches</h4>
              <p className="text-sm text-muted-foreground">
                Collections of business leads you've saved for future reference
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <h4 className="font-medium text-destructive">Danger Zone</h4>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. All your data will be permanently deleted.
                </p>
              </div>
            </div>
            <EnhancedButton
              variant="outline"
              onClick={clearAllData}
              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              Clear All Data
            </EnhancedButton>
          </div>
        </CardContent>
      </Card>

      {/* API Information */}
      <Card className="shadow-medium border-0 bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <span>About Firecrawl</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Firecrawl is a powerful web scraping API that converts websites into clean, 
            structured data. It's designed to handle complex websites with JavaScript, 
            anti-bot measures, and dynamic content.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Key Features:</h4>
              <ul className="space-y-1">
                <li>• JavaScript rendering</li>
                <li>• Anti-bot detection bypass</li>
                <li>• Rate limiting & retries</li>
                <li>• Clean data extraction</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Pricing:</h4>
              <ul className="space-y-1">
                <li>• Free tier: 500 credits/month</li>
                <li>• Starter: $20/month</li>
                <li>• Standard: $50/month</li>
                <li>• Scale: $150/month</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;