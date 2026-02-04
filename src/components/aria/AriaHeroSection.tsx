import React from 'react';
import { PenLine, AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale';

interface Session {
  id: string;
  type: string;
  start_time: string;
  ai_summary?: string | null;
}

interface AriaHeroSectionProps {
  userName?: string;
  lastSession?: Session | null;
  onStartChat: () => void;
  onStartVoice: () => void;
  onContinue?: () => void;
}

const AriaHeroSection: React.FC<AriaHeroSectionProps> = ({
  userName,
  lastSession,
  onStartChat,
  onStartVoice,
  onContinue,
}) => {
  const displayName = userName || 'amico';

  // Format last session context
  const getInsightText = () => {
    if (!lastSession) return null;
    
    const sessionDate = new Date(lastSession.start_time);
    let dateContext = '';
    if (isToday(sessionDate)) {
      dateContext = 'Oggi';
    } else if (isYesterday(sessionDate)) {
      dateContext = 'Ieri';
    } else {
      dateContext = format(sessionDate, "d MMM", { locale: it });
    }

    const preview = lastSession.ai_summary 
      ? lastSession.ai_summary.slice(0, 60) + (lastSession.ai_summary.length > 60 ? '...' : '')
      : `hai parlato ${lastSession.type === 'voice' ? 'vocalmente' : 'in chat'}`;

    return { dateContext, preview };
  };

  const insight = getInsightText();

  return (
    <section className="px-5 pt-3 pb-1">
      <div className={cn(
        "relative overflow-hidden rounded-3xl p-5",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass"
      )}>
        {/* Background gradient mesh */}
        <div className="absolute inset-0 bg-gradient-aria-subtle opacity-50 rounded-3xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-3xl" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Compact Orb + Intro */}
          <div className="flex items-center gap-3 mb-3">
            <motion.div
              className={cn(
                "relative w-12 h-12 rounded-full flex-shrink-0",
                "bg-gradient-aria",
                "shadow-aria-glow"
              )}
              animate={{
                scale: [1, 1.08, 1],
                boxShadow: [
                  '0 0 15px rgba(155, 111, 208, 0.4)',
                  '0 0 25px rgba(155, 111, 208, 0.6)',
                  '0 0 15px rgba(155, 111, 208, 0.4)'
                ]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/30" />
            </motion.div>

            <div className="text-left">
              <p className="text-xs text-aria-violet font-medium tracking-wide">
                Sono Aria
              </p>
              <h1 className="font-display text-lg font-bold text-foreground leading-tight">
                Ciao {displayName}, come stai?
              </h1>
            </div>
          </div>

          {/* Insight inline (if exists) */}
          {insight && (
            <motion.button
              onClick={onContinue}
              className={cn(
                "w-full mb-4 px-3 py-2 rounded-xl text-left",
                "bg-aria-violet/10 border border-aria-violet/20",
                "hover:bg-aria-violet/15 transition-colors"
              )}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-xs text-muted-foreground">
                <span className="text-aria-violet font-medium">{insight.dateContext}</span> {insight.preview}
              </p>
              <p className="text-[10px] text-primary mt-0.5">Tocca per continuare →</p>
            </motion.button>
          )}

          {/* CTA Buttons */}
          <div className="w-full flex gap-3">
            <motion.button
              onClick={onStartChat}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl",
                "bg-gradient-to-br from-primary to-primary-glow",
                "text-white font-semibold text-sm",
                "shadow-glass-glow hover:shadow-elevated",
                "transition-all duration-300"
              )}
              whileTap={{ scale: 0.97 }}
            >
              <PenLine className="w-4 h-4" />
              <span>Scrivi</span>
            </motion.button>

            <motion.button
              onClick={onStartVoice}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl",
                "bg-gradient-aria",
                "text-white font-semibold text-sm",
                "shadow-aria-glow hover:shadow-elevated",
                "transition-all duration-300"
              )}
              whileTap={{ scale: 0.97 }}
            >
              <AudioLines className="w-4 h-4" />
              <span>Parla</span>
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AriaHeroSection;
