import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSessions } from '@/hooks/useSessions';
import { useCheckins } from '@/hooks/useCheckins';
import { format, subDays, eachDayOfInterval, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { TrendingUp, Moon, Brain } from 'lucide-react';

interface SparklineData {
  date: string;
  fullDate: string;
  value: number | null;
}

interface SparklineProps {
  data: SparklineData[];
  color: string;
  gradientId: string;
  label: string;
  icon: React.ReactNode;
  unit?: string;
}

const Sparkline: React.FC<SparklineProps> = ({ data, color, gradientId, label, icon, unit = '%' }) => {
  const hasData = data.some(d => d.value !== null);
  const latestValue = [...data].reverse().find(d => d.value !== null)?.value;

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
            {icon}
          </div>
          <span className="font-medium text-sm text-foreground">{label}</span>
        </div>
        {latestValue !== undefined && (
          <span className="text-lg font-bold" style={{ color }}>{Math.round(latestValue)}{unit}</span>
        )}
      </div>
      
      {!hasData ? (
        <div className="h-16 flex items-center justify-center text-muted-foreground text-xs">
          Nessun dato disponibile
        </div>
      ) : (
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px',
                  padding: '6px 10px'
                }}
                formatter={(value: number) => [`${Math.round(value)}${unit}`, label]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const VitalTrendsSparklines: React.FC = () => {
  const { completedSessions } = useSessions();
  const { weeklyCheckins } = useCheckins();

  const { moodData, anxietyData, sleepData } = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today });

    const moodData: SparklineData[] = [];
    const anxietyData: SparklineData[] = [];
    const sleepData: SparklineData[] = [];

    days.forEach(day => {
      const daySessions = completedSessions.filter(s => isSameDay(new Date(s.start_time), day));
      const dayCheckin = weeklyCheckins?.find(c => isSameDay(new Date(c.created_at), day));

      // Mood
      let mood: number | null = null;
      if (dayCheckin) {
        mood = (dayCheckin.mood_value / 5) * 100;
      } else if (daySessions.length > 0) {
        const avgMood = daySessions.reduce((acc, s) => acc + (s.mood_score_detected || 50), 0) / daySessions.length;
        mood = avgMood * 10;
      }

      // Anxiety (inverted for display - lower is better)
      let anxiety: number | null = null;
      if (daySessions.length > 0) {
        const avgAnxiety = daySessions.reduce((acc, s) => acc + (s.anxiety_score_detected || 0), 0) / daySessions.length;
        anxiety = avgAnxiety * 10;
      }

      // Sleep quality
      let sleep: number | null = null;
      const sessionWithSleep = daySessions.find(s => (s as any).sleep_quality !== null);
      if (sessionWithSleep) {
        sleep = ((sessionWithSleep as any).sleep_quality || 0) * 10;
      }

      const dateStr = format(day, 'd', { locale: it });
      const fullDate = format(day, 'd MMM', { locale: it });

      moodData.push({ date: dateStr, fullDate, value: mood });
      anxietyData.push({ date: dateStr, fullDate, value: anxiety });
      sleepData.push({ date: dateStr, fullDate, value: sleep });
    });

    return { moodData, anxietyData, sleepData };
  }, [completedSessions, weeklyCheckins]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1 mb-2">
        <h2 className="font-display font-semibold text-lg text-foreground">I Tuoi Trend Vitali</h2>
        <span className="text-xs text-muted-foreground">Ultimi 30 giorni</span>
      </div>
      
      <Sparkline
        data={moodData}
        color="hsl(150, 60%, 45%)"
        gradientId="moodSparkGradient"
        label="Umore"
        icon={<TrendingUp className="w-4 h-4" style={{ color: 'hsl(150, 60%, 45%)' }} />}
      />
      
      <Sparkline
        data={anxietyData}
        color="hsl(25, 80%, 55%)"
        gradientId="anxietySparkGradient"
        label="Ansia"
        icon={<Brain className="w-4 h-4" style={{ color: 'hsl(25, 80%, 55%)' }} />}
      />
      
      <Sparkline
        data={sleepData}
        color="hsl(260, 60%, 55%)"
        gradientId="sleepSparkGradient"
        label="Qualità Sonno"
        icon={<Moon className="w-4 h-4" style={{ color: 'hsl(260, 60%, 55%)' }} />}
      />
    </div>
  );
};

export default VitalTrendsSparklines;