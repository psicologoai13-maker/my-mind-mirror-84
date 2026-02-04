import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { subDays, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Cloud } from 'lucide-react';
import { useEmotionsRange } from '@/hooks/useEmotionsData';
import { EMOTION_CONFIG, EmotionKey, ALL_EMOTION_KEYS } from '@/lib/emotionConfig';

const EmotionalWeather: React.FC = () => {
  const startDate = subDays(new Date(), 6);
  const endDate = new Date();
  const { dailyData, hasData, isLoading } = useEmotionsRange(startDate, endDate);

  // Format data for the chart
  const weeklyData = useMemo(() => {
    // Create array of last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayData = dailyData.find(d => d.date === dateStr);
      
      const formattedDay: Record<string, any> = {
        day: format(date, 'EEE', { locale: it }).slice(0, 3),
        fullDate: format(date, 'd MMM', { locale: it }),
      };
      
      // Add all emotions (convert to percentage for display)
      ALL_EMOTION_KEYS.forEach(key => {
        formattedDay[key] = dayData ? ((dayData as any)[key] ?? 0) * 10 : 0;
      });
      
      days.push(formattedDay);
    }
    return days;
  }, [dailyData]);

  // Get which emotions have data to show
  const activeEmotionKeys = useMemo(() => {
    const emotionTotals: Record<EmotionKey, number> = {} as Record<EmotionKey, number>;
    
    ALL_EMOTION_KEYS.forEach(key => {
      emotionTotals[key] = weeklyData.reduce((sum, day) => sum + ((day as any)[key] || 0), 0);
    });
    
    return ALL_EMOTION_KEYS.filter(key => emotionTotals[key] > 0);
  }, [weeklyData]);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/20 animate-pulse">
        <div className="h-40 bg-muted/20 rounded-lg" />
      </div>
    );
  }

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
                  formatter={(value: number, name: string) => {
                    const config = EMOTION_CONFIG[name as EmotionKey];
                    return [
                      `${Math.round(value)}%`,
                      config?.label || name
                    ];
                  }}
                />
                {/* Render bars for each active emotion */}
                {activeEmotionKeys.map((key, index) => {
                  const config = EMOTION_CONFIG[key];
                  return (
                    <Bar 
                      key={key}
                      dataKey={key} 
                      stackId="a" 
                      fill={config.color}
                      radius={index === activeEmotionKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend - only show active emotions */}
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {activeEmotionKeys.slice(0, 8).map(key => {
              const config = EMOTION_CONFIG[key];
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: config.color }} />
                  <span className="text-[10px] text-muted-foreground">{config.label}</span>
                </div>
              );
            })}
            {activeEmotionKeys.length > 8 && (
              <span className="text-[10px] text-muted-foreground">
                +{activeEmotionKeys.length - 8}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EmotionalWeather;
