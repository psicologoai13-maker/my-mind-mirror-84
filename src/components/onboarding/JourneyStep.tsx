import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, Compass, Target } from 'lucide-react';

interface JourneyStepProps {
  userName: string;
  selectedMotivations: string[];
  onMotivationsChange: (motivations: string[]) => void;
  selectedGoals: string[];
  onGoalsChange: (goals: string[]) => void;
  ageRange?: string;
  gender?: string;
}

interface Option {
  id: string;
  label: string;
  emoji: string;
}

// ============================================
// MOTIVATIONS - "Perché sei qui?"
// ============================================

const baseMotivations: Option[] = [
  { id: 'vent', label: 'Sfogarmi', emoji: '💨' },
  { id: 'track_mood', label: 'Monitorare umore', emoji: '📊' },
  { id: 'self_improvement', label: 'Migliorarmi', emoji: '🚀' },
  { id: 'understand_emotions', label: 'Capire emozioni', emoji: '🔍' },
  { id: 'daily_companion', label: 'Compagnia', emoji: '🤗' },
  { id: 'build_habits', label: 'Creare abitudini', emoji: '🔄' },
  { id: 'reduce_stress', label: 'Ridurre stress', emoji: '🧘' },
  { id: 'journal', label: 'Tenere un diario', emoji: '📝' },
  { id: 'therapy_support', label: 'Supporto terapia', emoji: '🩺' },
  { id: 'curiosity', label: 'Curiosità', emoji: '✨' },
];

const youthMotivations: Option[] = [
  { id: 'school_stress', label: 'Stress scolastico', emoji: '📚' },
  { id: 'bullying', label: 'Bullismo', emoji: '🛡️' },
  { id: 'parents', label: 'Rapporto genitori', emoji: '👨‍👩‍👧' },
  { id: 'identity', label: 'Capire chi sono', emoji: '🪞' },
  { id: 'social_pressure', label: 'Pressione sociale', emoji: '📱' },
];

const adultMotivations: Option[] = [
  { id: 'work_stress', label: 'Stress lavorativo', emoji: '💼' },
  { id: 'career_growth', label: 'Crescita carriera', emoji: '📈' },
  { id: 'parenting', label: 'Essere genitore', emoji: '👶' },
  { id: 'relationship_issues', label: 'Problemi coppia', emoji: '💔' },
  { id: 'burnout', label: 'Burnout', emoji: '🔥' },
  { id: 'life_transition', label: 'Cambiamenti vita', emoji: '🔄' },
];

const matureMotivations: Option[] = [
  { id: 'empty_nest', label: 'Nido vuoto', emoji: '🏠' },
  { id: 'aging', label: 'Invecchiare', emoji: '⏳' },
  { id: 'legacy', label: 'Lasciare un segno', emoji: '🌟' },
  { id: 'health_concerns', label: 'Preoccupazioni salute', emoji: '❤️‍🩹' },
];

const femaleMotivations: Option[] = [
  { id: 'imposter_syndrome', label: 'Sindrome impostora', emoji: '🎭' },
  { id: 'mental_load', label: 'Carico mentale', emoji: '🧠' },
  { id: 'body_image', label: 'Rapporto col corpo', emoji: '🪞' },
  { id: 'cycle_management', label: 'Gestire il ciclo', emoji: '🌙' },
];

const maleMotivations: Option[] = [
  { id: 'express_emotions', label: 'Esprimere emozioni', emoji: '💭' },
  { id: 'provider_pressure', label: 'Pressione economica', emoji: '💰' },
  { id: 'show_vulnerability', label: 'Mostrarsi vulnerabile', emoji: '🫂' },
];

const femaleMatureMotivations: Option[] = [
  { id: 'menopause', label: 'Menopausa', emoji: '🌸' },
];

// ============================================
// GOALS - "Su cosa vuoi lavorare?"
// ============================================

const baseGoals: Option[] = [
  { id: 'anxiety', label: 'Gestire ansia', emoji: '🧘' },
  { id: 'stress', label: 'Ridurre stress', emoji: '😮‍💨' },
  { id: 'mood', label: 'Migliorare umore', emoji: '😊' },
  { id: 'self_esteem', label: 'Autostima', emoji: '✨' },
  { id: 'sleep', label: 'Dormire meglio', emoji: '😴' },
  { id: 'energy', label: 'Più energia', emoji: '⚡' },
  { id: 'fitness', label: 'Forma fisica', emoji: '💪' },
  { id: 'nutrition', label: 'Alimentazione', emoji: '🥗' },
  { id: 'relationships', label: 'Relazioni', emoji: '💕' },
  { id: 'social', label: 'Vita sociale', emoji: '👥' },
  { id: 'communication', label: 'Comunicazione', emoji: '💬' },
  { id: 'boundaries', label: 'Confini sani', emoji: '🛡️' },
  { id: 'growth', label: 'Crescita personale', emoji: '🌱' },
  { id: 'focus', label: 'Concentrazione', emoji: '🧠' },
  { id: 'mindfulness', label: 'Mindfulness', emoji: '🕊️' },
  { id: 'habits', label: 'Nuove abitudini', emoji: '🔄' },
  { id: 'motivation', label: 'Motivazione', emoji: '🔥' },
];

const youthGoals: Option[] = [
  { id: 'school_performance', label: 'Rendimento scuola', emoji: '📊' },
  { id: 'study_habits', label: 'Abitudini studio', emoji: '📖' },
  { id: 'peer_pressure', label: 'Pressione sociale', emoji: '👥' },
  { id: 'future_anxiety', label: 'Ansia futuro', emoji: '🔮' },
];

const adultGoals: Option[] = [
  { id: 'work_life', label: 'Work-life balance', emoji: '⚖️' },
  { id: 'productivity', label: 'Produttività', emoji: '🎯' },
  { id: 'career', label: 'Carriera', emoji: '💼' },
  { id: 'financial', label: 'Finanze', emoji: '💰' },
];

const matureGoals: Option[] = [
  { id: 'aging_well', label: 'Invecchiare bene', emoji: '🌅' },
  { id: 'health_focus', label: 'Priorità salute', emoji: '❤️' },
  { id: 'new_chapter', label: 'Nuovo capitolo', emoji: '📖' },
  { id: 'legacy_goal', label: 'Lasciare un segno', emoji: '🌟' },
];

const femaleGoals: Option[] = [
  { id: 'body_positivity', label: 'Accettare il corpo', emoji: '💃' },
  { id: 'me_time', label: 'Tempo per me', emoji: '🛁' },
  { id: 'mental_load_balance', label: 'Bilanciare carico', emoji: '⚖️' },
];

const maleGoals: Option[] = [
  { id: 'emotional_intelligence', label: 'Intelligenza emotiva', emoji: '🫀' },
  { id: 'open_up', label: 'Aprirsi di più', emoji: '🗣️' },
  { id: 'present_father', label: 'Paternità presente', emoji: '👨‍👧' },
];

const youngFemaleGoals: Option[] = [
  { id: 'social_comparison', label: 'Stop confronti social', emoji: '📵' },
];

const youngMaleGoals: Option[] = [
  { id: 'healthy_masculinity', label: 'Mascolinità sana', emoji: '🌟' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

const getAgeGroup = (ageRange?: string): 'youth' | 'adult' | 'mature' => {
  if (ageRange === '<18' || ageRange === '18-24') return 'youth';
  if (ageRange === '45-54' || ageRange === '55+') return 'mature';
  return 'adult';
};

const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25
};

// ============================================
// COMPONENT
// ============================================

const JourneyStep: React.FC<JourneyStepProps> = ({
  userName,
  selectedMotivations,
  onMotivationsChange,
  selectedGoals,
  onGoalsChange,
  ageRange,
  gender,
}) => {
  const ageGroup = getAgeGroup(ageRange);

  // Build motivation options based on age/gender
  const motivationOptions = useMemo(() => {
    const options = [...baseMotivations];
    
    if (ageGroup === 'youth') {
      options.push(...youthMotivations);
    } else if (ageGroup === 'mature') {
      options.push(...adultMotivations);
      options.push(...matureMotivations);
      if (gender === 'female') {
        options.push(...femaleMatureMotivations);
      }
    } else {
      options.push(...adultMotivations);
    }
    
    if (gender === 'female') {
      options.push(...femaleMotivations);
    } else if (gender === 'male') {
      options.push(...maleMotivations);
    }
    
    return options;
  }, [ageGroup, gender]);

  // Build goal options based on age/gender
  const goalOptions = useMemo(() => {
    const options = [...baseGoals];
    
    if (ageGroup === 'youth') {
      options.push(...youthGoals);
      if (gender === 'female') {
        options.push(...youngFemaleGoals);
      } else if (gender === 'male') {
        options.push(...youngMaleGoals);
      }
    } else if (ageGroup === 'mature') {
      options.push(...adultGoals);
      options.push(...matureGoals);
    } else {
      options.push(...adultGoals);
    }
    
    if (gender === 'female') {
      options.push(...femaleGoals);
    } else if (gender === 'male') {
      options.push(...maleGoals);
    }
    
    return options;
  }, [ageGroup, gender]);

  const toggleMotivation = (id: string) => {
    if (selectedMotivations.includes(id)) {
      onMotivationsChange(selectedMotivations.filter(m => m !== id));
    } else {
      onMotivationsChange([...selectedMotivations, id]);
    }
  };

  const toggleGoal = (id: string) => {
    if (selectedGoals.includes(id)) {
      onGoalsChange(selectedGoals.filter(g => g !== id));
    } else {
      onGoalsChange([...selectedGoals, id]);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-5 py-4 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4 text-center"
      >
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Il tuo percorso, {userName}
        </h1>
        <p className="text-muted-foreground text-sm">
          Seleziona tutto ciò che ti risuona
        </p>
      </motion.div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-2 -mx-1 px-1">
        {/* Section 1: Motivations - Now using Grid like Goals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Compass className="w-4 h-4 text-aria-violet" />
            <p className="text-sm font-semibold text-foreground">Perché sei qui?</p>
            <span className="text-xs text-muted-foreground ml-auto">
              {selectedMotivations.length} sel.
            </span>
          </div>
          
          {/* Grid layout uniforme con Goals */}
          <div className="grid grid-cols-2 gap-2">
            {motivationOptions.map((option, index) => {
              const isSelected = selectedMotivations.includes(option.id);
              return (
                <motion.button
                  key={option.id}
                  onClick={() => toggleMotivation(option.id)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.015, ...spring }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "relative p-3 rounded-xl text-left transition-all duration-300",
                    "bg-glass backdrop-blur-xl border overflow-hidden",
                    "flex items-center gap-2",
                    isSelected
                      ? "border-aria-violet/50 shadow-aria-glow ring-1 ring-aria-violet/20 selection-glow"
                      : "border-glass-border shadow-glass hover:shadow-glass-elevated hover:border-aria-violet/20"
                  )}
                >
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={spring}
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gradient-aria flex items-center justify-center shadow-aria-glow"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.span 
                    className="text-2xl"
                    animate={{ scale: isSelected ? 1.1 : 1 }}
                    transition={spring}
                  >
                    {option.emoji}
                  </motion.span>
                  <span className={cn(
                    "text-xs font-semibold leading-tight",
                    isSelected ? "text-aria-violet" : "text-foreground"
                  )}>
                    {option.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3 mb-5"
        >
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-aria-violet/30 to-transparent" />
        </motion.div>

        {/* Section 2: Goals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-aria-violet" />
            <p className="text-sm font-semibold text-foreground">Su cosa vuoi lavorare?</p>
            <span className="text-xs text-muted-foreground ml-auto">
              {selectedGoals.length} sel.
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {goalOptions.map((goal, index) => {
              const isSelected = selectedGoals.includes(goal.id);
              return (
                <motion.button
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.015, ...spring }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "relative p-3 rounded-xl text-left transition-all duration-300",
                    "bg-glass backdrop-blur-xl border overflow-hidden",
                    "flex items-center gap-2",
                    isSelected
                      ? "border-aria-violet/50 shadow-aria-glow ring-1 ring-aria-violet/20 selection-glow"
                      : "border-glass-border shadow-glass hover:shadow-glass-elevated hover:border-aria-violet/20"
                  )}
                >
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={spring}
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gradient-aria flex items-center justify-center shadow-aria-glow"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.span 
                    className="text-2xl"
                    animate={{ scale: isSelected ? 1.1 : 1 }}
                    transition={spring}
                  >
                    {goal.emoji}
                  </motion.span>
                  <span className={cn(
                    "text-xs font-semibold leading-tight",
                    isSelected ? "text-aria-violet" : "text-foreground"
                  )}>
                    {goal.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Summary Footer */}
      <AnimatePresence>
        {(selectedMotivations.length > 0 || selectedGoals.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="pt-3 border-t border-glass-border"
          >
            <p className="text-center text-sm text-aria-violet font-medium">
              {selectedMotivations.length + selectedGoals.length >= 5 
                ? "Perfetto! Ho capito cosa cerchi 🎯" 
                : selectedMotivations.length + selectedGoals.length >= 2
                  ? "Ottimo inizio! ✨"
                  : "Continua a selezionare 👆"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JourneyStep;
