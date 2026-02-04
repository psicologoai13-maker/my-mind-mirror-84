import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricConfig } from '@/lib/metricConfigs';

interface UnifiedMetricCardProps {
  config: MetricConfig;
  value: number | null;
  trend: 'up' | 'down' | 'stable';
  chartData: { value: number }[];
  onClick?: () => void;
}

const UnifiedMetricCard: React.FC<UnifiedMetricCardProps> = ({
  config,
  value,
  trend,
  chartData,
  onClick,
}) => {
  // For negative metrics: invert for display (high stored = low visual score)
  const displayValue = value !== null 
    ? Math.round(config.isNegative ? 10 - value : value) 
    : null;
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  // Trend color (inverted for negative metrics)
  const trendColor = config.isNegative
    ? (trend === 'up' ? 'text-orange-500' : trend === 'down' ? 'text-emerald-500' : 'text-muted-foreground')
    : (trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-orange-500' : 'text-muted-foreground');

  // Score color based on display value
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (config.isNegative) {
      // For negative metrics shown inverted: low displayed = good
      if (score <= 3) return 'text-emerald-500';
      if (score <= 6) return 'text-amber-500';
      return 'text-orange-500';
    } else {
      if (score >= 7) return 'text-emerald-500';
      if (score >= 5) return 'text-amber-500';
      return 'text-orange-500';
    }
  };

  const gradientId = `gradient-unified-${config.key}`;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl text-left transition-all duration-300",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass hover:shadow-glass-elevated",
        "hover:scale-[1.02] active:scale-[0.98]",
        "flex flex-col h-[120px] w-full min-w-[140px]"
      )}
    >
      {/* Inner light reflection */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />
      
      {/* Top Section - Info */}
      <div className="relative z-10 p-3 pb-1 flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{config.icon}</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate max-w-[70px]">
              {config.label}
            </span>
          </div>
          <TrendIcon className={cn("w-3.5 h-3.5 flex-shrink-0", trendColor)} />
        </div>

        {/* Big Score */}
        <div className="flex flex-row items-baseline gap-0.5">
          <span className={cn("text-2xl font-bold leading-none", getScoreColor(displayValue))}>
            {displayValue ?? '—'}
          </span>
          <span className="text-[10px] text-muted-foreground/60">/10</span>
        </div>
      </div>

      {/* Bottom Section - Chart */}
      <div className="relative z-10 mt-auto h-10 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData.length > 0 ? chartData : [{ value: 0 }]} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.color} stopOpacity={0.5} />
                <stop offset="95%" stopColor={config.color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              connectNulls
              dot={chartData.length <= 2 ? { r: 3, fill: config.color, strokeWidth: 0 } : false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </button>
  );
};

export default UnifiedMetricCard;
