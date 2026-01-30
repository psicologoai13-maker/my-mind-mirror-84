import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Stars, MessageCircle, Mic } from 'lucide-react';

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

const ReadyScreen: React.FC<ReadyScreenProps> = ({ userName, selectedGoals, onComplete }) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const confettiCount = 20;

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-aria-violet/10 via-background to-aria-indigo/5" />
      
      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: confettiCount }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>
      )}

      {/* Compact Card - stile WelcomeAriaModal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative z-10 w-full max-w-[300px] card-glass p-5 rounded-3xl overflow-hidden"
      >
        {/* Aurora gradient background */}
        <div className="absolute inset-0 bg-gradient-aria-subtle opacity-50 pointer-events-none" />
        
        <div className="relative z-10">
          {/* Aria Avatar - compatto */}
          <div className="flex justify-center mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
              className="relative"
            >
              <div className="relative w-14 h-14 rounded-full bg-gradient-aria flex items-center justify-center shadow-aria-glow">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <motion.div
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Stars className="w-2.5 h-2.5 text-primary-foreground" />
              </motion.div>
            </motion.div>
          </div>

          {/* Title - compatto */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-4"
          >
            <h1 className="text-xl font-bold text-foreground mb-1">
              Perfetto, {userName}! 🎉
            </h1>
            <p className="text-muted-foreground text-sm">
              Sono <span className="font-semibold text-aria-violet">Aria</span>, pronta a conoscerti
            </p>
          </motion.div>

          {/* Selected Goals - compatti */}
          {selectedGoals.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-4"
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 text-center">
                I tuoi obiettivi
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {selectedGoals.slice(0, 3).map((goalId) => {
                  const goal = goalLabels[goalId];
                  if (!goal) return null;
                  
                  return (
                    <div
                      key={goalId}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/60 border border-border/30"
                    >
                      <span className="text-sm">{goal.emoji}</span>
                      <span className="text-[11px] font-medium text-foreground/80">{goal.label}</span>
                    </div>
                  );
                })}
                {selectedGoals.length > 3 && (
                  <div className="px-2 py-1 rounded-full bg-secondary/40 text-[11px] text-muted-foreground">
                    +{selectedGoals.length - 3}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* CTA Buttons - layout come WelcomeAriaModal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            {/* Main CTA */}
            <Button
              onClick={onComplete}
              className="w-full h-11 rounded-full bg-gradient-aria text-white text-sm font-semibold shadow-aria-glow hover:shadow-elevated transition-all group"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Iniziamo a conoscerci
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            
            {/* Secondary row */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onComplete}
                className="flex-1 h-9 rounded-full border-border/40 text-[11px] font-medium bg-background/50"
              >
                <Mic className="w-3 h-3 mr-1" />
                Preferisco parlare
              </Button>
              <Button
                variant="ghost"
                onClick={onComplete}
                className="h-9 px-3 rounded-full text-muted-foreground text-[11px] hover:bg-secondary/50"
              >
                Più tardi
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ReadyScreen;
