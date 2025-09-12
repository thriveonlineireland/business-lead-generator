import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

interface QuickActionsProps {
  onQuickSearch: (location: string, businessType: string) => void;
}

const QuickActions = ({ onQuickSearch }: QuickActionsProps) => {
  const quickSearches = [
    { location: "Dublin, Ireland", businessType: "hair-salon", label: "Dublin Hair Salons" },
    { location: "Dublin 2, Ireland", businessType: "restaurant", label: "Dublin 2 Restaurants" },
    { location: "Cork, Ireland", businessType: "dentist", label: "Cork Dentists" },
    { location: "London, UK", businessType: "lawyer", label: "London Lawyers" },
    { location: "Dublin 4, Ireland", businessType: "cafe", label: "Dublin 4 Cafes" },
    { location: "Manchester, UK", businessType: "accountant", label: "Manchester Accountants" },
    { location: "New York, NY, USA", businessType: "real-estate", label: "NYC Real Estate" },
    { location: "Los Angeles, CA, USA", businessType: "beauty-salon", label: "LA Beauty" }
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
                Target: 500+ leads
              </Badge>
            </EnhancedButton>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;