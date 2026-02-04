import React, { useMemo } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { EMOTION_CONFIG, EmotionKey, ALL_EMOTION_KEYS } from '@/lib/emotionConfig';
import DomainCard from './DomainCard';
import { ClinicalDomain } from '@/lib/clinicalDomains';

interface EmotionalSpectrumSectionProps {
  allMetricsData: Record<string, { value: number | null }>;
  onMetricClick: (key: string) => void;
}

const EMOTION_DOMAIN: ClinicalDomain = {
  id: 'emotional',
  label: 'Spettro Emotivo',
  icon: '🌈',
  description: 'Tutte le tue emozioni',
  color: 'hsl(280, 60%, 55%)'
};

const EmotionalSpectrumSection: React.FC<EmotionalSpectrumSectionProps> = ({
  allMetricsData,
  onMetricClick
}) => {
  // Build radar data from all emotions
  const { radarData, emotionsList, totalValue } = useMemo(() => {
    const emotions = ALL_EMOTION_KEYS
      .map(key => {
        const data = allMetricsData[key];
        const config = EMOTION_CONFIG[key];
        const value = data?.value ?? 0;
        return {
          key,
          label: config?.label || key,
          value: Math.round(value * 10) / 10,
          color: config?.color || 'hsl(220, 10%, 50%)',
          icon: config?.icon || '😐',
          isNegative: config?.isNegative ?? true,
        };
      })
      .filter(e => e.value > 0)
      .sort((a, b) => b.value - a.value);
    
    // Total for percentage calculation
    const total = emotions.reduce((sum, e) => sum + e.value, 0);
    
    // Calculate percentages
    const withPercentages = emotions.map(e => ({
      ...e,
      percentage: total > 0 ? Math.round((e.value / total) * 100) : 0,
      fullMark: 10,
    }));
    
    // For radar, take top 8
    const radarEmotions = withPercentages.slice(0, 8);
    
    return {
      radarData: radarEmotions,
      emotionsList: withPercentages,
      totalValue: total,
    };
  }, [allMetricsData]);
  
  // Don't render if no emotions data
  if (emotionsList.length === 0) return null;
  
  return (
    <DomainCard domain={EMOTION_DOMAIN}>
      {/* Radar Chart - only if 3+ emotions */}
      {radarData.length >= 3 && (
        <div className="h-52 w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid 
                stroke="hsl(var(--muted-foreground))" 
                strokeOpacity={0.15} 
              />
              <PolarAngleAxis
                dataKey="label"
                tick={{ 
                  fill: 'hsl(var(--muted-foreground))', 
                  fontSize: 10,
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
                fillOpacity={0.2}
                dot={{
                  r: 3,
                  fill: 'hsl(var(--primary))',
                  strokeWidth: 0,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* Emotions List with percentages */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            {emotionsList.length} emozioni rilevate
          </span>
        </div>
        
        {emotionsList.map((emotion, index) => (
          <button
            key={emotion.key}
            onClick={() => onMetricClick(emotion.key)}
            className={cn(
              "w-full flex items-center gap-3 p-2.5 rounded-xl",
              "bg-glass/20 border border-glass-border/40",
              "hover:bg-glass/40 transition-all duration-200",
              "active:scale-[0.98]"
            )}
          >
            {/* Rank */}
            <span className="text-xs font-bold text-muted-foreground/60 w-4">
              {index + 1}
            </span>
            
            {/* Icon */}
            <span className="text-lg">{emotion.icon}</span>
            
            {/* Label & Bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground truncate">
                  {emotion.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    {emotion.percentage}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({emotion.value}/10)
                  </span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${emotion.percentage}%`,
                    backgroundColor: emotion.color,
                  }}
                />
              </div>
            </div>
          </button>
        ))}
      </div>
    </DomainCard>
  );
};

export default EmotionalSpectrumSection;
