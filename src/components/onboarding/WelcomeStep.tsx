import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

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
      {/* Aurora Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-primary/5" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Animated Avatar */}
        <motion.div 
          className="relative mb-10"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...spring, delay: 0.2 }}
        >
          {/* Outer glow ring */}
          <div className="absolute inset-0 w-36 h-36 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 blur-xl animate-pulse" />
          
          {/* Main avatar circle */}
          <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-glass-glow backdrop-blur-xl">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              <Sparkles className="w-16 h-16 text-primary" />
            </motion.div>
          </div>
          
          {/* Floating particles */}
          <motion.div 
            className="absolute -top-3 -right-3 w-4 h-4 bg-primary/60 rounded-full"
            animate={{ y: [-3, 3, -3], x: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute -bottom-2 -left-4 w-3 h-3 bg-primary/40 rounded-full"
            animate={{ y: [3, -3, 3], x: [2, -2, 2] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute top-1/2 -right-5 w-2 h-2 bg-primary/50 rounded-full"
            animate={{ y: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Welcome Text */}
        <motion.h1 
          className="text-4xl font-bold text-foreground mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Ciao! Sono Aria 👋
        </motion.h1>
        
        <motion.p 
          className="text-lg text-muted-foreground mb-2"
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

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="w-full max-w-xs"
        >
          <Button 
            onClick={onStart}
            size="lg"
            className="w-full h-14 rounded-full text-base font-semibold bg-gradient-to-r from-primary to-primary/80 shadow-glass-glow hover:shadow-glass-elevated transition-all duration-300"
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
