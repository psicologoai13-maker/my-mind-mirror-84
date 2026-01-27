import React from 'react';
import { useTimeWeightedMetrics } from '@/hooks/useTimeWeightedMetrics';
import { Sparkles, MessageCircle } from 'lucide-react';

const EMOTION_CONFIG = {
  // Primary emotions
  joy: { label: 'Gioia', color: 'hsl(var(--mood-neutral))' },
  sadness: { label: 'Tristezza', color: 'hsl(var(--area-friendship))' },
  anger: { label: 'Rabbia', color: 'hsl(var(--mood-bad))' },
  fear: { label: 'Paura', color: 'hsl(var(--accent-foreground))' },
  apathy: { label: 'Apatia', color: 'hsl(var(--muted-foreground))' },
  // Secondary emotions
  shame: { label: 'Vergogna', color: 'hsl(320, 60%, 50%)' },
  jealousy: { label: 'Gelosia', color: 'hsl(150, 60%, 40%)' },
  hope: { label: 'Speranza', color: 'hsl(200, 80%, 55%)' },
  frustration: { label: 'Frustrazione', color: 'hsl(30, 80%, 50%)' },
  nostalgia: { label: 'Nostalgia', color: 'hsl(260, 50%, 55%)' },
};

type EmotionKey = keyof typeof EMOTION_CONFIG;

const EmotionalMixBar: React.FC = () => {
  // 🎯 TIME-WEIGHTED AVERAGE: Dati più recenti hanno più rilevanza
  const { emotions, hasData } = useTimeWeightedMetrics(30, 7);

  // Filter out emotions with 0 or null value - don't show them
  const segments = React.useMemo(() => {
    if (!emotions) return [];
    
    const emotionEntries = Object.entries(emotions) as [EmotionKey, number | null][];
    const nonZero = emotionEntries.filter(([_, value]) => value !== null && value > 0);
    
    if (nonZero.length === 0) return [];
    
    const total = nonZero.reduce((sum, [_, value]) => sum + (value || 0), 0);
    
    return nonZero
      .map(([key, value]) => ({
        key,
        value: value || 0,
        percentage: total > 0 ? ((value || 0) / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [emotions]);

  const hasEmotions = segments.length > 0;

  return (
    <div className="rounded-3xl p-6 bg-card shadow-premium">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-area-work/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-area-work" />
        </div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Mix Emotivo
        </h3>
      </div>

      {!hasEmotions ? (
        <div className="h-20 flex flex-col items-center justify-center text-muted-foreground text-center">
          <MessageCircle className="w-8 h-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm">Parla con l'AI per generare il grafico</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Slim Pill Bar */}
          <div className="h-4 w-full rounded-full overflow-hidden flex bg-muted">
            {segments.map((segment) => (
              <div
                key={segment.key}
                className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500"
                style={{
                  width: `${segment.percentage}%`,
                  backgroundColor: EMOTION_CONFIG[segment.key].color,
                }}
              />
            ))}
          </div>

          {/* Legend - Horizontal dots */}
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {segments.map(emotion => (
              <div key={emotion.key} className="flex items-center gap-1.5">
                <div 
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: EMOTION_CONFIG[emotion.key].color }}
                />
                <span className="text-xs text-muted-foreground">{EMOTION_CONFIG[emotion.key].label}</span>
                <span className="text-xs font-medium text-foreground">
                  {Math.round(emotion.percentage)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionalMixBar;