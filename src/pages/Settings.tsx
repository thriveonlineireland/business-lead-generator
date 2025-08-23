import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Settings as SettingsIcon, Shield } from "lucide-react";

const Settings = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Account Information */}
      <Card className="shadow-medium border-0">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your account details and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-4">
              <div>
                <strong>Email:</strong> {user.email || 'Not available'}
              </div>
              <div>
                <strong>User ID:</strong> {user.id || 'Not available'}
              </div>
              <div>
                <strong>Last Sign In:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Not available'}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Please sign in to view account information.</p>
          )}
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

      {/* Service Information */}
      <Card className="shadow-medium border-0 bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <span>About Business Lead Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Our business lead search uses Google Places API to find comprehensive business information
            including contact details, locations, ratings, and more. The service is designed to help
            you find legitimate business leads for your marketing and research needs.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Key Features:</h4>
              <ul className="space-y-1">
                <li>• Comprehensive business data</li>
                <li>• Contact information extraction</li>
                <li>• Location-based searching</li>
                <li>• Rating and review data</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Data Sources:</h4>
              <ul className="space-y-1">
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
  );
};

export default Settings;