import React from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmotionsData } from '@/hooks/useEmotionsData';
import { EMOTION_CONFIG, EmotionKey } from '@/lib/emotionConfig';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const EmotionalMixBar: React.FC = () => {
  // 🎯 TIME-WEIGHTED AVERAGE: Dati più recenti hanno più rilevanza (30 giorni, half-life 10 giorni)
  const { emotionsWithPercentages, hasData, isLoading } = useEmotionsData({ days: 30, halfLife: 10 });

  if (isLoading) {
    return (
      <div className={cn(
        "relative overflow-hidden rounded-3xl p-6",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass animate-pulse"
      )}>
        <div className="h-24 bg-muted/20 rounded-lg" />
      </div>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl p-6",
      "bg-glass backdrop-blur-xl border border-glass-border",
      "shadow-glass"
    )}>
      {/* Inner light */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 flex items-center gap-2.5 mb-4">
        <span className="text-xl">🎨</span>
        <div>
          <h3 className="font-display font-semibold text-sm text-foreground">
            Mix Emotivo
          </h3>
          <p className="text-[10px] text-muted-foreground">Media 30 giorni</p>
        </div>
      </div>

      {!hasData ? (
        <div className="relative z-10 h-20 flex flex-col items-center justify-center text-muted-foreground text-center">
          <MessageCircle className="w-8 h-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm">Parla con l'AI per generare il grafico</p>
        </div>
      ) : (
        <TooltipProvider>
          <div className="relative z-10 space-y-4">
            {/* Slim Pill Bar with glass effect */}
            <div className="h-5 w-full rounded-full overflow-hidden flex bg-muted/50 backdrop-blur-sm shadow-inner">
              {emotionsWithPercentages.map((segment, index) => {
                const config = EMOTION_CONFIG[segment.key];
                return (
                  <Tooltip key={segment.key}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-full transition-all duration-500 cursor-pointer hover:brightness-110",
                          index === 0 && "rounded-l-full",
                          index === emotionsWithPercentages.length - 1 && "rounded-r-full"
                        )}
                        style={{
                          width: `${segment.percentage}%`,
                          backgroundColor: config.color,
                          minWidth: segment.percentage > 0 ? '4px' : '0',
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex items-center gap-2">
                        <span>{config.icon}</span>
                        <span className="font-medium">{config.label}</span>
                        <span className="text-muted-foreground">{Math.round(segment.percentage)}%</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* Legend - Horizontal dots with wrap */}
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {emotionsWithPercentages.slice(0, 8).map(emotion => {
                const config = EMOTION_CONFIG[emotion.key];
                return (
                  <div key={emotion.key} className="flex items-center gap-1.5">
                    <div 
                      className="w-2.5 h-2.5 rounded-full shadow-sm"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-xs text-muted-foreground">{config.label}</span>
                    <span className="text-xs font-medium text-foreground">
                      {Math.round(emotion.percentage || 0)}%
                    </span>
                  </div>
                );
              })}
              {emotionsWithPercentages.length > 8 && (
                <span className="text-xs text-muted-foreground">
                  +{emotionsWithPercentages.length - 8} altre
                </span>
              )}
            </div>
          </div>
        </TooltipProvider>
      )}
    </div>
  );
};

export default EmotionalMixBar;
