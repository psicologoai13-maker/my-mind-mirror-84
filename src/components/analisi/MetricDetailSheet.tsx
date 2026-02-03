import React, { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useDailyMetricsRange } from '@/hooks/useDailyMetrics';
import { format, subDays, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { MetricData, TimeRange, MetricType } from '@/pages/Analisi';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricDetailSheetProps {
  metric: MetricData | null | undefined;
  isOpen: boolean;
  onClose: () => void;
  timeRange: TimeRange;
}

const MetricDetailSheet: React.FC<MetricDetailSheetProps> = ({ metric, isOpen, onClose, timeRange }) => {
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

  // 🎯 SINGLE SOURCE OF TRUTH: Use the unified RPC hook
  const { metricsRange } = useDailyMetricsRange(dateRange.start, dateRange.end);

  // Generate chart data from unified source
  const chartData = useMemo(() => {
    if (!metric) return [];

    // Filter days with actual data
    const daysWithData = metricsRange.filter(m => 
      m.has_checkin || m.has_sessions || m.has_emotions || m.has_life_areas
    );

    // Map to chart data based on metric type
    return daysWithData.map(dayData => {
      let value: number | null = null;

      // Get value based on metric category and key
      switch (metric.key) {
        // Vitali (scala 1-10)
        case 'mood':
          value = dayData.vitals.mood > 0 ? dayData.vitals.mood * 10 : null;
          break;
        case 'anxiety':
          value = dayData.vitals.anxiety > 0 ? dayData.vitals.anxiety * 10 : null;
          break;
        case 'energy':
          value = dayData.vitals.energy > 0 ? dayData.vitals.energy * 10 : null;
          break;
        case 'sleep':
          value = dayData.vitals.sleep > 0 ? dayData.vitals.sleep * 10 : null;
          break;
        // Emozioni (scala 0-10)
        case 'joy':
          value = dayData.emotions.joy > 0 ? dayData.emotions.joy * 10 : null;
          break;
        case 'sadness':
          value = dayData.emotions.sadness > 0 ? dayData.emotions.sadness * 10 : null;
          break;
        case 'anger':
          value = dayData.emotions.anger > 0 ? dayData.emotions.anger * 10 : null;
          break;
        case 'fear':
          value = dayData.emotions.fear > 0 ? dayData.emotions.fear * 10 : null;
          break;
        case 'apathy':
          value = dayData.emotions.apathy > 0 ? dayData.emotions.apathy * 10 : null;
          break;
        // Aree Vita (scala 1-10)
        case 'love':
          value = dayData.life_areas.love ? dayData.life_areas.love * 10 : null;
          break;
        case 'work':
          value = dayData.life_areas.work ? dayData.life_areas.work * 10 : null;
          break;
        case 'school':
          value = dayData.life_areas.school ? dayData.life_areas.school * 10 : null;
          break;
        case 'health':
          value = dayData.life_areas.health ? dayData.life_areas.health * 10 : null;
          break;
        case 'social':
          value = dayData.life_areas.social ? dayData.life_areas.social * 10 : null;
          break;
        case 'growth':
          value = dayData.life_areas.growth ? dayData.life_areas.growth * 10 : null;
          break;
        default:
          value = null;
      }

      return {
        date: format(new Date(dayData.date), 'd MMM', { locale: it }),
        fullDate: format(new Date(dayData.date), 'd MMMM yyyy', { locale: it }),
        value: value !== null ? Math.round(value) : null,
      };
    }).filter(d => d.value !== null); // Only include days with data for this metric
  }, [metric, metricsRange]);

  if (!metric) return null;

  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
  const trendColor = metric.trend === 'up' ? 'text-emerald-500' : metric.trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  const trendLabel = metric.trend === 'up' ? 'In aumento' : metric.trend === 'down' ? 'In calo' : 'Stabile';

  // Display value as X.X/10
  const displayValue = metric.average !== null 
    ? `${metric.average}/10`
    : '—';

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-[32px] bg-glass backdrop-blur-2xl border-t border-glass-border shadow-glass-elevated">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center bg-glass backdrop-blur-sm border border-glass-border shadow-soft"
              style={{ background: `linear-gradient(135deg, ${metric.color}15, ${metric.color}05)` }}
            >
              <span className="text-2xl">{metric.icon}</span>
            </div>
            <div>
              <SheetTitle className="text-xl font-display">{metric.label}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Storico {timeRange === 'day' ? 'giornaliero' : timeRange === 'week' ? 'settimanale' : timeRange === 'month' ? 'mensile' : 'completo'}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Summary Stats - Glass cards */}
          <div className="flex gap-4">
            <div className="flex-1 bg-glass backdrop-blur-xl rounded-2xl p-4 border border-glass-border shadow-soft">
              <p className="text-xs text-muted-foreground mb-1">Media</p>
              <p className="text-2xl font-bold" style={{ color: metric.color }}>
                {displayValue}
              </p>
            </div>
            <div className="flex-1 bg-glass backdrop-blur-xl rounded-2xl p-4 border border-glass-border shadow-soft">
              <p className="text-xs text-muted-foreground mb-1">Trend</p>
              <div className="flex items-center gap-2">
                <TrendIcon className={cn("w-5 h-5", trendColor)} />
                <span className={cn("font-medium", trendColor)}>{trendLabel}</span>
              </div>
            </div>
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
                      <linearGradient id={`gradient-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metric.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
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
                        metric.label
                      ]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={metric.color}
                      strokeWidth={2.5}
                      fill={`url(#gradient-${metric.key})`}
                      dot={{ fill: metric.color, strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: metric.color, filter: `drop-shadow(0 0 6px ${metric.color})` }}
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
