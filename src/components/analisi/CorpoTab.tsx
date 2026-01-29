import React from 'react';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Scale, Heart, Moon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const CorpoTab: React.FC = () => {
  const { 
    metricsHistory, 
    isLoading, 
    latestWeight, 
    latestHeartRate,
    weightTrend,
    calculateTrend 
  } = useBodyMetrics();

  // Prepare weight chart data
  const weightData = metricsHistory
    ?.filter(m => m.weight !== null)
    .map(m => ({
      date: format(new Date(m.date), 'dd/MM', { locale: it }),
      value: m.weight,
      fullDate: m.date,
    }))
    .reverse() || [];

  // Prepare sleep chart data
  const sleepData = metricsHistory
    ?.filter(m => m.sleep_hours !== null)
    .map(m => ({
      date: format(new Date(m.date), 'dd/MM', { locale: it }),
      value: m.sleep_hours,
      fullDate: m.date,
    }))
    .reverse() || [];

  // Prepare heart rate data
  const heartRateData = metricsHistory
    ?.filter(m => m.resting_heart_rate !== null)
    .map(m => ({
      date: format(new Date(m.date), 'dd/MM', { locale: it }),
      value: m.resting_heart_rate,
      fullDate: m.date,
    }))
    .reverse() || [];

  const sleepTrend = calculateTrend('sleep_hours', 30);
  const heartRateTrend = calculateTrend('resting_heart_rate', 30);

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-orange-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const hasAnyData = weightData.length > 0 || sleepData.length > 0 || heartRateData.length > 0;

  if (!hasAnyData) {
    return (
      <div className="text-center py-12">
        <Scale className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-medium text-foreground mb-2">Nessun dato corporeo</h3>
        <p className="text-sm text-muted-foreground">
          Inizia a tracciare peso, sonno o battito cardiaco per vedere le analisi qui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Weight Card */}
      {weightData.length > 0 && (
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Scale className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Peso</h3>
                <p className="text-xs text-muted-foreground">Ultimi 90 giorni</p>
              </div>
            </div>
            <div className="text-right flex items-center gap-2">
              <div>
                <span className="text-2xl font-bold text-foreground">
                  {latestWeight?.toFixed(1) || '—'}
                </span>
                <span className="text-sm text-muted-foreground ml-1">kg</span>
              </div>
              <TrendIcon trend={weightTrend.trend} />
            </div>
          </div>
          
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)} kg`, 'Peso']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(210, 80%, 55%)"
                  strokeWidth={2}
                  fill="url(#weightGradient)"
                  dot={{ fill: 'hsl(210, 80%, 55%)', r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {weightTrend.change !== null && (
            <div className="mt-3 pt-3 border-t border-border/20 text-xs text-muted-foreground">
              {weightTrend.change > 0 ? '+' : ''}{weightTrend.change.toFixed(1)} kg negli ultimi 30 giorni
            </div>
          )}
        </div>
      )}

      {/* Sleep Hours Card */}
      {sleepData.length > 0 && (
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Moon className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Ore di Sonno</h3>
                <p className="text-xs text-muted-foreground">Media periodo</p>
              </div>
            </div>
            <div className="text-right flex items-center gap-2">
              <div>
                <span className="text-2xl font-bold text-foreground">
                  {sleepTrend.current?.toFixed(1) || '—'}
                </span>
                <span className="text-sm text-muted-foreground ml-1">ore</span>
              </div>
              <TrendIcon trend={sleepTrend.trend} />
            </div>
          </div>
          
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sleepData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(260, 60%, 55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(260, 60%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <YAxis hide domain={[0, 12]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)} ore`, 'Sonno']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(260, 60%, 55%)"
                  strokeWidth={2}
                  fill="url(#sleepGradient)"
                  dot={{ fill: 'hsl(260, 60%, 55%)', r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Heart Rate Card */}
      {heartRateData.length > 0 && (
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Battito a Riposo</h3>
                <p className="text-xs text-muted-foreground">Media periodo</p>
              </div>
            </div>
            <div className="text-right flex items-center gap-2">
              <div>
                <span className="text-2xl font-bold text-foreground">
                  {latestHeartRate || '—'}
                </span>
                <span className="text-sm text-muted-foreground ml-1">bpm</span>
              </div>
              <TrendIcon trend={heartRateTrend.trend} />
            </div>
          </div>
          
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={heartRateData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="heartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(350, 80%, 55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(350, 80%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value} bpm`, 'Battito']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(350, 80%, 55%)"
                  strokeWidth={2}
                  fill="url(#heartGradient)"
                  dot={{ fill: 'hsl(350, 80%, 55%)', r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorpoTab;
