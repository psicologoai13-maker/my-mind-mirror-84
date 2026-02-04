import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSemanticColor, getSemanticTrend } from '@/lib/clinicalDomains';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface RichMetricCardProps {
  metricKey: string;
  label: string;
  icon: string;
  color: string;
  value: number | null;
  trend: 'up' | 'down' | 'stable';
  isNegative?: boolean;
  size?: 'compact' | 'expanded';
  onClick: () => void;
}

// Progress Ring SVG Component
const ProgressRing: React.FC<{ 
  value: number; 
  color: string; 
  size?: number;
  isNegative?: boolean;
}> = ({ value, color, size = 48, isNegative = false }) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Normalize value 0-10 to percentage
  const normalizedValue = Math.max(0, Math.min(10, value));
  const progress = (normalizedValue / 10) * circumference;
  
  // For negative metrics, invert the visual (low = more filled)
  const displayProgress = isNegative 
    ? circumference - ((10 - normalizedValue) / 10) * circumference
    : progress;
  
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={strokeWidth}
        className="opacity-30"
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={circumference - displayProgress}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
        style={{
          filter: `drop-shadow(0 0 6px ${color}40)`
        }}
      />
    </svg>
  );
};

const RichMetricCard: React.FC<RichMetricCardProps> = ({
  label,
  icon,
  color,
  value,
  trend,
  isNegative = false,
  size = 'compact',
  onClick
}) => {
  const { light } = useHapticFeedback();
  
  const valueColor = getSemanticColor(value, isNegative);
  const { color: trendColor } = getSemanticTrend(trend, isNegative);
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  const handleClick = () => {
    light();
    onClick();
  };
  
  const displayValue = value !== null ? value.toFixed(1) : '—';
  const ringSize = size === 'expanded' ? 64 : 48;
  
  if (size === 'expanded') {
    // Expanded layout for single metrics (horizontal)
    return (
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-4 p-4 rounded-2xl w-full",
          "bg-glass/40 backdrop-blur-sm border border-glass-border/50",
          "hover:bg-glass/60 hover:border-glass-border",
          "transition-all duration-200 active:scale-[0.98]",
          "text-left focus:outline-none focus:ring-2 focus:ring-primary/20"
        )}
      >
        {/* Progress Ring with Icon */}
        <div className="relative flex-shrink-0">
          <ProgressRing 
            value={value ?? 0} 
            color={color} 
            size={ringSize}
            isNegative={isNegative}
          />
          <span className="absolute inset-0 flex items-center justify-center text-2xl">
            {icon}
          </span>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <span className="text-sm text-muted-foreground block mb-1">
            {label}
          </span>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-bold tabular-nums", valueColor)}>
              {displayValue}
            </span>
            <TrendIcon className={cn("w-4 h-4", trendColor)} />
          </div>
        </div>
      </button>
    );
  }
  
  // Compact layout (vertical, for grids)
  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 rounded-2xl",
        "bg-glass/40 backdrop-blur-sm border border-glass-border/50",
        "hover:bg-glass/60 hover:border-glass-border",
        "transition-all duration-200 active:scale-[0.98]",
        "text-center focus:outline-none focus:ring-2 focus:ring-primary/20",
        "min-w-0 w-full"
      )}
    >
      {/* Progress Ring with Icon */}
      <div className="relative">
        <ProgressRing 
          value={value ?? 0} 
          color={color} 
          size={ringSize}
          isNegative={isNegative}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xl">
          {icon}
        </span>
      </div>
      
      {/* Label */}
      <span className="text-[11px] text-muted-foreground truncate w-full leading-tight">
        {label}
      </span>
      
      {/* Value + Trend */}
      <div className="flex items-center gap-1">
        <span className={cn("text-base font-bold tabular-nums", valueColor)}>
          {displayValue}
        </span>
        <TrendIcon className={cn("w-3 h-3", trendColor)} />
      </div>
    </button>
  );
};

export default RichMetricCard;
