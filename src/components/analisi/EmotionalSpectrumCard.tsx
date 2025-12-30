import React from 'react';
import { MetricData } from '@/pages/Analisi';

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

const EmotionalSpectrumCard: React.FC<EmotionalSpectrumCardProps> = ({ emotions }) => {
  // Filter emotions with data and sort by value
  const activeEmotions = emotions
    .filter(e => e.average !== null && e.average > 0)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

  // Get max value for relative bar widths
  const maxValue = Math.max(...activeEmotions.map(e => e.average ?? 0), 1);

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
          const percentage = Math.round((emotion.average ?? 0));
          const barWidth = ((emotion.average ?? 0) / maxValue) * 100;
          const bgColorClass = EMOTION_COLORS[emotion.key] || 'bg-gray-400';

          return (
            <div key={emotion.key}>
              {/* Label */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{emotion.icon}</span>
                  <span className="text-sm font-medium text-foreground">{emotion.label}</span>
                </div>
                <span className="text-sm font-bold text-foreground">{percentage}%</span>
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
