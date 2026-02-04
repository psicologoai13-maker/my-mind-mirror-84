import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { EMOTION_CONFIG, EmotionKey, ALL_EMOTION_KEYS } from '@/lib/emotionConfig';
import DomainCard from './DomainCard';
import { ClinicalDomain } from '@/lib/clinicalDomains';

interface EmotionRecord {
  joy: number | null;
  sadness: number | null;
  anger: number | null;
  fear: number | null;
  apathy: number | null;
  shame: number | null;
  jealousy: number | null;
  hope: number | null;
  frustration: number | null;
  nostalgia: number | null;
  nervousness: number | null;
  overwhelm: number | null;
  excitement: number | null;
  disappointment: number | null;
}

interface EmotionalSpectrumSectionProps {
  emotionsData: EmotionRecord[];
  onMetricClick: (key: string) => void;
}

const EMOTION_DOMAIN: ClinicalDomain = {
  id: 'emotional',
  label: 'Distribuzione Emotiva',
  icon: '🎭',
  description: 'Il tuo mix emotivo',
  color: 'hsl(280, 60%, 55%)'
};

const EmotionalSpectrumSection: React.FC<EmotionalSpectrumSectionProps> = ({
  emotionsData,
  onMetricClick
}) => {
  // Calculate averages for all emotions from raw data
  const { emotionsList, totalValue } = useMemo(() => {
    if (!emotionsData || emotionsData.length === 0) {
      return { emotionsList: [], totalValue: 0 };
    }

    const emotionAverages = ALL_EMOTION_KEYS.map(key => {
      const config = EMOTION_CONFIG[key];
      const values = emotionsData
        .map(d => d[key as keyof EmotionRecord])
        .filter((v): v is number => v !== null && v !== undefined && v > 0);
      
      const avg = values.length > 0 
        ? values.reduce((a, b) => a + b, 0) / values.length 
        : 0;
      
      return {
        key,
        label: config?.label || key,
        value: Math.round(avg * 10) / 10,
        color: config?.color || 'hsl(280, 60%, 55%)',
        icon: config?.icon || '😐',
      };
    })
    .filter(e => e.value > 0)
    .sort((a, b) => b.value - a.value);
    
    // Total for percentage calculation
    const total = emotionAverages.reduce((sum, e) => sum + e.value, 0);
    
    // Calculate percentages
    const withPercentages = emotionAverages.map(e => ({
      ...e,
      percentage: total > 0 ? Math.round((e.value / total) * 100) : 0,
    }));
    
    return {
      emotionsList: withPercentages,
      totalValue: total,
    };
  }, [emotionsData]);
  
  // Don't render if no emotions data
  if (emotionsList.length === 0) return null;
  
  return (
    <DomainCard domain={EMOTION_DOMAIN}>
      {/* Horizontal Bar Chart */}
      <div className="space-y-1.5 mb-2">
        {emotionsList.map((emotion) => (
          <button
            key={emotion.key}
            onClick={() => onMetricClick(emotion.key)}
            className={cn(
              "w-full flex items-center gap-2 py-1.5 px-1 rounded-lg",
              "hover:bg-glass/30 transition-all duration-200",
              "active:scale-[0.99]"
            )}
          >
            {/* Label */}
            <span className="text-xs font-medium text-foreground w-24 text-left truncate">
              {emotion.label}
            </span>
            
            {/* Bar */}
            <div className="flex-1 h-5 bg-muted/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ 
                  width: `${emotion.percentage}%`,
                  backgroundColor: emotion.color,
                }}
              />
            </div>
            
            {/* Percentage */}
            <span className="text-xs font-bold text-muted-foreground w-10 text-right">
              {emotion.percentage}%
            </span>
          </button>
        ))}
      </div>
      
      {/* Summary */}
      <div className="mt-3 pt-3 border-t border-glass-border/30 flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">
          {emotionsList.length} emozioni rilevate
        </span>
        {emotionsList[0] && (
          <span className="text-xs font-medium text-foreground flex items-center gap-1">
            <span>{emotionsList[0].icon}</span>
            <span>Dominante: {emotionsList[0].label}</span>
          </span>
        )}
      </div>
    </DomainCard>
  );
};

export default EmotionalSpectrumSection;
