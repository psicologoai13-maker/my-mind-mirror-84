import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AboutYouStepProps {
  currentMood: number;
  onMoodChange: (mood: number) => void;
  ageRange?: string;
  onAgeChange: (age: string) => void;
  gender?: string;
  onGenderChange: (gender: string) => void;
  moodSelected?: boolean;
  onMoodSelected?: (selected: boolean) => void;
}

const moodEmojis = [
  { emoji: '😔', label: 'Molto male' },
  { emoji: '😕', label: 'Male' },
  { emoji: '😐', label: 'Così così' },
  { emoji: '🙂', label: 'Bene' },
  { emoji: '😊', label: 'Molto bene' },
];

const ageRanges = ['<18', '18-24', '25-34', '35-44', '45-54', '55+'];

const genderOptions = [
  { id: 'male', label: 'Uomo' },
  { id: 'female', label: 'Donna' },
  { id: 'other', label: 'Altro' },
  { id: 'prefer_not_say', label: 'Preferisco non dire' },
];

const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25
};

const AboutYouStep: React.FC<AboutYouStepProps> = ({
  currentMood,
  onMoodChange,
  ageRange,
  onAgeChange,
  gender,
  onGenderChange,
  moodSelected = false,
  onMoodSelected,
}) => {
  const handleMoodSelect = (index: number) => {
    onMoodChange(index);
    onMoodSelected?.(true);
  };

  return (
    <div className="flex-1 flex flex-col px-5 py-6 overflow-y-auto">
      {/* Mood Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Come ti senti in questo periodo?
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Seleziona l'emoji che meglio rappresenta il tuo stato d'animo
        </p>

        {/* Current Mood Display */}
        <div className="flex flex-col items-center mb-6">
          <AnimatePresence mode="wait">
            {moodSelected ? (
              <motion.span
                key={currentMood}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={spring}
                className="text-7xl mb-2"
              >
                {moodEmojis[currentMood].emoji}
              </motion.span>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-20 h-20 rounded-full bg-glass border-2 border-dashed border-aria-violet/30 flex items-center justify-center mb-2 backdrop-blur-xl"
              >
                <span className="text-2xl text-muted-foreground">?</span>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.span
            key={`label-${moodSelected ? currentMood : 'none'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-medium text-foreground"
          >
            {moodSelected ? moodEmojis[currentMood].label : 'Seleziona un\'emoji'}
          </motion.span>
        </div>

        {/* Mood Selector with Glass Interactive */}
        <div className="flex items-center justify-center gap-2">
          {moodEmojis.map((mood, index) => (
            <motion.button
              key={index}
              onClick={() => handleMoodSelect(index)}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl relative overflow-hidden",
                "transition-all duration-300 bg-glass backdrop-blur-xl border",
                moodSelected && index === currentMood
                  ? "border-aria-violet/50 shadow-aria-glow scale-110 ring-2 ring-aria-violet/30 selection-glow"
                  : "border-glass-border shadow-glass hover:shadow-glass-elevated hover:border-aria-violet/20"
              )}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity" 
                   style={{ transform: 'translateX(-100%)', animation: 'none' }} />
              {mood.emoji}
            </motion.button>
          ))}
        </div>

        {/* Mood scale labels */}
        <div className="flex justify-between mt-3 px-2">
          <span className="text-xs text-muted-foreground">Peggio</span>
          <span className="text-xs text-muted-foreground">Meglio</span>
        </div>
      </motion.div>

      {/* Gradient Divider */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="flex-1 divider-gradient" />
        <span className="text-xs text-muted-foreground font-medium px-2">Un po' su di te</span>
        <div className="flex-1 divider-gradient" />
      </motion.div>

      {/* Gender Section - NOW FIRST */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-6"
      >
        <p className="text-sm font-medium text-foreground mb-3">Come ti identifichi?</p>
        <div className="flex flex-wrap gap-2">
          {genderOptions.map((option) => (
            <motion.button
              key={option.id}
              onClick={() => onGenderChange(option.id)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                "bg-glass backdrop-blur-xl border",
                gender === option.id
                  ? "border-aria-violet/50 text-aria-violet shadow-aria-glow selection-glow"
                  : "border-glass-border text-muted-foreground hover:text-foreground hover:border-aria-violet/20"
              )}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Age Range Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <p className="text-sm font-medium text-foreground mb-3">Fascia d'età</p>
        <div className="flex flex-wrap gap-2">
          {ageRanges.map((age) => (
            <motion.button
              key={age}
              onClick={() => onAgeChange(age)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                "bg-glass backdrop-blur-xl border",
                ageRange === age
                  ? "border-aria-violet/50 text-aria-violet shadow-aria-glow selection-glow"
                  : "border-glass-border text-muted-foreground hover:text-foreground hover:border-aria-violet/20"
              )}
            >
              {age}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Feedback message */}
      <AnimatePresence>
        {moodSelected && currentMood >= 3 && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm text-aria-violet mt-6 font-medium"
          >
            Che bello sentirti così! 🌟
          </motion.p>
        )}
        {moodSelected && currentMood <= 1 && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm text-muted-foreground mt-6"
          >
            Sono qui per aiutarti 💜
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AboutYouStep;
