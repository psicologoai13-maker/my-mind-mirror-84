import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSemanticColor, getSemanticTrend } from '@/lib/clinicalDomains';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface UnifiedMetricCardProps {
  metricKey: string;
  label: string;
  icon: string;
  color: string;
  value: number | null;
  trend: 'up' | 'down' | 'stable';
  sparklineData: number[];
  isNegative?: boolean;
  onClick: () => void;
}

// Mini SVG Sparkline component
const MiniSparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (data.length < 2) return null;
  
  const width = 50;
  const height = 16;
  const padding = 1;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="opacity-50">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const UnifiedMetricCard: React.FC<UnifiedMetricCardProps> = ({
  label,
  icon,
  color,
  value,
  trend,
  sparklineData,
  isNegative = false,
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
  
  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2.5 p-2.5 rounded-xl w-full",
        "bg-glass/80 backdrop-blur-sm border border-glass-border/80",
        "hover:bg-glass hover:border-glass-border",
        "transition-all duration-150 active:scale-[0.98]",
        "text-left focus:outline-none focus:ring-1 focus:ring-primary/20"
      )}
    >
      {/* Icon */}
      <span className="text-base flex-shrink-0">{icon}</span>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-[11px] text-muted-foreground truncate">
            {label}
          </span>
          <TrendIcon className={cn("w-3 h-3 flex-shrink-0", trendColor)} />
        </div>
        <div className="flex items-center justify-between gap-1">
          <span className={cn("text-sm font-semibold tabular-nums", valueColor)}>
            {displayValue}
          </span>
          <MiniSparkline data={sparklineData} color={color} />
        </div>
      </div>
    </button>
  );
};

export default UnifiedMetricCard;
