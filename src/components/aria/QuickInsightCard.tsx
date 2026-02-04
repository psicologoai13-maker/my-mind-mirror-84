import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { isToday, isYesterday } from 'date-fns';

interface Session {
  id: string;
  type: string;
  start_time: string;
  ai_summary?: string | null;
  emotion_tags?: string[] | null;
}

interface QuickInsightCardProps {
  lastSession?: Session | null;
  onContinue: () => void;
  onStartNew: () => void;
}

const QuickInsightCard: React.FC<QuickInsightCardProps> = ({
  lastSession,
  onContinue,
  onStartNew,
}) => {
  if (!lastSession) {
    // Empty state - minimal
    return (
      <motion.section
        className="px-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <button
          onClick={onStartNew}
          className={cn(
            "w-full flex items-center gap-3 rounded-2xl p-3.5",
            "bg-glass/60 backdrop-blur-sm border border-glass-border/50",
            "hover:bg-glass hover:shadow-glass transition-all duration-200 text-left"
          )}
        >
          <span className="text-lg">💡</span>
          <div className="flex-1">
            <p className="text-sm text-foreground font-medium">
              Condividi i tuoi pensieri con Aria
            </p>
            <p className="text-xs text-muted-foreground">
              Riceverai insight personalizzati
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </motion.section>
    );
  }

  // Format date context
  const sessionDate = new Date(lastSession.start_time);
  let dateContext = '';
  if (isToday(sessionDate)) {
    dateContext = 'Oggi';
  } else if (isYesterday(sessionDate)) {
    dateContext = 'Ieri';
  } else {
    dateContext = 'Di recente';
  }

  // Get preview text
  const previewText = lastSession.ai_summary 
    ? lastSession.ai_summary.slice(0, 100) + (lastSession.ai_summary.length > 100 ? '...' : '')
    : `Hai parlato ${lastSession.type === 'voice' ? 'vocalmente' : 'in chat'} con Aria`;

  return (
    <motion.section
      className="px-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <button
        onClick={onContinue}
        className={cn(
          "w-full flex items-start gap-3 rounded-2xl p-3.5",
          "bg-gradient-aria-subtle border border-glass-border/50",
          "hover:shadow-glass-glow transition-all duration-200 text-left"
        )}
      >
        <span className="text-lg">💜</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground font-medium">
            {dateContext} hai parlato di...
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {previewText}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      </button>
    </motion.section>
  );
};

export default QuickInsightCard;
