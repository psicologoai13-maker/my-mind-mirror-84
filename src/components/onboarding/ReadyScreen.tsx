import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageCircle, Shield, Heart, Target, Loader2 } from 'lucide-react';

interface ReadyScreenProps {
  userName: string;
  selectedGoals: string[];
  onComplete: (goToAria: boolean) => void;
}

const goalLabels: Record<string, { emoji: string; label: string }> = {
  anxiety: { emoji: '🧘', label: 'Gestire ansia' },
  sleep: { emoji: '😴', label: 'Dormire meglio' },
  energy: { emoji: '⚡', label: 'Più energia' },
  relationships: { emoji: '💕', label: 'Relazioni' },
  growth: { emoji: '🌱', label: 'Crescita' },
  self_esteem: { emoji: '✨', label: 'Autostima' },
  stress: { emoji: '🧠', label: 'Gestire stress' },
  focus: { emoji: '🎯', label: 'Concentrazione' },
  motivation: { emoji: '🔥', label: 'Motivazione' },
  confidence: { emoji: '💪', label: 'Sicurezza' },
  balance: { emoji: '⚖️', label: 'Equilibrio' },
  happiness: { emoji: '😊', label: 'Felicità' },
  mindfulness: { emoji: '🧘‍♀️', label: 'Mindfulness' },
  productivity: { emoji: '📈', label: 'Produttività' },
  creativity: { emoji: '🎨', label: 'Creatività' },
  health: { emoji: '❤️', label: 'Salute' },
  fitness: { emoji: '🏃', label: 'Fitness' },
  nutrition: { emoji: '🥗', label: 'Alimentazione' },
  habits: { emoji: '✅', label: 'Abitudini' },
  social: { emoji: '👥', label: 'Socialità' },
};

const benefitItems = [
  { icon: Heart, text: 'Raccontami di te', subtext: 'Conoscerti è il primo passo' },
  { icon: Target, text: 'Percorso personalizzato', subtext: 'Adattato ai tuoi obiettivi' },
  { icon: Shield, text: 'Dati sempre al sicuro', subtext: 'Privacy garantita' },
];

const ReadyScreen: React.FC<ReadyScreenProps> = ({ userName, selectedGoals, onComplete }) => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate profile preparation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    const timer = setTimeout(() => {
      setIsProcessing(false);
    }, 2200);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 relative overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-aria-violet/15 via-background to-aria-indigo/10" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-aria-violet/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-aria-indigo/15 rounded-full blur-3xl animate-pulse delay-700" />

      <AnimatePresence mode="wait">
        {isProcessing ? (
          /* Processing State */
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", damping: 25 }}
            className="relative z-10 flex flex-col items-center text-center"
          >
            {/* Animated Loader */}
            <div className="relative mb-6">
              <motion.div
                className="w-20 h-20 rounded-full bg-gradient-aria flex items-center justify-center shadow-aria-glow"
                animate={{ 
                  boxShadow: [
                    '0 0 20px rgba(155, 111, 208, 0.4)',
                    '0 0 40px rgba(155, 111, 208, 0.6)',
                    '0 0 20px rgba(155, 111, 208, 0.4)'
                  ]
                }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </motion.div>
            </div>

            <h2 className="text-xl font-bold text-foreground mb-2">
              Stiamo preparando il tuo profilo
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Un momento, {userName}...
            </p>

            {/* Progress Bar */}
            <div className="w-48 h-1.5 bg-muted/30 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-aria rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
          </motion.div>
        ) : (
          /* Main Card */
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-sm"
          >
            {/* Glass Card */}
            <div className="card-glass p-6 rounded-3xl overflow-hidden relative">
              {/* Inner aurora glow */}
              <div className="absolute inset-0 bg-gradient-aria-subtle opacity-40 pointer-events-none" />
              
              <div className="relative z-10">
                {/* Aria Avatar */}
                <div className="flex justify-center mb-5">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
                    className="relative"
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-aria flex items-center justify-center shadow-aria-glow">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                  </motion.div>
                </div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-center mb-5"
                >
                  <h1 className="text-2xl font-bold text-foreground mb-1">
                    Ciao {userName}! 🎉
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Sono <span className="font-semibold text-aria-violet">Aria</span>, la tua compagna di crescita
                  </p>
                </motion.div>

                {/* Why talk to Aria - Benefits */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-5 space-y-3"
                >
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider text-center font-medium">
                    Aiutami a conoscerti meglio
                  </p>
                  
                  <div className="space-y-2">
                    {benefitItems.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + index * 0.1 }}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/40 border border-border/30"
                      >
                        <div className="w-8 h-8 rounded-full bg-aria-violet/20 flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-4 h-4 text-aria-violet" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{item.text}</p>
                          <p className="text-[11px] text-muted-foreground">{item.subtext}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Selected Goals */}
                {selectedGoals.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mb-5"
                  >
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 text-center font-medium">
                      I tuoi obiettivi
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {selectedGoals.map((goalId) => {
                        const goal = goalLabels[goalId];
                        if (!goal) return null;
                        
                        return (
                          <motion.div
                            key={goalId}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-aria-violet/10 border border-aria-violet/20"
                          >
                            <span className="text-sm">{goal.emoji}</span>
                            <span className="text-[11px] font-medium text-foreground/80">{goal.label}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-3"
                >
                  {/* Main CTA */}
                  <Button
                    onClick={() => onComplete(true)}
                    className="w-full h-12 rounded-full bg-gradient-aria text-white text-sm font-semibold shadow-aria-glow hover:shadow-elevated transition-all group"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Parla con Aria
                  </Button>
                  
                  {/* Secondary - Later */}
                  <Button
                    variant="ghost"
                    onClick={() => onComplete(false)}
                    className="w-full h-10 rounded-full text-muted-foreground text-sm hover:bg-secondary/50"
                  >
                    Più tardi
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReadyScreen;
