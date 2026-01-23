import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useDailyMetricsRange } from '@/hooks/useDailyMetrics';
import { subDays, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Activity } from 'lucide-react';

const EmotionalPulseChart: React.FC = () => {
  // 🎯 SINGLE SOURCE OF TRUTH: Use the unified RPC hook
  const startDate = subDays(new Date(), 6);
  const endDate = new Date();
  const { metricsRange } = useDailyMetricsRange(startDate, endDate);

  const chartData = React.useMemo(() => {
    return metricsRange.map(dayMetrics => {
      const day = new Date(dayMetrics.date);
      const hasData = dayMetrics.has_checkin || dayMetrics.has_sessions;
      
      return {
        date: format(day, 'yyyy-MM-dd'),
        label: format(day, 'EEE', { locale: it }),
        // Mood is 1-10 scale from unified source
        mood: hasData && dayMetrics.vitals.mood > 0 ? dayMetrics.vitals.mood : null,
      };
    });
  }, [metricsRange]);

  const hasData = chartData.some(d => d.mood !== null);
  const latestMood = chartData.filter(d => d.mood !== null).pop()?.mood;
  const trend = latestMood && latestMood >= 6 ? 'positivo' : 'in crescita';

  return (
    <div className="bg-card rounded-3xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Polso Emotivo</h3>
            <p className="text-xs text-muted-foreground">Ultimi 7 giorni</p>
          </div>
        </div>
        {hasData && (
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
            Trend {trend}
          </span>
        )}
      </div>
      
      {!hasData ? (
        <div className="h-24 flex flex-col items-center justify-center text-muted-foreground">
          <span className="text-2xl mb-1">💭</span>
          <p className="text-xs">Inizia a interagire per vedere il tuo polso</p>
        </div>
      ) : (
        <div className="h-24 relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[0, 10]} hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px'
                }}
                formatter={(value: number) => [`${Math.round(value)}/10`, 'Umore']}
              />
              <Area
                type="monotone"
                dataKey="mood"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#pulseGradient)"
                connectNulls
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default EmotionalPulseChart;
