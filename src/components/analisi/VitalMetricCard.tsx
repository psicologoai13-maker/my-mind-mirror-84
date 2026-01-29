import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricData, MetricType } from '@/pages/Analisi';

interface VitalMetricCardProps {
  metric: MetricData;
  chartData: { value: number }[];
  onClick: () => void;
}

// Negative metrics where lower = better (user votes HIGH when feeling good = show LOW value)
const NEGATIVE_METRICS = ['anxiety', 'stress', 'anger', 'fear', 'sadness', 'apathy'];

const VitalMetricCard: React.FC<VitalMetricCardProps> = ({ metric, chartData, onClick }) => {
  const isNegative = NEGATIVE_METRICS.includes(metric.key);
  
  // metric.average is already in 1-10 scale from unified source
  // For negative metrics: INVERT for display (high anxiety stored = low visual score)
  const rawScore = metric.average;
  const score10 = rawScore !== null 
    ? Math.round(isNegative ? 10 - rawScore : rawScore) 
    : null;
  
  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
  
  // Trend color (inverted for negative metrics)
  const trendColor = isNegative
    ? (metric.trend === 'up' ? 'text-orange-500' : metric.trend === 'down' ? 'text-emerald-500' : 'text-muted-foreground')
    : (metric.trend === 'up' ? 'text-emerald-500' : metric.trend === 'down' ? 'text-orange-500' : 'text-muted-foreground');

  // Score color based on INVERTED visual score for negative metrics
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    
    if (isNegative) {
      if (score <= 3) return 'text-emerald-500';
      if (score <= 6) return 'text-amber-500';
      return 'text-orange-500';
    } else {
      if (score >= 7) return 'text-emerald-500';
      if (score >= 5) return 'text-amber-500';
      return 'text-orange-500';
    }
  };

  // Chart gradient color based on metric
  const gradientId = `gradient-${metric.key}`;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-3xl text-left transition-all duration-300",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass hover:shadow-glass-elevated",
        "hover:scale-[1.02] active:scale-[0.98]",
        "flex flex-col h-[140px]"
      )}
    >
      {/* Inner light reflection */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
      
      {/* Top Section - Info */}
      <div className="relative z-10 p-4 pb-2 flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{metric.icon}</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {metric.label}
            </span>
          </div>
          <TrendIcon className={cn("w-4 h-4", trendColor)} />
        </div>

        {/* Big Score */}
        <div className="flex flex-row items-baseline gap-1">
          <span className={cn("text-4xl font-bold leading-none", getScoreColor(score10))}>
            {score10 ?? '—'}
          </span>
          <span className="text-sm text-muted-foreground/60">/10</span>
        </div>
      </div>

      {/* Bottom Section - Chart */}
      <div className="relative z-10 mt-auto h-14 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData.length > 0 ? chartData : [{ value: 0 }]} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metric.color} stopOpacity={0.5} />
                <stop offset="95%" stopColor={metric.color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={metric.color}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              connectNulls
              dot={chartData.length <= 2 ? { r: 4, fill: metric.color, strokeWidth: 0 } : false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </button>
  );
};

export default VitalMetricCard;
