import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Star, Users, Mail, Phone, Download, History, Shield } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (plan: string) => void;
  hiddenLeadsCount?: number;
}

const UpgradeModal = ({ isOpen, onClose, onUpgrade, hiddenLeadsCount = 0 }: UpgradeModalProps) => {
  const [selectedPlan, setSelectedPlan] = useState<string>("pro");

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: 29,
      period: "month",
      description: "Perfect for small businesses and freelancers",
      features: [
        "Up to 500 leads per search",
        "Email & phone contact info",
        "Basic export (CSV, JSON)",
        "Search history",
        "Email support"
      ],
      icon: Zap,
      popular: false
    },
    {
      id: "pro",
      name: "Professional",
      price: 79,
      period: "month",
      description: "Ideal for growing teams and agencies",
      features: [
        "Unlimited leads per search",
        "Complete contact information",
        "Advanced export options",
        "Lead tracking & CRM",
        "Email automation tools",
        "Priority support",
        "Custom integrations"
      ],
      icon: Crown,
      popular: true
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: 199,
      period: "month",
      description: "For large teams and organizations",
      features: [
        "Everything in Professional",
        "White-label solution",
        "API access",
        "Custom data sources",
        "Dedicated account manager",
        "SLA guarantee",
        "Advanced analytics"
      ],
      icon: Star,
      popular: false
    }
  ];

  const handleUpgrade = () => {
    onUpgrade(selectedPlan);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Upgrade to ProspectlyPro
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            {hiddenLeadsCount > 0 
              ? `Unlock ${hiddenLeadsCount} more leads and get access to our complete lead generation suite`
              : "Choose the perfect plan for your lead generation needs"
            }
          </DialogDescription>
        </DialogHeader>

        {hiddenLeadsCount > 0 && (
          <Card className="border-primary/20 bg-primary/5 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-center space-x-2 text-primary">
                <Users className="h-5 w-5" />
                <span className="font-semibold">
                  {hiddenLeadsCount} premium leads are waiting to be unlocked!
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.id;
            
            return (
              <Card 
                key={plan.id}
                className={`relative transition-all cursor-pointer ${
                  isSelected 
                    ? 'border-2 border-primary shadow-strong' 
                    : 'border hover:shadow-medium'
                } ${plan.popular ? 'ring-2 ring-primary/20' : ''}`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-2">
                    <div className={`p-3 rounded-full ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold">
                      ${plan.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{plan.period}
                      </span>
                    </div>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

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
            onClick={handleUpgrade}
            className="min-w-[200px] flex items-center space-x-2"
          >
            <Crown className="h-5 w-5" />
            <span>Start {plans.find(p => p.id === selectedPlan)?.name} Plan</span>
          </EnhancedButton>
        </div>

        <div className="text-center text-sm text-muted-foreground mt-4">
          <div className="flex items-center justify-center space-x-4 mb-2">
            <div className="flex items-center space-x-1">
              <Shield className="h-4 w-4" />
              <span>30-day money-back guarantee</span>
            </div>
            <div className="flex items-center space-x-1">
              <Mail className="h-4 w-4" />
              <span>Cancel anytime</span>
            </div>
          </div>
          <p>All plans include access to our lead database and contact information.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;