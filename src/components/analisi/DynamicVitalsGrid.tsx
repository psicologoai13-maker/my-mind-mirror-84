import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VitalMetricConfig } from '@/lib/chartLibrary';
import CompactTimeSelector, { TimeRange } from './CompactTimeSelector';

interface VitalData {
  value: number | null;
  trend: 'up' | 'down' | 'stable';
  chartData: { value: number }[];
}

interface DynamicVitalsGridProps {
  metrics: VitalMetricConfig[];
  data: Record<string, VitalData>;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  onMetricClick?: (key: string) => void;
  hasTodayData?: boolean;
}

const DynamicVitalCard: React.FC<{
  metric: VitalMetricConfig;
  data: VitalData;
  onClick?: () => void;
}> = ({ metric, data, onClick }) => {
  const { value, trend, chartData } = data;
  
  // For negative metrics: invert for display (high stored = low visual score)
  const displayValue = value !== null 
    ? Math.round(metric.isNegative ? 10 - value : value) 
    : null;
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  // Trend color (inverted for negative metrics)
  const trendColor = metric.isNegative
    ? (trend === 'up' ? 'text-orange-500' : trend === 'down' ? 'text-emerald-500' : 'text-muted-foreground')
    : (trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-orange-500' : 'text-muted-foreground');

  // Score color based on display value
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (metric.isNegative) {
      if (score <= 3) return 'text-emerald-500';
      if (score <= 6) return 'text-amber-500';
      return 'text-orange-500';
    } else {
      if (score >= 7) return 'text-emerald-500';
      if (score >= 5) return 'text-amber-500';
      return 'text-orange-500';
    }
  };

  const gradientId = `gradient-dynamic-${metric.key}`;

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
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate max-w-[80px]">
              {metric.label}
            </span>
          </div>
          <TrendIcon className={cn("w-4 h-4 flex-shrink-0", trendColor)} />
        </div>

        {/* Big Score */}
        <div className="flex flex-row items-baseline gap-1">
          <span className={cn("text-4xl font-bold leading-none", getScoreColor(displayValue))}>
            {displayValue ?? '—'}
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

const DynamicVitalsGrid: React.FC<DynamicVitalsGridProps> = ({
  metrics,
  data,
  timeRange,
  onTimeRangeChange,
  onMetricClick,
  hasTodayData = true,
}) => {
  if (metrics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nessun dato disponibile per i parametri vitali</p>
      </div>
    );
  }

  return (
    <section className="animate-fade-in mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
          <span>💫</span> Parametri Vitali
        </h2>
        {timeRange && onTimeRangeChange && (
          <CompactTimeSelector value={timeRange} onChange={onTimeRangeChange} hasTodayData={hasTodayData} />
        )}
      </div>
      
      <div className={cn(
        "grid gap-4",
        metrics.length <= 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
      )}>
        {metrics.map((metric) => (
          <DynamicVitalCard
            key={metric.key}
            metric={metric}
            data={data[metric.key] || { value: null, trend: 'stable', chartData: [] }}
            onClick={() => onMetricClick?.(metric.key)}
          />
        ))}
      </div>
    </section>
  );
};

export default DynamicVitalsGrid;
