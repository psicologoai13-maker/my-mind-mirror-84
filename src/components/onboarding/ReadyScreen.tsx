import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageCircle, Shield, Heart, Target, Loader2, Compass } from 'lucide-react';
import FloatingParticles from '@/components/aria/FloatingParticles';

interface ReadyScreenProps {
  userName: string;
  selectedGoals: string[];
  selectedMotivations?: string[];
  onComplete: (goToAria: boolean) => void;
}

// Complete mapping of all motivation labels
const motivationLabels: Record<string, { emoji: string; label: string }> = {
  // Base motivations
  vent: { emoji: '💨', label: 'Sfogarmi' },
  track_mood: { emoji: '📊', label: 'Monitorare umore' },
  self_improvement: { emoji: '🚀', label: 'Migliorarmi' },
  understand_emotions: { emoji: '🔍', label: 'Capire emozioni' },
  daily_companion: { emoji: '🤗', label: 'Compagnia' },
  build_habits: { emoji: '🔄', label: 'Creare abitudini' },
  reduce_stress: { emoji: '🧘', label: 'Ridurre stress' },
  journal: { emoji: '📝', label: 'Tenere un diario' },
  therapy_support: { emoji: '🩺', label: 'Supporto terapia' },
  curiosity: { emoji: '✨', label: 'Curiosità' },
  // Youth motivations
  school_stress: { emoji: '📚', label: 'Stress scolastico' },
  bullying: { emoji: '🛡️', label: 'Bullismo' },
  parents: { emoji: '👨‍👩‍👧', label: 'Rapporto genitori' },
  identity: { emoji: '🪞', label: 'Capire chi sono' },
  social_pressure: { emoji: '📱', label: 'Pressione sociale' },
  // Adult motivations
  work_stress: { emoji: '💼', label: 'Stress lavorativo' },
  career_growth: { emoji: '📈', label: 'Crescita carriera' },
  parenting: { emoji: '👶', label: 'Essere genitore' },
  relationship_issues: { emoji: '💔', label: 'Problemi coppia' },
  burnout: { emoji: '🔥', label: 'Burnout' },
  life_transition: { emoji: '🔄', label: 'Cambiamenti vita' },
  // Mature motivations
  empty_nest: { emoji: '🏠', label: 'Nido vuoto' },
  aging: { emoji: '⏳', label: 'Invecchiare' },
  legacy: { emoji: '🌟', label: 'Lasciare un segno' },
  health_concerns: { emoji: '❤️‍🩹', label: 'Preoccupazioni salute' },
  // Female motivations
  imposter_syndrome: { emoji: '🎭', label: 'Sindrome impostora' },
  mental_load: { emoji: '🧠', label: 'Carico mentale' },
  body_image: { emoji: '🪞', label: 'Rapporto col corpo' },
  cycle_management: { emoji: '🌙', label: 'Gestire il ciclo' },
  // Male motivations
  express_emotions: { emoji: '💭', label: 'Esprimere emozioni' },
  provider_pressure: { emoji: '💰', label: 'Pressione economica' },
  show_vulnerability: { emoji: '🫂', label: 'Mostrarsi vulnerabile' },
  // Female mature
  menopause: { emoji: '🌸', label: 'Menopausa' },
};

// Complete mapping of all goal labels
const goalLabels: Record<string, { emoji: string; label: string }> = {
  // Base goals
  anxiety: { emoji: '🧘', label: 'Gestire ansia' },
  stress: { emoji: '😮‍💨', label: 'Ridurre stress' },
  mood: { emoji: '😊', label: 'Migliorare umore' },
  self_esteem: { emoji: '✨', label: 'Autostima' },
  sleep: { emoji: '😴', label: 'Dormire meglio' },
  energy: { emoji: '⚡', label: 'Più energia' },
  fitness: { emoji: '💪', label: 'Forma fisica' },
  nutrition: { emoji: '🥗', label: 'Alimentazione' },
  relationships: { emoji: '💕', label: 'Relazioni' },
  social: { emoji: '👥', label: 'Vita sociale' },
  communication: { emoji: '💬', label: 'Comunicazione' },
  boundaries: { emoji: '🛡️', label: 'Confini sani' },
  growth: { emoji: '🌱', label: 'Crescita personale' },
  focus: { emoji: '🧠', label: 'Concentrazione' },
  mindfulness: { emoji: '🕊️', label: 'Mindfulness' },
  habits: { emoji: '🔄', label: 'Nuove abitudini' },
  motivation: { emoji: '🔥', label: 'Motivazione' },
  // Youth goals
  school_performance: { emoji: '📊', label: 'Rendimento scolastico' },
  study_habits: { emoji: '📖', label: 'Abitudini studio' },
  peer_pressure: { emoji: '👥', label: 'Pressione sociale' },
  future_anxiety: { emoji: '🔮', label: 'Ansia per il futuro' },
  // Adult goals
  work_life: { emoji: '⚖️', label: 'Work-life balance' },
  productivity: { emoji: '🎯', label: 'Produttività' },
  career: { emoji: '💼', label: 'Carriera' },
  financial: { emoji: '💰', label: 'Finanze' },
  // Mature goals
  aging_well: { emoji: '🌅', label: 'Invecchiare bene' },
  health_focus: { emoji: '❤️', label: 'Priorità salute' },
  new_chapter: { emoji: '📖', label: 'Nuovo capitolo' },
  legacy_goal: { emoji: '🌟', label: 'Lasciare un segno' },
  // Female goals
  body_positivity: { emoji: '💃', label: 'Accettare il corpo' },
  me_time: { emoji: '🛁', label: 'Tempo per me' },
  mental_load_balance: { emoji: '⚖️', label: 'Bilanciare il carico' },
  // Male goals
  emotional_intelligence: { emoji: '🫀', label: 'Intelligenza emotiva' },
  open_up: { emoji: '🗣️', label: 'Aprirsi di più' },
  present_father: { emoji: '👨‍👧', label: 'Paternità presente' },
  // Young female goals
  social_comparison: { emoji: '📵', label: 'Stop confronti social' },
  // Young male goals
  healthy_masculinity: { emoji: '🌟', label: 'Mascolinità sana' },
};

const benefitItems = [
  { icon: Heart, text: 'Raccontami di te', subtext: 'Conoscerti è il primo passo' },
  { icon: Target, text: 'Percorso personalizzato', subtext: 'Adattato ai tuoi obiettivi' },
  { icon: Shield, text: 'Dati sempre al sicuro', subtext: 'Privacy garantita' },
];

const ReadyScreen: React.FC<ReadyScreenProps> = ({ 
  userName, 
  selectedGoals, 
  selectedMotivations = [],
  onComplete 
}) => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
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

  const hasMotivations = selectedMotivations.length > 0;
  const hasGoals = selectedGoals.length > 0;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 relative overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-aria-violet/15 via-background to-aria-indigo/10" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-aria-violet/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-aria-indigo/15 rounded-full blur-3xl animate-pulse delay-700" />

      {/* Floating Particles */}
      <FloatingParticles />

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
            {/* Animated Loader with Rings */}
            <div className="relative mb-6">
              <motion.div 
                className="absolute inset-[-12px] rounded-full border border-aria-violet/20 ring-concentric-2"
              />
              <motion.div 
                className="absolute inset-[-6px] rounded-full border border-aria-violet/30 ring-concentric-1"
              />
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
            <div className="card-glass p-6 rounded-3xl overflow-hidden relative max-h-[85vh] flex flex-col">
              {/* Inner aurora glow */}
              <div className="absolute inset-0 bg-gradient-aria-subtle opacity-40 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
              
              <div className="relative z-10 flex flex-col overflow-hidden">
                {/* Aria Avatar with Rings */}
                <div className="flex justify-center mb-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
                    className="relative"
                  >
                    <motion.div 
                      className="absolute inset-[-10px] rounded-full border border-aria-violet/20 ring-concentric-2"
                    />
                    <motion.div 
                      className="absolute inset-[-5px] rounded-full border border-aria-violet/30 ring-concentric-1"
                    />
                    <div className="w-14 h-14 rounded-full bg-gradient-aria flex items-center justify-center shadow-aria-glow">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                  </motion.div>
                </div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-center mb-4"
                >
                  <h1 className="text-xl font-bold text-foreground mb-1">
                    Ciao {userName}! 🎉
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Sono <span className="font-semibold text-aria-violet">Aria</span>, la tua compagna di crescita
                  </p>
                </motion.div>

                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
                  {/* Why talk to Aria - Benefits */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider text-center font-medium mb-2">
                      Aiutami a conoscerti meglio
                    </p>
                    
                    <div className="space-y-2">
                      {benefitItems.map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.25 + index * 0.1 }}
                          className="flex items-center gap-3 p-2 rounded-xl bg-glass backdrop-blur-xl border border-glass-border shadow-glass"
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

                  {/* Selected Motivations */}
                  {hasMotivations && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <Compass className="w-3 h-3 text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                          Perché sei qui
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {selectedMotivations.slice(0, 6).map((motivId) => {
                          const motiv = motivationLabels[motivId];
                          if (!motiv) return null;
                          
                          return (
                            <motion.div
                              key={motivId}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex items-center gap-1 px-2 py-1 rounded-full bg-glass backdrop-blur-xl border border-aria-violet/20 shadow-glass"
                            >
                              <span className="text-xs">{motiv.emoji}</span>
                              <span className="text-[10px] font-medium text-foreground/80">{motiv.label}</span>
                            </motion.div>
                          );
                        })}
                        {selectedMotivations.length > 6 && (
                          <span className="text-[10px] text-muted-foreground py-1">
                            +{selectedMotivations.length - 6}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Selected Goals */}
                  {hasGoals && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <Target className="w-3 h-3 text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                          I tuoi obiettivi
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {selectedGoals.slice(0, 6).map((goalId) => {
                          const goal = goalLabels[goalId];
                          if (!goal) return null;
                          
                          return (
                            <motion.div
                              key={goalId}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex items-center gap-1 px-2 py-1 rounded-full bg-glass backdrop-blur-xl border border-aria-violet/20 shadow-glass"
                            >
                              <span className="text-xs">{goal.emoji}</span>
                              <span className="text-[10px] font-medium text-foreground/80">{goal.label}</span>
                            </motion.div>
                          );
                        })}
                        {selectedGoals.length > 6 && (
                          <span className="text-[10px] text-muted-foreground py-1">
                            +{selectedGoals.length - 6}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="space-y-2 pt-4 mt-auto"
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
                    className="w-full h-10 rounded-full text-muted-foreground text-sm hover:bg-glass"
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
