import React from 'react';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WellnessSnapshotProps {
  wellnessScore: number | null;
  previousScore: number | null;
  trend: 'up' | 'down' | 'stable';
  dataPointsCount: number;
  timeRangeLabel: string;
}

const WellnessSnapshot: React.FC<WellnessSnapshotProps> = ({
  wellnessScore,
  previousScore,
  trend,
  dataPointsCount,
  timeRangeLabel,
}) => {
  const score = wellnessScore ?? 0;
  const delta = previousScore ? Math.round((score - previousScore) * 10) / 10 : null;
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-orange-500' : 'text-muted-foreground';
  
  // Calculate ring progress (0-100)
  const ringProgress = Math.min(100, Math.max(0, score * 10));
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (ringProgress / 100) * circumference;
  
  // Score color based on value
  const getScoreColor = (value: number) => {
    if (value >= 7) return 'text-emerald-500';
    if (value >= 5) return 'text-amber-500';
    return 'text-orange-500';
  };

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* Wellness Score Card */}
      <div className={cn(
        "relative overflow-hidden rounded-3xl p-5",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass"
      )}>
        {/* Inner glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          {/* Ring Chart */}
          <div className="relative w-24 h-24 mb-2">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background ring */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              {/* Progress ring */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Center score */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-3xl font-bold", getScoreColor(score))}>
                {score > 0 ? score.toFixed(1) : '—'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Wellness Score</span>
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gradient-aria-subtle text-aria-violet rounded-full flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              AI
            </span>
          </div>
        </div>
      </div>
      
      {/* Trend Card */}
      <div className={cn(
        "relative overflow-hidden rounded-3xl p-5",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass"
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Trend {timeRangeLabel}
            </span>
            <TrendIcon className={cn("w-5 h-5", trendColor)} />
          </div>
          
          {/* Delta display */}
          <div className="flex-1 flex flex-col justify-center">
            {delta !== null ? (
              <>
                <div className={cn("text-4xl font-bold mb-1", trendColor)}>
                  {delta > 0 ? '+' : ''}{delta}
                </div>
                <span className="text-xs text-muted-foreground">
                  punti vs periodo precedente
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                Dati insufficienti per il confronto
              </span>
            )}
          </div>
          
          {/* Data points indicator */}
          <div className="mt-3 pt-3 border-t border-glass-border">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {[...Array(Math.min(5, dataPointsCount))].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary/60 border border-background"
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {dataPointsCount} giorni di dati
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WellnessSnapshot;
