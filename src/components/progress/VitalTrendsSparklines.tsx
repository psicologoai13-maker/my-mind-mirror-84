import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useDailyMetricsRange } from '@/hooks/useDailyMetrics';
import { format, subDays } from 'date-fns';
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

const Sparkline: React.FC<SparklineProps> = ({ data, color, gradientId, label, icon, unit = '/10' }) => {
  // Filter to only include data points with values (stretch effect)
  const filteredData = data.filter(d => d.value !== null && d.value > 0);
  const hasData = filteredData.length > 0;
  const latestValue = filteredData[filteredData.length - 1]?.value;

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
            <AreaChart data={filteredData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 10]} hide />
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
                dot={{ fill: color, strokeWidth: 0, r: 2 }}
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
  // 🎯 SINGLE SOURCE OF TRUTH: Use the unified RPC hook
  const startDate = subDays(new Date(), 30);
  const endDate = new Date();
  const { metricsRange } = useDailyMetricsRange(startDate, endDate);

  const { moodData, anxietyData, sleepData } = useMemo(() => {
    const moodData: SparklineData[] = [];
    const anxietyData: SparklineData[] = [];
    const sleepData: SparklineData[] = [];

    // Filter days with actual data and build sparklines
    metricsRange
      .filter(m => m.has_checkin || m.has_sessions)
      .forEach(dayMetrics => {
        const day = new Date(dayMetrics.date);
        const dateStr = format(day, 'd', { locale: it });
        const fullDate = format(day, 'd MMM', { locale: it });

        // All vitals are already 1-10 scale from RPC
        moodData.push({ 
          date: dateStr, 
          fullDate, 
          value: dayMetrics.vitals.mood > 0 ? dayMetrics.vitals.mood : null 
        });
        anxietyData.push({ 
          date: dateStr, 
          fullDate, 
          value: dayMetrics.vitals.anxiety > 0 ? dayMetrics.vitals.anxiety : null 
        });
        sleepData.push({ 
          date: dateStr, 
          fullDate, 
          value: dayMetrics.vitals.sleep > 0 ? dayMetrics.vitals.sleep : null 
        });
      });

    return { moodData, anxietyData, sleepData };
  }, [metricsRange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1 mb-2">
        <h2 className="font-display font-semibold text-lg text-foreground">I Tuoi Trend Vitali</h2>
        <span className="text-xs text-muted-foreground">Dati disponibili</span>
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
