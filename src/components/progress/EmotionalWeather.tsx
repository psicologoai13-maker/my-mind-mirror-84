import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useDailyMetricsRange } from '@/hooks/useDailyMetrics';
import { subDays, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Cloud } from 'lucide-react';

const EMOTION_CONFIG = {
  // Primary emotions
  joy: { label: 'Gioia', color: 'hsl(45, 90%, 55%)' },
  sadness: { label: 'Tristezza', color: 'hsl(220, 70%, 55%)' },
  anger: { label: 'Rabbia', color: 'hsl(0, 70%, 55%)' },
  fear: { label: 'Paura', color: 'hsl(280, 60%, 55%)' },
  apathy: { label: 'Apatia', color: 'hsl(220, 10%, 60%)' },
  // Secondary emotions
  shame: { label: 'Vergogna', color: 'hsl(320, 60%, 50%)' },
  jealousy: { label: 'Gelosia', color: 'hsl(150, 60%, 40%)' },
  hope: { label: 'Speranza', color: 'hsl(200, 80%, 55%)' },
  frustration: { label: 'Frustrazione', color: 'hsl(30, 80%, 50%)' },
  nostalgia: { label: 'Nostalgia', color: 'hsl(260, 50%, 55%)' },
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
  // 🎯 SINGLE SOURCE OF TRUTH: Use the unified RPC hook
  const startDate = subDays(new Date(), 6);
  const endDate = new Date();
  const { metricsRange } = useDailyMetricsRange(startDate, endDate);

  const weeklyData = useMemo(() => {
    return metricsRange.map(dayMetrics => {
      const day = new Date(dayMetrics.date);
      
      // Emotions are already aggregated in the RPC (1-10 scale, displayed as %)
      return {
        day: format(day, 'EEE', { locale: it }).slice(0, 3),
        fullDate: format(day, 'd MMM', { locale: it }),
        joy: dayMetrics.emotions.joy * 10,
        sadness: dayMetrics.emotions.sadness * 10,
        anger: dayMetrics.emotions.anger * 10,
        fear: dayMetrics.emotions.fear * 10,
        apathy: dayMetrics.emotions.apathy * 10,
      } as DayEmotions;
    });
  }, [metricsRange]);

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
                    `${Math.round(value)}%`,
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
