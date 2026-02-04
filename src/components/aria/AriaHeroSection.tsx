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
      ? lastSession.ai_summary.slice(0, 70) + (lastSession.ai_summary.length > 70 ? '...' : '')
      : `hai parlato ${lastSession.type === 'voice' ? 'vocalmente' : 'in chat'}`;

    return { dateContext, preview };
  };

  const insight = getInsightText();

  return (
    <section className="px-4 pt-4">
      <div className={cn(
        "relative overflow-hidden rounded-3xl p-6",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass"
      )}>
        {/* Background gradient mesh */}
        <div className="absolute inset-0 bg-gradient-aria-subtle opacity-50 rounded-3xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-3xl" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Orb + Intro */}
          <div className="flex items-center gap-4 mb-5 w-full">
            <motion.div
              className={cn(
                "relative w-14 h-14 rounded-full flex-shrink-0",
                "bg-gradient-aria",
                "shadow-aria-glow"
              )}
              animate={{
                scale: [1, 1.08, 1],
                boxShadow: [
                  '0 0 20px rgba(155, 111, 208, 0.4)',
                  '0 0 35px rgba(155, 111, 208, 0.6)',
                  '0 0 20px rgba(155, 111, 208, 0.4)'
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

            <div className="text-left flex-1">
              <p className="text-sm text-aria-violet font-semibold tracking-wide mb-0.5">
                Sono Aria
              </p>
              <h1 className="font-display text-xl font-bold text-foreground leading-tight">
                Ciao {displayName}, come stai?
              </h1>
            </div>
          </div>

          {/* CTA Buttons - BIGGER */}
          <div className="w-full flex gap-3 mb-4">
            <motion.button
              onClick={onStartChat}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 py-4 px-5 rounded-2xl",
                "bg-gradient-to-br from-primary to-primary-glow",
                "text-white font-bold text-base",
                "shadow-glass-glow hover:shadow-elevated",
                "transition-all duration-300"
              )}
              whileTap={{ scale: 0.97 }}
            >
              <PenLine className="w-5 h-5" />
              <span>Scrivi</span>
            </motion.button>

            <motion.button
              onClick={onStartVoice}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 py-4 px-5 rounded-2xl",
                "bg-gradient-aria",
                "text-white font-bold text-base",
                "shadow-aria-glow hover:shadow-elevated",
                "transition-all duration-300"
              )}
              whileTap={{ scale: 0.97 }}
            >
              <AudioLines className="w-5 h-5" />
              <span>Parla</span>
            </motion.button>
          </div>

          {/* Insight at BOTTOM */}
          {insight && (
            <motion.button
              onClick={onContinue}
              className={cn(
                "w-full px-4 py-3 rounded-xl text-left",
                "bg-aria-violet/10 border border-aria-violet/20",
                "hover:bg-aria-violet/15 transition-colors"
              )}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-sm text-foreground/80">
                <span className="text-aria-violet font-semibold">{insight.dateContext}:</span> {insight.preview}
              </p>
              <p className="text-xs text-primary font-medium mt-1">Tocca per continuare →</p>
            </motion.button>
          )}
        </div>
      </div>
    </section>
  );
};

export default AriaHeroSection;
