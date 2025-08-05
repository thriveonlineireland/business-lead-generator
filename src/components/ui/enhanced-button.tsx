import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "./button";
import { forwardRef } from "react";

export interface EnhancedButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "hero" | "success" | "gradient";
}

const EnhancedButton = forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ className, variant, ...props }, ref) => {
    const heroVariants = {
      hero: "bg-gradient-hero text-primary-foreground shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105 animate-pulse-glow",
      success: "bg-success text-success-foreground hover:bg-success/90 shadow-soft",
      gradient: "bg-gradient-primary text-primary-foreground shadow-medium hover:shadow-strong transition-all duration-300"
    };

    const variantClasses = variant && ['hero', 'success', 'gradient'].includes(variant) 
      ? heroVariants[variant as keyof typeof heroVariants]
      : '';

    if (variantClasses) {
      return (
        <Button
          className={cn(variantClasses, className)}
          ref={ref}
          {...props}
        />
      );
    }

    return (
      <Button
        className={className}
        variant={variant as any}
        ref={ref}
        {...props}
      />
    );
  }
);

EnhancedButton.displayName = "EnhancedButton";

export { EnhancedButton };