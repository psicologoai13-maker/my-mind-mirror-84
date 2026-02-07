import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, Compass } from 'lucide-react';

interface MotivationsStepProps {
  userName: string;
  selectedMotivations: string[];
  onMotivationsChange: (motivations: string[]) => void;
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

const MotivationsStep: React.FC<MotivationsStepProps> = ({
  userName,
  selectedMotivations,
  onMotivationsChange,
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

  const toggleMotivation = (id: string) => {
    if (selectedMotivations.includes(id)) {
      onMotivationsChange(selectedMotivations.filter(m => m !== id));
    } else {
      onMotivationsChange([...selectedMotivations, id]);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-5 py-4 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-5 text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Compass className="w-5 h-5 text-aria-violet" />
          <h1 className="text-2xl font-bold text-foreground">
            Perché sei qui, {userName}?
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Seleziona tutto ciò che ti risuona
        </p>
      </motion.div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-2 -mx-1 px-1">
        <div className="grid grid-cols-2 gap-3">
          {motivationOptions.map((option, index) => {
            const isSelected = selectedMotivations.includes(option.id);
            return (
              <motion.button
                key={option.id}
                onClick={() => toggleMotivation(option.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.02, ...spring }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative p-4 rounded-2xl text-left transition-all duration-300",
                  "bg-glass backdrop-blur-xl border overflow-hidden",
                  "flex flex-col gap-2",
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
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gradient-aria flex items-center justify-center shadow-aria-glow"
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.span 
                  className="text-3xl"
                  animate={{ scale: isSelected ? 1.1 : 1 }}
                  transition={spring}
                >
                  {option.emoji}
                </motion.span>
                <span className={cn(
                  "text-sm font-semibold leading-tight",
                  isSelected ? "text-aria-violet" : "text-foreground"
                )}>
                  {option.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Summary Footer */}
      <AnimatePresence>
        {selectedMotivations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="pt-3 border-t border-glass-border"
          >
            <p className="text-center text-sm text-aria-violet font-medium">
              {selectedMotivations.length >= 3 
                ? "Perfetto! 🎯" 
                : selectedMotivations.length >= 1
                  ? "Ottimo inizio! ✨"
                  : "Seleziona almeno una opzione 👆"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MotivationsStep;
