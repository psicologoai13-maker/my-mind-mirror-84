import React, { useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from 'recharts';
import { useProfile } from '@/hooks/useProfile';
import { useSessions, LifeBalanceScores } from '@/hooks/useSessions';
import { Star, Heart, Briefcase, Users, Zap, Sprout } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subDays, isAfter } from 'date-fns';

const LIFE_AREAS = [
  { key: 'love', label: 'Amore', icon: Heart, color: 'hsl(340, 70%, 60%)', bgColor: 'bg-pink-500/20' },
  { key: 'work', label: 'Lavoro', icon: Briefcase, color: 'hsl(220, 70%, 55%)', bgColor: 'bg-blue-500/20' },
  { key: 'friendship', label: 'Amicizia', icon: Users, color: 'hsl(45, 80%, 50%)', bgColor: 'bg-amber-500/20' },
  { key: 'energy', label: 'Energia', icon: Zap, color: 'hsl(150, 60%, 45%)', bgColor: 'bg-emerald-500/20' },
  { key: 'growth', label: 'Crescita', icon: Sprout, color: 'hsl(280, 60%, 55%)', bgColor: 'bg-purple-500/20' },
];

const LifeWheelRadar: React.FC = () => {
  const { profile } = useProfile();
  const { completedSessions } = useSessions();
  
  // Current life balance scores from profile
  const lifeAreasScores = profile?.life_areas_scores as Record<string, number | null> | undefined;
  
  // Calculate last month's average from sessions
  const lastMonthAverage = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const sixtyDaysAgo = subDays(new Date(), 60);
    
    // Get sessions from 30-60 days ago (previous month)
    const previousMonthSessions = completedSessions.filter(s => {
      const sessionDate = new Date(s.start_time);
      return isAfter(sessionDate, sixtyDaysAgo) && !isAfter(sessionDate, thirtyDaysAgo);
    });
    
    if (previousMonthSessions.length === 0) return null;
    
    // Calculate averages
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
    
    // Calculate final averages
    const result: Record<string, number> = {};
    Object.keys(averages).forEach(key => {
      result[key] = Math.round((averages[key] / counts[key]) * 10) / 10;
    });
    
    return Object.keys(result).length > 0 ? result : null;
  }, [completedSessions]);
  
  // Build radar data
  const radarData = LIFE_AREAS.map(area => ({
    subject: area.label,
    current: (lifeAreasScores?.[area.key] || 0) as number,
    previous: lastMonthAverage?.[area.key] || 0,
    fullMark: 10,
  }));
  
  const hasCurrentData = radarData.some(d => d.current > 0);
  const hasPreviousData = radarData.some(d => d.previous > 0);

  if (!hasCurrentData) {
    return (
      <div className="bg-card rounded-3xl p-5 shadow-card border border-border/30">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
            <Star className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-lg text-foreground">Ruota della Vita</h3>
        </div>
        <div className="h-56 flex flex-col items-center justify-center text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-3">
            <Star className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium">Nessun dato ancora</p>
          <p className="text-xs text-center mt-1 max-w-[200px]">Completa sessioni vocali per vedere il tuo bilancio di vita</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl p-5 shadow-card border border-border/30">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
          <Star className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">Ruota della Vita</h3>
          {hasPreviousData && (
            <p className="text-xs text-muted-foreground">vs mese scorso (linea tratteggiata)</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex-1 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
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
              {/* Previous month - dashed ghost line */}
              {hasPreviousData && (
                <Radar
                  name="Mese scorso"
                  dataKey="previous"
                  stroke="hsl(var(--muted-foreground))"
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  strokeOpacity={0.6}
                />
              )}
              {/* Current - solid fill */}
              <Radar
                name="Attuale"
                dataKey="current"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              {hasPreviousData && (
                <Legend 
                  wrapperStyle={{ fontSize: '11px' }}
                  iconType="line"
                />
              )}
            </RadarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend with values */}
        <div className="w-28 space-y-2">
          {LIFE_AREAS.map(area => {
            const current = lifeAreasScores?.[area.key] || 0;
            const previous = lastMonthAverage?.[area.key] || 0;
            const Icon = area.icon;
            const diff = current - previous;
            
            return (
              <div key={area.key} className="flex items-center gap-2">
                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", area.bgColor)}>
                  <Icon className="w-3 h-3" style={{ color: area.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground truncate block">{area.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-foreground block">
                    {current || '-'}
                  </span>
                  {hasPreviousData && diff !== 0 && (
                    <span className={cn(
                      "text-[9px]",
                      diff > 0 ? "text-emerald-500" : "text-destructive"
                    )}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LifeWheelRadar;
