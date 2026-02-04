import React from 'react';
import { PenLine, AudioLines, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale';

interface Session {
  id: string;
  type?: string;
  ai_summary?: string | null;
  start_time: string;
}

interface AriaHeroSectionProps {
  userName?: string;
  lastSession?: Session | null;
  onStartChat: () => void;
  onStartVoice: () => void;
  onViewLastSession?: () => void;
}

const AriaHeroSection: React.FC<AriaHeroSectionProps> = ({
  userName,
  lastSession,
  onStartChat,
  onStartVoice,
  onViewLastSession,
}) => {
  const formatSessionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Oggi';
    if (isYesterday(date)) return 'Ieri';
    return format(date, 'd MMMM', { locale: it });
  };

  const getInsightPreview = () => {
    if (!lastSession?.ai_summary) return null;
    const preview = lastSession.ai_summary.slice(0, 60);
    return preview.length < lastSession.ai_summary.length ? `${preview}...` : preview;
  };

  const insightPreview = getInsightPreview();

  return (
    <div className="flex flex-col items-center text-center space-y-6">
      {/* Animated Orb - Compact & Centered */}
      <motion.div
        className="relative"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={cn(
          "w-16 h-16 rounded-full",
          "bg-gradient-aria",
          "flex items-center justify-center",
          "shadow-aria-glow animate-aria-breathe"
        )}>
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-aria opacity-30 blur-xl -z-10 scale-150" />
      </motion.div>

      {/* Introduction - Clean & Centered */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="space-y-1"
      >
        <h1 className="font-display text-2xl text-foreground">Sono Aria</h1>
        <p className="text-muted-foreground text-base">Come posso aiutarti oggi?</p>
      </motion.div>

      {/* HUGE Action Buttons - PROTAGONISTI */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="w-full space-y-3"
      >
        {/* Write Button - Glass style, HUGE */}
        <motion.button
          onClick={onStartChat}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "w-full flex items-center justify-center gap-4",
            "py-6 px-8 rounded-3xl",
            "bg-gradient-to-br from-white/90 to-white/70 dark:from-white/15 dark:to-white/10",
            "backdrop-blur-xl border border-white/50 dark:border-white/20",
            "text-foreground font-bold text-lg",
            "shadow-glass-elevated hover:shadow-glass-glow",
            "transition-all duration-300"
          )}
        >
          <PenLine className="w-7 h-7" />
          <span>Scrivi con Aria</span>
        </motion.button>

        {/* Voice Button - Aurora gradient, HUGE */}
        <motion.button
          onClick={onStartVoice}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "w-full flex items-center justify-center gap-4",
            "py-6 px-8 rounded-3xl",
            "bg-gradient-aria",
            "text-white font-bold text-lg",
            "shadow-aria-glow hover:shadow-[0_8px_40px_rgba(155,111,208,0.4)]",
            "transition-all duration-300"
          )}
        >
          <AudioLines className="w-7 h-7" />
          <span>Parla con Aria</span>
        </motion.button>
      </motion.div>

      {/* Insight Line - Subtle, at bottom - Opens session detail */}
      {insightPreview && lastSession && (
        <motion.button
          onClick={onViewLastSession}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className={cn(
            "w-full flex items-center gap-2 px-4 py-3 rounded-2xl",
            "bg-glass/50 backdrop-blur-sm border border-glass-border/30",
            "text-muted-foreground hover:text-foreground hover:bg-glass/70",
            "transition-all duration-200"
          )}
        >
          <span className="text-primary">💜</span>
          <span className="text-sm flex-1 text-left truncate">
            <span className="font-medium">{formatSessionDate(lastSession.start_time)}:</span>
            {' '}{insightPreview}
          </span>
          <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-50" />
        </motion.button>
      )}
    </div>
  );
};

export default AriaHeroSection;
