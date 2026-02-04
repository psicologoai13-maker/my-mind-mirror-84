import React from 'react';
import { MetricData } from '@/pages/Analisi';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  EMOTION_CONFIG, 
  EmotionKey, 
  getQualitativeLabel,
  groupEmotionsByCategory,
  ALL_EMOTION_KEYS,
} from '@/lib/emotionConfig';

interface EmotionalSpectrumCardProps {
  emotions: MetricData[];
}

const EmotionalSpectrumCard: React.FC<EmotionalSpectrumCardProps> = ({ emotions }) => {
  // Filter emotions with data and sort by value (scale 0-100 -> 0-10)
  const activeEmotions = emotions
    .filter(e => e.average !== null && e.average > 0)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

  // Group emotions by category
  const grouped = React.useMemo(() => {
    const primary: MetricData[] = [];
    const secondary: MetricData[] = [];
    
    activeEmotions.forEach(emotion => {
      const config = EMOTION_CONFIG[emotion.key as EmotionKey];
      if (config?.category === 'primary') {
        primary.push(emotion);
      } else if (config?.category === 'secondary') {
        secondary.push(emotion);
      }
    });
    
    return { primary, secondary };
  }, [activeEmotions]);

  // Get trend icon and color based on whether emotion is negative
  const getTrendDisplay = (emotion: MetricData) => {
    const config = EMOTION_CONFIG[emotion.key as EmotionKey];
    const isNegative = config?.isNegative ?? true;
    const TrendIcon = emotion.trend === 'up' ? TrendingUp : emotion.trend === 'down' ? TrendingDown : Minus;
    
    let colorClass = 'text-muted-foreground';
    if (emotion.trend === 'up') {
      colorClass = isNegative ? 'text-orange-500' : 'text-emerald-500';
    } else if (emotion.trend === 'down') {
      colorClass = isNegative ? 'text-emerald-500' : 'text-orange-500';
    }
    
    return { TrendIcon, colorClass };
  };

  // Format score as integer
  const formatScore = (rawScore: number) => {
    const score = Math.round(rawScore);
    if (rawScore > 0 && rawScore < 1) return '< 1';
    return score.toString();
  };

  // Render single emotion row
  const renderEmotionRow = (emotion: MetricData) => {
    const config = EMOTION_CONFIG[emotion.key as EmotionKey];
    if (!config) return null;
    
    // Convert from 0-100 scale to 0-10 scale
    const score10 = (emotion.average ?? 0) / 10;
    const roundedScore = Math.round(score10);
    // Bar width based on 0-10 scale (score/10 * 100%)
    const barWidth = Math.min(score10 * 10, 100);
    const { TrendIcon, colorClass } = getTrendDisplay(emotion);
    const qualitative = getQualitativeLabel(roundedScore, emotion.key as EmotionKey);

    return (
      <div key={emotion.key}>
        {/* Label */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm">{config.icon}</span>
            <span className="text-sm font-medium text-foreground">{config.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{formatScore(score10)}</span>
            <span className={cn("text-xs font-medium", qualitative.colorClass)}>
              {qualitative.label}
            </span>
            <TrendIcon className={cn("w-3.5 h-3.5", colorClass)} />
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-4 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${barWidth}%`,
              backgroundColor: config.color,
            }}
          />
        </div>
      </div>
    );
  };

  if (activeEmotions.length === 0) {
    return (
      <div className="bg-card rounded-3xl shadow-premium p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🎭</span>
          <h3 className="font-semibold text-foreground">Spettro Emotivo</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">
          Nessun dato emotivo disponibile
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl shadow-premium p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-lg">🎭</span>
        <h3 className="font-semibold text-foreground">Spettro Emotivo</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {activeEmotions.length} emozioni rilevate
        </span>
      </div>

      <div className="space-y-6">
        {/* Primary Emotions */}
        {grouped.primary.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Emozioni Primarie
            </h4>
            <div className="space-y-3">
              {grouped.primary.map(renderEmotionRow)}
            </div>
          </div>
        )}

        {/* Secondary Emotions */}
        {grouped.secondary.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Emozioni Secondarie
            </h4>
            <div className="space-y-3">
              {grouped.secondary.map(renderEmotionRow)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmotionalSpectrumCard;
