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
    <div className="flex flex-col items-center text-center space-y-8">
      {/* Glassmorphic Orb - STATIC (no breathing animation) */}
      <motion.div
        className="relative"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Ambient Glow - Static but vibrant */}
        <div 
          className="absolute inset-[-60px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(155,111,208,0.25) 0%, rgba(99,102,241,0.15) 40%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
        
        {/* Outer Decorative Ring - Static */}
        <div 
          className="absolute inset-[-20px] rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(167,139,250,0.15) 0%, transparent 50%, rgba(155,111,208,0.1) 100%)',
            border: '1px solid rgba(167,139,250,0.2)',
          }}
        />

        {/* Main Glassmorphic Sphere - STATIC */}
        <div className="relative w-44 h-44">
          {/* Glass Base with vibrant Aurora colors */}
          <div 
            className="absolute inset-0 rounded-full backdrop-blur-xl"
            style={{
              background: `
                radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.35) 0%, transparent 45%),
                radial-gradient(ellipse at 70% 80%, rgba(167,139,250,0.4) 0%, transparent 50%),
                linear-gradient(160deg, 
                  rgba(155,111,208,0.5) 0%, 
                  rgba(129,140,248,0.4) 50%,
                  rgba(99,102,241,0.35) 100%
                )
              `,
              boxShadow: `
                inset 0 2px 3px rgba(255,255,255,0.4),
                inset 0 -2px 3px rgba(99,102,241,0.2),
                0 0 50px rgba(155,111,208,0.3),
                0 0 100px rgba(129,140,248,0.15)
              `,
              border: '1.5px solid rgba(255,255,255,0.25)',
            }}
          />
          
          {/* Inner Light Refraction - More vivid */}
          <div 
            className="absolute inset-4 rounded-full"
            style={{
              background: `
                radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.5) 0%, transparent 45%),
                radial-gradient(ellipse at 70% 70%, rgba(167,139,250,0.25) 0%, transparent 40%)
              `,
            }}
          />
          
          {/* Highlight Streak - Brighter */}
          <div 
            className="absolute top-5 left-7 w-14 h-7 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 100%)',
              transform: 'rotate(-35deg)',
              filter: 'blur(3px)',
            }}
          />
          
          {/* Secondary Highlight */}
          <div 
            className="absolute bottom-7 right-9 w-6 h-3 rounded-full opacity-50"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 100%)',
              transform: 'rotate(145deg)',
              filter: 'blur(2px)',
            }}
          />
          
          {/* Core Glow - Static vivid center */}
          <div 
            className="absolute inset-8 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(167,139,250,0.3) 0%, rgba(155,111,208,0.15) 50%, transparent 70%)',
            }}
          />
        </div>
      </motion.div>

      {/* Text - More visible */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="space-y-2"
      >
        <h1 className="font-display text-3xl text-foreground font-light tracking-wide">
          Sono qui per te
        </h1>
        <p className="text-muted-foreground/70 text-base font-light">
          quando vuoi
        </p>
      </motion.div>

      {/* Action Buttons - More vibrant on hover */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="flex items-center justify-center gap-14 pt-4"
      >
        {/* Write Button */}
        <motion.button
          onClick={onStartChat}
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center gap-3 group"
        >
          <div 
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              "bg-white/5 backdrop-blur-sm border border-white/10",
              "group-hover:bg-[hsl(var(--aria-violet)/0.15)] group-hover:border-[hsl(var(--aria-violet)/0.4)]",
              "group-hover:shadow-[0_0_30px_rgba(155,111,208,0.25)]",
              "transition-all duration-300"
            )}
          >
            <PenLine className="w-5 h-5 text-foreground/50 group-hover:text-[hsl(var(--aria-violet))] transition-colors duration-300" />
          </div>
          <span className="text-sm text-muted-foreground/50 font-medium tracking-widest uppercase group-hover:text-foreground/80 transition-colors duration-300">
            scrivi
          </span>
        </motion.button>

        {/* Divider */}
        <div className="h-16 w-px bg-gradient-to-b from-transparent via-[hsl(var(--aria-violet)/0.2)] to-transparent" />

        {/* Voice Button */}
        <motion.button
          onClick={onStartVoice}
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center gap-3 group"
        >
          <div 
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              "bg-white/5 backdrop-blur-sm border border-white/10",
              "group-hover:bg-gradient-to-br group-hover:from-[hsl(var(--aria-violet)/0.2)] group-hover:to-[hsl(var(--aria-indigo)/0.15)]",
              "group-hover:border-[hsl(var(--aria-violet)/0.5)]",
              "group-hover:shadow-[0_0_35px_rgba(155,111,208,0.3)]",
              "transition-all duration-300"
            )}
          >
            <AudioLines className="w-5 h-5 text-foreground/50 group-hover:text-[hsl(var(--aria-violet))] transition-colors duration-300" />
          </div>
          <span className="text-sm text-muted-foreground/50 font-medium tracking-widest uppercase group-hover:text-foreground/80 transition-colors duration-300">
            parla
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default AriaHeroSection;
