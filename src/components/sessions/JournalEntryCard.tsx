import React from 'react';
import { Session } from '@/hooks/useSessions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Mic, MessageSquare, ChevronRight } from 'lucide-react';

interface JournalEntryCardProps {
  session: Session;
  onClick: () => void;
  index: number;
}

const JournalEntryCard: React.FC<JournalEntryCardProps> = ({ session, onClick, index }) => {
  const sessionDate = new Date(session.start_time);
  const day = format(sessionDate, 'd');
  const month = format(sessionDate, 'MMM', { locale: it }).toUpperCase();
  
  // Generate a title from summary or use default
  const getTitle = () => {
    if (session.ai_summary) {
      const firstSentence = session.ai_summary.split(/[.!?]/)[0];
      if (firstSentence.length > 40) {
        return firstSentence.substring(0, 37) + '...';
      }
      return firstSentence;
    }
    return session.type === 'voice' ? 'Sessione vocale' : 'Sessione di ascolto';
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 bg-white rounded-xl p-3 cursor-pointer",
        "border border-gray-100 hover:border-primary/20 hover:bg-gray-50",
        "transition-all duration-200 animate-slide-up text-left shadow-sm"
      )}
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      {/* Date Box */}
      <div className="flex flex-col items-center justify-center min-w-[44px] h-[44px] bg-primary/10 rounded-lg">
        <span className="text-base font-bold text-primary leading-none">{day}</span>
        <span className="text-[10px] text-gray-500 font-medium">{month}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 text-sm truncate">
          {getTitle()}
        </h4>
        
        <div className="flex items-center gap-2 mt-0.5">
          {session.type === 'voice' ? (
            <Mic className="w-3 h-3 text-gray-400" />
          ) : (
            <MessageSquare className="w-3 h-3 text-gray-400" />
          )}
          <span className="text-xs text-gray-500">
            {format(sessionDate, 'HH:mm')}
            {session.duration && ` • ${Math.floor(session.duration / 60)}min`}
          </span>
          
          {/* Compact emotion tags */}
          {session.emotion_tags && session.emotion_tags.length > 0 && (
            <div className="flex items-center gap-1 ml-1">
              {session.emotion_tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500"
                >
                  #{tag}
                </span>
              ))}
              {session.emotion_tags.length > 2 && (
                <span className="text-[9px] text-gray-400">
                  +{session.emotion_tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </button>
  );
};

export default JournalEntryCard;
