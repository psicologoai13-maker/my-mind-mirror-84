import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const glassCardVariants = cva(
  "relative overflow-hidden rounded-3xl transition-all duration-300",
  {
    variants: {
      variant: {
        default: [
          "bg-glass border border-glass-border",
          "backdrop-blur-xl backdrop-saturate-150",
          "shadow-glass",
          "before:absolute before:inset-0 before:rounded-3xl",
          "before:bg-gradient-to-br before:from-white/20 before:via-transparent before:to-transparent",
          "before:pointer-events-none",
        ].join(" "),
        solid: [
          "bg-card border border-border/30",
          "shadow-glass",
        ].join(" "),
        glow: [
          "bg-glass border border-glass-border",
          "backdrop-blur-xl backdrop-saturate-150",
          "shadow-glass-glow",
          "before:absolute before:inset-0 before:rounded-3xl",
          "before:bg-gradient-to-br before:from-white/30 before:via-transparent before:to-transparent",
          "before:pointer-events-none",
        ].join(" "),
        subtle: [
          "bg-glass-subtle border border-glass-border/50",
          "backdrop-blur-lg",
          "shadow-soft",
        ].join(" "),
      },
      size: {
        sm: "p-3",
        default: "p-5",
        lg: "p-6",
        xl: "p-8",
      },
      hover: {
        none: "",
        lift: "hover:shadow-glass-elevated hover:-translate-y-0.5 active:translate-y-0",
        glow: "hover:shadow-glass-glow hover:border-primary/30",
        scale: "hover:scale-[1.02] active:scale-[0.98]",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      hover: "lift",
    },
  }
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  asChild?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant, size, hover, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(glassCardVariants({ variant, size, hover }), className)}
        {...props}
      >
        {/* Liquid shimmer effect */}
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-liquid-shimmer" />
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }
);
GlassCard.displayName = "GlassCard";

// Glass Card Header
const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 mb-4", className)}
    {...props}
  />
));
GlassCardHeader.displayName = "GlassCardHeader";

// Glass Card Title
const GlassCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
GlassCardTitle.displayName = "GlassCardTitle";

// Glass Card Content
const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
GlassCardContent.displayName = "GlassCardContent";

export { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, glassCardVariants };
