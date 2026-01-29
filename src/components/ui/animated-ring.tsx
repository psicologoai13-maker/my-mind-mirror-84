import * as React from "react";
import { cn } from "@/lib/utils";

interface AnimatedRingProps {
  value: number; // 0-100
  size?: "sm" | "md" | "lg" | "xl";
  thickness?: number;
  color?: string;
  bgColor?: string;
  showValue?: boolean;
  showLabel?: boolean;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  glowColor?: string;
  animated?: boolean;
}

const SIZE_CONFIG = {
  sm: { viewBox: 48, radius: 18, fontSize: "text-xs" },
  md: { viewBox: 64, radius: 24, fontSize: "text-sm" },
  lg: { viewBox: 80, radius: 32, fontSize: "text-xl" },
  xl: { viewBox: 120, radius: 48, fontSize: "text-3xl" },
};

const AnimatedRing: React.FC<AnimatedRingProps> = ({
  value,
  size = "md",
  thickness = 6,
  color,
  bgColor = "hsl(var(--muted))",
  showValue = true,
  showLabel = false,
  label,
  icon,
  className,
  glowColor,
  animated = true,
}) => {
  const [animatedValue, setAnimatedValue] = React.useState(0);
  const config = SIZE_CONFIG[size];
  const circumference = 2 * Math.PI * config.radius;
  
  // Animate value on mount
  React.useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedValue(Math.min(100, Math.max(0, value)));
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedValue(Math.min(100, Math.max(0, value)));
    }
  }, [value, animated]);

  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;
  const displayValue = (value / 10).toFixed(1);

  // Dynamic color based on value
  const getDefaultColor = () => {
    if (value >= 70) return "hsl(var(--mood-excellent))";
    if (value >= 50) return "hsl(var(--mood-neutral))";
    return "hsl(var(--mood-low))";
  };

  const ringColor = color || getDefaultColor();
  const glow = glowColor || ringColor;

  return (
    <div className={cn("relative inline-flex", className)}>
      <svg
        viewBox={`0 0 ${config.viewBox} ${config.viewBox}`}
        className="transform -rotate-90"
        style={{ width: config.viewBox, height: config.viewBox }}
      >
        {/* Glow filter */}
        <defs>
          <filter id={`glow-${size}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor={glow} floodOpacity="0.4" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle
          cx={config.viewBox / 2}
          cy={config.viewBox / 2}
          r={config.radius}
          stroke={bgColor}
          strokeWidth={thickness}
          fill="none"
          className="opacity-30"
        />
        
        {/* Progress circle with glow */}
        <circle
          cx={config.viewBox / 2}
          cy={config.viewBox / 2}
          r={config.radius}
          stroke={ringColor}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
          filter={`url(#glow-${size})`}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {icon && (
          <div className="mb-0.5">
            {icon}
          </div>
        )}
        {showValue && (
          <div className="flex items-baseline gap-0.5">
            <span className={cn("font-bold leading-none", config.fontSize)}>
              {displayValue}
            </span>
            <span className="text-[10px] text-muted-foreground">/10</span>
          </div>
        )}
        {showLabel && label && (
          <span className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
            {label}
          </span>
        )}
      </div>
    </div>
  );
};

export { AnimatedRing };
