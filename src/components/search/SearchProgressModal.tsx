import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, Search, MapPin, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SearchProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
  businessType: string;
  onCancel?: () => void;
}

interface SearchStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  description?: string;
  count?: number;
}

export const SearchProgressModal = ({ isOpen, onClose, location, businessType, onCancel }: SearchProgressModalProps) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalFound, setTotalFound] = useState(0);
  const [searchSteps, setSearchSteps] = useState<SearchStep[]>([
    { id: 'init', label: 'Initializing Search', status: 'pending' },
    { id: 'variations', label: 'Creating Search Variations', status: 'pending' },
    { id: 'places', label: 'Searching Google Places', status: 'pending', description: 'Finding businesses...' },
    { id: 'details', label: 'Gathering Business Details', status: 'pending' },
    { id: 'emails', label: 'Extracting Contact Information', status: 'pending' },
    { id: 'saving', label: 'Saving Results', status: 'pending' }
  ]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setProgress(0);
      setCurrentStep(0);
      setTotalFound(0);
      setSearchSteps(steps => steps.map(step => ({ ...step, status: 'pending', count: undefined })));
      return;
    }

    // Simulate search progress
    const simulateProgress = () => {
      let stepIndex = 0;
      let progressValue = 0;

      const updateStep = (index: number, status: SearchStep['status'], count?: number, description?: string) => {
        setSearchSteps(prev => prev.map((step, i) => 
          i === index 
            ? { ...step, status, count, description: description || step.description }
            : i < index 
              ? { ...step, status: 'completed' }
              : step
        ));
        setCurrentStep(index);
      };

      const intervals = [
        () => { // Step 0: Initialize
          updateStep(0, 'active');
          progressValue = 5;
          setProgress(progressValue);
        },
        () => { // Step 1: Create variations
          updateStep(0, 'completed');
          updateStep(1, 'active');
          progressValue = 15;
          setProgress(progressValue);
        },
        () => { // Step 2: Start Places search
          updateStep(1, 'completed');
          updateStep(2, 'active', 0, 'Searching multiple variations...');
          progressValue = 25;
          setProgress(progressValue);
        },
        () => { // Continue Places search
          updateStep(2, 'active', Math.floor(Math.random() * 50), 'Found initial results...');
          progressValue = 40;
          setProgress(progressValue);
        },
        () => { // More Places results
          const found = Math.floor(Math.random() * 100) + 50;
          updateStep(2, 'active', found, 'Expanding search area...');
          setTotalFound(found);
          progressValue = 55;
          setProgress(progressValue);
        },
        () => { // Step 3: Gather details
          updateStep(2, 'completed', totalFound);
          updateStep(3, 'active', 0, 'Getting detailed business info...');
          progressValue = 70;
          setProgress(progressValue);
        },
        () => { // Step 4: Extract emails
          updateStep(3, 'completed');
          updateStep(4, 'active', 0, 'Checking websites for contact info...');
          progressValue = 85;
          setProgress(progressValue);
        },
        () => { // Step 5: Save results
          updateStep(4, 'completed');
          updateStep(5, 'active', 0, 'Finalizing results...');
          progressValue = 95;
          setProgress(progressValue);
        },
        () => { // Complete
          updateStep(5, 'completed');
          progressValue = 100;
          setProgress(progressValue);
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      ];

      intervals.forEach((fn, index) => {
        setTimeout(fn, index * 2000 + 500);
      });
    };

    // Start the progress simulation
    const timeout = setTimeout(simulateProgress, 500);

    return () => clearTimeout(timeout);
  }, [isOpen, onClose, totalFound]);

  const getStepIcon = (step: SearchStep) => {
    switch (step.status) {
      case 'active':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-muted" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Searching Business Leads
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            <span className="font-medium">{businessType}</span> in <span className="font-medium">{location}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            {totalFound > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{totalFound} businesses found so far</span>
              </div>
            )}
          </div>

          {/* Search Steps */}
          <div className="space-y-3">
            {searchSteps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-3">
                {getStepIcon(step)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      step.status === 'active' ? 'text-primary' : 
                      step.status === 'completed' ? 'text-success' : 
                      step.status === 'error' ? 'text-destructive' : 
                      'text-muted-foreground'
                    }`}>
                      {step.label}
                    </span>
                    {typeof step.count === 'number' && (
                      <Badge variant="secondary" className="text-xs">
                        {step.count}
                      </Badge>
                    )}
                  </div>
                  {step.status === 'active' && step.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Cancel Button */}
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => {
                onCancel?.();
                onClose();
              }}
              disabled={progress >= 95}
            >
              Cancel Search
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};