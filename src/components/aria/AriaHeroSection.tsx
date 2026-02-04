import React from 'react';
import { PenLine, AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AriaHeroSectionProps {
  userName?: string;
  onStartChat: () => void;
  onStartVoice: () => void;
}

const AriaHeroSection: React.FC<AriaHeroSectionProps> = ({
  userName,
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
    <section className="px-5 pt-5 pb-1">
      {/* Compact Greeting */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-2xl font-bold text-foreground">
          {greeting}, {displayName}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Come ti senti oggi?
        </p>
      </motion.div>

      {/* CTA Buttons - Compact Row */}
      <div className="flex gap-3">
        <motion.button
          onClick={onStartChat}
          className={cn(
            "flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl",
            "bg-gradient-to-br from-primary to-primary-glow",
            "text-white font-semibold text-sm",
            "shadow-glass-glow hover:shadow-elevated",
            "transition-all duration-300"
          )}
          whileTap={{ scale: 0.97 }}
        >
          <PenLine className="w-5 h-5" />
          <span>Scrivi con Aria</span>
        </motion.button>

        <motion.button
          onClick={onStartVoice}
          className={cn(
            "flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl",
            "bg-gradient-aria",
            "text-white font-semibold text-sm",
            "shadow-aria-glow hover:shadow-elevated",
            "transition-all duration-300"
          )}
          whileTap={{ scale: 0.97 }}
        >
          <AudioLines className="w-5 h-5" />
          <span>Parla con Aria</span>
        </motion.button>
      </div>
    </section>
  );
};

export default AriaHeroSection;
