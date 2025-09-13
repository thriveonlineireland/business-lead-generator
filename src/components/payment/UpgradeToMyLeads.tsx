import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, History, Users, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UpgradeToMyLeadsProps {
  onUpgrade?: () => void;
}

const UpgradeToMyLeads = ({ onUpgrade }: UpgradeToMyLeadsProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      
      // Call our edge function to create checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: 'price_1OYourPriceId', // You'll need to create this in Stripe Dashboard
          successUrl: `${window.location.origin}/history?upgraded=true`,
          cancelUrl: `${window.location.origin}/history?upgrade=cancelled`,
        },
      });

      if (error) throw error;

      if (data?.sessionUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.sessionUrl;
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast({
        title: 'Upgrade Failed',
        description: 'Unable to start upgrade process. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: History, text: 'Access to all previous searches' },
    { icon: Users, text: 'Unlimited lead management' },
    { icon: Mail, text: 'Email campaign tools' },
    { icon: Zap, text: 'Advanced filtering & sorting' },
    { icon: Crown, text: 'Priority customer support' },
  ];

  return (
    <div className="max-w-md mx-auto">
      <Card className="border-2 border-primary/20">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-2">
            <Badge variant="secondary" className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          </div>
          <CardTitle className="text-2xl font-bold">Upgrade to My Leads</CardTitle>
          <CardDescription>
            Unlock powerful lead management features
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-3xl font-bold">€10</div>
            <div className="text-sm text-muted-foreground">per month</div>
          </div>

          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center space-x-2">
                  <feature.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{feature.text}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <Button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Now
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            Cancel anytime. Secure payment powered by Stripe.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpgradeToMyLeads;