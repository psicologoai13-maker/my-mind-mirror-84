import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { useSessions } from '@/hooks/useSessions';
import { subDays, eachDayOfInterval, isSameDay, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Cloud } from 'lucide-react';

const EMOTION_CONFIG = {
  joy: { label: 'Gioia', color: 'hsl(45, 90%, 55%)' },
  sadness: { label: 'Tristezza', color: 'hsl(220, 70%, 55%)' },
  anger: { label: 'Rabbia', color: 'hsl(0, 70%, 55%)' },
  fear: { label: 'Paura', color: 'hsl(280, 60%, 55%)' },
  apathy: { label: 'Apatia', color: 'hsl(220, 10%, 60%)' },
};

interface DayEmotions {
  day: string;
  fullDate: string;
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  apathy: number;
}

const EmotionalWeather: React.FC = () => {
  const { completedSessions } = useSessions();

  const weeklyData = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 6);
    const days = eachDayOfInterval({ start: sevenDaysAgo, end: today });

    return days.map(day => {
      const daySessions = completedSessions.filter(s => isSameDay(new Date(s.start_time), day));
      
      // Aggregate specific_emotions from all sessions of the day
      let emotions = { joy: 0, sadness: 0, anger: 0, fear: 0, apathy: 0 };
      let sessionCount = 0;

      daySessions.forEach(session => {
        const specificEmotions = (session as any).specific_emotions;
        if (specificEmotions) {
          emotions.joy += specificEmotions.joy || 0;
          emotions.sadness += specificEmotions.sadness || 0;
          emotions.anger += specificEmotions.anger || 0;
          emotions.fear += specificEmotions.fear || 0;
          emotions.apathy += specificEmotions.apathy || 0;
          sessionCount++;
        }
      });

      // Average if multiple sessions
      if (sessionCount > 0) {
        emotions.joy = Math.round(emotions.joy / sessionCount);
        emotions.sadness = Math.round(emotions.sadness / sessionCount);
        emotions.anger = Math.round(emotions.anger / sessionCount);
        emotions.fear = Math.round(emotions.fear / sessionCount);
        emotions.apathy = Math.round(emotions.apathy / sessionCount);
      }

      return {
        day: format(day, 'EEE', { locale: it }).slice(0, 3),
        fullDate: format(day, 'd MMM', { locale: it }),
        ...emotions,
      } as DayEmotions;
    });
  }, [completedSessions]);

  const hasData = weeklyData.some(d => d.joy + d.sadness + d.anger + d.fear + d.apathy > 0);

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Cloud className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">Meteo Emotivo</h3>
          <p className="text-xs text-muted-foreground">Ultimi 7 giorni</p>
        </div>
      </div>

      {!hasData ? (
        <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
          <span className="text-3xl mb-2">🌤️</span>
          <p className="text-sm">Completa sessioni per vedere il meteo</p>
        </div>
      ) : (
        <>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <YAxis 
                  hide 
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '10px',
                    fontSize: '11px',
                    padding: '8px 12px'
                  }}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                  formatter={(value: number, name: string) => [
                    `${value}%`,
                    EMOTION_CONFIG[name as keyof typeof EMOTION_CONFIG]?.label || name
                  ]}
                />
                <Bar dataKey="joy" stackId="a" fill={EMOTION_CONFIG.joy.color} radius={[0, 0, 0, 0]} />
                <Bar dataKey="sadness" stackId="a" fill={EMOTION_CONFIG.sadness.color} radius={[0, 0, 0, 0]} />
                <Bar dataKey="anger" stackId="a" fill={EMOTION_CONFIG.anger.color} radius={[0, 0, 0, 0]} />
                <Bar dataKey="fear" stackId="a" fill={EMOTION_CONFIG.fear.color} radius={[0, 0, 0, 0]} />
                <Bar dataKey="apathy" stackId="a" fill={EMOTION_CONFIG.apathy.color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {Object.entries(EMOTION_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: config.color }} />
                <span className="text-[10px] text-muted-foreground">{config.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default EmotionalWeather;