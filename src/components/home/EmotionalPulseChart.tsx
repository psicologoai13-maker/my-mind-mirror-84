import React from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useSessions } from '@/hooks/useSessions';
import { useCheckins } from '@/hooks/useCheckins';
import { format, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { TrendingUp, Activity } from 'lucide-react';

const EmotionalPulseChart: React.FC = () => {
  const { sessions } = useSessions();
  const { weeklyCheckins } = useCheckins();

  // Combine data from last 7 sessions + checkins
  const chartData = React.useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, 'yyyy-MM-dd'),
        label: format(date, 'EEE', { locale: it }),
        mood: null as number | null,
      };
    });

    // Add checkin data
    weeklyCheckins?.forEach(checkin => {
      const dateStr = format(new Date(checkin.created_at), 'yyyy-MM-dd');
      const dayData = last7Days.find(d => d.date === dateStr);
      if (dayData) {
        dayData.mood = checkin.mood_value;
      }
    });

    // Add session mood data (takes priority)
    sessions?.slice(0, 10).forEach(session => {
      if (session.mood_score_detected) {
        const dateStr = format(new Date(session.start_time), 'yyyy-MM-dd');
        const dayData = last7Days.find(d => d.date === dateStr);
        if (dayData) {
          dayData.mood = session.mood_score_detected;
        }
      }
    });

    return last7Days;
  }, [sessions, weeklyCheckins]);

  const hasData = chartData.some(d => d.mood !== null);
  const latestMood = chartData.filter(d => d.mood).pop()?.mood || 0;
  const trend = latestMood >= 3 ? 'positivo' : 'in crescita';

  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-5 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-foreground">
            Il tuo Battito Emotivo
          </h3>
        </div>
        {hasData && (
          <div className="flex items-center gap-1 text-xs text-mood-good">
            <TrendingUp className="w-3 h-3" />
            <span>Trend {trend}</span>
          </div>
        )}
      </div>

      {hasData ? (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                domain={[0, 5]}
                axisLine={false}
                tickLine={false}
                tick={false}
                width={20}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload?.[0]?.value) {
                    const moodLabels = ['', 'Triste', 'Giù', 'Neutro', 'Bene', 'Ottimo'];
                    return (
                      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                        <p className="text-sm font-medium">{moodLabels[payload[0].value as number]}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="mood"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#moodGradient)"
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-32 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center">
            Inizia a parlare per vedere<br />il tuo andamento emotivo
          </p>
        </div>
      )}

      {/* Y-axis labels */}
      {hasData && (
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
          <span>Basso</span>
          <span>Alto</span>
        </div>
      )}
    </div>
  );
};

export default EmotionalPulseChart;
