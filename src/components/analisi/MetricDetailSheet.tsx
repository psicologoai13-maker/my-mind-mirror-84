import React, { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSessions } from '@/hooks/useSessions';
import { useCheckins } from '@/hooks/useCheckins';
import { format, subDays, isAfter, startOfDay, isSameDay } from 'date-fns';
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
  const { completedSessions } = useSessions();
  const { weeklyCheckins } = useCheckins();

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
        return { start: new Date(0), end: now };
    }
  }, [timeRange]);

  // Generate chart data - ONLY for days with actual data (stretch effect)
  const chartData = useMemo(() => {
    if (!metric) return [];

    // Filter sessions in range
    const sessionsInRange = completedSessions.filter(s => 
      isAfter(new Date(s.start_time), dateRange.start)
    );

    // Get unique days with data, sorted chronologically
    const daysWithData = new Map<string, { date: Date; sessions: typeof sessionsInRange }>();
    
    sessionsInRange.forEach(session => {
      const date = new Date(session.start_time);
      const dateKey = format(date, 'yyyy-MM-dd');
      if (!daysWithData.has(dateKey)) {
        daysWithData.set(dateKey, { date, sessions: [] });
      }
      daysWithData.get(dateKey)!.sessions.push(session);
    });

    // Convert to array and sort
    const sortedDays = Array.from(daysWithData.entries())
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime());

    // Map to chart data
    return sortedDays.map(([dateKey, { date, sessions }]) => {
      let value: number | null = null;

      const getSessionValue = (metricKey: MetricType): number | null => {
        const values = sessions.map(s => {
          switch (metricKey) {
            case 'mood':
              return s.mood_score_detected ? s.mood_score_detected * 10 : null;
            case 'anxiety':
              return s.anxiety_score_detected ? s.anxiety_score_detected * 10 : null;
            case 'sleep':
              return (s as any).sleep_quality ? (s as any).sleep_quality * 10 : null;
            case 'energy':
              const m = s.mood_score_detected ? s.mood_score_detected * 10 : null;
              const a = s.anxiety_score_detected ? s.anxiety_score_detected * 10 : 50;
              return m !== null ? Math.max(0, Math.min(100, m - (a * 0.3) + 20)) : null;
            case 'joy':
              return (s as any).specific_emotions?.joy ?? null;
            case 'sadness':
              return (s as any).specific_emotions?.sadness ?? null;
            case 'anger':
              return (s as any).specific_emotions?.anger ?? null;
            case 'fear':
              return (s as any).specific_emotions?.fear ?? null;
            case 'apathy':
              return (s as any).specific_emotions?.apathy ?? null;
            case 'love':
              return s.life_balance_scores?.love ? s.life_balance_scores.love * 10 : null;
            case 'work':
              return s.life_balance_scores?.work ? s.life_balance_scores.work * 10 : null;
            case 'friendship':
              return s.life_balance_scores?.friendship ? s.life_balance_scores.friendship * 10 : null;
            case 'wellness':
              return s.life_balance_scores?.energy ? s.life_balance_scores.energy * 10 : null;
            default:
              return null;
          }
        }).filter((v): v is number => v !== null);

        if (values.length === 0) return null;
        return values.reduce((a, b) => a + b, 0) / values.length;
      };

      value = getSessionValue(metric.key);

      return {
        date: format(date, 'd MMM', { locale: it }),
        fullDate: format(date, 'd MMMM yyyy', { locale: it }),
        value: value !== null ? Math.round(value) : null,
      };
    }).filter(d => d.value !== null); // Only include days with data
  }, [metric, completedSessions, weeklyCheckins, dateRange]);

  if (!metric) return null;

  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
  const trendColor = metric.trend === 'up' ? 'text-emerald-500' : metric.trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  const trendLabel = metric.trend === 'up' ? 'In aumento' : metric.trend === 'down' ? 'In calo' : 'Stabile';

  const displayValue = metric.average !== null 
    ? metric.unit === '/10' 
      ? `${Math.round(metric.average / 10)}/10`
      : `${metric.average}%`
    : '—';

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${metric.color}20` }}
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
          {/* Summary Stats */}
          <div className="flex gap-4">
            <div className="flex-1 bg-muted/50 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Media</p>
              <p className="text-2xl font-bold" style={{ color: metric.color }}>
                {displayValue}
              </p>
            </div>
            <div className="flex-1 bg-muted/50 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Trend</p>
              <div className="flex items-center gap-2">
                <TrendIcon className={cn("w-5 h-5", trendColor)} />
                <span className={cn("font-medium", trendColor)}>{trendLabel}</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/20">
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
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        fontSize: '12px',
                        padding: '8px 12px'
                      }}
                      formatter={(value: number) => [
                        metric.unit === '/10' ? `${Math.round(value / 10)}/10` : `${value}%`,
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
                      activeDot={{ r: 5, fill: metric.color }}
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