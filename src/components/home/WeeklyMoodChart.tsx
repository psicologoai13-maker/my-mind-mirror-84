import React from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useCheckins } from '@/hooks/useCheckins';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-3 rounded-xl shadow-card border border-border">
        <p className="font-display font-semibold text-sm text-foreground">{label}</p>
        <p className="text-xs text-primary">Umore: {payload[0].value}/5</p>
        {payload[1]?.value > 0 && (
          <p className="text-xs text-area-love">Soddisfazione: {payload[1].value}/5</p>
        )}
      </div>
    );
  }
  return null;
};

const WeeklyMoodChart: React.FC = () => {
  const { weeklyChartData, isLoading } = useCheckins();
  
  const hasData = weeklyChartData.some(d => d.mood > 0);

  if (isLoading) {
    return (
      <div className="bg-card rounded-3xl p-6 shadow-card animate-slide-up stagger-4">
        <div className="h-40 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Caricamento...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl p-6 shadow-card animate-slide-up stagger-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg text-foreground">
          Andamento settimanale
        </h3>
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          Questa settimana
        </span>
      </div>
      
      {!hasData ? (
        <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
          <span className="text-4xl mb-2">📊</span>
          <p className="text-sm">Nessun dato ancora</p>
          <p className="text-xs">Registra il tuo umore per vedere il grafico</p>
        </div>
      ) : (
        <>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(150, 30%, 45%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(150, 30%, 45%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="satisfactionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(340, 70%, 60%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(340, 70%, 60%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 12 }}
                />
                <YAxis 
                  domain={[0, 5]} 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="mood"
                  stroke="hsl(150, 30%, 45%)"
                  strokeWidth={2}
                  fill="url(#moodGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="satisfaction"
                  stroke="hsl(340, 70%, 60%)"
                  strokeWidth={2}
                  fill="url(#satisfactionGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Umore</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-area-love" />
              <span className="text-xs text-muted-foreground">Soddisfazione</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WeeklyMoodChart;
