import React from 'react';
import { MetricData } from '@/pages/Analisi';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmotionalSpectrumCardProps {
  emotions: MetricData[];
}

const EMOTION_COLORS: Record<string, string> = {
  joy: 'bg-yellow-400',
  sadness: 'bg-blue-400',
  anger: 'bg-red-400',
  fear: 'bg-purple-400',
  apathy: 'bg-gray-400',
};

// Negative emotions where lower = better
const NEGATIVE_EMOTIONS = ['sadness', 'anger', 'fear', 'apathy'];

const EmotionalSpectrumCard: React.FC<EmotionalSpectrumCardProps> = ({ emotions }) => {
  // Filter emotions with data and sort by value (scale 0-100 -> 0-10)
  const activeEmotions = emotions
    .filter(e => e.average !== null && e.average > 0)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

  // Get trend icon and color based on whether emotion is negative
  const getTrendDisplay = (emotion: MetricData) => {
    const isNegative = NEGATIVE_EMOTIONS.includes(emotion.key);
    const TrendIcon = emotion.trend === 'up' ? TrendingUp : emotion.trend === 'down' ? TrendingDown : Minus;
    
    let colorClass = 'text-muted-foreground';
    if (emotion.trend === 'up') {
      colorClass = isNegative ? 'text-orange-500' : 'text-emerald-500';
    } else if (emotion.trend === 'down') {
      colorClass = isNegative ? 'text-emerald-500' : 'text-orange-500';
    }
    
    return { TrendIcon, colorClass };
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
      </div>

      <div className="space-y-4">
        {activeEmotions.map(emotion => {
          // Convert from 0-100 scale to 0-10 scale
          const score10 = (emotion.average ?? 0) / 10;
          // Bar width based on 0-10 scale (score/10 * 100%)
          const barWidth = Math.min(score10 * 10, 100);
          const bgColorClass = EMOTION_COLORS[emotion.key] || 'bg-gray-400';
          const { TrendIcon, colorClass } = getTrendDisplay(emotion);

          return (
            <div key={emotion.key}>
              {/* Label */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{emotion.icon}</span>
                  <span className="text-sm font-medium text-foreground">{emotion.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{score10.toFixed(1)}</span>
                  <TrendIcon className={cn("w-3.5 h-3.5", colorClass)} />
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${bgColorClass}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmotionalSpectrumCard;
