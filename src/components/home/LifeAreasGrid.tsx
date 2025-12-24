import React from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useSessions } from '@/hooks/useSessions';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LifeBalanceScores } from '@/hooks/useSessions';

type LifeAreaKey = 'love' | 'work' | 'friendship' | 'wellness';

interface LifeArea {
  key: LifeAreaKey;
  balanceKey: keyof LifeBalanceScores;
  icon: string;
  label: string;
  colorClass: string;
}

const lifeAreas: LifeArea[] = [
  { key: 'love', balanceKey: 'love', icon: '❤️', label: 'Amore', colorClass: 'bg-rose-500' },
  { key: 'work', balanceKey: 'work', icon: '💼', label: 'Lavoro', colorClass: 'bg-amber-500' },
  { key: 'friendship', balanceKey: 'friendship', icon: '🤝', label: 'Amicizia', colorClass: 'bg-sky-500' },
  { key: 'wellness', balanceKey: 'energy', icon: '🧘', label: 'Benessere', colorClass: 'bg-emerald-500' },
];

const LifeAreasGrid: React.FC = () => {
  const { profile } = useProfile();
  const { journalSessions } = useSessions();
  
  // Get current scores from profile (scaled 0-10)
  const currentScores = profile?.life_areas_scores || {
    love: 5,
    work: 5,
    friendship: 5,
    wellness: 5,
  };
  
  // Calculate trends from recent sessions
  const getTrend = (balanceKey: keyof LifeBalanceScores): 'up' | 'down' | 'stable' => {
    if (!journalSessions || journalSessions.length < 2) return 'stable';
    
    const sessionsWithScores = journalSessions.filter(s => s.life_balance_scores);
    if (sessionsWithScores.length < 2) return 'stable';
    
    const recent = sessionsWithScores.slice(0, Math.ceil(sessionsWithScores.length / 2));
    const older = sessionsWithScores.slice(Math.ceil(sessionsWithScores.length / 2));
    
    const recentAvg = recent.reduce((acc, s) => {
      return acc + (s.life_balance_scores?.[balanceKey] ?? 5);
    }, 0) / recent.length;
    
    const olderAvg = older.reduce((acc, s) => {
      return acc + (s.life_balance_scores?.[balanceKey] ?? 5);
    }, 0) / older.length;
    
    if (recentAvg > olderAvg + 0.5) return 'up';
    if (recentAvg < olderAvg - 0.5) return 'down';
    return 'stable';
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-emerald-500';
    if (score >= 4) return 'text-amber-500';
    return 'text-destructive';
  };

  const getBarColor = (score: number, baseColor: string) => {
    if (score >= 7) return baseColor;
    if (score >= 4) return 'bg-amber-500';
    return 'bg-destructive';
  };

  return (
    <div className="relative overflow-hidden bg-card/80 backdrop-blur-xl rounded-3xl p-5 shadow-soft border border-border/50">
      {/* Decorative blur */}
      <div className="absolute -top-16 -left-16 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="text-lg">⚖️</span>
          Bilanciamento Vita
        </h3>
        
        <div className="space-y-4">
          {lifeAreas.map((area) => {
            const profileScores = currentScores as { love?: number; work?: number; friendship?: number; wellness?: number };
            const score = profileScores[area.key] ?? 5;
            const trend = getTrend(area.balanceKey);
            const percentage = (score / 10) * 100;
            
            return (
              <div key={area.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{area.icon}</span>
                    <span className="text-sm font-medium text-foreground">{area.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-sm font-bold", getScoreColor(score))}>
                      {score}/10
                    </span>
                    {trend === 'up' && (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    {trend === 'down' && (
                      <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                    )}
                    {trend === 'stable' && (
                      <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      getBarColor(score, area.colorClass)
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LifeAreasGrid;
