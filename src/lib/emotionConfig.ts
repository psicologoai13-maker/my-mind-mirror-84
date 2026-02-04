// Centralized emotion configuration for the entire app
// All 14 emotions tracked in the database with Italian labels, colors, and icons

export type EmotionKey = 
  | 'joy' | 'sadness' | 'anger' | 'fear' | 'apathy'  // Primary (5)
  | 'shame' | 'jealousy' | 'hope' | 'frustration' | 'nostalgia'  // Secondary (5)
  | 'nervousness' | 'overwhelm' | 'excitement' | 'disappointment';  // Secondary (4)

export interface EmotionConfig {
  key: EmotionKey;
  label: string;
  color: string;
  icon: string;
  category: 'primary' | 'secondary';
  isNegative: boolean; // For semantic interpretation (lower = better)
}

// All 14 emotions with consistent HSL colors
export const EMOTION_CONFIG: Record<EmotionKey, EmotionConfig> = {
  // Primary emotions (5)
  joy: {
    key: 'joy',
    label: 'Gioia',
    color: 'hsl(45, 90%, 55%)',
    icon: '🌟',
    category: 'primary',
    isNegative: false,
  },
  sadness: {
    key: 'sadness',
    label: 'Tristezza',
    color: 'hsl(220, 70%, 55%)',
    icon: '💧',
    category: 'primary',
    isNegative: true,
  },
  anger: {
    key: 'anger',
    label: 'Rabbia',
    color: 'hsl(0, 70%, 55%)',
    icon: '🔥',
    category: 'primary',
    isNegative: true,
  },
  fear: {
    key: 'fear',
    label: 'Paura',
    color: 'hsl(280, 60%, 50%)',
    icon: '👁️',
    category: 'primary',
    isNegative: true,
  },
  apathy: {
    key: 'apathy',
    label: 'Apatia',
    color: 'hsl(220, 10%, 55%)',
    icon: '☁️',
    category: 'primary',
    isNegative: true,
  },
  
  // Secondary emotions (9)
  shame: {
    key: 'shame',
    label: 'Vergogna',
    color: 'hsl(320, 60%, 50%)',
    icon: '😔',
    category: 'secondary',
    isNegative: true,
  },
  jealousy: {
    key: 'jealousy',
    label: 'Gelosia',
    color: 'hsl(150, 60%, 40%)',
    icon: '💚',
    category: 'secondary',
    isNegative: true,
  },
  hope: {
    key: 'hope',
    label: 'Speranza',
    color: 'hsl(200, 80%, 55%)',
    icon: '✨',
    category: 'secondary',
    isNegative: false,
  },
  frustration: {
    key: 'frustration',
    label: 'Frustrazione',
    color: 'hsl(30, 80%, 50%)',
    icon: '😤',
    category: 'secondary',
    isNegative: true,
  },
  nostalgia: {
    key: 'nostalgia',
    label: 'Nostalgia',
    color: 'hsl(260, 50%, 55%)',
    icon: '🌅',
    category: 'secondary',
    isNegative: false, // Neutral - can be positive
  },
  nervousness: {
    key: 'nervousness',
    label: 'Nervosismo',
    color: 'hsl(50, 70%, 50%)',
    icon: '⚡',
    category: 'secondary',
    isNegative: true,
  },
  overwhelm: {
    key: 'overwhelm',
    label: 'Sopraffazione',
    color: 'hsl(290, 50%, 50%)',
    icon: '🌊',
    category: 'secondary',
    isNegative: true,
  },
  excitement: {
    key: 'excitement',
    label: 'Eccitazione',
    color: 'hsl(340, 80%, 55%)',
    icon: '🎉',
    category: 'secondary',
    isNegative: false,
  },
  disappointment: {
    key: 'disappointment',
    label: 'Delusione',
    color: 'hsl(210, 30%, 50%)',
    icon: '😞',
    category: 'secondary',
    isNegative: true,
  },
};

// All emotion keys in order (primary first, then secondary)
export const ALL_EMOTION_KEYS: EmotionKey[] = [
  'joy', 'sadness', 'anger', 'fear', 'apathy',
  'shame', 'jealousy', 'hope', 'frustration', 'nostalgia',
  'nervousness', 'overwhelm', 'excitement', 'disappointment',
];

export const PRIMARY_EMOTION_KEYS: EmotionKey[] = ['joy', 'sadness', 'anger', 'fear', 'apathy'];
export const SECONDARY_EMOTION_KEYS: EmotionKey[] = [
  'shame', 'jealousy', 'hope', 'frustration', 'nostalgia',
  'nervousness', 'overwhelm', 'excitement', 'disappointment',
];

// Helper: Get emotion config by key
export const getEmotionConfig = (key: string): EmotionConfig | undefined => {
  return EMOTION_CONFIG[key as EmotionKey];
};

// Helper: Get emotion label in Italian
export const getEmotionLabel = (key: string): string => {
  return EMOTION_CONFIG[key as EmotionKey]?.label || key;
};

// Helper: Get emotion color
export const getEmotionColor = (key: string): string => {
  return EMOTION_CONFIG[key as EmotionKey]?.color || 'hsl(220, 10%, 50%)';
};

// Helper: Filter emotions with value > 0
export const filterActiveEmotions = <T extends Record<string, number | null>>(
  emotions: T
): { key: EmotionKey; value: number }[] => {
  return ALL_EMOTION_KEYS
    .filter(key => {
      const value = emotions[key];
      return value !== null && value !== undefined && value > 0;
    })
    .map(key => ({
      key,
      value: emotions[key] as number,
    }));
};

// Helper: Get emotions sorted by value (descending)
export const sortEmotionsByValue = (
  emotions: { key: EmotionKey; value: number }[]
): { key: EmotionKey; value: number }[] => {
  return [...emotions].sort((a, b) => b.value - a.value);
};

// Helper: Calculate percentages for pie/bar charts
export const calculateEmotionPercentages = (
  emotions: { key: EmotionKey; value: number }[]
): { key: EmotionKey; value: number; percentage: number }[] => {
  const total = emotions.reduce((sum, e) => sum + e.value, 0);
  if (total === 0) return emotions.map(e => ({ ...e, percentage: 0 }));
  
  return emotions.map(e => ({
    ...e,
    percentage: (e.value / total) * 100,
  }));
};

// Helper: Get qualitative label based on score (0-10) and emotion type
export const getQualitativeLabel = (
  score: number,
  emotionKey: EmotionKey
): { label: string; colorClass: string } => {
  const config = EMOTION_CONFIG[emotionKey];
  const isNegative = config?.isNegative ?? true;
  
  if (isNegative) {
    // For negative emotions: low = good, high = concerning
    if (score <= 2) return { label: 'Ottimo', colorClass: 'text-emerald-600' };
    if (score <= 5) return { label: 'Gestibile', colorClass: 'text-amber-600' };
    return { label: 'Intensa', colorClass: 'text-orange-600' };
  } else {
    // For positive emotions: low = concerning, high = good
    if (score <= 3) return { label: 'Bassa', colorClass: 'text-muted-foreground' };
    if (score <= 7) return { label: 'Buona', colorClass: 'text-amber-500' };
    return { label: 'Ottima', colorClass: 'text-emerald-600' };
  }
};

// Helper: Group emotions by category
export const groupEmotionsByCategory = (
  emotions: { key: EmotionKey; value: number }[]
): { primary: { key: EmotionKey; value: number }[]; secondary: { key: EmotionKey; value: number }[] } => {
  return {
    primary: emotions.filter(e => EMOTION_CONFIG[e.key].category === 'primary'),
    secondary: emotions.filter(e => EMOTION_CONFIG[e.key].category === 'secondary'),
  };
};
