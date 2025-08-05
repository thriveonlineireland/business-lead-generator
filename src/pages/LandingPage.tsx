import { Link } from "react-router-dom";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Download, History, Shield, Zap, Target, Building2, Users, Globe, Settings as SettingsIcon } from "lucide-react";

const LandingPage = () => {
  const features = [
    {
      icon: Search,
      title: "Smart Business Search",
      description: "Find local businesses with advanced search filters for location and business type."
    },
    {
      icon: Globe,
      title: "Multiple Directories",
      description: "Search across Yellow Pages, Yelp, BBB, and other major business directories."
    },
    {
      icon: Download,
      title: "Export & Save",
      description: "Export your leads to CSV/Excel and save searches for future reference."
    },
    {
      icon: History,
      title: "Search History",
      description: "Keep track of all your searches and easily repeat successful campaigns."
    },
    {
      icon: Shield,
      title: "Ethical Scraping",
      description: "Built with responsible data collection practices and legal compliance."
    },
    {
      icon: Zap,
      title: "Fast Results",
      description: "Get comprehensive business data in seconds with our optimized scraping engine."
    }
  ];

  const directories = [
    { name: "Yellow Pages", description: "Comprehensive business listings" },
    { name: "Yelp", description: "Reviews and local business info" },
    { name: "Better Business Bureau", description: "Verified business profiles" },
    { name: "Google Search", description: "General business information" }
  ];

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 animate-fade-in">
              Professional Lead Generation Tool
            </Badge>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-slide-up">
              Find <span className="bg-gradient-primary bg-clip-text text-transparent">Business Leads</span>
              <br />
              Like Never Before
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-fade-in">
              Discover local businesses, extract contact information, and build your prospect database 
              with our powerful lead generation tool. Search multiple directories simultaneously and 
              export results instantly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up">
              <EnhancedButton variant="hero" size="lg" asChild>
                <Link to="/dashboard">
                  <Search className="mr-2 h-5 w-5" />
                  Start Finding Leads
                </Link>
              </EnhancedButton>
              
              <EnhancedButton variant="outline" size="lg" asChild>
                <Link to="/settings">
                  <Building2 className="mr-2 h-5 w-5" />
                  Setup API Key
                </Link>
              </EnhancedButton>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full animate-float hidden lg:block" />
        <div className="absolute top-40 right-20 w-32 h-32 bg-accent/10 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-success/10 rounded-full animate-float" style={{ animationDelay: '4s' }} />
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for Lead Generation
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive platform provides all the tools you need to find, 
              organize, and export business leads efficiently.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-0 shadow-medium hover:shadow-strong transition-all duration-300 hover:-translate-y-1 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Directories Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Supported Business Directories
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Search across multiple trusted business directories to maximize your lead discovery.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {directories.map((directory, index) => (
              <Card key={index} className="text-center border-0 shadow-soft hover:shadow-medium transition-all duration-300 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">{directory.name}</CardTitle>
                  <CardDescription>{directory.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Legal Disclaimer */}
      <section className="py-16 px-4 bg-muted/20">
        <div className="container mx-auto">
          <Card className="border-0 shadow-medium bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="h-6 w-6 text-primary" />
                <CardTitle className="text-xl">Responsible Use & Legal Compliance</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                <strong>Important Notice:</strong> This tool is designed for legitimate business purposes only. 
                Please ensure your use complies with all applicable laws and regulations, including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Respect robots.txt files and website terms of service</li>
                <li>Comply with GDPR, CCPA, and other privacy regulations</li>
                <li>Use scraped data only for lawful business purposes</li>
                <li>Do not overwhelm servers with excessive requests</li>
                <li>Respect rate limits and be considerate of website resources</li>
              </ul>
              <p className="text-sm">
                By using this tool, you agree to use it responsibly and in compliance with all applicable laws. 
                The developers are not responsible for misuse of this software.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Start Finding Leads?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Set up your Firecrawl API key and start discovering business opportunities today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <EnhancedButton variant="gradient" size="lg" asChild>
                <Link to="/settings">
                  <SettingsIcon className="mr-2 h-5 w-5" />
                  Configure API Key
                </Link>
              </EnhancedButton>
            
            <EnhancedButton variant="outline" size="lg" asChild>
              <Link to="/dashboard">
                <Users className="mr-2 h-5 w-5" />
                Start Searching
              </Link>
            </EnhancedButton>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;