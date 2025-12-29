import React, { useMemo } from 'react';
import { useSessions } from '@/hooks/useSessions';
import { isToday } from 'date-fns';
import { Sparkles, MessageCircle } from 'lucide-react';

const EMOTION_CONFIG = {
  joy: { label: 'Gioia', color: 'hsl(45, 90%, 55%)' },
  sadness: { label: 'Tristezza', color: 'hsl(220, 70%, 55%)' },
  anger: { label: 'Rabbia', color: 'hsl(0, 70%, 55%)' },
  fear: { label: 'Paura', color: 'hsl(280, 60%, 55%)' },
  apathy: { label: 'Apatia', color: 'hsl(220, 10%, 60%)' },
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
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <h4 className="text-sm font-semibold text-gray-900">Mix Emotivo</h4>
      </div>

      {!hasData ? (
        <div className="h-16 flex flex-col items-center justify-center text-gray-400 text-center px-4">
          <MessageCircle className="w-5 h-5 text-gray-300 mb-1" />
          <p className="text-[11px]">Parla con l'AI per generare il grafico</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Slim Pill Bar */}
          <div className="h-4 w-full rounded-full overflow-hidden flex bg-gray-100">
            {segments.map((segment) => (
              <div
                key={segment.key}
                className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
                style={{
                  width: `${segment.percentage}%`,
                  backgroundColor: EMOTION_CONFIG[segment.key].color,
                }}
              />
            ))}
          </div>

          {/* Legend - Horizontal dots */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {segments.map(emotion => (
              <div key={emotion.key} className="flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: EMOTION_CONFIG[emotion.key].color }}
                />
                <span className="text-[10px] text-gray-500">{EMOTION_CONFIG[emotion.key].label}</span>
                <span className="text-[10px] font-medium text-gray-700">
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
