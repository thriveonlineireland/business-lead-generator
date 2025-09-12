import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Settings as SettingsIcon, Shield, User, Mail, Calendar } from "lucide-react";

const Settings = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <div className="sticky top-0 bg-background/80 backdrop-blur border-b border-border/50 z-10 p-4">
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Account & preferences</p>
        </div>

        <div className="p-4 space-y-6">
          {/* Mobile Account Card */}
          <Card className="border-0 shadow-soft">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                <span>Account</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email || 'Not available'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Last Sign In</p>
                      <p className="text-sm text-muted-foreground">
                        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Not available'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Please sign in to view account information.</p>
              )}
            </CardContent>
          </Card>

          {/* Mobile Guidelines Card */}
          <Card className="border-0 shadow-soft border-warning/20 bg-warning/5">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-warning text-lg">
                <Shield className="h-5 w-5" />
                <span>Usage Guidelines</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-3 text-foreground text-sm">✅ Recommended</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Legitimate business research</li>
                    <li>• Respect terms of service</li>
                    <li>• Follow rate limits</li>
                    <li>• Verify contact info</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-foreground text-sm">❌ Avoid</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Spam or unsolicited marketing</li>
                    <li>• Overwhelming servers</li>
                    <li>• Ignoring robots.txt</li>
                    <li>• Violating privacy</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Service Info Card */}
          <Card className="border-0 shadow-soft bg-muted/30">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-primary text-lg">
                <SettingsIcon className="h-5 w-5" />
                <span>About</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p className="leading-relaxed">
                Our business lead search uses Google Places API to find comprehensive business information
                for your marketing and research needs.
              </p>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Features:</h4>
                  <p className="text-xs">Business data, contact info, locations, ratings</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Sources:</h4>
                  <p className="text-xs">Google Places, verified listings, public directories</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="container mx-auto p-8 max-w-6xl space-y-12 animate-fade-in">
      {/* Desktop Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">Settings</h1>
        <p className="text-xl text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Desktop Account Information */}
        <Card className="shadow-medium border-0">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Account Information</CardTitle>
            <CardDescription className="text-base">
              Your account details and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {user ? (
              <div className="space-y-6">
                <div className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg">
                  <Mail className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <strong className="text-base">Email:</strong>
                    <p className="text-muted-foreground">{user.email || 'Not available'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg">
                  <User className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <strong className="text-base">User ID:</strong>
                    <p className="text-muted-foreground text-sm font-mono">{user.id || 'Not available'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <strong className="text-base">Last Sign In:</strong>
                    <p className="text-muted-foreground">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Not available'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Please sign in to view account information.</p>
            )}
          </CardContent>
        </Card>

        {/* Desktop Service Information */}
        <Card className="shadow-medium border-0 bg-muted/30">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center space-x-3 text-2xl">
              <SettingsIcon className="h-6 w-6 text-primary" />
              <span>About Business Lead Search</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-base text-muted-foreground">
            <p className="leading-relaxed">
              Our business lead search uses Google Places API to find comprehensive business information
              including contact details, locations, ratings, and more. The service is designed to help
              you find legitimate business leads for your marketing and research needs.
            </p>
            <div className="grid gap-6">
              <div>
                <h4 className="font-semibold text-foreground mb-3 text-lg">Key Features:</h4>
                <ul className="space-y-2">
                  <li>• Comprehensive business data</li>
                  <li>• Contact information extraction</li>
                  <li>• Location-based searching</li>
                  <li>• Rating and review data</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-3 text-lg">Data Sources:</h4>
                <ul className="space-y-2">
                  <li>• Google Places API</li>
                  <li>• Business website scraping</li>
                  <li>• Verified business listings</li>
                  <li>• Public directory information</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Usage Guidelines */}
      <Card className="shadow-medium border-0 border-warning/20 bg-warning/5">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center space-x-3 text-warning text-2xl">
            <Shield className="h-6 w-6" />
            <span>Usage Guidelines</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold mb-4 text-foreground text-lg">✅ Recommended Practices</h4>
              <ul className="space-y-3 text-muted-foreground">
                <li>• Use for legitimate business research</li>
                <li>• Respect website terms of service</li>
                <li>• Follow rate limiting guidelines</li>
                <li>• Verify contact information before use</li>
                <li>• Comply with privacy regulations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground text-lg">❌ Avoid These Practices</h4>
              <ul className="space-y-3 text-muted-foreground">
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
    </div>
  );
};

export default Settings;