import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import FloatingParticles from '@/components/aria/FloatingParticles';

interface WelcomeStepProps {
  onStart: () => void;
}

const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25
};

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onStart }) => {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Aurora Background - Enhanced */}
      <div className="absolute inset-0 bg-gradient-to-br from-aria-violet/20 via-background to-aria-indigo/10" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-aria-violet/15 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-aria-indigo/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-aria-purple/5 rounded-full blur-3xl" />

      {/* Floating Particles */}
      <FloatingParticles />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Animated Avatar with Concentric Rings */}
        <motion.div 
          className="relative mb-10"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...spring, delay: 0.2 }}
        >
          {/* Outer concentric ring */}
          <motion.div 
            className="absolute inset-[-30px] rounded-full border border-aria-violet/20 ring-concentric-2"
          />
          
          {/* Middle concentric ring */}
          <motion.div 
            className="absolute inset-[-15px] rounded-full border border-aria-violet/30 ring-concentric-1"
          />
          
          {/* Outer glow ring - Aurora */}
          <div className="absolute inset-0 w-40 h-40 rounded-full bg-gradient-aria blur-xl opacity-40 animate-pulse" />
          
          {/* Main avatar circle with Aurora gradient border */}
          <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-aria-violet/20 to-aria-indigo/10 flex items-center justify-center border border-aria-violet/30 shadow-aria-glow backdrop-blur-xl">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              <Sparkles className="w-20 h-20 text-aria-violet" />
            </motion.div>
          </div>
          
          {/* Floating particles - Aurora colors */}
          <motion.div 
            className="absolute -top-4 -right-4 w-5 h-5 bg-aria-violet/60 rounded-full shadow-[0_0_10px_rgba(155,111,208,0.5)]"
            animate={{ y: [-3, 3, -3], x: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute -bottom-3 -left-5 w-4 h-4 bg-aria-indigo/50 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"
            animate={{ y: [3, -3, 3], x: [2, -2, 2] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute top-1/2 -right-6 w-3 h-3 bg-aria-purple/50 rounded-full shadow-[0_0_6px_rgba(167,139,250,0.5)]"
            animate={{ y: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Welcome Text - Larger */}
        <motion.h1 
          className="text-5xl font-bold text-foreground mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Ciao! Sono Aria 👋
        </motion.h1>
        
        <motion.p 
          className="text-xl text-muted-foreground mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          La tua compagna di benessere
        </motion.p>
        
        <motion.p 
          className="text-base text-muted-foreground/70 mb-12 max-w-xs"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          Vorrei conoscerti meglio ✨
        </motion.p>

        {/* CTA Button with Aurora gradient */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="w-full max-w-xs"
        >
          <Button 
            onClick={onStart}
            size="lg"
            className="w-full h-14 rounded-full text-base font-semibold bg-gradient-aria text-white shadow-aria-glow hover:shadow-elevated transition-all duration-300"
          >
            Iniziamo
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default WelcomeStep;
