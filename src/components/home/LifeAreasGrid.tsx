import React from 'react';
import { useDailyLifeAreas } from '@/hooks/useDailyLifeAreas';
import { useProfile } from '@/hooks/useProfile';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type LifeAreaKey = 'love' | 'work' | 'social' | 'health';

interface LifeArea {
  key: LifeAreaKey;
  icon: string;
  label: string;
  colorClass: string;
}

const lifeAreas: LifeArea[] = [
  { key: 'love', icon: '❤️', label: 'Amore', colorClass: 'bg-rose-500' },
  { key: 'work', icon: '💼', label: 'Lavoro', colorClass: 'bg-amber-500' },
  { key: 'social', icon: '🤝', label: 'Amicizia', colorClass: 'bg-sky-500' },
  { key: 'health', icon: '🧘', label: 'Benessere', colorClass: 'bg-emerald-500' },
];

const LifeAreasGrid: React.FC = () => {
  const { latestLifeAreas } = useDailyLifeAreas();
  const { profile } = useProfile();
  
  // Use daily_life_areas as primary source, fallback to profile
  const currentScores = React.useMemo(() => {
    if (latestLifeAreas) {
      return {
        love: latestLifeAreas.love ?? 5,
        work: latestLifeAreas.work ?? 5,
        social: latestLifeAreas.social ?? 5,
        health: latestLifeAreas.health ?? 5,
      };
    }
    
    // Fallback to profile (legacy)
    const profileScores = profile?.life_areas_scores as Record<string, number | null> | undefined;
    return {
      love: profileScores?.love ?? 5,
      work: profileScores?.work ?? 5,
      social: profileScores?.friendship ?? 5,
      health: profileScores?.wellness ?? profileScores?.energy ?? 5,
    };
  }, [latestLifeAreas, profile]);

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
            const score = currentScores[area.key] ?? 5;
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
