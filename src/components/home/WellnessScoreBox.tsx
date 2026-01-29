import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedRing } from '@/components/ui/animated-ring';

interface WellnessScoreBoxProps {
  score?: number;
  message?: string;
  isLoading?: boolean;
}

const WellnessScoreBox: React.FC<WellnessScoreBoxProps> = ({ score, message, isLoading }) => {
  // Default values if undefined
  const safeScore = score ?? 5;
  const safeMessage = message || 'Parla con me per iniziare a monitorare il tuo benessere.';

  // Get glow color based on score
  const getGlowColor = (value: number) => {
    if (value >= 7) return 'hsl(var(--mood-excellent))';
    if (value >= 5) return 'hsl(var(--mood-neutral))';
    return 'hsl(var(--mood-low))';
  };

  if (isLoading) {
    return (
      <div className={cn(
        "relative overflow-hidden rounded-[32px] p-6",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass animate-pulse"
      )}>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-muted/50" />
          <div className="flex-1 space-y-3">
            <div className="h-3 bg-muted/50 rounded-full w-24" />
            <div className="h-4 bg-muted/50 rounded-full w-full" />
            <div className="h-4 bg-muted/50 rounded-full w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-[32px] p-6",
      "bg-glass backdrop-blur-xl border border-glass-border",
      "shadow-glass-glow",
      "animate-scale-in"
    )}>
      {/* Gradient mesh background */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-50 pointer-events-none" />
      
      {/* Inner light reflection */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none rounded-[32px]" />
      
      <div className="relative z-10 flex items-center gap-5">
        {/* Animated Ring Score */}
        <div className="relative shrink-0">
          {/* Glow effect behind ring */}
          <div 
            className="absolute inset-0 rounded-full blur-xl opacity-40"
            style={{ background: getGlowColor(safeScore) }}
          />
          <AnimatedRing
            value={safeScore * 10}
            size="lg"
            thickness={8}
            color={getGlowColor(safeScore)}
            glowColor={getGlowColor(safeScore)}
            showValue={true}
          />
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/10 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
              Il tuo stato
            </span>
          </div>
          <p className="text-[15px] text-foreground leading-relaxed line-clamp-2 font-medium">
            {safeMessage}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WellnessScoreBox;
