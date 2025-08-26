import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";

const EmailConfirmation = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Get the token and type from URL parameters
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        
        console.log('Confirmation attempt:', { token: token?.substring(0, 10) + '...', type });

        if (!token || !type) {
          setStatus('error');
          setMessage('Invalid confirmation link. Please check your email and try again.');
          return;
        }

        // Verify the email confirmation
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as any
        });

        console.log('Verification result:', { data: !!data, error: error?.message });

        if (error) {
          console.error('Email confirmation error:', error);
          setStatus('error');
          setMessage(error.message || 'Failed to confirm email. The link may have expired.');
          
          toast({
            title: "Confirmation failed",
            description: error.message || 'Failed to confirm email. The link may have expired.',
            variant: "destructive",
          });
        } else {
          setStatus('success');
          setMessage('Your email has been confirmed successfully! You can now sign in.');
          
          toast({
            title: "Email confirmed!",
            description: "Your account is now active. You can sign in.",
          });

          // Redirect to dashboard if user is now logged in, otherwise to auth page
          setTimeout(() => {
            if (data.user) {
              navigate("/dashboard");
            } else {
              navigate("/auth");
            }
          }, 2000);
        }
      } catch (error) {
        console.error('Unexpected error during email confirmation:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
        
        toast({
          title: "Error",
          description: "An unexpected error occurred during confirmation.",
          variant: "destructive",
        });
      }
    };

    confirmEmail();
  }, [searchParams, navigate, toast]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-success" />;
      case 'error':
        return <XCircle className="h-12 w-12 text-destructive" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Confirming your email...';
      case 'success':
        return 'Email confirmed!';
      case 'error':
        return 'Confirmation failed';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Email Confirmation</h1>
        </div>

        {/* Confirmation Status */}
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {getIcon()}
            </div>
            <CardTitle className="text-xl">
              {getTitle()}
            </CardTitle>
            <CardDescription className="text-center">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'success' && (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Redirecting you automatically...
                </p>
                <EnhancedButton
                  onClick={() => navigate("/dashboard")}
                  className="w-full"
                  variant="gradient"
                >
                  Go to Dashboard
                </EnhancedButton>
              </div>
            )}
            
            {status === 'error' && (
              <div className="text-center space-y-4">
                <EnhancedButton
                  onClick={() => navigate("/auth")}
                  className="w-full"
                  variant="outline"
                >
                  Back to Sign In
                </EnhancedButton>
              </div>
            )}
            
            {status === 'loading' && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Please wait while we confirm your email address...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailConfirmation;