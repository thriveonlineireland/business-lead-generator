import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, LogIn, UserPlus, Eye, EyeOff, Mail, Lock } from "lucide-react";

const Auth = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: ""
  });
  const [resendLoading, setResendLoading] = useState(false);

  const handleResendConfirmation = async () => {
    if (!formData.email) {
      toast({
        title: "Email required",
        description: "Please enter your email address to resend confirmation.",
        variant: "destructive",
      });
      return;
    }

    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`
        }
      });

      if (error) {
        toast({
          title: "Resend failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ Confirmation email sent!",
          description: (
            <div className="space-y-1">
              <p>Check your email (including spam folder) for the confirmation link.</p>
              <p className="text-xs text-muted-foreground">It may take a few minutes to arrive.</p>
            </div>
          ),
          duration: 6000,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend confirmation email.",
        variant: "destructive",
      });
    } finally {
      setResendLoading(false);
    }
  };

  useEffect(() => {
    // Check if user is already authenticated
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth/confirm`;
      
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: formData.displayName
          }
        }
      });

      if (error) {
        // Check for various "user already exists" error scenarios
        const isUserExists = error.message.includes("already registered") || 
                           error.message.includes("User already registered") ||
                           error.message.includes("already been registered") ||
                           error.code === "user_already_exists";

        if (isUserExists) {
          toast({
            title: "Account Already Exists",
            description: (
              <div className="space-y-2">
                <p>This email is already registered.</p>
                <p className="text-sm text-green-600">✅ Switched to sign-in mode for you!</p>
              </div>
            ),
            variant: "default",
          });
          // Auto-switch to sign-in and keep the email
          setIsSignUp(false);
          setFormData(prev => ({ 
            ...prev, 
            password: "", 
            displayName: "" 
          }));
        } else {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Account created successfully! 🎉",
          description: (
            <div className="space-y-2">
              <p>Please check your email (including spam folder) for a confirmation link.</p>
              <p className="text-xs text-blue-600">💡 If you don't receive an email in 5 minutes, try the "Resend confirmation" button below.</p>
            </div>
          ),
          duration: 8000,
        });
        // Switch to sign in mode after successful registration
        setIsSignUp(false);
        setFormData({ email: formData.email, password: "", displayName: "" });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        toast({
          title: "Reset failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Reset email sent!",
          description: "Check your email for password reset instructions.",
        });
        // Switch back to sign in mode
        setIsForgotPassword(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Sign in failed",
            description: (
              <div className="space-y-2">
                <p>Please check your email and password.</p>
                <p className="text-xs text-amber-600">⚠️ If you just signed up, make sure to confirm your email first!</p>
              </div>
            ),
            variant: "destructive",
            duration: 6000,
          });
        } else if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email not confirmed",
            description: (
              <div className="space-y-2">
                <p>Please check your email and click the confirmation link.</p>
                <p className="text-xs text-blue-600">💡 Use the "Resend confirmation" button below if needed.</p>
              </div>
            ),
            variant: "destructive",
            duration: 8000,
          });
        } else {
          toast({
            title: "Sign in failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
        navigate("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <User className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Business Lead Generator</h1>
          <p className="text-muted-foreground">
            {isForgotPassword 
              ? "Enter your email to receive password reset instructions"
              : isSignUp 
                ? "Create your account to get started" 
                : "Welcome back! Please sign in to continue"
            }
          </p>
        </div>

        {/* Auth Form */}
        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">
              {isForgotPassword ? "Reset Password" : isSignUp ? "Create Account" : "Sign In"}
            </CardTitle>
            <CardDescription className="text-center">
              {isForgotPassword 
                ? "We'll send you a link to reset your password"
                : isSignUp 
                  ? "Enter your details to create your account" 
                  : "Enter your credentials to access your account"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={isForgotPassword ? handleForgotPassword : isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Display Name</span>
                  </Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    required={isSignUp}
                    className="transition-all duration-200"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="transition-all duration-200"
                />
              </div>

              {!isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <span>Password</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="transition-all duration-200 pr-10"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {isSignUp && (
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters long
                    </p>
                  )}
                </div>
              )}

              <EnhancedButton
                type="submit"
                className="w-full"
                disabled={isLoading}
                size="lg"
                variant="gradient"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>
                      {isForgotPassword 
                        ? "Sending reset email..." 
                        : isSignUp 
                          ? "Creating account..." 
                          : "Signing in..."
                      }
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    {isForgotPassword 
                      ? <Mail className="h-4 w-4" />
                      : isSignUp 
                        ? <UserPlus className="h-4 w-4" /> 
                        : <LogIn className="h-4 w-4" />
                    }
                    <span>
                      {isForgotPassword 
                        ? "Send Reset Email" 
                        : isSignUp 
                          ? "Create Account" 
                          : "Sign In"
                      }
                    </span>
                  </div>
                )}
              </EnhancedButton>
            </form>

            <Separator />

            <div className="text-center space-y-3">
              {!isForgotPassword ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setIsForgotPassword(false);
                      setFormData({ email: "", password: "", displayName: "" });
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isSignUp ? (
                      <>Already have an account? <span className="text-primary font-medium">Sign in</span></>
                    ) : (
                      <>Don't have an account? <span className="text-primary font-medium">Sign up</span></>
                    )}
                  </button>

                  {!isSignUp && (
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setIsSignUp(false);
                          setFormData(prev => ({ ...prev, password: "", displayName: "" }));
                        }}
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot your password?
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setIsSignUp(false);
                    setFormData({ email: "", password: "", displayName: "" });
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to sign in
                </button>
              )}
              
              {!isSignUp && !isForgotPassword && (
                <div className="pt-4 border-t bg-muted/30 rounded-lg p-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-3">
                      🚨 <strong>Not receiving emails?</strong> Check your spam folder first!
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Haven't received your confirmation email?
                    </p>
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={resendLoading || !formData.email}
                      className="text-xs text-primary hover:underline disabled:opacity-50 font-medium"
                    >
                      {resendLoading ? "Sending..." : "🔄 Resend confirmation email"}
                    </button>
                    {!formData.email && (
                      <p className="text-xs text-red-500 mt-1">Enter your email above first</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Secure authentication powered by Supabase</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;