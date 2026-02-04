import React, { useMemo, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useDailyMetricsRange } from '@/hooks/useDailyMetrics';
import { format, subDays, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { TrendingUp, TrendingDown, X, Calendar, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMetricByKey, getSemanticTrend } from '@/lib/clinicalDomains';

export type TimeRange = 'day' | 'week' | 'month' | 'all';

interface MetricDetailSheetProps {
  metricKey: string | null;
  isOpen: boolean;
  onClose: () => void;
  timeRange: TimeRange;
}

// Compact animated ring for hero display
const HeroRing: React.FC<{ 
  value: number; 
  isNegative: boolean;
}> = ({ value, isNegative }) => {
  const size = 100;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // For negative metrics, invert display
  const effectiveValue = isNegative ? (10 - value) : value;
  const progress = (effectiveValue / 10) * circumference;
  
  // Semantic color
  const getColor = () => {
    if (effectiveValue >= 7) return 'hsl(150, 60%, 45%)';
    if (effectiveValue >= 4) return 'hsl(45, 80%, 50%)';
    return 'hsl(0, 70%, 55%)';
  };
  
  const color = getColor();
  
  return (
    <div className="relative">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          className="opacity-20"
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
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 10px ${color}50)`
          }}
        />
      </svg>
      {/* Center value */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{value.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground">/10</span>
      </div>
    </div>
  );
};

const MetricDetailSheet: React.FC<MetricDetailSheetProps> = ({ 
  metricKey, 
  isOpen, 
  onClose, 
  timeRange 
}) => {
  // Hide bottom nav when sheet opens
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('hide-bottom-nav'));
    } else {
      window.dispatchEvent(new CustomEvent('show-bottom-nav'));
    }
    
    return () => {
      window.dispatchEvent(new CustomEvent('show-bottom-nav'));
    };
  }, [isOpen]);

  const metricConfig = metricKey ? getMetricByKey(metricKey) : null;
  
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return { start: startOfDay(now), end: now };
      case 'week':
        return { start: subDays(now, 7), end: now };
      case 'month':
        return { start: subDays(now, 30), end: now };
      case 'all':
      default:
        return { start: subDays(now, 365), end: now };
    }
  }, [timeRange]);

  const { metricsRange } = useDailyMetricsRange(dateRange.start, dateRange.end);

  const { chartData, average, trend, minValue, maxValue } = useMemo(() => {
    if (!metricKey || !metricConfig) {
      return { chartData: [], average: null, trend: 'stable' as const, minValue: null, maxValue: null };
    }

    const daysWithData = metricsRange.filter(m => 
      m.has_checkin || m.has_sessions || m.has_emotions || m.has_life_areas || m.has_psychology
    );

    const data = daysWithData.map(dayData => {
      let value: number | null = null;

      switch (metricConfig.source) {
        case 'vitals':
          value = dayData.vitals[metricKey as keyof typeof dayData.vitals] as number || null;
          break;
        case 'emotions':
          value = dayData.emotions[metricKey as keyof typeof dayData.emotions] as number || null;
          break;
        case 'psychology':
          value = dayData.deep_psychology?.[metricKey] as number || null;
          break;
        case 'life_areas':
          value = dayData.life_areas[metricKey as keyof typeof dayData.life_areas] as number || null;
          break;
      }

      if (value === 0 || value === null) return null;

      return {
        date: format(new Date(dayData.date), 'd MMM', { locale: it }),
        fullDate: format(new Date(dayData.date), 'd MMMM yyyy', { locale: it }),
        value: Math.round(value * 10),
        rawValue: value
      };
    }).filter((d): d is NonNullable<typeof d> => d !== null);

    const values = data.map(d => d.rawValue);
    const avg = values.length > 0 
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 
      : null;
    
    const min = values.length > 0 ? Math.min(...values) : null;
    const max = values.length > 0 ? Math.max(...values) : null;

    let trendResult: 'up' | 'down' | 'stable' = 'stable';
    if (values.length >= 2) {
      const midpoint = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, midpoint);
      const secondHalf = values.slice(midpoint);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      if (secondAvg > firstAvg + 0.3) trendResult = 'up';
      if (secondAvg < firstAvg - 0.3) trendResult = 'down';
    }

    return { chartData: data, average: avg, trend: trendResult, minValue: min, maxValue: max };
  }, [metricKey, metricConfig, metricsRange]);

  if (!metricKey || !metricConfig) return null;

  const { color: trendColor } = getSemanticTrend(trend, metricConfig.isNegative);
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
  
  const trendLabel = metricConfig.isNegative
    ? (trend === 'up' ? 'Peggioramento' : trend === 'down' ? 'Miglioramento' : 'Stabile')
    : (trend === 'up' ? 'Miglioramento' : trend === 'down' ? 'Peggioramento' : 'Stabile');

  const timeRangeLabel = timeRange === 'day' ? 'Oggi' : timeRange === 'week' ? 'Ultimi 7 giorni' : timeRange === 'month' ? 'Ultimi 30 giorni' : 'Tutto lo storico';

  // Semantic gradient based on value
  const getGradientColor = () => {
    if (!average) return 'from-muted/20 to-transparent';
    const effectiveValue = metricConfig.isNegative ? (10 - average) : average;
    if (effectiveValue >= 7) return 'from-emerald-500/10 via-emerald-500/5 to-transparent';
    if (effectiveValue >= 4) return 'from-amber-500/10 via-amber-500/5 to-transparent';
    return 'from-red-500/10 via-red-500/5 to-transparent';
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[80vh] rounded-t-[28px] p-0 border-0 bg-background/95 backdrop-blur-2xl overflow-hidden"
      >
        {/* Gradient background overlay */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-b pointer-events-none",
          getGradientColor()
        )} />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 w-8 h-8 rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        
        {/* Drag indicator */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="relative px-6 pb-6 space-y-6 overflow-y-auto h-full">
          {/* Hero Section */}
          <div className="flex flex-col items-center pt-4">
            {/* Icon */}
            <span className="text-5xl mb-4">{metricConfig.icon}</span>
            
            {/* Title */}
            <h2 className="text-2xl font-display font-bold text-foreground mb-1">
              {metricConfig.label}
            </h2>
            <p className="text-sm text-muted-foreground text-center max-w-[280px]">
              {metricConfig.description}
            </p>
            
            {/* Hero Ring */}
            {average !== null && (
              <div className="mt-6">
                <HeroRing value={average} isNegative={metricConfig.isNegative} />
              </div>
            )}
            
            {average === null && (
              <div className="mt-6 text-center">
                <span className="text-4xl font-bold text-muted-foreground">—</span>
                <p className="text-sm text-muted-foreground mt-2">Nessun dato</p>
              </div>
            )}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            {/* Trend */}
            <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-4 border border-border/30">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                <Activity className="w-3.5 h-3.5" />
                <span className="text-[11px] uppercase tracking-wide">Trend</span>
              </div>
              <div className="flex items-center gap-1.5">
                {TrendIcon && <TrendIcon className={cn("w-4 h-4", trendColor)} />}
                <span className={cn("text-sm font-medium", trendColor)}>{trendLabel}</span>
              </div>
            </div>
            
            {/* Min */}
            <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-4 border border-border/30">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                <TrendingDown className="w-3.5 h-3.5" />
                <span className="text-[11px] uppercase tracking-wide">Min</span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {minValue !== null ? minValue.toFixed(1) : '—'}
              </span>
            </div>
            
            {/* Max */}
            <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-4 border border-border/30">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-[11px] uppercase tracking-wide">Max</span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {maxValue !== null ? maxValue.toFixed(1) : '—'}
              </span>
            </div>
          </div>

          {/* Time Range Badge */}
          <div className="flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{timeRangeLabel}</span>
            <span className="text-xs text-muted-foreground/60">
              ({chartData.length} {chartData.length === 1 ? 'dato' : 'dati'})
            </span>
          </div>

          {/* Chart */}
          <div className="bg-card/30 backdrop-blur-sm rounded-3xl p-4 border border-border/20">
            {chartData.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                <span className="text-3xl mb-2">📊</span>
                <span className="text-sm">Nessun dato per questo periodo</span>
              </div>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`gradient-detail-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v/10}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid hsl(var(--border) / 0.5)',
                        borderRadius: '12px',
                        fontSize: '13px',
                        padding: '10px 14px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
                      }}
                      formatter={(value: number) => [
                        `${(value / 10).toFixed(1)}/10`,
                        metricConfig.label
                      ]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill={`url(#gradient-detail-${metricKey})`}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                      activeDot={{ 
                        r: 6, 
                        fill: 'hsl(var(--primary))', 
                        stroke: 'hsl(var(--background))',
                        strokeWidth: 2
                      }}
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Hint for negative metrics */}
          {metricConfig.isNegative && (
            <p className="text-xs text-center text-muted-foreground/70 pb-4">
              💡 Per questa metrica, valori più bassi indicano maggiore benessere
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MetricDetailSheet;
