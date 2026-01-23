import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDailyMetricsRange } from '@/hooks/useDailyMetrics';
import { format, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';

const MoodAnxietyChart: React.FC = () => {
  // 🎯 SINGLE SOURCE OF TRUTH: Use the unified RPC hook
  const startDate = subDays(new Date(), 30);
  const endDate = new Date();
  const { metricsRange } = useDailyMetricsRange(startDate, endDate);

  const chartData = useMemo(() => {
    return metricsRange.map(dayMetrics => {
      const day = new Date(dayMetrics.date);
      const hasData = dayMetrics.has_checkin || dayMetrics.has_sessions;
      
      return {
        date: format(day, 'd', { locale: it }),
        fullDate: format(day, 'd MMM', { locale: it }),
        // Vitals are 1-10 scale, multiply by 10 for 0-100 display
        mood: hasData && dayMetrics.vitals.mood > 0 ? dayMetrics.vitals.mood * 10 : null,
        anxiety: hasData && dayMetrics.vitals.anxiety > 0 ? dayMetrics.vitals.anxiety * 10 : null,
      };
    });
  }, [metricsRange]);

  const hasData = chartData.some(d => d.mood !== null || d.anxiety !== null);

  if (!hasData) {
    return (
      <div className="bg-card rounded-3xl p-5 shadow-card border border-border/30">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-foreground">Umore vs Ansia</h3>
        </div>
        <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
          <span className="text-3xl mb-2">📊</span>
          <p className="text-sm">Completa sessioni per vedere il trend</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl p-5 shadow-card border border-border/30">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">Umore vs Ansia</h3>
          <p className="text-xs text-muted-foreground">Ultimi 30 giorni</p>
        </div>
      </div>
      
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="moodGradientFull" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(150, 60%, 45%)" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="hsl(150, 60%, 45%)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="anxietyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 65%, 55%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(0, 65%, 55%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
              interval={4}
            />
            <YAxis 
              domain={[0, 100]} 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
              tickFormatter={(v) => v === 0 ? 'Basso' : v === 100 ? 'Alto' : ''}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '11px',
                padding: '8px 12px'
              }}
              formatter={(value: number, name: string) => [
                `${Math.round(value)}%`, 
                name === 'mood' ? 'Umore' : 'Ansia'
              ]}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
            />
            <Legend 
              formatter={(value) => value === 'mood' ? 'Umore' : 'Ansia'}
              iconType="circle"
              wrapperStyle={{ fontSize: '11px' }}
            />
            <Area
              type="monotone"
              dataKey="mood"
              stroke="hsl(150, 60%, 45%)"
              strokeWidth={2}
              fill="url(#moodGradientFull)"
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="anxiety"
              stroke="hsl(0, 65%, 55%)"
              strokeWidth={2}
              fill="url(#anxietyGradient)"
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MoodAnxietyChart;
