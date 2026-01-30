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
  { id: 'anxiety', label: 'Gestire ansia e stress', emoji: '🧘', description: 'Ritrovare la calma interiore' },
  { id: 'sleep', label: 'Dormire meglio', emoji: '😴', description: 'Notti rigeneranti' },
  { id: 'energy', label: 'Più energia', emoji: '⚡', description: 'Vitalità quotidiana' },
  { id: 'relationships', label: 'Relazioni', emoji: '💕', description: 'Connessioni più profonde' },
  { id: 'growth', label: 'Crescita personale', emoji: '🌱', description: 'Diventare la versione migliore di te' },
  { id: 'self_esteem', label: 'Autostima', emoji: '✨', description: 'Amarti di più' },
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
    } else if (selectedGoals.length < 3) {
      onChange([...selectedGoals, goalId]);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-5 py-6">
      {/* Header */}
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Su cosa vuoi concentrarti, {userName}?
        </h1>
        <p className="text-muted-foreground">
          Scegli fino a 3 aree su cui lavorare insieme
        </p>
      </motion.div>

      {/* Counter */}
      <motion.div 
        className="flex items-center justify-center mb-6"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-glass backdrop-blur-xl border border-glass-border">
          <span className="text-sm font-medium text-foreground">
            {selectedGoals.length}/3 selezionati
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
                {selectedGoals.length === 3 ? '🎯' : '✨'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Goals Grid */}
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="grid grid-cols-2 gap-3">
          {goalOptions.map((goal, index) => {
            const isSelected = selectedGoals.includes(goal.id);
            const isDisabled = selectedGoals.length >= 3 && !isSelected;

            return (
              <motion.button
                key={goal.id}
                onClick={() => handleSelect(goal.id)}
                disabled={isDisabled}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, ...spring }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative p-4 rounded-3xl text-left transition-all duration-300",
                  "bg-glass backdrop-blur-xl border",
                  "flex flex-col items-center justify-center min-h-[140px]",
                  isSelected
                    ? "border-primary/50 shadow-glass-glow ring-1 ring-primary/20"
                    : "border-glass-border shadow-glass hover:shadow-glass-elevated",
                  isDisabled && "opacity-40 cursor-not-allowed"
                )}
              >
                {/* Selection indicator */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Emoji */}
                <motion.span 
                  className="text-5xl mb-3"
                  animate={{ scale: isSelected ? 1.1 : 1 }}
                  transition={spring}
                >
                  {goal.emoji}
                </motion.span>

                {/* Label */}
                <span className={cn(
                  "text-sm font-semibold text-center leading-tight",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {goal.label}
                </span>

                {/* Description */}
                <span className="text-xs text-muted-foreground text-center mt-1 leading-tight">
                  {goal.description}
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
            className="text-center text-sm text-primary py-3 font-medium"
          >
            {selectedGoals.length === 1 && "Ottima scelta! Continua così 🌟"}
            {selectedGoals.length === 2 && "Perfetto! Ancora uno se vuoi ✨"}
            {selectedGoals.length === 3 && "Fantastico! Hai selezionato i tuoi obiettivi 🎯"}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoalsStep;
