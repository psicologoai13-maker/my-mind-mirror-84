import React from 'react';
import { MetricData } from '@/pages/Analisi';
import { cn } from '@/lib/utils';

interface LifeAreasCardProps {
  areas: MetricData[];
  onClick: (key: string) => void;
}

const LifeAreasCard: React.FC<LifeAreasCardProps> = ({ areas, onClick }) => {
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 7) return 'text-emerald-500';
    if (score >= 5) return 'text-amber-500';
    return 'text-orange-500';
  };

  return (
    <div className="bg-card rounded-3xl shadow-premium p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-lg">⚖️</span>
        <h3 className="font-semibold text-foreground">Aree della Vita</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {areas.map(area => {
          const score10 = area.average !== null ? Math.round(area.average / 10) : null;
          
          return (
            <button
              key={area.key}
              onClick={() => onClick(area.key)}
              className="bg-muted/50 rounded-2xl p-4 text-left transition-all hover:bg-muted active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{area.icon}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {area.label}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={cn("text-2xl font-bold", getScoreColor(score10))}>
                  {score10 ?? '—'}
                </span>
                <span className="text-sm text-muted-foreground">/10</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LifeAreasCard;
