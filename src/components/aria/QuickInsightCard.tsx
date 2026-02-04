import React from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale';

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
    // Empty state - encourage first session
    return (
      <motion.section
        className="px-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={onStartNew}
          className={cn(
            "w-full relative overflow-hidden rounded-2xl p-4",
            "bg-glass backdrop-blur-xl border border-glass-border",
            "shadow-glass hover:shadow-glass-glow",
            "transition-all duration-300 text-left"
          )}
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-aria-subtle opacity-40 rounded-2xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent rounded-2xl" />
          
          <div className="relative z-10 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-aria flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">
                Inizia a parlare con Aria
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Condividi i tuoi pensieri, riceverai insight personalizzati
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
          </div>
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
    dateContext = format(sessionDate, "d MMM", { locale: it });
  }

  // Get preview text
  const previewText = lastSession.ai_summary 
    ? lastSession.ai_summary.slice(0, 80) + (lastSession.ai_summary.length > 80 ? '...' : '')
    : `Hai parlato ${lastSession.type === 'voice' ? 'vocalmente' : 'in chat'} con Aria`;

  return (
    <motion.section
      className="px-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <button
        onClick={onContinue}
        className={cn(
          "w-full relative overflow-hidden rounded-2xl p-4",
          "bg-glass backdrop-blur-xl border border-glass-border",
          "shadow-glass hover:shadow-glass-glow",
          "transition-all duration-300 text-left"
        )}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-aria-subtle opacity-30 rounded-2xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent rounded-2xl" />
        
        <div className="relative z-10 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-aria flex items-center justify-center flex-shrink-0 shadow-aria-glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-foreground">
                {dateContext} hai parlato di...
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {previewText}
            </p>
            <p className="text-xs text-primary font-medium mt-1.5">
              Tocca per continuare →
            </p>
          </div>
        </div>
      </button>
    </motion.section>
  );
};

export default QuickInsightCard;
