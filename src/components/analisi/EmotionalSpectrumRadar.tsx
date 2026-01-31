import React from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmotionData {
  emotion: string;
  label: string;
  value: number;
  fullMark: number;
}

interface EmotionalSpectrumRadarProps {
  emotions: Record<string, number>;
  extendedEmotions?: Record<string, number | null>;
  className?: string;
}

const EMOTION_CONFIG: { key: string; label: string; color: string }[] = [
  { key: 'joy', label: 'Gioia', color: 'hsl(50, 90%, 50%)' },
  { key: 'sadness', label: 'Tristezza', color: 'hsl(210, 60%, 50%)' },
  { key: 'anger', label: 'Rabbia', color: 'hsl(0, 80%, 50%)' },
  { key: 'fear', label: 'Paura', color: 'hsl(270, 60%, 50%)' },
  { key: 'apathy', label: 'Apatia', color: 'hsl(220, 20%, 50%)' },
  { key: 'excitement', label: 'Eccitazione', color: 'hsl(340, 80%, 55%)' },
  { key: 'hope', label: 'Speranza', color: 'hsl(160, 60%, 45%)' },
  { key: 'frustration', label: 'Frustrazione', color: 'hsl(25, 80%, 55%)' },
  { key: 'nervousness', label: 'Nervosismo', color: 'hsl(45, 70%, 50%)' },
  { key: 'overwhelm', label: 'Sopraffazione', color: 'hsl(280, 50%, 50%)' },
];

const EmotionalSpectrumRadar: React.FC<EmotionalSpectrumRadarProps> = ({
  emotions,
  extendedEmotions,
  className,
}) => {
  // Combine basic and extended emotions
  const allEmotions = { ...emotions, ...extendedEmotions };
  
  // Build data for radar chart (only include emotions with values)
  const radarData: EmotionData[] = EMOTION_CONFIG
    .map(({ key, label }) => ({
      emotion: key,
      label,
      value: allEmotions[key] !== null && allEmotions[key] !== undefined 
        ? Math.round(allEmotions[key] as number) 
        : 0,
      fullMark: 10,
    }))
    .filter(d => d.value > 0 || EMOTION_CONFIG.slice(0, 5).some(e => e.key === d.emotion)); // Always show base 5 emotions

  // If not enough emotions to show, return null
  if (radarData.filter(d => d.value > 0).length < 2) {
    return null;
  }

  // Calculate dominant emotion
  const dominantEmotion = radarData.reduce((prev, curr) => 
    curr.value > prev.value ? curr : prev
  , radarData[0]);

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
            <h3 className="font-display font-semibold text-foreground">Spettro Emotivo</h3>
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

        {/* Emotion legend (scrollable) */}
        <div className="mt-3 flex flex-wrap gap-2">
          {radarData
            .filter(d => d.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
            .map((item) => (
              <div
                key={item.emotion}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 text-xs"
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: EMOTION_CONFIG.find(e => e.key === item.emotion)?.color || 'hsl(var(--primary))' }}
                />
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
};

export default EmotionalSpectrumRadar;
