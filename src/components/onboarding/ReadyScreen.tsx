import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

interface ReadyScreenProps {
  userName: string;
  selectedGoals: string[];
  onComplete: () => void;
}

const goalLabels: Record<string, { emoji: string; label: string }> = {
  anxiety: { emoji: '🧘', label: 'Gestire ansia' },
  sleep: { emoji: '😴', label: 'Dormire meglio' },
  energy: { emoji: '⚡', label: 'Più energia' },
  relationships: { emoji: '💕', label: 'Relazioni' },
  growth: { emoji: '🌱', label: 'Crescita' },
  self_esteem: { emoji: '✨', label: 'Autostima' },
};

// Simple confetti particle
const ConfettiParticle: React.FC<{ index: number }> = ({ index }) => {
  const colors = ['#9B6FD0', '#6366F1', '#A78BFA', '#22C55E', '#F59E0B', '#EC4899'];
  const color = colors[index % colors.length];
  
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ 
        backgroundColor: color,
        left: `${10 + Math.random() * 80}%`,
        top: '-10px'
      }}
      initial={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
      animate={{ 
        y: window.innerHeight + 100,
        opacity: 0,
        scale: 0,
        rotate: 360 * (Math.random() > 0.5 ? 1 : -1)
      }}
      transition={{ 
        duration: 2 + Math.random() * 2,
        delay: index * 0.1,
        ease: "easeOut"
      }}
    />
  );
};

const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25
};

const ReadyScreen: React.FC<ReadyScreenProps> = ({ userName, selectedGoals, onComplete }) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const confettiCount = 30;

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5 animate-aurora" />
      
      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: confettiCount }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...spring, delay: 0.2 }}
          className="relative mb-8"
        >
          {/* Glow rings */}
          <div className="absolute inset-0 w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 blur-xl animate-pulse" />
          <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-glass-glow">
            <Sparkles className="w-14 h-14 text-primary animate-pulse" />
          </div>
          
          {/* Floating sparkles */}
          <motion.div 
            className="absolute -top-2 -right-2 text-2xl"
            animate={{ y: [-2, 2, -2], rotate: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            ✨
          </motion.div>
          <motion.div 
            className="absolute -bottom-1 -left-3 text-xl"
            animate={{ y: [2, -2, 2], rotate: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
          >
            🌟
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-3xl font-bold text-foreground mb-2"
        >
          Perfetto, {userName}! 🎉
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground mb-8"
        >
          Aria non vede l'ora di conoscerti
        </motion.p>

        {/* Selected Goals */}
        {selectedGoals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full mb-8"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
              I tuoi obiettivi
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {selectedGoals.map((goalId, index) => {
                const goal = goalLabels[goalId];
                if (!goal) return null;
                
                return (
                  <motion.div
                    key={goalId}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + index * 0.1, ...spring }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-glass backdrop-blur-xl border border-glass-border shadow-glass"
                  >
                    <span className="text-lg">{goal.emoji}</span>
                    <span className="text-sm font-medium text-foreground">{goal.label}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="w-full"
        >
          <Button
            onClick={onComplete}
            size="lg"
            className="w-full h-14 rounded-full text-base font-semibold bg-gradient-to-r from-primary to-primary/80 shadow-glass-glow hover:shadow-glass-elevated transition-all duration-300"
          >
            Parla con Aria
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>

        {/* Subtle note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="text-xs text-muted-foreground/60 mt-4"
        >
          Aria è qui per accompagnarti ogni giorno 💙
        </motion.p>
      </div>
    </div>
  );
};

export default ReadyScreen;
