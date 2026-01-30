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
}

const goalOptions: GoalOption[] = [
  // Mental wellness
  { id: 'anxiety', label: 'Gestire ansia', emoji: '🧘', description: 'Ritrovare la calma' },
  { id: 'stress', label: 'Ridurre stress', emoji: '😮‍💨', description: 'Più leggerezza' },
  { id: 'mood', label: 'Migliorare umore', emoji: '😊', description: 'Più serenità' },
  { id: 'self_esteem', label: 'Autostima', emoji: '✨', description: 'Amarti di più' },
  
  // Physical wellness
  { id: 'sleep', label: 'Dormire meglio', emoji: '😴', description: 'Notti rigeneranti' },
  { id: 'energy', label: 'Più energia', emoji: '⚡', description: 'Vitalità quotidiana' },
  { id: 'fitness', label: 'Forma fisica', emoji: '💪', description: 'Corpo più sano' },
  { id: 'nutrition', label: 'Alimentazione', emoji: '🥗', description: 'Mangiare meglio' },
  
  // Relationships & social
  { id: 'relationships', label: 'Relazioni', emoji: '💕', description: 'Legami più profondi' },
  { id: 'social', label: 'Vita sociale', emoji: '👥', description: 'Più connessioni' },
  { id: 'communication', label: 'Comunicazione', emoji: '💬', description: 'Esprimerti meglio' },
  { id: 'boundaries', label: 'Confini sani', emoji: '🛡️', description: 'Dire di no' },
  
  // Personal growth
  { id: 'growth', label: 'Crescita personale', emoji: '🌱', description: 'Evoluzione continua' },
  { id: 'productivity', label: 'Produttività', emoji: '🎯', description: 'Fare di più' },
  { id: 'focus', label: 'Concentrazione', emoji: '🧠', description: 'Mente lucida' },
  { id: 'creativity', label: 'Creatività', emoji: '🎨', description: 'Esprimere idee' },
  
  // Life balance
  { id: 'work_life', label: 'Work-life balance', emoji: '⚖️', description: 'Equilibrio vita-lavoro' },
  { id: 'mindfulness', label: 'Mindfulness', emoji: '🕊️', description: 'Vivere il presente' },
  { id: 'habits', label: 'Nuove abitudini', emoji: '🔄', description: 'Routine positive' },
  { id: 'motivation', label: 'Motivazione', emoji: '🔥', description: 'Ritrovare la spinta' },
];

const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25
};

const GoalsStep: React.FC<GoalsStepProps> = ({ userName, selectedGoals, onChange }) => {
  const handleSelect = (goalId: string) => {
    if (selectedGoals.includes(goalId)) {
      onChange(selectedGoals.filter(g => g !== goalId));
    } else {
      // Free selection - no limit
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

      {/* Counter */}
      <motion.div 
        className="flex items-center justify-center mb-4"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-glass backdrop-blur-xl border border-glass-border">
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
        </div>
      </motion.div>

      {/* Goals Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto pb-4 -mx-1 px-1">
        <div className="grid grid-cols-2 gap-2.5">
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
                  "relative p-3 rounded-2xl text-left transition-all duration-300",
                  "bg-glass backdrop-blur-xl border",
                  "flex flex-col items-center justify-center min-h-[100px]",
                  isSelected
                    ? "border-primary/50 shadow-glass-glow ring-1 ring-primary/20"
                    : "border-glass-border shadow-glass hover:shadow-glass-elevated"
                )}
              >
                {/* Selection indicator */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Emoji */}
                <motion.span 
                  className="text-3xl mb-1.5"
                  animate={{ scale: isSelected ? 1.1 : 1 }}
                  transition={spring}
                >
                  {goal.emoji}
                </motion.span>

                {/* Label */}
                <span className={cn(
                  "text-xs font-semibold text-center leading-tight",
                  isSelected ? "text-primary" : "text-foreground"
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
            className="text-center text-sm text-primary py-2 font-medium"
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
