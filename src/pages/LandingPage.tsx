import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Download, History, Shield, Zap, Target, Building2, Users, Globe, Settings as SettingsIcon, LogIn, ArrowDown, Play } from "lucide-react";

const LandingPage = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
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

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        {/* Mobile Hero Section */}
        <section className="px-4 pt-8 pb-12">
          <div className="text-center space-y-6">
            <Badge variant="secondary" className="animate-fade-in">
              🚀 Lead Gen Tool
            </Badge>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-bold leading-tight">
                Find Business
                <br />
                <span className="bg-gradient-primary bg-clip-text text-transparent">Leads Fast</span>
              </h1>
              
              <p className="text-lg text-muted-foreground px-2">
                Search multiple directories. Export instantly. Build your pipeline.
              </p>
            </div>
            
            <div className="pt-4 space-y-3">
              {user ? (
                <EnhancedButton variant="hero" size="lg" className="w-full py-4" asChild>
                  <Link to="/dashboard">
                    <Play className="mr-2 h-5 w-5" />
                    Start Searching
                  </Link>
                </EnhancedButton>
              ) : (
                <EnhancedButton variant="hero" size="lg" className="w-full py-4" asChild>
                  <Link to="/auth">
                    <LogIn className="mr-2 h-5 w-5" />
                    Get Started Free
                  </Link>
                </EnhancedButton>
              )}
              
              <div className="flex items-center justify-center text-sm text-muted-foreground animate-bounce">
                <ArrowDown className="h-4 w-4 mr-1" />
                Swipe to explore
              </div>
            </div>
          </div>
        </section>
        
        {/* Mobile Quick Stats */}
        <section className="px-4 pb-8">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card/80 backdrop-blur rounded-lg p-4 text-center border border-border/50">
              <div className="text-2xl font-bold text-primary">500+</div>
              <div className="text-xs text-muted-foreground">Leads/Search</div>
            </div>
            <div className="bg-card/80 backdrop-blur rounded-lg p-4 text-center border border-border/50">
              <div className="text-2xl font-bold text-success">2min</div>
              <div className="text-xs text-muted-foreground">Avg Time</div>
            </div>
            <div className="bg-card/80 backdrop-blur rounded-lg p-4 text-center border border-border/50">
              <div className="text-2xl font-bold text-accent">4+</div>
              <div className="text-xs text-muted-foreground">Directories</div>
            </div>
          </div>
        </section>

        {/* Mobile Features - Swipeable Cards */}
        <section className="px-4 py-8">
          <h2 className="text-2xl font-bold text-center mb-6">Everything You Need</h2>
          <div className="space-y-4">
            {features.slice(0, 3).map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-0 shadow-soft bg-card/80 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-2">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="text-center mt-6">
            <EnhancedButton variant="outline" size="sm">
              View All Features
            </EnhancedButton>
          </div>
        </section>

        {/* Mobile CTA */}
        <section className="px-4 py-12 text-center">
          <div className="bg-gradient-primary rounded-2xl p-8 text-primary-foreground">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="mb-6 opacity-90">
              Join thousands of businesses finding their next customers
            </p>
            {user ? (
              <EnhancedButton variant="secondary" size="lg" className="w-full" asChild>
                <Link to="/dashboard">
                  Go to Dashboard
                </Link>
              </EnhancedButton>
            ) : (
              <EnhancedButton variant="secondary" size="lg" className="w-full" asChild>
                <Link to="/auth">
                  Start Free Trial
                </Link>
              </EnhancedButton>
            )}
          </div>
        </section>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Desktop Hero Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 animate-fade-in">
              Professional Lead Generation Tool
            </Badge>
            
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 animate-slide-up leading-tight">
              Find <span className="bg-gradient-primary bg-clip-text text-transparent">Business Leads</span>
              <br />
              Like Never Before
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-fade-in">
              Discover local businesses, extract contact information, and build your prospect database 
              with our powerful lead generation tool. Search multiple directories simultaneously and 
              export results instantly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up mb-12">
              {user ? (
                <EnhancedButton variant="hero" size="lg" asChild>
                  <Link to="/dashboard">
                    <Search className="mr-2 h-5 w-5" />
                    Go to Dashboard
                  </Link>
                </EnhancedButton>
              ) : (
                <EnhancedButton variant="hero" size="lg" asChild>
                  <Link to="/auth">
                    <LogIn className="mr-2 h-5 w-5" />
                    Sign In / Sign Up
                  </Link>
                </EnhancedButton>
              )}
              <EnhancedButton variant="outline" size="lg">
                Watch Demo
              </EnhancedButton>
            </div>

            {/* Desktop Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Leads per search</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-success">2min</div>
                <div className="text-sm text-muted-foreground">Average search time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">4+</div>
                <div className="text-sm text-muted-foreground">Data sources</div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full animate-float hidden lg:block" />
        <div className="absolute top-40 right-20 w-32 h-32 bg-accent/10 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-success/10 rounded-full animate-float" style={{ animationDelay: '4s' }} />
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4">
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

          <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Supported Business Directories
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Search across multiple trusted business directories to maximize your lead discovery.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

    </div>
  );
};

export default LandingPage;