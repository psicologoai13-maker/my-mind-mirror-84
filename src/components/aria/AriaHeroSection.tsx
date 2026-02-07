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
      {/* Glassmorphic Orb with Premium Effects */}
      <motion.div
        className="relative"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Ambient Glow - Very Soft */}
        <div className="absolute inset-[-80px] rounded-full bg-gradient-to-b from-[hsl(var(--aria-violet)/0.08)] to-transparent blur-3xl animate-breathe" 
          style={{ animationDuration: '8s' }}
        />
        
        {/* Outer Ring - Ethereal */}
        <motion.div 
          className="absolute inset-[-24px] rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          animate={{ 
            rotate: 360,
          }}
          transition={{ 
            duration: 60, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />

        {/* Main Glassmorphic Sphere */}
        <div className="relative w-44 h-44">
          {/* Glass Base */}
          <div 
            className={cn(
              "absolute inset-0 rounded-full",
              "backdrop-blur-xl",
              "animate-aria-breathe"
            )}
            style={{
              background: `
                radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.25) 0%, transparent 50%),
                radial-gradient(ellipse at 70% 80%, rgba(155,111,208,0.15) 0%, transparent 40%),
                linear-gradient(180deg, 
                  rgba(255,255,255,0.12) 0%, 
                  rgba(155,111,208,0.08) 50%,
                  rgba(99,102,241,0.06) 100%
                )
              `,
              boxShadow: `
                inset 0 1px 1px rgba(255,255,255,0.3),
                inset 0 -1px 1px rgba(0,0,0,0.05),
                0 0 60px rgba(155,111,208,0.15),
                0 0 100px rgba(155,111,208,0.08)
              `,
              border: '1px solid rgba(255,255,255,0.18)',
            }}
          />
          
          {/* Inner Light Refraction */}
          <div 
            className="absolute inset-3 rounded-full"
            style={{
              background: `
                radial-gradient(ellipse at 25% 25%, rgba(255,255,255,0.4) 0%, transparent 40%),
                radial-gradient(ellipse at 75% 75%, rgba(167,139,250,0.1) 0%, transparent 30%)
              `,
            }}
          />
          
          {/* Highlight Streak */}
          <div 
            className="absolute top-4 left-6 w-16 h-8 rounded-full opacity-60"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 100%)',
              transform: 'rotate(-30deg)',
              filter: 'blur(4px)',
            }}
          />
          
          {/* Secondary Highlight */}
          <div 
            className="absolute bottom-6 right-8 w-8 h-4 rounded-full opacity-30"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 100%)',
              transform: 'rotate(150deg)',
              filter: 'blur(3px)',
            }}
          />
          
          {/* Subtle Inner Glow */}
          <motion.div 
            className="absolute inset-6 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(155,111,208,0.12) 0%, transparent 70%)',
            }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
              scale: [0.95, 1, 0.95],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      </motion.div>

      {/* Intimate Text - More Zen */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="space-y-2"
      >
        <h1 className="font-display text-3xl text-foreground/85 font-light tracking-wide">
          Sono qui
        </h1>
        <p className="text-muted-foreground/50 text-base font-light">
          quando vuoi
        </p>
      </motion.div>

      {/* Minimal Action Invites */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="flex items-center justify-center gap-16 pt-4"
      >
        {/* Write Invite */}
        <motion.button
          onClick={onStartChat}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center gap-4 group"
        >
          <div 
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              "transition-all duration-500 ease-out"
            )}
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 0 0 rgba(155,111,208,0)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(155,111,208,0.3)';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(155,111,208,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.boxShadow = '0 0 0 rgba(155,111,208,0)';
            }}
          >
            <PenLine className="w-5 h-5 text-foreground/40 group-hover:text-foreground/70 transition-colors duration-300" />
          </div>
          <span className="text-sm text-muted-foreground/40 font-light tracking-widest uppercase group-hover:text-muted-foreground/70 transition-colors duration-300">
            scrivi
          </span>
        </motion.button>

        {/* Soft Divider */}
        <div className="h-16 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

        {/* Voice Invite */}
        <motion.button
          onClick={onStartVoice}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center gap-4 group"
        >
          <div 
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              "transition-all duration-500 ease-out"
            )}
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 0 0 rgba(155,111,208,0)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(155,111,208,0.1)';
              e.currentTarget.style.borderColor = 'rgba(155,111,208,0.4)';
              e.currentTarget.style.boxShadow = '0 0 40px rgba(155,111,208,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.boxShadow = '0 0 0 rgba(155,111,208,0)';
            }}
          >
            <AudioLines className="w-5 h-5 text-foreground/40 group-hover:text-foreground/70 transition-colors duration-300" />
          </div>
          <span className="text-sm text-muted-foreground/40 font-light tracking-widest uppercase group-hover:text-muted-foreground/70 transition-colors duration-300">
            parla
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default AriaHeroSection;
