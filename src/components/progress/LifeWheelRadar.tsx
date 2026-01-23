import React, { useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useDailyMetricsRange } from '@/hooks/useDailyMetrics';
import { Heart, Briefcase, Users, Zap, Sprout, TrendingUp, TrendingDown, Minus, Compass } from 'lucide-react';
import { subDays } from 'date-fns';
import { cn } from '@/lib/utils';

const LIFE_AREAS = [
  { key: 'love', label: 'Amore', icon: Heart, color: 'hsl(340, 70%, 60%)', bgColor: 'bg-rose-100' },
  { key: 'work', label: 'Lavoro', icon: Briefcase, color: 'hsl(220, 70%, 55%)', bgColor: 'bg-blue-100' },
  { key: 'social', label: 'Socialità', icon: Users, color: 'hsl(45, 80%, 50%)', bgColor: 'bg-amber-100' },
  { key: 'growth', label: 'Crescita', icon: Sprout, color: 'hsl(280, 60%, 55%)', bgColor: 'bg-purple-100' },
  { key: 'health', label: 'Salute', icon: Zap, color: 'hsl(150, 60%, 45%)', bgColor: 'bg-emerald-100' },
];

const LifeWheelRadar: React.FC = () => {
  // 🎯 SINGLE SOURCE OF TRUTH: Use the unified RPC hook
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  const sixtyDaysAgo = subDays(today, 60);
  
  // Current period
  const { metricsRange: currentRange } = useDailyMetricsRange(thirtyDaysAgo, today);
  // Previous period for comparison
  const { metricsRange: previousRange } = useDailyMetricsRange(sixtyDaysAgo, thirtyDaysAgo);

  // Get latest life areas from current period
  const lifeAreasScores = useMemo(() => {
    const daysWithLifeAreas = currentRange.filter(m => m.has_life_areas);
    const latest = daysWithLifeAreas[daysWithLifeAreas.length - 1];
    
    if (!latest?.life_areas) return null;
    
    return {
      love: latest.life_areas.love,
      work: latest.life_areas.work,
      social: latest.life_areas.social,
      growth: latest.life_areas.growth,
      health: latest.life_areas.health,
    };
  }, [currentRange]);

  // Calculate last month's average
  const lastMonthAverage = useMemo(() => {
    const daysWithData = previousRange.filter(m => m.has_life_areas);
    if (daysWithData.length === 0) return null;

    const averages: Record<string, number> = {};
    const counts: Record<string, number> = {};

    daysWithData.forEach(dayMetrics => {
      LIFE_AREAS.forEach(area => {
        const value = dayMetrics.life_areas?.[area.key as keyof typeof dayMetrics.life_areas];
        if (value !== null && value !== undefined && value > 0) {
          averages[area.key] = (averages[area.key] || 0) + value;
          counts[area.key] = (counts[area.key] || 0) + 1;
        }
      });
    });

    const result: Record<string, number> = {};
    Object.keys(averages).forEach(key => {
      result[key] = Math.round((averages[key] / counts[key]) * 10) / 10;
    });

    return Object.keys(result).length > 0 ? result : null;
  }, [previousRange]);

  // Build radar data
  const radarData = LIFE_AREAS.map(area => ({
    subject: area.label,
    current: lifeAreasScores?.[area.key as keyof typeof lifeAreasScores] || 0,
    previous: lastMonthAverage?.[area.key] || 0,
    fullMark: 10,
  }));

  const hasCurrentData = radarData.some(d => d.current > 0);

  // Calculate differences for legend
  const getDifference = (key: string) => {
    const current = lifeAreasScores?.[key as keyof typeof lifeAreasScores] || 0;
    const previous = lastMonthAverage?.[key] || 0;
    if (!previous) return null;
    return Math.round((current - previous) * 10) / 10;
  };

  return (
    <div className="bg-card rounded-3xl p-5 shadow-card border border-border/30">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Compass className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Ruota della Vita</h3>
          <p className="text-xs text-muted-foreground">Bilancio attuale vs mese scorso</p>
        </div>
      </div>

      {!hasCurrentData ? (
        <div className="h-56 flex flex-col items-center justify-center text-muted-foreground">
          <Compass className="w-16 h-16 text-muted-foreground/20 mb-3" />
          <p className="text-sm font-medium">Nessun dato disponibile</p>
          <p className="text-xs text-center mt-1 max-w-[200px]">
            Completa sessioni o interagisci con l'AI per tracciare le tue aree di vita
          </p>
        </div>
      ) : (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid 
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.3}
                />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 10]}
                  tick={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string) => [
                    `${value}/10`,
                    name === 'current' ? 'Attuale' : 'Mese scorso'
                  ]}
                />
                {/* Previous month - dashed line */}
                {lastMonthAverage && (
                  <Radar
                    name="previous"
                    dataKey="previous"
                    stroke="hsl(var(--muted-foreground))"
                    fill="transparent"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    strokeOpacity={0.5}
                  />
                )}
                {/* Current - filled */}
                <Radar
                  name="current"
                  dataKey="current"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend with values and differences */}
          <div className="grid grid-cols-5 gap-2 mt-4">
            {LIFE_AREAS.map(area => {
              const current = lifeAreasScores?.[area.key as keyof typeof lifeAreasScores] || 0;
              const diff = getDifference(area.key);
              const Icon = area.icon;

              return (
                <div key={area.key} className="flex flex-col items-center gap-1">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", area.bgColor)}>
                    <Icon className="w-4 h-4" style={{ color: area.color }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground text-center">{area.label}</span>
                  <span className="text-xs font-semibold text-foreground">{current || '-'}</span>
                  {diff !== null && diff !== 0 && (
                    <span className={cn(
                      "text-[10px] flex items-center gap-0.5",
                      diff > 0 ? "text-emerald-600" : "text-red-500"
                    )}>
                      {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {diff > 0 ? '+' : ''}{diff}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default LifeWheelRadar;
