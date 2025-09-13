import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search, Settings, History, Home, Building2, LogIn, User, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

const Navigation = () => {
  const location = useLocation();
  const { user, signOut, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const navigationItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/dashboard", label: "Dashboard", icon: Search },
    { path: "/history", label: "History", icon: History },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const getUserInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  // Mobile Navigation Component
  const MobileNavigation = () => (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors">
          <Menu className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 bg-background">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              ProspectlyPro
            </span>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col space-y-4 mt-8">
          {/* Navigation Links */}
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200",
                  "hover:bg-muted hover:shadow-soft",
                  isActive && "bg-primary text-primary-foreground shadow-medium"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium text-base">{item.label}</span>
              </Link>
            );
          })}
          
          {/* Auth Section */}
          <div className="pt-4 border-t border-border">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3 px-4 py-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials(user.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                  </div>
                </div>
                
                <Link
                  to="/settings"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </Link>
                
                <button
                  onClick={() => {
                    signOut();
                    setIsOpen(false);
                  }}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-destructive w-full text-left"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <nav className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-16 min-w-0">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group shrink-0 mr-8">
            <Building2 className="h-8 w-8 text-primary group-hover:text-accent transition-colors" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              ProspectlyPro
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4 min-w-0">
            {/* Navigation Links */}
            <div className="flex space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200",
                      "hover:bg-muted hover:shadow-soft",
                      isActive && "bg-primary text-primary-foreground shadow-medium"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Desktop Auth Section */}
            {!isLoading && (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {getUserInitials(user.email || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium hidden lg:block">
                          {user.email}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-background border shadow-lg z-50">
                      <DropdownMenuItem asChild>
                        <Link to="/settings" className="flex items-center space-x-2 cursor-pointer">
                          <User className="h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/settings" className="flex items-center space-x-2 cursor-pointer">
                          <Settings className="h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.preventDefault();
                          console.log('🖱️ Sign out clicked');
                          signOut();
                        }}
                        className="flex items-center space-x-2 cursor-pointer text-destructive focus:text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link to="/auth">
                    <EnhancedButton variant="outline" size="sm" className="flex items-center space-x-2">
                      <LogIn className="h-4 w-4" />
                      <span className="hidden sm:inline">Sign In</span>
                    </EnhancedButton>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex items-center space-x-2 md:hidden">
            {!isLoading && user && (
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getUserInitials(user.email || "U")}
                </AvatarFallback>
              </Avatar>
            )}
            <MobileNavigation />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;