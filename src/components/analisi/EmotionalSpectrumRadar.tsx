import React from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EMOTION_CONFIG, EmotionKey, ALL_EMOTION_KEYS } from '@/lib/emotionConfig';

interface EmotionData {
  emotion: string;
  label: string;
  value: number;
  fullMark: number;
  color: string;
}

interface EmotionalSpectrumRadarProps {
  emotions: Record<string, number>;
  extendedEmotions?: Record<string, number | null>;
  className?: string;
}

const EmotionalSpectrumRadar: React.FC<EmotionalSpectrumRadarProps> = ({
  emotions,
  extendedEmotions,
  className,
}) => {
  // Combine basic and extended emotions
  const allEmotions = { ...emotions, ...extendedEmotions };
  
  // Build data for radar chart - only include emotions with values > 0
  // Limit to max 8 emotions for readability, prioritized by value
  const radarData: EmotionData[] = React.useMemo(() => {
    const emotionsWithValues = ALL_EMOTION_KEYS
      .map(key => {
        const value = allEmotions[key];
        const config = EMOTION_CONFIG[key];
        return {
          emotion: key,
          label: config?.label || key,
          value: value !== null && value !== undefined ? Math.round(value as number) : 0,
          fullMark: 10,
          color: config?.color || 'hsl(220, 10%, 50%)',
        };
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Max 8 for readability
    
    return emotionsWithValues;
  }, [allEmotions]);

  // Need at least 3 emotions for a meaningful radar
  if (radarData.length < 3) {
    return null;
  }

  // Calculate dominant emotion
  const dominantEmotion = radarData[0];

  return (
    <section className={cn("animate-fade-in mb-6", className)}>
      <div className={cn(
        "relative overflow-hidden rounded-3xl",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass p-5"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌈</span>
            <h3 className="font-display font-semibold text-foreground">Radar Emotivo</h3>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-medium bg-gradient-aria-subtle text-aria-violet rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI
          </span>
        </div>

        {/* Radar Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid 
                stroke="hsl(var(--muted-foreground))" 
                strokeOpacity={0.2} 
              />
              <PolarAngleAxis
                dataKey="label"
                tick={{ 
                  fill: 'hsl(var(--muted-foreground))', 
                  fontSize: 11,
                  fontWeight: 500,
                }}
                tickLine={false}
              />
              <Radar
                name="Emozioni"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="hsl(var(--primary))"
                fillOpacity={0.25}
                dot={{
                  r: 4,
                  fill: 'hsl(var(--primary))',
                  strokeWidth: 0,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Dominant emotion indicator */}
        {dominantEmotion && dominantEmotion.value > 0 && (
          <div className="mt-4 pt-4 border-t border-glass-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Emozione dominante</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {dominantEmotion.label}
                </span>
                <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                  {dominantEmotion.value}/10
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Emotion legend (scrollable) - show top 6 */}
        <div className="mt-3 flex flex-wrap gap-2">
          {radarData.slice(0, 6).map((item) => {
            const config = EMOTION_CONFIG[item.emotion as EmotionKey];
            return (
              <div
                key={item.emotion}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 text-xs"
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: config?.color || item.color }}
                />
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            );
          })}
          {radarData.length > 6 && (
            <span className="text-xs text-muted-foreground px-2 py-1">
              +{radarData.length - 6}
            </span>
          )}
        </div>
      </div>
    </section>
  );
};

export default EmotionalSpectrumRadar;
