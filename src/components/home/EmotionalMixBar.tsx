import React, { useMemo } from 'react';
import { useSessions } from '@/hooks/useSessions';
import { isToday } from 'date-fns';
import { Sparkles, MessageCircle } from 'lucide-react';

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
    if (!completedSessions || completedSessions.length === 0) {
      return null;
    }

    // First try to get today's sessions
    const todaySessions = completedSessions.filter(s => 
      isToday(new Date(s.start_time))
    );

    // If no today sessions, get the most recent session with emotion data
    let sessionsToUse = todaySessions;
    
    if (sessionsToUse.length === 0 || !sessionsToUse.some(s => (s as any).specific_emotions)) {
      // Find the most recent session with specific_emotions data
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

    // Average
    if (count > 0) {
      Object.keys(emotions).forEach(key => {
        emotions[key as EmotionKey] = Math.round(emotions[key as EmotionKey] / count);
      });
    }

    return emotions;
  }, [completedSessions]);

  const total = emotionsData ? Object.values(emotionsData).reduce((a, b) => a + b, 0) : 0;
  const hasData = emotionsData && total > 0;

  // Calculate percentages for bar segments
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
    <div className="bg-card/60 backdrop-blur-sm rounded-2xl p-4 border border-border/30 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <h4 className="font-display font-semibold text-sm text-foreground">Mix Emotivo</h4>
      </div>

      {!hasData ? (
        <div className="h-16 flex flex-col items-center justify-center text-muted-foreground text-center px-4">
          <MessageCircle className="w-6 h-6 text-muted-foreground/30 mb-1" />
          <p className="text-xs leading-relaxed">Parla con l'AI per generare il tuo primo grafico</p>
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

          {/* All emotions with value > 0 in a grid */}
          <div className="grid grid-cols-3 gap-2">
            {segments.map(emotion => (
              <div key={emotion.key} className="flex items-center gap-1.5">
                <span className="text-xs">{EMOTION_CONFIG[emotion.key].emoji}</span>
                <span className="text-[10px] text-muted-foreground truncate">{EMOTION_CONFIG[emotion.key].label}</span>
                <span className="text-[10px] font-semibold text-foreground ml-auto">
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
