import React from 'react';
import { PenLine, AudioLines } from 'lucide-react';
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
    <div className="flex flex-col items-center text-center space-y-4">
      {/* Protagonist Orb with Concentric Rings */}
      <motion.div
        className="relative"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Outer Ring 3 - Most distant */}
        <div 
          className="absolute inset-[-50px] rounded-full border border-[hsl(var(--aria-violet)/0.08)] animate-breathe"
          style={{ animationDelay: '2s', animationDuration: '5s' }}
        />
        
        {/* Outer Ring 2 - Middle */}
        <div 
          className="absolute inset-[-32px] rounded-full border border-[hsl(var(--aria-violet)/0.12)] animate-breathe"
          style={{ animationDelay: '1s', animationDuration: '4.5s' }}
        />
        
        {/* Outer Ring 1 - Closest */}
        <div 
          className="absolute inset-[-14px] rounded-full border border-[hsl(var(--aria-violet)/0.20)] animate-breathe"
          style={{ animationDelay: '0s', animationDuration: '4s' }}
        />

        {/* Main Orb - Larger */}
        <div className={cn(
          "w-36 h-36 rounded-full",
          "bg-gradient-to-b from-[hsl(var(--aria-violet))] to-[hsl(var(--aria-indigo)/0.85)]",
          "animate-aria-breathe",
          "shadow-aria-glow"
        )}>
          {/* Inner glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/20" />
        </div>
        
        {/* Diffused Glow Layer */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[hsl(var(--aria-violet)/0.4)] to-[hsl(var(--aria-indigo)/0.3)] blur-2xl -z-10 scale-150" />
      </motion.div>

      {/* Intimate Text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="space-y-1 pt-2"
      >
        <h1 className="font-display text-3xl text-foreground/90 font-normal">
          Sono qui per te
        </h1>
        <p className="text-muted-foreground/70 text-lg">
          Quando vuoi, come vuoi
        </p>
      </motion.div>

      {/* Gentle Action Invites - Larger */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="flex items-center justify-center gap-10 pt-2"
      >
        {/* Write Invite */}
        <motion.button
          onClick={onStartChat}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "flex flex-col items-center gap-3 px-6 py-4",
            "text-foreground/60 hover:text-foreground/90",
            "transition-all duration-300",
            "group"
          )}
        >
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center",
            "bg-glass/50 backdrop-blur-sm border border-glass-border/30",
            "group-hover:bg-glass/70 group-hover:border-[hsl(var(--aria-violet)/0.3)]",
            "group-hover:shadow-[0_0_20px_rgba(155,111,208,0.15)]",
            "transition-all duration-300"
          )}>
            <PenLine className="w-7 h-7 text-[hsl(var(--aria-violet)/0.7)] group-hover:text-[hsl(var(--aria-violet))]" />
          </div>
          <span className="text-base font-medium tracking-wide">scrivi</span>
        </motion.button>

        {/* Soft Divider */}
        <div className="h-20 w-px bg-gradient-to-b from-transparent via-border/30 to-transparent" />

        {/* Voice Invite */}
        <motion.button
          onClick={onStartVoice}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "flex flex-col items-center gap-3 px-6 py-4",
            "text-foreground/60 hover:text-foreground/90",
            "transition-all duration-300",
            "group"
          )}
        >
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center",
            "bg-glass/50 backdrop-blur-sm border border-glass-border/30",
            "group-hover:bg-gradient-to-br group-hover:from-[hsl(var(--aria-violet)/0.2)] group-hover:to-[hsl(var(--aria-indigo)/0.15)]",
            "group-hover:border-[hsl(var(--aria-violet)/0.4)]",
            "group-hover:shadow-[0_0_25px_rgba(155,111,208,0.2)]",
            "transition-all duration-300"
          )}>
            <AudioLines className="w-7 h-7 text-[hsl(var(--aria-violet)/0.7)] group-hover:text-[hsl(var(--aria-violet))]" />
          </div>
          <span className="text-base font-medium tracking-wide">parla</span>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default AriaHeroSection;
