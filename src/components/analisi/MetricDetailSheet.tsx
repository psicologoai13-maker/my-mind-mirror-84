import React, { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useDailyMetricsRange, DailyMetrics } from '@/hooks/useDailyMetrics';
import { format, subDays, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMetricConfig, MetricConfig } from '@/lib/metricConfigs';

export type TimeRange = 'day' | 'week' | 'month' | 'all';

interface MetricDetailSheetProps {
  metricKey: string | null;
  isOpen: boolean;
  onClose: () => void;
  timeRange: TimeRange;
}

// Helper to extract value from daily metrics based on metric key
const extractMetricValue = (dayData: DailyMetrics, key: string, config: MetricConfig): number | null => {
  let value: number | null = null;

  switch (config.source) {
    case 'vitals':
      value = dayData.vitals[key as keyof typeof dayData.vitals];
      break;
    case 'emotions':
      value = (dayData.emotions as Record<string, number>)?.[key] ?? null;
      break;
    case 'psychology':
      value = (dayData.deep_psychology as unknown as Record<string, number | null>)?.[key] ?? null;
      break;
    case 'life_areas':
      value = dayData.life_areas[key as keyof typeof dayData.life_areas];
      break;
  }

  return value && value > 0 ? value : null;
};

const MetricDetailSheet: React.FC<MetricDetailSheetProps> = ({ metricKey, isOpen, onClose, timeRange }) => {
  const config = metricKey ? getMetricConfig(metricKey) : null;

  // Calculate date range based on timeRange
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

  // Use the unified RPC hook
  const { metricsRange } = useDailyMetricsRange(dateRange.start, dateRange.end);

  // Generate chart data from unified source
  const chartData = useMemo(() => {
    if (!config || !metricKey) return [];

    // Filter days with actual data
    const daysWithData = metricsRange.filter(m => 
      m.has_checkin || m.has_sessions || m.has_emotions || m.has_life_areas || m.has_psychology
    );

    // Map to chart data based on metric
    return daysWithData.map(dayData => {
      const value = extractMetricValue(dayData, metricKey, config);
      
      return {
        date: format(new Date(dayData.date), 'd MMM', { locale: it }),
        fullDate: format(new Date(dayData.date), 'd MMMM yyyy', { locale: it }),
        value: value !== null ? Math.round(value * 10) : null,
        rawValue: value,
      };
    }).filter(d => d.value !== null);
  }, [config, metricKey, metricsRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return { average: null, trend: 'stable' as const };

    const values = chartData.map(d => d.rawValue!).filter(v => v !== null && v > 0);
    if (values.length === 0) return { average: null, trend: 'stable' as const };

    const average = values.reduce((a, b) => a + b, 0) / values.length;

    // Calculate trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (values.length >= 2) {
      const midpoint = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, midpoint);
      const secondHalf = values.slice(midpoint);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      if (secondAvg > firstAvg + 0.3) trend = 'up';
      else if (secondAvg < firstAvg - 0.3) trend = 'down';
    }

    return { average: Math.round(average * 10) / 10, trend };
  }, [chartData]);

  if (!config || !metricKey) return null;

  const TrendIcon = stats.trend === 'up' ? TrendingUp : stats.trend === 'down' ? TrendingDown : Minus;
  
  // Trend color (inverted for negative metrics)
  const trendColor = config.isNegative
    ? (stats.trend === 'up' ? 'text-orange-500' : stats.trend === 'down' ? 'text-emerald-500' : 'text-muted-foreground')
    : (stats.trend === 'up' ? 'text-emerald-500' : stats.trend === 'down' ? 'text-orange-500' : 'text-muted-foreground');
  
  const trendLabel = config.isNegative
    ? (stats.trend === 'up' ? 'In aumento ⚠️' : stats.trend === 'down' ? 'In diminuzione ✓' : 'Stabile')
    : (stats.trend === 'up' ? 'In aumento ✓' : stats.trend === 'down' ? 'In calo' : 'Stabile');

  // Display value (inverted for negative metrics)
  const displayAverage = stats.average !== null 
    ? (config.isNegative ? Math.round((10 - stats.average) * 10) / 10 : stats.average)
    : null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-[32px] bg-glass backdrop-blur-2xl border-t border-glass-border shadow-glass-elevated">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center bg-glass backdrop-blur-sm border border-glass-border shadow-soft"
              style={{ background: `linear-gradient(135deg, ${config.color}15, ${config.color}05)` }}
            >
              <span className="text-2xl">{config.icon}</span>
            </div>
            <div>
              <SheetTitle className="text-xl font-display">{config.label}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {config.description}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Time Range Label */}
          <div className="text-center">
            <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
              {timeRange === 'day' ? 'Oggi' : timeRange === 'week' ? 'Ultima settimana' : timeRange === 'month' ? 'Ultimo mese' : 'Tutto lo storico'}
            </span>
          </div>

          {/* Summary Stats */}
          <div className="flex gap-4">
            <div className="flex-1 bg-glass backdrop-blur-xl rounded-2xl p-4 border border-glass-border shadow-soft">
              <p className="text-xs text-muted-foreground mb-1">Media</p>
              <p className="text-2xl font-bold" style={{ color: config.color }}>
                {displayAverage !== null ? `${displayAverage}/10` : '—'}
              </p>
            </div>
            <div className="flex-1 bg-glass backdrop-blur-xl rounded-2xl p-4 border border-glass-border shadow-soft">
              <p className="text-xs text-muted-foreground mb-1">Trend</p>
              <div className="flex items-center gap-2">
                <TrendIcon className={cn("w-5 h-5", trendColor)} />
                <span className={cn("font-medium text-sm", trendColor)}>{trendLabel}</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-glass backdrop-blur-xl rounded-3xl p-4 border border-glass-border shadow-soft">
            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Nessun dato disponibile per questo periodo
              </div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`gradient-detail-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={config.color} stopOpacity={0} />
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
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card) / 0.95)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid hsl(var(--border) / 0.3)',
                        borderRadius: '16px',
                        fontSize: '12px',
                        padding: '12px 16px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                      }}
                      formatter={(value: number) => {
                        const displayVal = config.isNegative ? (100 - value) / 10 : value / 10;
                        return [`${displayVal.toFixed(1)}/10`, config.label];
                      }}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={config.color}
                      strokeWidth={2.5}
                      fill={`url(#gradient-detail-${metricKey})`}
                      dot={{ fill: config.color, strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: config.color, filter: `drop-shadow(0 0 6px ${config.color})` }}
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Data points info */}
          <p className="text-xs text-center text-muted-foreground">
            {chartData.length} {chartData.length === 1 ? 'rilevazione' : 'rilevazioni'} nel periodo selezionato
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MetricDetailSheet;
