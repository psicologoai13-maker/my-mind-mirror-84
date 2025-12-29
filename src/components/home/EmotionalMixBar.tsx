import React, { useMemo } from 'react';
import { useSessions } from '@/hooks/useSessions';
import { isToday } from 'date-fns';
import { Sparkles, MessageCircle } from 'lucide-react';

const EMOTION_CONFIG = {
  joy: { label: 'Gioia', color: 'hsl(var(--mood-neutral))' },
  sadness: { label: 'Tristezza', color: 'hsl(var(--area-friendship))' },
  anger: { label: 'Rabbia', color: 'hsl(var(--mood-bad))' },
  fear: { label: 'Paura', color: 'hsl(var(--accent-foreground))' },
  apathy: { label: 'Apatia', color: 'hsl(var(--muted-foreground))' },
};

type EmotionKey = keyof typeof EMOTION_CONFIG;

const EmotionalMixBar: React.FC = () => {
  const { completedSessions } = useSessions();

  const emotionsData = useMemo(() => {
    if (!completedSessions || completedSessions.length === 0) {
      return null;
    }

    const todaySessions = completedSessions.filter(s => 
      isToday(new Date(s.start_time))
    );

    let sessionsToUse = todaySessions;
    
    if (sessionsToUse.length === 0 || !sessionsToUse.some(s => (s as any).specific_emotions)) {
      const sortedSessions = [...completedSessions]
        .filter(s => {
          const emotions = (s as any).specific_emotions;
          return emotions && Object.values(emotions).some(v => v && (v as number) > 0);
        })
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
      
      if (sortedSessions.length > 0) {
        sessionsToUse = [sortedSessions[0]];
      }
    }

    if (sessionsToUse.length === 0) {
      return null;
    }

    const emotions: Record<EmotionKey, number> = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      apathy: 0,
    };

    let count = 0;

    sessionsToUse.forEach(session => {
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

    if (count > 0) {
      Object.keys(emotions).forEach(key => {
        emotions[key as EmotionKey] = Math.round(emotions[key as EmotionKey] / count);
      });
    }

    return emotions;
  }, [completedSessions]);

  const total = emotionsData ? Object.values(emotionsData).reduce((a, b) => a + b, 0) : 0;
  const hasData = emotionsData && total > 0;

  const segments = hasData 
    ? Object.entries(emotionsData)
        .map(([key, value]) => ({
          key: key as EmotionKey,
          value,
          percentage: total > 0 ? (value / total) * 100 : 0,
        }))
        .filter(s => s.value > 0)
        .sort((a, b) => b.value - a.value)
    : [];

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

      {!hasData ? (
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