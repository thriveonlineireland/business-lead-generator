import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Search } from "lucide-react";

interface ExpandSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpandSearch: () => void;
  currentCount: number;
  location: string;
  businessType: string;
}

export function ExpandSearchDialog({
  open,
  onOpenChange,
  onExpandSearch,
  currentCount,
  location,
  businessType
}: ExpandSearchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Expand Search Area?
          </DialogTitle>
          <DialogDescription>
            Found {currentCount} {businessType} leads in {location}. 
            We can search a wider area to find more potential leads.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Search className="h-4 w-4" />
              Expanded Search Will Include:
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Surrounding areas and neighborhoods</li>
              <li>• Additional business categories</li>
              <li>• Potentially 200-500 more leads</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep Current Results
          </Button>
          <Button onClick={onExpandSearch} className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Expand Search Area
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}