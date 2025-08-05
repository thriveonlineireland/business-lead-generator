import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

interface QuickActionsProps {
  onQuickSearch: (location: string, businessType: string) => void;
}

const QuickActions = ({ onQuickSearch }: QuickActionsProps) => {
  const quickSearches = [
    { location: "New York, NY", businessType: "restaurants", label: "NYC Restaurants" },
    { location: "Los Angeles, CA", businessType: "dental clinics", label: "LA Dental" },
    { location: "Chicago, IL", businessType: "law firms", label: "Chicago Law" },
    { location: "Miami, FL", businessType: "real estate agents", label: "Miami Real Estate" },
    { location: "Seattle, WA", businessType: "coffee shops", label: "Seattle Coffee" },
    { location: "Austin, TX", businessType: "tech companies", label: "Austin Tech" },
  ];

  return (
    <Card className="border-0 shadow-soft bg-gradient-secondary">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-primary" />
          <span>Quick Searches</span>
        </CardTitle>
        <CardDescription>
          Get started quickly with these popular search combinations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickSearches.map((search, index) => (
            <EnhancedButton
              key={index}
              variant="outline"
              size="sm"
              onClick={() => onQuickSearch(search.location, search.businessType)}
              className="h-auto p-3 flex flex-col items-center space-y-1 hover:shadow-soft transition-all duration-200"
            >
              <span className="text-xs font-medium text-center">{search.label}</span>
              <Badge variant="secondary" className="text-xs">
                {search.businessType}
              </Badge>
            </EnhancedButton>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;