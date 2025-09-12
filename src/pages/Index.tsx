import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

// Update this page (the content is just a fallback if you fail to update the page)

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-sm mx-auto space-y-6">
        <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
          <Search className="w-8 h-8 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Welcome to Your Blank App</h1>
          <p className="text-base sm:text-xl text-muted-foreground">Start building your amazing project here!</p>
        </div>

        <div className="pt-4">
          <Button asChild className="w-full sm:w-auto">
            <Link to="/dashboard">
              <Search className="w-4 h-4 mr-2" />
              Explore Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
