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
        "w-full flex items-center gap-3 bg-card rounded-xl p-3 cursor-pointer",
        "border border-transparent hover:border-primary/20 hover:bg-muted/30",
        "transition-all duration-200 animate-slide-up text-left"
      )}
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      {/* Date Box */}
      <div className="flex flex-col items-center justify-center min-w-[44px] h-[44px] bg-gradient-to-br from-primary/15 to-primary/5 rounded-lg">
        <span className="text-base font-bold text-primary leading-none">{day}</span>
        <span className="text-[10px] text-muted-foreground font-medium">{month}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground text-sm truncate">
          {getTitle()}
        </h4>
        
        <div className="flex items-center gap-2 mt-0.5">
          {session.type === 'voice' ? (
            <Mic className="w-3 h-3 text-muted-foreground" />
          ) : (
            <MessageSquare className="w-3 h-3 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {format(sessionDate, 'HH:mm')}
            {session.duration && ` • ${Math.floor(session.duration / 60)}min`}
          </span>
          
          {/* Compact emotion tags */}
          {session.emotion_tags && session.emotion_tags.length > 0 && (
            <div className="flex items-center gap-1 ml-1">
              {session.emotion_tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
              {session.emotion_tags.length > 2 && (
                <span className="text-[9px] text-muted-foreground">
                  +{session.emotion_tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
};

export default JournalEntryCard;
