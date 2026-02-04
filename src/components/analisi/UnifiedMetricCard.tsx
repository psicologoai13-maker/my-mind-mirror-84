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
  if (data.length === 0) return null;
  
  const width = 60;
  const height = 20;
  const padding = 2;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="opacity-60">
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
        "flex flex-col items-start p-3 rounded-2xl",
        "bg-glass backdrop-blur-sm border border-glass-border",
        "shadow-soft hover:shadow-glass-elevated",
        "transition-all duration-200 active:scale-95",
        "min-w-[100px] w-full text-left",
        "focus:outline-none focus:ring-2 focus:ring-primary/20"
      )}
    >
      {/* Header: Icon + Trend */}
      <div className="flex items-center justify-between w-full mb-1">
        <span className="text-lg">{icon}</span>
        <TrendIcon className={cn("w-3.5 h-3.5", trendColor)} />
      </div>
      
      {/* Value */}
      <div className={cn("text-xl font-bold tabular-nums", valueColor)}>
        {displayValue}
      </div>
      
      {/* Label */}
      <div className="text-[11px] text-muted-foreground truncate w-full mb-1">
        {label}
      </div>
      
      {/* Sparkline */}
      <div className="w-full h-5 flex items-end">
        {sparklineData.length > 1 ? (
          <MiniSparkline data={sparklineData} color={color} />
        ) : (
          <div className="text-[10px] text-muted-foreground/50">
            Dati insufficienti
          </div>
        )}
      </div>
    </button>
  );
};

export default UnifiedMetricCard;
