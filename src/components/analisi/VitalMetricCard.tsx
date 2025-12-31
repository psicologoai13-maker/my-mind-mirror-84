import React, { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricData, MetricType } from '@/pages/Analisi';

interface VitalMetricCardProps {
  metric: MetricData;
  chartData: { value: number }[];
  onClick: () => void;
}

// Negative metrics where lower = better
const NEGATIVE_METRICS = ['anxiety'];

const VitalMetricCard: React.FC<VitalMetricCardProps> = ({ metric, chartData, onClick }) => {
  const isNegative = NEGATIVE_METRICS.includes(metric.key);
  
  // Score in 1-10 scale
  const score10 = metric.average !== null ? Math.round(metric.average / 10) : null;
  
  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
  
  // Trend color (inverted for negative metrics)
  const trendColor = isNegative
    ? (metric.trend === 'up' ? 'text-orange-500' : metric.trend === 'down' ? 'text-emerald-500' : 'text-muted-foreground')
    : (metric.trend === 'up' ? 'text-emerald-500' : metric.trend === 'down' ? 'text-orange-500' : 'text-muted-foreground');

  // Score color (inverted for negative metrics)
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    const effectiveScore = isNegative ? 11 - score : score;
    if (effectiveScore >= 7) return 'text-emerald-500';
    if (effectiveScore >= 5) return 'text-amber-500';
    return 'text-orange-500';
  };

  // Chart gradient color based on metric
  const gradientId = `gradient-${metric.key}`;

  return (
    <button
      onClick={onClick}
      className="bg-card rounded-3xl shadow-premium overflow-hidden text-left transition-transform active:scale-[0.98] flex flex-col h-[140px]"
    >
      {/* Top Section - Info */}
      <div className="p-4 pb-2 flex-shrink-0">
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

        {/* Big Score - Flexbox layout */}
        <div className="flex flex-row items-baseline gap-1">
          <span className={cn("text-4xl font-bold leading-none", getScoreColor(score10))}>
            {score10 ?? '—'}
          </span>
          <span className="text-sm text-muted-foreground/60">/10</span>
        </div>
      </div>

      {/* Bottom Section - Chart (pushed to bottom) */}
      <div className="mt-auto h-14 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData.length > 0 ? chartData : [{ value: 0 }]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metric.color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={metric.color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={metric.color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </button>
  );
};

export default VitalMetricCard;
