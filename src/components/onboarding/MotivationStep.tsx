import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface MotivationOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

interface MotivationStepProps {
  userName: string;
  selectedMotivations: string[];
  onChange: (motivations: string[]) => void;
  ageRange?: string;
}

// Base motivations for everyone
const baseMotivationOptions: MotivationOption[] = [
  { id: 'vent', label: 'Sfogarmi', emoji: '💨', description: 'Avere uno spazio sicuro dove parlare' },
  { id: 'track_mood', label: 'Monitorare umore', emoji: '📊', description: 'Capire i miei pattern emotivi' },
  { id: 'self_improvement', label: 'Migliorarmi', emoji: '🚀', description: 'Lavorare sulla crescita personale' },
  { id: 'understand_emotions', label: 'Capire emozioni', emoji: '🔍', description: 'Comprendere cosa provo e perché' },
  { id: 'daily_companion', label: 'Compagnia', emoji: '🤗', description: 'Avere qualcuno con cui parlare' },
  { id: 'build_habits', label: 'Creare abitudini', emoji: '🔄', description: 'Costruire routine positive' },
  { id: 'reduce_stress', label: 'Ridurre stress', emoji: '🧘', description: 'Trovare più calma e serenità' },
  { id: 'journal', label: 'Tenere un diario', emoji: '📝', description: 'Scrivere i miei pensieri' },
  { id: 'therapy_support', label: 'Supporto terapia', emoji: '🩺', description: 'Affiancare un percorso clinico' },
  { id: 'curiosity', label: 'Curiosità', emoji: '✨', description: 'Voglio esplorare questa app' },
];

// Youth-specific motivations (<25 years)
const youthMotivationOptions: MotivationOption[] = [
  { id: 'school_stress', label: 'Stress scolastico', emoji: '📚', description: 'Gestire verifiche e interrogazioni' },
  { id: 'bullying', label: 'Bullismo', emoji: '🛡️', description: 'Affrontare situazioni difficili' },
  { id: 'parents', label: 'Rapporto genitori', emoji: '👨‍👩‍👧', description: 'Migliorare comunicazione in famiglia' },
  { id: 'identity', label: 'Capire chi sono', emoji: '🔍', description: 'Esplorare la propria identità' },
  { id: 'social_pressure', label: 'Pressione sociale', emoji: '📱', description: 'Gestire aspettative e confronti' },
  { id: 'exam_anxiety', label: 'Ansia da esame', emoji: '😰', description: 'Affrontare verifiche senza panico' },
];

// Adult-specific motivations (25+ years)
const adultMotivationOptions: MotivationOption[] = [
  { id: 'work_stress', label: 'Stress lavorativo', emoji: '💼', description: 'Gestire pressioni sul lavoro' },
  { id: 'career_growth', label: 'Crescita carriera', emoji: '📈', description: 'Avanzare professionalmente' },
  { id: 'parenting', label: 'Essere genitore', emoji: '👶', description: 'Affrontare la genitorialità' },
  { id: 'relationship_issues', label: 'Problemi di coppia', emoji: '💔', description: 'Migliorare la relazione' },
  { id: 'burnout', label: 'Burnout', emoji: '🔥', description: 'Recuperare energie esaurite' },
  { id: 'life_transition', label: 'Cambiamenti vita', emoji: '🔄', description: 'Affrontare nuove fasi' },
];

const isYouthAge = (ageRange?: string) => {
  return ageRange === '<18' || ageRange === '18-24';
};

const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25
};

const MotivationStep: React.FC<MotivationStepProps> = ({ userName, selectedMotivations, onChange, ageRange }) => {
  // Build options based on age
  const motivationOptions = [
    ...baseMotivationOptions,
    ...(isYouthAge(ageRange) ? youthMotivationOptions : adultMotivationOptions),
  ];

  const handleSelect = (id: string) => {
    if (selectedMotivations.includes(id)) {
      onChange(selectedMotivations.filter(m => m !== id));
    } else {
      onChange([...selectedMotivations, id]);
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
          Puoi selezionarne più di una
        </p>
        <h1 className="text-2xl font-bold text-foreground">
          Cosa ti porta qui, {userName}?
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
            {selectedMotivations.length} {selectedMotivations.length === 1 ? 'selezionata' : 'selezionate'}
          </span>
          <AnimatePresence mode="wait">
            {selectedMotivations.length > 0 && (
              <motion.span
                key={selectedMotivations.length}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="text-lg"
              >
                {selectedMotivations.length >= 2 ? '💫' : '✨'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Options Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto pb-4 -mx-1 px-1">
        <div className="grid grid-cols-2 gap-2.5">
          {motivationOptions.map((option, index) => {
            const isSelected = selectedMotivations.includes(option.id);

            return (
              <motion.button
                key={option.id}
                onClick={() => handleSelect(option.id)}
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
                  {option.emoji}
                </motion.span>

                {/* Label */}
                <span className={cn(
                  "text-xs font-semibold text-center leading-tight",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {option.label}
                </span>

                {/* Description - only on selected */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.span
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-[10px] text-muted-foreground text-center mt-1 leading-tight"
                    >
                      {option.description}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Encouragement */}
      <AnimatePresence>
        {selectedMotivations.length > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center text-sm text-primary py-2 font-medium"
          >
            {selectedMotivations.length === 1 && "Capito! 🌟"}
            {selectedMotivations.length >= 2 && "Perfetto, sono qui per tutto questo 💫"}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MotivationStep;
