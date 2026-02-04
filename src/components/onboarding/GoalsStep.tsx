import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface GoalOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

interface GoalsStepProps {
  userName: string;
  selectedGoals: string[];
  onChange: (goals: string[]) => void;
  ageRange?: string;
  gender?: string;
}

// Base goals for everyone
const baseGoalOptions: GoalOption[] = [
  { id: 'anxiety', label: 'Gestire ansia', emoji: '🧘', description: 'Ritrovare la calma' },
  { id: 'stress', label: 'Ridurre stress', emoji: '😮‍💨', description: 'Più leggerezza' },
  { id: 'mood', label: 'Migliorare umore', emoji: '😊', description: 'Più serenità' },
  { id: 'self_esteem', label: 'Autostima', emoji: '✨', description: 'Amarti di più' },
  { id: 'sleep', label: 'Dormire meglio', emoji: '😴', description: 'Notti rigeneranti' },
  { id: 'energy', label: 'Più energia', emoji: '⚡', description: 'Vitalità quotidiana' },
  { id: 'fitness', label: 'Forma fisica', emoji: '💪', description: 'Corpo più sano' },
  { id: 'nutrition', label: 'Alimentazione', emoji: '🥗', description: 'Mangiare meglio' },
  { id: 'relationships', label: 'Relazioni', emoji: '💕', description: 'Legami più profondi' },
  { id: 'social', label: 'Vita sociale', emoji: '👥', description: 'Più connessioni' },
  { id: 'communication', label: 'Comunicazione', emoji: '💬', description: 'Esprimerti meglio' },
  { id: 'boundaries', label: 'Confini sani', emoji: '🛡️', description: 'Dire di no' },
  { id: 'growth', label: 'Crescita personale', emoji: '🌱', description: 'Evoluzione continua' },
  { id: 'focus', label: 'Concentrazione', emoji: '🧠', description: 'Mente lucida' },
  { id: 'mindfulness', label: 'Mindfulness', emoji: '🕊️', description: 'Vivere il presente' },
  { id: 'habits', label: 'Nuove abitudini', emoji: '🔄', description: 'Routine positive' },
  { id: 'motivation', label: 'Motivazione', emoji: '🔥', description: 'Ritrovare la spinta' },
];

// Youth-specific goals (<18, 18-24)
const youthGoalOptions: GoalOption[] = [
  { id: 'school_performance', label: 'Rendimento scolastico', emoji: '📊', description: 'Migliorare a scuola' },
  { id: 'study_habits', label: 'Abitudini studio', emoji: '📖', description: 'Studiare meglio' },
  { id: 'peer_pressure', label: 'Pressione sociale', emoji: '👥', description: 'Gestire confronti' },
  { id: 'future_anxiety', label: 'Ansia per il futuro', emoji: '🔮', description: 'Cosa farò da grande?' },
];

// Adult-specific goals (25-44)
const adultGoalOptions: GoalOption[] = [
  { id: 'work_life', label: 'Work-life balance', emoji: '⚖️', description: 'Equilibrio vita-lavoro' },
  { id: 'productivity', label: 'Produttività', emoji: '🎯', description: 'Fare di più' },
  { id: 'career', label: 'Carriera', emoji: '💼', description: 'Crescere professionalmente' },
  { id: 'financial', label: 'Finanze', emoji: '💰', description: 'Gestire meglio i soldi' },
];

// Mature adult goals (45+)
const matureGoalOptions: GoalOption[] = [
  { id: 'aging_well', label: 'Invecchiare bene', emoji: '🌅', description: 'Accettare il tempo' },
  { id: 'health_focus', label: 'Priorità salute', emoji: '❤️', description: 'Prendersi cura di sé' },
  { id: 'new_chapter', label: 'Nuovo capitolo', emoji: '📖', description: 'Reinventarsi' },
  { id: 'legacy', label: 'Lasciare un segno', emoji: '🌟', description: 'Il proprio contributo' },
];

// Female-specific goals
const femaleGoalOptions: GoalOption[] = [
  { id: 'body_positivity', label: 'Accettare il corpo', emoji: '💃', description: 'Body positivity' },
  { id: 'me_time', label: 'Tempo per me', emoji: '🛁', description: 'Self-care' },
  { id: 'mental_load_balance', label: 'Bilanciare il carico', emoji: '⚖️', description: 'Non fare tutto da sola' },
];

// Male-specific goals
const maleGoalOptions: GoalOption[] = [
  { id: 'emotional_intelligence', label: 'Intelligenza emotiva', emoji: '🫀', description: 'Capire le emozioni' },
  { id: 'open_up', label: 'Aprirsi di più', emoji: '🗣️', description: 'Condividere con altri' },
  { id: 'present_father', label: 'Paternità presente', emoji: '👨‍👧', description: 'Essere più presente' },
];

// Young female specific
const youngFemaleGoals: GoalOption[] = [
  { id: 'social_comparison', label: 'Stop confronti social', emoji: '📵', description: 'Vivere senza paragoni' },
];

// Young male specific  
const youngMaleGoals: GoalOption[] = [
  { id: 'healthy_masculinity', label: 'Mascolinità sana', emoji: '🌟', description: 'Essere sé stessi' },
];

const getAgeGroup = (ageRange?: string): 'youth' | 'adult' | 'mature' => {
  if (ageRange === '<18' || ageRange === '18-24') return 'youth';
  if (ageRange === '45-54' || ageRange === '55+') return 'mature';
  return 'adult';
};

const getGoalOptions = (ageRange?: string, gender?: string): GoalOption[] => {
  const ageGroup = getAgeGroup(ageRange);
  const options: GoalOption[] = [...baseGoalOptions];

  // Age-specific
  if (ageGroup === 'youth') {
    options.push(...youthGoalOptions);
  } else if (ageGroup === 'mature') {
    options.push(...adultGoalOptions);
    options.push(...matureGoalOptions);
  } else {
    options.push(...adultGoalOptions);
  }

  // Gender-specific
  if (gender === 'female') {
    options.push(...femaleGoalOptions);
    if (ageGroup === 'youth') {
      options.push(...youngFemaleGoals);
    }
  } else if (gender === 'male') {
    options.push(...maleGoalOptions);
    if (ageGroup === 'youth') {
      options.push(...youngMaleGoals);
    }
  }

  return options;
};

const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25
};

const GoalsStep: React.FC<GoalsStepProps> = ({ 
  userName, 
  selectedGoals, 
  onChange, 
  ageRange,
  gender 
}) => {
  const goalOptions = getGoalOptions(ageRange, gender);

  const handleSelect = (goalId: string) => {
    if (selectedGoals.includes(goalId)) {
      onChange(selectedGoals.filter(g => g !== goalId));
    } else {
      onChange([...selectedGoals, goalId]);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-5 py-6">
      {/* Header */}
      <motion.div 
        className="mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-muted-foreground text-sm mb-1">
          Seleziona tutte le aree che ti interessano
        </p>
        <h1 className="text-2xl font-bold text-foreground">
          Su cosa vuoi concentrarti, {userName}?
        </h1>
      </motion.div>

      {/* Counter Badge with Pulse */}
      <motion.div 
        className="flex items-center justify-center mb-4"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div 
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-glass backdrop-blur-xl border border-glass-border shadow-glass"
          key={selectedGoals.length}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-sm font-medium text-foreground">
            {selectedGoals.length} {selectedGoals.length === 1 ? 'selezionato' : 'selezionati'}
          </span>
          <AnimatePresence mode="wait">
            {selectedGoals.length > 0 && (
              <motion.span
                key={selectedGoals.length}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="text-lg"
              >
                {selectedGoals.length >= 3 ? '🎯' : '✨'}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Goals Grid - Glass Interactive Cards */}
      <div className="flex-1 overflow-y-auto pb-4 -mx-1 px-1">
        <div className="grid grid-cols-2 gap-3">
          {goalOptions.map((goal, index) => {
            const isSelected = selectedGoals.includes(goal.id);

            return (
              <motion.button
                key={goal.id}
                onClick={() => handleSelect(goal.id)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3), ...spring }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative p-3.5 rounded-2xl text-left transition-all duration-300",
                  "bg-glass backdrop-blur-xl border overflow-hidden",
                  "flex flex-col items-center justify-center min-h-[110px]",
                  isSelected
                    ? "border-aria-violet/50 shadow-aria-glow ring-1 ring-aria-violet/20 selection-glow"
                    : "border-glass-border shadow-glass hover:shadow-glass-elevated hover:border-aria-violet/20"
                )}
              >
                {/* Selection indicator with animation */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      transition={spring}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gradient-aria flex items-center justify-center shadow-aria-glow"
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Emoji */}
                <motion.span 
                  className="text-4xl mb-2"
                  animate={{ scale: isSelected ? 1.15 : 1 }}
                  transition={spring}
                >
                  {goal.emoji}
                </motion.span>

                {/* Label */}
                <span className={cn(
                  "text-xs font-semibold text-center leading-tight",
                  isSelected ? "text-aria-violet" : "text-foreground"
                )}>
                  {goal.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Encouragement */}
      <AnimatePresence>
        {selectedGoals.length > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center text-sm text-aria-violet py-2 font-medium"
          >
            {selectedGoals.length === 1 && "Ottima scelta! 🌟"}
            {selectedGoals.length === 2 && "Bene così! ✨"}
            {selectedGoals.length >= 3 && "Perfetto! Lavoreremo su tutto 🎯"}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoalsStep;
