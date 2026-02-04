import React from 'react';
import { PenLine, AudioLines, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AriaHeroSectionProps {
  onStartChat: () => void;
  onStartVoice: () => void;
}

const AriaHeroSection: React.FC<AriaHeroSectionProps> = ({
  onStartChat,
  onStartVoice,
}) => {
  return (
    <div className="flex flex-col items-center text-center space-y-8">
      {/* Animated Orb - Bigger & Centered */}
      <motion.div
        className="relative"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={cn(
          "w-20 h-20 rounded-full",
          "bg-gradient-aria",
          "flex items-center justify-center",
          "shadow-aria-glow animate-aria-breathe"
        )}>
          <Sparkles className="w-9 h-9 text-white" />
        </div>
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-aria opacity-30 blur-xl -z-10 scale-150" />
      </motion.div>

      {/* Introduction - Clean & Centered */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="space-y-2"
      >
        <h1 className="font-display text-3xl text-foreground">Sono Aria</h1>
        <p className="text-muted-foreground text-lg">Come posso aiutarti oggi?</p>
      </motion.div>

      {/* HUGE Action Buttons - PROTAGONISTI */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="w-full space-y-4"
      >
        {/* Write Button - Glass style, HUGE */}
        <motion.button
          onClick={onStartChat}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "w-full flex items-center justify-center gap-4",
            "py-7 px-8 rounded-3xl",
            "bg-gradient-to-br from-white/90 to-white/70 dark:from-white/15 dark:to-white/10",
            "backdrop-blur-xl border border-white/50 dark:border-white/20",
            "text-foreground font-bold text-xl",
            "shadow-glass-elevated hover:shadow-glass-glow",
            "transition-all duration-300"
          )}
        >
          <PenLine className="w-8 h-8" />
          <span>Scrivi con Aria</span>
        </motion.button>

        {/* Voice Button - Aurora gradient, HUGE */}
        <motion.button
          onClick={onStartVoice}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "w-full flex items-center justify-center gap-4",
            "py-7 px-8 rounded-3xl",
            "bg-gradient-aria",
            "text-white font-bold text-xl",
            "shadow-aria-glow hover:shadow-[0_8px_40px_rgba(155,111,208,0.4)]",
            "transition-all duration-300"
          )}
        >
          <AudioLines className="w-8 h-8" />
          <span>Parla con Aria</span>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default AriaHeroSection;
