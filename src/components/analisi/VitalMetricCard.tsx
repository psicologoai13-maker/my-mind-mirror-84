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

// Negative metrics where lower = better (user votes HIGH when feeling good = show LOW value)
const NEGATIVE_METRICS = ['anxiety', 'stress', 'anger', 'fear', 'sadness', 'apathy'];

const VitalMetricCard: React.FC<VitalMetricCardProps> = ({ metric, chartData, onClick }) => {
  const isNegative = NEGATIVE_METRICS.includes(metric.key);
  
  // Score in 1-10 scale - INVERT for negative metrics
  // If user votes 10 ("I'm great!") for anxiety, stored value is 10, but visual = 10 - 10 = 0 (no anxiety)
  // If user votes 2 ("I'm bad") for anxiety, stored value is 2, but visual = 10 - 2 = 8 (high anxiety)
  const rawScore = metric.average !== null ? metric.average / 10 : null;
  const score10 = rawScore !== null 
    ? Math.round(isNegative ? 10 - rawScore : rawScore) 
    : null;
  
  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
  
  // Trend color (inverted for negative metrics)
  // For negative metrics: stored value going UP = feeling worse = RED
  // For negative metrics: stored value going DOWN = feeling better = GREEN
  const trendColor = isNegative
    ? (metric.trend === 'up' ? 'text-orange-500' : metric.trend === 'down' ? 'text-emerald-500' : 'text-muted-foreground')
    : (metric.trend === 'up' ? 'text-emerald-500' : metric.trend === 'down' ? 'text-orange-500' : 'text-muted-foreground');

  // Score color based on INVERTED visual score for negative metrics
  // After inversion: LOW score = GREEN (good), HIGH score = RED (bad)
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    
    if (isNegative) {
      // For negative metrics (after inversion): 0-3 = green, 4-6 = amber, 7-10 = red
      if (score <= 3) return 'text-emerald-500';
      if (score <= 6) return 'text-amber-500';
      return 'text-orange-500';
    } else {
      // For positive metrics: 7-10 = green, 5-6 = amber, 0-4 = red
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
          <AreaChart data={chartData.length > 0 ? chartData : [{ value: 0 }]} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
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
