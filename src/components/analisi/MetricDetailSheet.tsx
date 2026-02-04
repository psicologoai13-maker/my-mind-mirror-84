import React, { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useDailyMetricsRange } from '@/hooks/useDailyMetrics';
import { format, subDays, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMetricByKey, getSemanticColor, getSemanticTrend } from '@/lib/clinicalDomains';

export type TimeRange = 'day' | 'week' | 'month' | 'all';

interface MetricDetailSheetProps {
  metricKey: string | null;
  isOpen: boolean;
  onClose: () => void;
  timeRange: TimeRange;
}

const MetricDetailSheet: React.FC<MetricDetailSheetProps> = ({ 
  metricKey, 
  isOpen, 
  onClose, 
  timeRange 
}) => {
  // Get metric configuration from clinical domains
  const metricConfig = metricKey ? getMetricByKey(metricKey) : null;
  
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

  // Fetch metrics data
  const { metricsRange } = useDailyMetricsRange(dateRange.start, dateRange.end);

  // Generate chart data from unified source for ALL metric types
  const { chartData, average, trend } = useMemo(() => {
    if (!metricKey || !metricConfig) {
      return { chartData: [], average: null, trend: 'stable' as const };
    }

    // Filter days with actual data
    const daysWithData = metricsRange.filter(m => 
      m.has_checkin || m.has_sessions || m.has_emotions || m.has_life_areas || m.has_psychology
    );

    // Map to chart data based on metric source
    const data = daysWithData.map(dayData => {
      let value: number | null = null;

      // Get value based on metric source and key
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

      // Filter out zero/null values
      if (value === 0 || value === null) return null;

      return {
        date: format(new Date(dayData.date), 'd MMM', { locale: it }),
        fullDate: format(new Date(dayData.date), 'd MMMM yyyy', { locale: it }),
        value: Math.round(value * 10), // Scale to 0-100 for chart
        rawValue: value
      };
    }).filter((d): d is NonNullable<typeof d> => d !== null);

    // Calculate average
    const values = data.map(d => d.rawValue);
    const avg = values.length > 0 
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 
      : null;

    // Calculate trend
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

    return { chartData: data, average: avg, trend: trendResult };
  }, [metricKey, metricConfig, metricsRange]);

  if (!metricKey || !metricConfig) return null;

  const { color: trendColor } = getSemanticTrend(trend, metricConfig.isNegative);
  const valueColor = getSemanticColor(average, metricConfig.isNegative);
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  const trendLabel = metricConfig.isNegative
    ? (trend === 'up' ? 'In aumento ⚠️' : trend === 'down' ? 'In calo ✓' : 'Stabile')
    : (trend === 'up' ? 'In aumento ✓' : trend === 'down' ? 'In calo ⚠️' : 'Stabile');

  const displayValue = average !== null ? `${average}/10` : '—';

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[70vh] rounded-t-[32px] bg-glass backdrop-blur-2xl border-t border-glass-border shadow-glass-elevated"
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center bg-glass backdrop-blur-sm border border-glass-border shadow-soft"
              style={{ background: `linear-gradient(135deg, ${metricConfig.color}15, ${metricConfig.color}05)` }}
            >
              <span className="text-2xl">{metricConfig.icon}</span>
            </div>
            <div>
              <SheetTitle className="text-xl font-display">{metricConfig.label}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {metricConfig.description}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Summary Stats - Glass cards */}
          <div className="flex gap-4">
            <div className="flex-1 bg-glass backdrop-blur-xl rounded-2xl p-4 border border-glass-border shadow-soft">
              <p className="text-xs text-muted-foreground mb-1">Media</p>
              <p className={cn("text-2xl font-bold", valueColor)}>
                {displayValue}
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

          {/* Time Range Badge */}
          <div className="flex justify-center">
            <span className="text-xs text-muted-foreground px-3 py-1 bg-muted/50 rounded-full">
              {timeRange === 'day' ? 'Oggi' : timeRange === 'week' ? 'Ultimi 7 giorni' : timeRange === 'month' ? 'Ultimi 30 giorni' : 'Tutto lo storico'}
            </span>
          </div>

          {/* Chart - Glass container */}
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
                      <linearGradient id={`gradient-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metricConfig.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={metricConfig.color} stopOpacity={0} />
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
                      formatter={(value: number) => [
                        `${(value / 10).toFixed(1)}/10`,
                        metricConfig.label
                      ]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={metricConfig.color}
                      strokeWidth={2.5}
                      fill={`url(#gradient-${metricKey})`}
                      dot={{ fill: metricConfig.color, strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: metricConfig.color, filter: `drop-shadow(0 0 6px ${metricConfig.color})` }}
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

          {/* Metric interpretation hint */}
          {metricConfig.isNegative && (
            <p className="text-xs text-center text-muted-foreground/70 italic">
              💡 Per questa metrica, valori più bassi indicano un migliore benessere
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MetricDetailSheet;
