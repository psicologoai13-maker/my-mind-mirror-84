import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useDailyMetricsRange } from '@/hooks/useDailyMetrics';
import { subDays, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { TrendingUp, Loader2 } from 'lucide-react';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
        <p className="text-xs font-medium">{payload[0]?.payload?.fullDate}</p>
        {payload[0]?.value !== null && (
          <p className="text-xs text-muted-foreground">Umore: {Math.round(payload[0].value)}/10</p>
        )}
      </div>
    );
  }
  return null;
};

const WeeklyMoodChart: React.FC = () => {
  // 🎯 SINGLE SOURCE OF TRUTH: Use the unified RPC hook
  const startDate = subDays(new Date(), 6);
  const endDate = new Date();
  const { metricsRange, isLoading } = useDailyMetricsRange(startDate, endDate);

  const chartData = React.useMemo(() => {
    return metricsRange.map(dayMetrics => {
      const day = new Date(dayMetrics.date);
      const hasData = dayMetrics.has_checkin || dayMetrics.has_sessions;
      
      return {
        day: format(day, 'EEE', { locale: it }).slice(0, 3),
        fullDate: format(day, 'd MMM', { locale: it }),
        // Mood is 1-10 from unified source
        mood: hasData && dayMetrics.vitals.mood > 0 ? dayMetrics.vitals.mood : null,
      };
    });
  }, [metricsRange]);

  const hasData = chartData.some(d => d.mood !== null && d.mood > 0);

  if (isLoading) {
    return (
      <div className="bg-card rounded-3xl p-6 shadow-card">
        <div className="h-32 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="bg-card rounded-3xl p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold">Umore Settimanale</h3>
        </div>
        <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
          Nessun dato disponibile questa settimana
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl p-6 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="font-display font-semibold">Umore Settimanale</h3>
      </div>
      
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="weeklyMoodGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <YAxis domain={[0, 10]} hide />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="mood"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#weeklyMoodGradient)"
              connectNulls
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WeeklyMoodChart;
