import React, { useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { useProfile } from '@/hooks/useProfile';
import { useSessions, LifeBalanceScores } from '@/hooks/useSessions';
import { Heart, Briefcase, Users, Zap, Sprout, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subDays, isAfter } from 'date-fns';

const LIFE_AREAS = [
  { key: 'love', label: 'Amore', icon: Heart, color: 'hsl(340, 70%, 60%)' },
  { key: 'work', label: 'Lavoro', icon: Briefcase, color: 'hsl(220, 70%, 55%)' },
  { key: 'friendship', label: 'Socialità', icon: Users, color: 'hsl(45, 80%, 50%)' },
  { key: 'growth', label: 'Crescita', icon: Sprout, color: 'hsl(280, 60%, 55%)' },
  { key: 'energy', label: 'Salute', icon: Zap, color: 'hsl(150, 60%, 45%)' },
];

const ImprovedLifeRadar: React.FC = () => {
  const { profile } = useProfile();
  const { completedSessions } = useSessions();

  const lifeAreasScores = profile?.life_areas_scores as Record<string, number | null> | undefined;

  // Calculate last month's average
  const lastMonthAverage = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const sixtyDaysAgo = subDays(new Date(), 60);

    const previousMonthSessions = completedSessions.filter(s => {
      const sessionDate = new Date(s.start_time);
      return isAfter(sessionDate, sixtyDaysAgo) && !isAfter(sessionDate, thirtyDaysAgo);
    });

    if (previousMonthSessions.length === 0) return null;

    const averages: Record<string, number> = {};
    const counts: Record<string, number> = {};

    previousMonthSessions.forEach(session => {
      if (session.life_balance_scores) {
        const scores = session.life_balance_scores as LifeBalanceScores;
        LIFE_AREAS.forEach(area => {
          const value = scores[area.key as keyof LifeBalanceScores];
          if (value !== null && value !== undefined) {
            averages[area.key] = (averages[area.key] || 0) + value;
            counts[area.key] = (counts[area.key] || 0) + 1;
          }
        });
      }
    });

    const result: Record<string, number> = {};
    Object.keys(averages).forEach(key => {
      result[key] = Math.round((averages[key] / counts[key]) * 10) / 10;
    });

    return Object.keys(result).length > 0 ? result : null;
  }, [completedSessions]);

  const radarData = LIFE_AREAS.map(area => ({
    subject: area.label,
    current: (lifeAreasScores?.[area.key] || 0) as number,
    previous: lastMonthAverage?.[area.key] || 0,
    fullMark: 10,
  }));

  const hasCurrentData = radarData.some(d => d.current > 0);

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Compass className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">Aree della Vita</h3>
          <p className="text-xs text-muted-foreground">Bilancio attuale</p>
        </div>
      </div>

      {!hasCurrentData ? (
        <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
          <Compass className="w-12 h-12 text-muted-foreground/30 mb-2" />
          <p className="text-sm">Nessun dato disponibile</p>
          <p className="text-xs text-center mt-1">Completa sessioni vocali per vedere il bilancio</p>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid 
                  stroke="hsl(var(--border))" 
                  strokeOpacity={0.3}
                  strokeWidth={1}
                />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 10]}
                  tick={false}
                  axisLine={false}
                />
                {/* Previous month - light dashed */}
                {lastMonthAverage && (
                  <Radar
                    name="Mese scorso"
                    dataKey="previous"
                    stroke="hsl(var(--muted-foreground))"
                    fill="transparent"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                )}
                {/* Current - main radar */}
                <Radar
                  name="Attuale"
                  dataKey="current"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Side legend with values */}
          <div className="w-24 space-y-1.5">
            {LIFE_AREAS.map(area => {
              const current = lifeAreasScores?.[area.key] || 0;
              const Icon = area.icon;

              return (
                <div key={area.key} className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" style={{ color: area.color }} />
                  <span className="text-[10px] text-muted-foreground flex-1 truncate">{area.label}</span>
                  <span className="text-[11px] font-semibold text-foreground">{current || '-'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImprovedLifeRadar;