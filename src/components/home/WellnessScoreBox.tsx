import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WellnessScoreBoxProps {
  score?: number;
  message?: string;
  isLoading?: boolean;
}

const WellnessScoreBox: React.FC<WellnessScoreBoxProps> = ({ score, message, isLoading }) => {
  // Default values if undefined
  const safeScore = score ?? 5;
  const safeMessage = message || 'Parla con me per iniziare a monitorare il tuo benessere.';

  // Color based on score
  const getScoreColor = (value: number) => {
    if (value >= 7) return 'text-emerald-600 dark:text-emerald-400';
    if (value >= 5) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getScoreBg = (value: number) => {
    if (value >= 7) return 'bg-emerald-100 dark:bg-emerald-900/30';
    if (value >= 5) return 'bg-amber-100 dark:bg-amber-900/30';
    return 'bg-rose-100 dark:bg-rose-900/30';
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-3xl p-5 shadow-premium border border-border/30 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl p-5 shadow-premium border border-border/30 animate-slide-up">
      <div className="flex items-center gap-4">
        {/* Score Circle */}
        <div className={cn(
          "w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0",
          getScoreBg(safeScore)
        )}>
          <span className={cn("text-3xl font-bold leading-none", getScoreColor(safeScore))}>
            {safeScore.toFixed(1)}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">/10</span>
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs font-medium text-primary">Il tuo stato</span>
          </div>
          <p className="text-sm text-foreground leading-snug line-clamp-2">
            {safeMessage}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WellnessScoreBox;
