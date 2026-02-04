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

// Youth-specific motivations (ONLY for <18 and 18-24 age ranges)
const youthMotivationOptions: MotivationOption[] = [
  { id: 'school_stress', label: 'Stress scolastico', emoji: '📚', description: 'Gestire verifiche e interrogazioni' },
  { id: 'bullying', label: 'Bullismo', emoji: '🛡️', description: 'Affrontare situazioni difficili' },
  { id: 'parents', label: 'Rapporto genitori', emoji: '👨‍👩‍👧', description: 'Migliorare comunicazione in famiglia' },
  { id: 'identity', label: 'Capire chi sono', emoji: '🔍', description: 'Esplorare la propria identità' },
  { id: 'social_pressure', label: 'Pressione sociale', emoji: '📱', description: 'Gestire aspettative e confronti' },
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

const YOUTH_AGE_RANGES = ['<18', '18-24'] as const;

const isYouthAge = (ageRange?: string): boolean => {
  return YOUTH_AGE_RANGES.includes(ageRange as any);
};

const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25
};

const MotivationStep: React.FC<MotivationStepProps> = ({ userName, selectedMotivations, onChange, ageRange }) => {
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

      {/* Counter Badge with Pulse */}
      <motion.div 
        className="flex items-center justify-center mb-4"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div 
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-glass backdrop-blur-xl border border-glass-border shadow-glass"
          key={selectedMotivations.length}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 0.3 }}
        >
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
        </motion.div>
      </motion.div>

      {/* Options Grid - Glass Interactive Cards */}
      <div className="flex-1 overflow-y-auto pb-4 -mx-1 px-1">
        <div className="grid grid-cols-2 gap-3">
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
                  "relative p-3.5 rounded-2xl text-left transition-all duration-300",
                  "bg-glass backdrop-blur-xl border overflow-hidden",
                  "flex flex-col items-center justify-center min-h-[110px]",
                  isSelected
                    ? "border-aria-violet/50 shadow-aria-glow ring-1 ring-aria-violet/20 selection-glow"
                    : "border-glass-border shadow-glass hover:shadow-glass-elevated hover:border-aria-violet/20"
                )}
              >
                {/* Shimmer effect on hover */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700",
                  "translate-x-[-100%] group-hover:translate-x-[100%]"
                )} />
                
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
                  {option.emoji}
                </motion.span>

                {/* Label */}
                <span className={cn(
                  "text-xs font-semibold text-center leading-tight",
                  isSelected ? "text-aria-violet" : "text-foreground"
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
            className="text-center text-sm text-aria-violet py-2 font-medium"
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
