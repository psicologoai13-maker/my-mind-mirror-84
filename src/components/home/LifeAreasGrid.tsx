import React from 'react';
import { useTimeWeightedMetrics } from '@/hooks/useTimeWeightedMetrics';
import { useOccupationContext } from '@/hooks/useOccupationContext';
import { cn } from '@/lib/utils';

const LifeAreasGrid: React.FC = () => {
  // 🎯 TIME-WEIGHTED AVERAGE: Use unified data source (30 giorni, half-life 10 giorni)
  const { lifeAreas: scores, hasData, daysWithData } = useTimeWeightedMetrics(30, 10);
  // 🎯 OCCUPATION CONTEXT: Dynamic life areas based on age/occupation
  const { lifeAreas: dynamicAreas } = useOccupationContext();
  
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 7) return 'text-emerald-500';
    if (score >= 4) return 'text-amber-500';
    return 'text-destructive';
  };

  const getBarColor = (score: number | null, baseColor: string) => {
    if (score === null) return 'bg-muted';
    if (score >= 7) return baseColor;
    if (score >= 4) return 'bg-amber-500';
    return 'bg-destructive';
  };

  return (
    <div className="relative overflow-hidden bg-card/80 backdrop-blur-xl rounded-3xl p-5 shadow-soft border border-border/50">
      {/* Decorative blur */}
      <div className="absolute -top-16 -left-16 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <span className="text-lg">⚖️</span>
            Bilanciamento Vita
          </h3>
          {daysWithData > 0 && (
            <span className="text-xs text-muted-foreground">
              Media ponderata
            </span>
          )}
        </div>
        
        <div className="space-y-4">
          {dynamicAreas.map((area) => {
            const score = scores[area.dbField as keyof typeof scores];
            const percentage = score !== null ? (score / 10) * 100 : 0;
            
            return (
              <div key={area.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{area.icon}</span>
                    <span className="text-sm font-medium text-foreground">{area.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-sm font-bold", getScoreColor(score))}>
                      {score !== null ? `${score}/10` : '—'}
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
