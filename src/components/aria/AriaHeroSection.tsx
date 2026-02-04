import React from 'react';
import { PenLine, AudioLines, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AriaHeroSectionProps {
  userName?: string;
  sessionCount?: number;
  streakDays?: number;
  onStartChat: () => void;
  onStartVoice: () => void;
}

const AriaHeroSection: React.FC<AriaHeroSectionProps> = ({
  userName,
  sessionCount = 0,
  streakDays = 0,
  onStartChat,
  onStartVoice,
}) => {
  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  const greeting = getGreeting();
  const displayName = userName || 'amico';

  return (
    <section className="px-5 pt-4 pb-2">
      {/* Hero Card with Aria Identity */}
      <div className={cn(
        "relative overflow-hidden rounded-3xl p-6",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass"
      )}>
        {/* Background gradient mesh */}
        <div className="absolute inset-0 bg-gradient-aria-subtle opacity-60 rounded-3xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent rounded-3xl" />
        
        {/* Animated Orb */}
        <div className="relative flex flex-col items-center mb-5">
          <motion.div
            className={cn(
              "relative w-20 h-20 rounded-full",
              "bg-gradient-aria",
              "shadow-aria-glow"
            )}
            animate={{
              scale: [1, 1.06, 1],
              boxShadow: [
                '0 0 25px rgba(155, 111, 208, 0.4)',
                '0 0 45px rgba(155, 111, 208, 0.6)',
                '0 0 25px rgba(155, 111, 208, 0.4)'
              ]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/30" />
            
            {/* Sparkle icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white/90" />
            </div>
            
            {/* Reflection ring */}
            <motion.div
              className="absolute -inset-2 rounded-full border-2 border-aria-violet/20"
              animate={{ 
                scale: [1, 1.15, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
            />
          </motion.div>

          {/* Greeting */}
          <motion.div
            className="mt-4 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="font-display text-xl font-bold text-foreground">
              {greeting}, {displayName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Come ti senti oggi?
            </p>
          </motion.div>
        </div>

        {/* CTA Buttons - Compact Row */}
        <div className="relative z-10 flex gap-3">
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

        {/* Mini Stats Row */}
        {(sessionCount > 0 || streakDays > 0) && (
          <motion.div
            className="relative z-10 flex items-center justify-center gap-4 mt-4 pt-3 border-t border-glass-border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {sessionCount > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="text-primary">💬</span> {sessionCount} sessioni
              </span>
            )}
            {streakDays > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="text-primary">🔥</span> {streakDays} giorni
              </span>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default AriaHeroSection;
