import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AboutYouStepProps {
  currentMood: number;
  onMoodChange: (mood: number) => void;
  ageRange?: string;
  onAgeChange: (age: string | undefined) => void;
  therapyStatus?: string;
  onTherapyChange: (status: string | undefined) => void;
}

const moodEmojis = [
  { emoji: '😔', label: 'Molto male' },
  { emoji: '😕', label: 'Male' },
  { emoji: '😐', label: 'Così così' },
  { emoji: '🙂', label: 'Bene' },
  { emoji: '😊', label: 'Molto bene' },
];

const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55+'];

const therapyOptions = [
  { id: 'no', label: 'No' },
  { id: 'past', label: 'In passato' },
  { id: 'current', label: 'Attualmente' },
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
  therapyStatus,
  onTherapyChange,
}) => {
  return (
    <div className="flex-1 flex flex-col px-5 py-6 overflow-y-auto">
      {/* Mood Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Come ti senti in questo periodo?
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Seleziona l'emoji che meglio rappresenta il tuo stato d'animo
        </p>

        {/* Current Mood Display */}
        <div className="flex flex-col items-center mb-6">
          <motion.span
            key={currentMood}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring}
            className="text-7xl mb-2"
          >
            {moodEmojis[currentMood].emoji}
          </motion.span>
          <motion.span
            key={`label-${currentMood}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-medium text-foreground"
          >
            {moodEmojis[currentMood].label}
          </motion.span>
        </div>

        {/* Mood Selector */}
        <div className="flex items-center justify-center gap-2">
          {moodEmojis.map((mood, index) => (
            <motion.button
              key={index}
              onClick={() => onMoodChange(index)}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl",
                "transition-all duration-300 bg-glass backdrop-blur-xl border",
                index === currentMood
                  ? "border-primary/50 shadow-glass-glow scale-110 ring-2 ring-primary/30"
                  : "border-glass-border shadow-glass hover:shadow-glass-elevated"
              )}
            >
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

      {/* Divider */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium">Un po' su di te (opzionale)</span>
        <div className="flex-1 h-px bg-border" />
      </motion.div>

      {/* Age Range Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <p className="text-sm font-medium text-foreground mb-3">Fascia d'età</p>
        <div className="flex flex-wrap gap-2">
          {ageRanges.map((age) => (
            <motion.button
              key={age}
              onClick={() => onAgeChange(ageRange === age ? undefined : age)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                "bg-glass backdrop-blur-xl border",
                ageRange === age
                  ? "border-primary/50 text-primary shadow-glass-glow"
                  : "border-glass-border text-muted-foreground hover:text-foreground"
              )}
            >
              {age}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Therapy Status Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-sm font-medium text-foreground mb-3">Sei mai stato/a in terapia?</p>
        <div className="flex flex-wrap gap-2">
          {therapyOptions.map((option) => (
            <motion.button
              key={option.id}
              onClick={() => onTherapyChange(therapyStatus === option.id ? undefined : option.id)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                "bg-glass backdrop-blur-xl border",
                therapyStatus === option.id
                  ? "border-primary/50 text-primary shadow-glass-glow"
                  : "border-glass-border text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Feedback message */}
      <AnimatePresence>
        {currentMood >= 3 && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm text-primary mt-6 font-medium"
          >
            Che bello sentirti così! 🌟
          </motion.p>
        )}
        {currentMood <= 1 && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm text-muted-foreground mt-6"
          >
            Sono qui per aiutarti 💙
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AboutYouStep;
