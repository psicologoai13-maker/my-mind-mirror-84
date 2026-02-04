import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface InterestsStepProps {
  userName: string;
  selectedInterests: string[];
  onChange: (interests: string[]) => void;
  ageRange?: string;
}

// Base interests for everyone
const BASE_INTERESTS = [
  { id: 'sport', emoji: '⚽', label: 'Sport' },
  { id: 'music', emoji: '🎵', label: 'Musica' },
  { id: 'reading', emoji: '📚', label: 'Lettura' },
  { id: 'travel', emoji: '✈️', label: 'Viaggi' },
  { id: 'cooking', emoji: '🍳', label: 'Cucina' },
  { id: 'nature', emoji: '🌿', label: 'Natura' },
  { id: 'art', emoji: '🎨', label: 'Arte' },
  { id: 'gaming', emoji: '🎮', label: 'Gaming' },
  { id: 'fitness', emoji: '💪', label: 'Fitness' },
  { id: 'movies', emoji: '🎬', label: 'Film/Serie TV' },
  { id: 'pets', emoji: '🐕', label: 'Animali' },
  { id: 'photography', emoji: '📸', label: 'Fotografia' },
  { id: 'yoga', emoji: '🧘', label: 'Yoga/Meditazione' },
  { id: 'tech', emoji: '💻', label: 'Tecnologia' },
];

// Youth-specific interests
const YOUTH_INTERESTS = [
  { id: 'tiktok', emoji: '📱', label: 'TikTok/Social' },
  { id: 'anime', emoji: '🎌', label: 'Anime/Manga' },
  { id: 'kpop', emoji: '🎤', label: 'K-pop' },
  { id: 'streaming', emoji: '📺', label: 'Twitch/YouTube' },
  { id: 'influencer', emoji: '⭐', label: 'Content Creator' },
  { id: 'esports', emoji: '🏆', label: 'Esport' },
];

// Adult-specific interests
const ADULT_INTERESTS = [
  { id: 'wine', emoji: '🍷', label: 'Vino/Cucina' },
  { id: 'gardening', emoji: '🌻', label: 'Giardinaggio' },
  { id: 'investing', emoji: '📈', label: 'Investimenti' },
  { id: 'diy', emoji: '🔧', label: 'Fai da te' },
  { id: 'podcasts', emoji: '🎧', label: 'Podcast' },
  { id: 'volunteering', emoji: '🤝', label: 'Volontariato' },
];

const YOUTH_AGE_RANGES = ['<18', '18-24'] as const;

const isYouthAge = (ageRange?: string): boolean => {
  return YOUTH_AGE_RANGES.includes(ageRange as any);
};

const InterestsStep: React.FC<InterestsStepProps> = ({
  userName,
  selectedInterests,
  onChange,
  ageRange,
}) => {
  const INTERESTS_OPTIONS = [
    ...BASE_INTERESTS,
    ...(isYouthAge(ageRange) ? YOUTH_INTERESTS : ADULT_INTERESTS),
  ];

  const toggleInterest = (id: string) => {
    if (selectedInterests.includes(id)) {
      onChange(selectedInterests.filter(i => i !== id));
    } else {
      onChange([...selectedInterests, id]);
    }
  };

  return (
    <motion.div 
      className="flex-1 flex flex-col px-5 pt-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <motion.h1 
          className="font-display text-2xl font-bold text-foreground mb-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Cosa ti appassiona, {userName}?
        </motion.h1>
        <motion.p 
          className="text-muted-foreground text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Seleziona i tuoi interessi per conversazioni più personali
        </motion.p>
      </div>

      {/* Interests Grid - 3 columns for better breathing */}
      <div className="grid grid-cols-3 gap-3 pb-4">
        {INTERESTS_OPTIONS.map((interest, index) => {
          const isSelected = selectedInterests.includes(interest.id);
          
          return (
            <motion.button
              key={interest.id}
              onClick={() => toggleInterest(interest.id)}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300",
                "bg-glass backdrop-blur-xl border min-h-[90px]",
                isSelected 
                  ? "border-aria-violet/50 shadow-aria-glow selection-glow" 
                  : "border-glass-border shadow-glass hover:shadow-glass-elevated hover:border-aria-violet/20"
              )}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.02 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.span 
                className="text-3xl mb-1.5"
                animate={{ scale: isSelected ? 1.15 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                {interest.emoji}
              </motion.span>
              <span className={cn(
                "text-xs font-medium text-center leading-tight",
                isSelected ? "text-aria-violet" : "text-muted-foreground"
              )}>
                {interest.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Selection Counter */}
      {selectedInterests.length > 0 && (
        <motion.div 
          className="text-center py-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-sm text-aria-violet font-medium">
            {selectedInterests.length} selezionat{selectedInterests.length === 1 ? 'o' : 'i'} ✨
          </span>
        </motion.div>
      )}

      {/* Skip hint */}
      <motion.p 
        className="text-center text-xs text-muted-foreground mt-auto pb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Puoi saltare questo passaggio e aggiungere interessi dopo
      </motion.p>
    </motion.div>
  );
};

export default InterestsStep;
