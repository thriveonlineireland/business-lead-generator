import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

interface QuickActionsProps {
  onQuickSearch: (location: string, businessType: string) => void;
}

const QuickActions = ({ onQuickSearch }: QuickActionsProps) => {
  const quickSearches = [
    { location: "Dublin, Ireland", businessType: "restaurant", label: "Dublin Restaurants", target: "1000+" },
    { location: "Dublin, Ireland", businessType: "hair-salon", label: "Dublin Hair Salons", target: "500+" },
    { location: "Cork, Ireland", businessType: "cafe", label: "Cork Cafes", target: "300+" },
    { location: "London, UK", businessType: "dentist", label: "London Dentists", target: "800+" },
    { location: "Manchester, UK", businessType: "lawyer", label: "Manchester Lawyers", target: "600+" },
    { location: "New York, NY, USA", businessType: "restaurant", label: "NYC Restaurants", target: "2000+" },
    { location: "Los Angeles, CA, USA", businessType: "beauty-salon", label: "LA Beauty Salons", target: "1500+" },
    { location: "Chicago, IL, USA", businessType: "accountant", label: "Chicago Accountants", target: "700+" }
  ];

  return (
    <Card className="border-0 shadow-soft bg-gradient-secondary">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-primary" />
          <span>Quick Searches</span>
        </CardTitle>
        <CardDescription>
          Get started quickly with optimized search combinations for maximum results
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickSearches.map((search, index) => (
            <EnhancedButton
              key={index}
              variant="outline"
              size="sm"
              onClick={() => onQuickSearch(search.location, search.businessType)}
              className="h-auto p-3 flex flex-col items-center space-y-2 hover:shadow-soft transition-all duration-200"
              title={`Search for ${search.businessType} in ${search.location}`}
            >
              <span className="text-xs font-medium text-center leading-tight">{search.label}</span>
              <Badge variant="secondary" className="text-xs">
                Target: {search.target} leads
              </Badge>
            </EnhancedButton>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;