import React, { useMemo } from 'react';
import { useSessions } from '@/hooks/useSessions';
import { isToday } from 'date-fns';
import { Sparkles } from 'lucide-react';

const EMOTION_CONFIG = {
  joy: { label: 'Gioia', emoji: '🟡', color: 'hsl(45, 90%, 55%)' },
  sadness: { label: 'Tristezza', emoji: '🔵', color: 'hsl(220, 70%, 55%)' },
  anger: { label: 'Rabbia', emoji: '🔴', color: 'hsl(0, 70%, 55%)' },
  fear: { label: 'Paura', emoji: '🟣', color: 'hsl(280, 60%, 55%)' },
  apathy: { label: 'Apatia', emoji: '⚪', color: 'hsl(220, 10%, 60%)' },
};

type EmotionKey = keyof typeof EMOTION_CONFIG;

const EmotionalMixBar: React.FC = () => {
  const { completedSessions } = useSessions();

  const emotionsData = useMemo(() => {
    // Get today's sessions
    const todaySessions = completedSessions.filter(s => 
      isToday(new Date(s.start_time))
    );

    const emotions: Record<EmotionKey, number> = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      apathy: 0,
    };

    let count = 0;

    todaySessions.forEach(session => {
      const specificEmotions = (session as any).specific_emotions;
      if (specificEmotions) {
        emotions.joy += specificEmotions.joy || 0;
        emotions.sadness += specificEmotions.sadness || 0;
        emotions.anger += specificEmotions.anger || 0;
        emotions.fear += specificEmotions.fear || 0;
        emotions.apathy += specificEmotions.apathy || 0;
        count++;
      }
    });

    // Average
    if (count > 0) {
      Object.keys(emotions).forEach(key => {
        emotions[key as EmotionKey] = Math.round(emotions[key as EmotionKey] / count);
      });
    }

    return emotions;
  }, [completedSessions]);

  const total = Object.values(emotionsData).reduce((a, b) => a + b, 0);
  const hasData = total > 0;

  // Calculate percentages for bar segments
  const segments = Object.entries(emotionsData)
    .map(([key, value]) => ({
      key: key as EmotionKey,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))
    .filter(s => s.value > 0)
    .sort((a, b) => b.value - a.value);

  // Top 2 dominant emotions
  const topTwo = segments.slice(0, 2);

  return (
    <div className="bg-card/60 backdrop-blur-sm rounded-2xl p-4 border border-border/30 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <h4 className="font-display font-semibold text-sm text-foreground">Mix Emotivo</h4>
      </div>

      {!hasData ? (
        <div className="h-16 flex flex-col items-center justify-center text-muted-foreground">
          <span className="text-xl mb-1">🌈</span>
          <p className="text-xs">Nessun dato oggi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Stacked horizontal bar */}
          <div className="h-6 w-full rounded-full overflow-hidden flex bg-muted/30">
            {segments.map((segment, i) => (
              <div
                key={segment.key}
                className="h-full transition-all duration-300"
                style={{
                  width: `${segment.percentage}%`,
                  backgroundColor: EMOTION_CONFIG[segment.key].color,
                  borderTopLeftRadius: i === 0 ? '9999px' : 0,
                  borderBottomLeftRadius: i === 0 ? '9999px' : 0,
                  borderTopRightRadius: i === segments.length - 1 ? '9999px' : 0,
                  borderBottomRightRadius: i === segments.length - 1 ? '9999px' : 0,
                }}
              />
            ))}
          </div>

          {/* Top 2 emotions */}
          <div className="flex items-center justify-center gap-4">
            {topTwo.map(emotion => (
              <div key={emotion.key} className="flex items-center gap-1.5">
                <span className="text-sm">{EMOTION_CONFIG[emotion.key].emoji}</span>
                <span className="text-xs text-muted-foreground">{EMOTION_CONFIG[emotion.key].label}</span>
                <span className="text-xs font-semibold text-foreground">
                  {(emotion.value / 10).toFixed(1)}
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
