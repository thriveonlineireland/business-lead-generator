import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Users, Mail, Download, Shield, Calculator } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (leadCount: number) => void;
  hiddenLeadsCount?: number;
}

const UpgradeModal = ({ isOpen, onClose, onPurchase, hiddenLeadsCount = 0 }: UpgradeModalProps) => {
  const [selectedPackage, setSelectedPackage] = useState<number>(100);

  const PRICE_PER_100_LEADS = 10; // €10 per 100 leads

  const packages = [
    {
      leads: 100,
      price: 10,
      popular: false,
      description: "Perfect for small campaigns"
    },
    {
      leads: 500,
      price: 45,
      popular: true,
      description: "Best value for growing businesses",
      savings: 10
    },
    {
      leads: 1000,
      price: 80,
      popular: false,
      description: "Ideal for large campaigns",
      savings: 20
    }
  ];

  const calculateLeadsNeeded = () => {
    return Math.ceil(hiddenLeadsCount / 100) * 100;
  };

  const handlePurchase = () => {
    onPurchase(selectedPackage);
    onClose();
  };

  const features = [
    "Complete contact information (email, phone, website)",
    "Instant CSV/JSON export",
    "Save leads to your account",
    "No monthly commitments",
    "Pay only for what you use"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Unlock Your Business Leads
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            {hiddenLeadsCount > 0 
              ? `Unlock ${hiddenLeadsCount} more leads for just €${Math.ceil(hiddenLeadsCount / 100) * PRICE_PER_100_LEADS}`
              : "Pay only for the leads you need - no monthly subscriptions"
            }
          </DialogDescription>
        </DialogHeader>

        {hiddenLeadsCount > 0 && (
          <Card className="border-primary/20 bg-primary/5 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-center space-x-2 text-primary">
                <Users className="h-5 w-5" />
                <span className="font-semibold">
                  {hiddenLeadsCount} premium leads are ready to unlock
                </span>
              </div>
              <div className="text-center mt-2 text-sm text-muted-foreground">
                Minimum purchase: {calculateLeadsNeeded()} leads for €{Math.ceil(hiddenLeadsCount / 100) * PRICE_PER_100_LEADS}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {packages.map((pkg) => {
            const isSelected = selectedPackage === pkg.leads;
            const pricePerLead = (pkg.price / pkg.leads).toFixed(3);
            
            return (
              <Card 
                key={pkg.leads}
                className={`relative transition-all cursor-pointer ${
                  isSelected 
                    ? 'border-2 border-primary shadow-strong' 
                    : 'border hover:shadow-medium'
                } ${pkg.popular ? 'ring-2 ring-primary/20' : ''}`}
                onClick={() => setSelectedPackage(pkg.leads)}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      Best Value
                    </Badge>
                  </div>
                )}

                {pkg.savings && (
                  <div className="absolute -top-2 -right-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      Save €{pkg.savings}
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-2">
                    <div className={`p-3 rounded-full ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Calculator className="h-6 w-6" />
                    </div>
                  </div>
                  
                  <CardTitle className="text-2xl font-bold">{pkg.leads} Leads</CardTitle>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-primary">
                      €{pkg.price}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      €{pricePerLead} per lead
                    </div>
                  </div>
                  <CardDescription className="text-sm">{pkg.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="text-center text-sm text-muted-foreground mb-4">
                    Includes everything you need:
                  </div>
                  
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center space-x-2">
                      <Check className="h-3 w-3 text-primary flex-shrink-0" />
                      <span>Email addresses</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="h-3 w-3 text-primary flex-shrink-0" />
                      <span>Phone numbers</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="h-3 w-3 text-primary flex-shrink-0" />
                      <span>Website URLs</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="h-3 w-3 text-primary flex-shrink-0" />
                      <span>Business addresses</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="h-3 w-3 text-primary flex-shrink-0" />
                      <span>Instant CSV export</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-muted/30 mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 text-center">What You Get With Every Purchase:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 border-t">
          <EnhancedButton
            variant="outline"
            size="lg"
            onClick={onClose}
            className="min-w-[150px]"
          >
            Maybe Later
          </EnhancedButton>
          
          <EnhancedButton
            variant="gradient"
            size="lg"
            onClick={handlePurchase}
            className="min-w-[200px] flex items-center space-x-2"
          >
            <Crown className="h-5 w-5" />
            <span>Get {selectedPackage} Leads - €{packages.find(p => p.leads === selectedPackage)?.price}</span>
          </EnhancedButton>
        </div>

        <div className="text-center text-sm text-muted-foreground mt-4">
          <div className="flex items-center justify-center space-x-4 mb-2">
            <div className="flex items-center space-x-1">
              <Shield className="h-4 w-4" />
              <span>Secure payment</span>
            </div>
            <div className="flex items-center space-x-1">
              <Download className="h-4 w-4" />
              <span>Instant download</span>
            </div>
            <div className="flex items-center space-x-1">
              <Mail className="h-4 w-4" />
              <span>24/7 support</span>
            </div>
          </div>
          <p>One-time payment • No recurring charges • Complete ownership of your leads</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;