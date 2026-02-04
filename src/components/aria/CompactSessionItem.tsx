import React from 'react';
import { PenLine, AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Session {
  id: string;
  type: string;
  start_time: string;
  duration?: number | null;
  emotion_tags?: string[] | null;
}

interface CompactSessionItemProps {
  session: Session;
  index?: number;
  onClick: () => void;
}

const CompactSessionItem: React.FC<CompactSessionItemProps> = ({
  session,
  index = 0,
  onClick,
}) => {
  const isVoice = session.type === 'voice';
  const sessionLabel = isVoice ? 'Vocale' : 'Chat';
  const dateLabel = format(new Date(session.start_time), "d MMM", { locale: it });
  const timeLabel = format(new Date(session.start_time), "HH:mm", { locale: it });
  const emotionTag = session.emotion_tags?.[0];
  const durationMin = session.duration ? Math.floor(session.duration / 60) : null;

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left",
        "bg-glass/50 backdrop-blur-sm border border-glass-border/50",
        "hover:bg-glass hover:shadow-glass transition-all duration-200",
        "active:scale-[0.99]"
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Icon */}
      <div 
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          isVoice 
            ? "bg-gradient-aria" 
            : "bg-gradient-to-br from-primary to-primary-glow"
        )}
      >
        {isVoice ? (
          <AudioLines className="w-4 h-4 text-white" />
        ) : (
          <PenLine className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">
            {sessionLabel}
          </span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">
            {dateLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{timeLabel}</span>
          {durationMin && (
            <>
              <span>•</span>
              <span>{durationMin} min</span>
            </>
          )}
          {emotionTag && (
            <>
              <span>•</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                isVoice 
                  ? "bg-aria-violet/10 text-aria-violet" 
                  : "bg-primary/10 text-primary"
              )}>
                {emotionTag.replace('#', '')}
              </span>
            </>
          )}
        </div>
      </div>
    </motion.button>
  );
};

export default CompactSessionItem;
