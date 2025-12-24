import React from 'react';
import { Session } from '@/hooks/useSessions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Mic, MessageSquare } from 'lucide-react';

interface JournalEntryCardProps {
  session: Session;
  onClick: () => void;
  index: number;
}

const JournalEntryCard: React.FC<JournalEntryCardProps> = ({ session, onClick, index }) => {
  const sessionDate = new Date(session.start_time);
  const day = format(sessionDate, 'd');
  const month = format(sessionDate, 'MMM', { locale: it });
  
  // Generate a title from summary or use default
  const getTitle = () => {
    if (session.ai_summary) {
      // Take first sentence or first 50 chars
      const firstSentence = session.ai_summary.split(/[.!?]/)[0];
      if (firstSentence.length > 50) {
        return firstSentence.substring(0, 47) + '...';
      }
      return firstSentence;
    }
    return session.type === 'voice' ? 'Sessione vocale' : 'Sessione di ascolto';
  };

  // Get preview text
  const getPreview = () => {
    if (session.ai_summary) {
      const sentences = session.ai_summary.split(/[.!?]/).filter(s => s.trim());
      if (sentences.length > 1) {
        return sentences.slice(1, 3).join('. ').trim().substring(0, 120);
      }
    }
    if (session.insights) {
      return session.insights.substring(0, 120);
    }
    return null;
  };

  const preview = getPreview();

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      gioia: 'bg-mood-excellent/20 text-mood-excellent border-mood-excellent/30',
      felicità: 'bg-mood-excellent/20 text-mood-excellent border-mood-excellent/30',
      serenità: 'bg-mood-good/20 text-mood-good border-mood-good/30',
      calma: 'bg-mood-good/20 text-mood-good border-mood-good/30',
      ansia: 'bg-mood-low/20 text-mood-low border-mood-low/30',
      stress: 'bg-mood-low/20 text-mood-low border-mood-low/30',
      tristezza: 'bg-mood-poor/20 text-mood-poor border-mood-poor/30',
      rabbia: 'bg-destructive/20 text-destructive border-destructive/30',
      paura: 'bg-mood-poor/20 text-mood-poor border-mood-poor/30',
      speranza: 'bg-primary/20 text-primary border-primary/30',
      gratitudine: 'bg-mood-excellent/20 text-mood-excellent border-mood-excellent/30',
    };
    return colors[emotion.toLowerCase()] || 'bg-muted text-muted-foreground border-border';
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex gap-4 bg-card rounded-2xl p-4 shadow-soft cursor-pointer",
        "border border-transparent hover:border-primary/20 hover:shadow-card",
        "transition-all duration-300 animate-slide-up"
      )}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Date Column */}
      <div className="flex flex-col items-center justify-center min-w-[48px] bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-2">
        <span className="text-xl font-bold text-primary">{day}</span>
        <span className="text-xs text-muted-foreground uppercase">{month}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {session.type === 'voice' ? (
            <Mic className="w-3.5 h-3.5 text-primary" />
          ) : (
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
          )}
          <span className="text-xs text-muted-foreground">
            {format(sessionDate, 'HH:mm')}
            {session.duration && ` • ${Math.floor(session.duration / 60)} min`}
          </span>
        </div>
        
        <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-1">
          {getTitle()}
        </h4>
        
        {preview && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {preview}...
          </p>
        )}

        {/* Emotion Tags */}
        {session.emotion_tags && session.emotion_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {session.emotion_tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium border",
                  getEmotionColor(tag)
                )}
              >
                #{tag}
              </span>
            ))}
            {session.emotion_tags.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                +{session.emotion_tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalEntryCard;
