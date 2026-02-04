import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GraduationCap, Briefcase, Sparkles } from 'lucide-react';

interface OccupationStepProps {
  userName: string;
  occupation?: string;
  onChange: (occupation: string) => void;
}

const occupationOptions = [
  { 
    id: 'student', 
    label: 'Studio', 
    emoji: '📚',
    description: 'Scuola, università o formazione',
    icon: GraduationCap,
  },
  { 
    id: 'worker', 
    label: 'Lavoro', 
    emoji: '💼',
    description: 'Lavoro full-time o part-time',
    icon: Briefcase,
  },
  { 
    id: 'both', 
    label: 'Entrambi', 
    emoji: '⚡',
    description: 'Studio e lavoro insieme',
    icon: Sparkles,
  },
];

const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25
};

const OccupationStep: React.FC<OccupationStepProps> = ({ 
  userName, 
  occupation, 
  onChange 
}) => {
  return (
    <div className="flex-1 flex flex-col px-5 py-6">
      {/* Header */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Cosa fai nella vita, {userName}?
        </h1>
        <p className="text-muted-foreground text-sm">
          Questo mi aiuterà a personalizzare la tua esperienza
        </p>
      </motion.div>

      {/* Options */}
      <div className="flex flex-col gap-4">
        {occupationOptions.map((option, index) => {
          const isSelected = occupation === option.id;
          const Icon = option.icon;

          return (
            <motion.button
              key={option.id}
              onClick={() => onChange(option.id)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, ...spring }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative p-5 rounded-2xl text-left transition-all duration-300",
                "bg-glass backdrop-blur-xl border overflow-hidden",
                "flex items-center gap-4",
                isSelected
                  ? "border-aria-violet/50 shadow-aria-glow ring-1 ring-aria-violet/20 selection-glow"
                  : "border-glass-border shadow-glass hover:shadow-glass-elevated hover:border-aria-violet/20"
              )}
            >
              {/* Icon/Emoji Container */}
              <motion.div
                className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center text-3xl",
                  "bg-glass border transition-all duration-300",
                  isSelected 
                    ? "border-aria-violet/30 shadow-aria-glow" 
                    : "border-glass-border"
                )}
                animate={{ scale: isSelected ? 1.05 : 1 }}
                transition={spring}
              >
                {option.emoji}
              </motion.div>

              {/* Text Content */}
              <div className="flex-1">
                <span className={cn(
                  "text-lg font-semibold block mb-0.5 transition-colors duration-300",
                  isSelected ? "text-aria-violet" : "text-foreground"
                )}>
                  {option.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {option.description}
                </span>
              </div>

              {/* Selection Indicator */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={spring}
                    className="w-6 h-6 rounded-full bg-gradient-aria flex items-center justify-center shadow-aria-glow"
                  >
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Helper text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-muted-foreground mt-auto pt-6"
      >
        Potrai cambiare questa impostazione in qualsiasi momento
      </motion.p>
    </div>
  );
};

export default OccupationStep;
