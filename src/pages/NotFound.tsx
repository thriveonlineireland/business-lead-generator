import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-secondary p-4">
      <Card className="w-full max-w-md shadow-medium border-0">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Search className="w-10 h-10 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">404</h1>
            <h2 className="text-lg font-semibold text-foreground">Page Not Found</h2>
            <p className="text-muted-foreground">
              Oops! The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              asChild 
              variant="default" 
              className="flex items-center gap-2"
            >
              <Link to="/">
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            </Button>
            
            <Button 
              asChild 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => window.history.back()}
            >
              <button>
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            </Button>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              If you believe this is an error, please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
