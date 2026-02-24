import React, { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GraduationCap, Briefcase, Sparkles, Heart, Minus, Plus } from 'lucide-react';

interface ProfileStepProps {
  userName: string;
  gender?: string;
  onGenderChange: (gender: string) => void;
  age?: number;
  onAgeChange: (age: number) => void;
  therapyStatus?: string;
  onTherapyChange: (status: string) => void;
  occupation?: string;
  onOccupationChange: (occupation: string) => void;
  showOccupation: boolean;
}

const genderOptions = [
  { id: 'male', label: 'Uomo', emoji: '👨' },
  { id: 'female', label: 'Donna', emoji: '👩' },
  { id: 'other', label: 'Altro', emoji: '🧑' },
  { id: 'prefer_not_say', label: 'Non dire', emoji: '🤐' },
];

const therapyOptions = [
  { id: 'none', label: 'No', emoji: '🙅' },
  { id: 'current', label: 'Sì, in corso', emoji: '🩺' },
  { id: 'past', label: 'In passato', emoji: '📋' },
  { id: 'considering', label: 'Ci sto pensando', emoji: '🤔' },
];

const occupationOptions = [
  { id: 'student', label: 'Studio', emoji: '📚', icon: GraduationCap },
  { id: 'worker', label: 'Lavoro', emoji: '💼', icon: Briefcase },
  { id: 'both', label: 'Entrambi', emoji: '⚡', icon: Sparkles },
];

const ProfileStep: React.FC<ProfileStepProps> = ({
  userName,
  gender,
  onGenderChange,
  age,
  onAgeChange,
  therapyStatus,
  onTherapyChange,
  occupation,
  onOccupationChange,
  showOccupation,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Generate age values 13-99
  const ages = Array.from({ length: 87 }, (_, i) => i + 13);

  const handleAgeScroll = useCallback((targetAge: number) => {
    onAgeChange(targetAge);
    // Scroll to center the selected age
    if (scrollRef.current) {
      const container = scrollRef.current;
      const items = container.children;
      const idx = targetAge - 13;
      if (items[idx]) {
        const item = items[idx] as HTMLElement;
        const scrollLeft = item.offsetLeft - container.clientWidth / 2 + item.clientWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [onAgeChange]);

  return (
    <div className="flex-1 flex flex-col px-5 py-6 overflow-y-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Raccontami di te, {userName}
        </h1>
        <p className="text-muted-foreground text-sm">
          Mi aiuterà a personalizzare la tua esperienza
        </p>
      </motion.div>

      {/* Gender Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <p className="text-sm font-medium text-foreground mb-3">Come ti identifichi?</p>
        <div className="grid grid-cols-4 gap-2">
          {genderOptions.map((option) => (
            <motion.button
              key={option.id}
              onClick={() => onGenderChange(option.id)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300",
                "bg-glass backdrop-blur-xl border min-h-[70px]",
                gender === option.id
                  ? "border-aria-violet/50 shadow-aria-glow selection-glow"
                  : "border-glass-border shadow-glass hover:shadow-glass-elevated hover:border-aria-violet/20"
              )}
            >
              <span className="text-2xl mb-1">{option.emoji}</span>
              <span className={cn(
                "text-[10px] font-medium",
                gender === option.id ? "text-aria-violet" : "text-muted-foreground"
              )}>
                {option.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Age Section - Numeric */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <p className="text-sm font-medium text-foreground mb-3">Quanti anni hai?</p>
        
        {/* Age display with +/- buttons */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => age && age > 13 && onAgeChange(age - 1)}
            disabled={!age || age <= 13}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              "bg-glass backdrop-blur-xl border border-glass-border",
              "disabled:opacity-30"
            )}
          >
            <Minus className="w-4 h-4 text-muted-foreground" />
          </motion.button>
          
          <div className={cn(
            "w-20 h-16 rounded-2xl flex items-center justify-center",
            "bg-glass backdrop-blur-xl border",
            age ? "border-aria-violet/50 shadow-aria-glow" : "border-glass-border"
          )}>
            <span className={cn(
              "text-3xl font-bold",
              age ? "text-aria-violet" : "text-muted-foreground/40"
            )}>
              {age || '—'}
            </span>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => age ? (age < 99 && onAgeChange(age + 1)) : onAgeChange(25)}
            disabled={age !== undefined && age >= 99}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              "bg-glass backdrop-blur-xl border border-glass-border",
              "disabled:opacity-30"
            )}
          >
            <Plus className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        </div>

        {/* Horizontal scroll age picker */}
        <div 
          ref={scrollRef}
          className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide snap-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {ages.map((a) => (
            <motion.button
              key={a}
              onClick={() => handleAgeScroll(a)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex-shrink-0 w-11 h-9 rounded-full text-sm font-medium transition-all duration-200 snap-center",
                age === a
                  ? "bg-aria-violet text-white shadow-aria-glow"
                  : "bg-glass/50 text-muted-foreground hover:text-foreground border border-glass-border/50"
              )}
            >
              {a}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Occupation Section - Only for 18-34 */}
      <AnimatePresence>
        {showOccupation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <p className="text-sm font-medium text-foreground mb-3">Cosa fai nella vita?</p>
            <div className="grid grid-cols-3 gap-2">
              {occupationOptions.map((option) => (
                <motion.button
                  key={option.id}
                  onClick={() => onOccupationChange(option.id)}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300",
                    "bg-glass backdrop-blur-xl border min-h-[80px]",
                    occupation === option.id
                      ? "border-aria-violet/50 shadow-aria-glow selection-glow"
                      : "border-glass-border shadow-glass hover:shadow-glass-elevated hover:border-aria-violet/20"
                  )}
                >
                  <span className="text-2xl mb-1">{option.emoji}</span>
                  <span className={cn(
                    "text-xs font-medium",
                    occupation === option.id ? "text-aria-violet" : "text-muted-foreground"
                  )}>
                    {option.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="flex-1 divider-gradient" />
        <Heart className="w-4 h-4 text-aria-violet/50" />
        <div className="flex-1 divider-gradient" />
      </motion.div>

      {/* Therapy Status Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <p className="text-sm font-medium text-foreground mb-2">
          Stai seguendo un percorso di terapia?
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Questo mi aiuta a capire come supportarti al meglio
        </p>
        <div className="grid grid-cols-2 gap-2">
          {therapyOptions.map((option) => (
            <motion.button
              key={option.id}
              onClick={() => onTherapyChange(option.id)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl transition-all duration-300",
                "bg-glass backdrop-blur-xl border",
                therapyStatus === option.id
                  ? "border-aria-violet/50 shadow-aria-glow selection-glow"
                  : "border-glass-border shadow-glass hover:shadow-glass-elevated hover:border-aria-violet/20"
              )}
            >
              <span className="text-xl">{option.emoji}</span>
              <span className={cn(
                "text-sm font-medium",
                therapyStatus === option.id ? "text-aria-violet" : "text-foreground"
              )}>
                {option.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Privacy Note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-[11px] text-muted-foreground mt-auto pt-4"
      >
        🔒 I tuoi dati sono sempre al sicuro e privati
      </motion.p>
    </div>
  );
};

export default ProfileStep;
