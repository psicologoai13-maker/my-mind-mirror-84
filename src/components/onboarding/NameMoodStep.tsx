import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NameMoodStepProps {
  name: string;
  onNameChange: (name: string) => void;
  mood: number;
  onMoodChange: (mood: number) => void;
  moodSelected: boolean;
  onMoodSelected: (selected: boolean) => void;
  onNext: () => void;
}

const moodEmojis = [
  { emoji: '😔', label: 'Molto male' },
  { emoji: '😕', label: 'Male' },
  { emoji: '😐', label: 'Così così' },
  { emoji: '🙂', label: 'Bene' },
  { emoji: '😊', label: 'Molto bene' },
];

const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25
};

const NameMoodStep: React.FC<NameMoodStepProps> = ({
  name,
  onNameChange,
  mood,
  onMoodChange,
  moodSelected,
  onMoodSelected,
  onNext,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const isNameValid = name.trim().length >= 2;
  const canProceed = isNameValid && moodSelected;

  const handleMoodSelect = (index: number) => {
    onMoodChange(index);
    onMoodSelected(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canProceed) {
      onNext();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canProceed) {
      e.preventDefault();
      inputRef.current?.blur();
      onNext();
    }
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-6">
      {/* Header with Aurora Orb */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Aurora Orb */}
        <motion.div 
          className="relative w-16 h-16 mb-5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={spring}
        >
          <motion.div className="absolute inset-[-10px] rounded-full border border-aria-violet/20 ring-concentric-2" />
          <motion.div className="absolute inset-[-5px] rounded-full border border-aria-violet/30 ring-concentric-1" />
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-aria-violet/20 to-aria-indigo/10 flex items-center justify-center border border-aria-violet/30 shadow-aria-glow backdrop-blur-xl">
            <Sparkles className="w-8 h-8 text-aria-violet" />
          </div>
        </motion.div>
        
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Ciao! Come ti chiami?
        </h1>
        <p className="text-muted-foreground text-sm">
          E come ti senti oggi? 😊
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        {/* Name Input */}
        <motion.div 
          className={cn(
            "relative rounded-2xl transition-all duration-300 mb-8",
            isFocused ? 'shadow-[0_0_25px_rgba(155,111,208,0.3)]' : 'shadow-glass'
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className={cn(
            "absolute inset-0 rounded-2xl transition-opacity duration-300",
            "bg-gradient-to-r from-aria-violet/50 via-aria-indigo/50 to-aria-purple/50",
            isFocused ? 'opacity-100' : 'opacity-0'
          )} style={{ padding: '2px' }}>
            <div className="w-full h-full rounded-2xl bg-background" />
          </div>
          
          <Input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Il tuo nome"
            enterKeyHint="next"
            className="relative h-14 text-lg text-center rounded-2xl border-2 bg-glass backdrop-blur-xl transition-all duration-300 focus:border-aria-violet focus:ring-0 focus:outline-none border-glass-border"
            autoFocus
          />
        </motion.div>

        {/* Name Feedback */}
        <AnimatePresence>
          {isNameValid && (
            <motion.p 
              className="text-center text-sm text-aria-violet mb-6 font-medium -mt-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              Piacere, {name}! ✨
            </motion.p>
          )}
        </AnimatePresence>

        {/* Mood Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <p className="text-sm font-medium text-foreground mb-4 text-center">
            Come ti senti in questo periodo?
          </p>

          {/* Selected Mood Display */}
          <div className="flex flex-col items-center mb-4">
            <AnimatePresence mode="wait">
              {moodSelected ? (
                <motion.div
                  key={mood}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={spring}
                  className="text-center"
                >
                  <span className="text-5xl block mb-1">{moodEmojis[mood].emoji}</span>
                  <span className="text-sm font-medium text-foreground">{moodEmojis[mood].label}</span>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-16 h-16 rounded-full bg-glass border-2 border-dashed border-aria-violet/30 flex items-center justify-center backdrop-blur-xl"
                >
                  <span className="text-xl text-muted-foreground">?</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mood Selector */}
          <div className="flex items-center justify-center gap-2">
            {moodEmojis.map((m, index) => (
              <motion.button
                key={index}
                type="button"
                onClick={() => handleMoodSelect(index)}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-2xl relative overflow-hidden",
                  "transition-all duration-300 bg-glass backdrop-blur-xl border",
                  moodSelected && index === mood
                    ? "border-aria-violet/50 shadow-aria-glow scale-110 ring-2 ring-aria-violet/30"
                    : "border-glass-border shadow-glass hover:shadow-glass-elevated hover:border-aria-violet/20"
                )}
              >
                {m.emoji}
              </motion.button>
            ))}
          </div>

          {/* Scale labels */}
          <div className="flex justify-between mt-2 px-4">
            <span className="text-xs text-muted-foreground">Peggio</span>
            <span className="text-xs text-muted-foreground">Meglio</span>
          </div>
        </motion.div>

        {/* Mood Feedback */}
        <AnimatePresence>
          {moodSelected && mood >= 3 && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm text-aria-violet font-medium"
            >
              Che bello sentirti così! 🌟
            </motion.p>
          )}
          {moodSelected && mood <= 1 && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm text-muted-foreground"
            >
              Sono qui per aiutarti 💜
            </motion.p>
          )}
        </AnimatePresence>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button 
            type="submit"
            disabled={!canProceed}
            className="w-full h-14 rounded-full text-base font-semibold bg-gradient-aria text-white shadow-aria-glow hover:shadow-elevated transition-all duration-300 disabled:opacity-40 disabled:shadow-none"
          >
            Continua
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </form>
    </div>
  );
};

export default NameMoodStep;
