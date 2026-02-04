import React from 'react';
import { useTimeWeightedMetrics, ExtendedEmotions, ExtendedLifeAreas, ExtendedPsychology } from '@/hooks/useTimeWeightedMetrics';
import { Hash, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// ===========================================
// METRIC CONFIGURATION
// Maps all metrics to Italian labels and categories
// ===========================================

type MetricCategory = 'emotion_positive' | 'emotion_negative' | 'life_area' | 'resource' | 'attention';

interface MetricConfig {
  label: string;
  category: MetricCategory;
}

// All 20 emotions
const EMOTION_CONFIG: Record<keyof ExtendedEmotions, MetricConfig> = {
  // Positive emotions
  joy: { label: 'Gioia', category: 'emotion_positive' },
  hope: { label: 'Speranza', category: 'emotion_positive' },
  excitement: { label: 'Eccitazione', category: 'emotion_positive' },
  serenity: { label: 'Serenità', category: 'emotion_positive' },
  pride: { label: 'Orgoglio', category: 'emotion_positive' },
  affection: { label: 'Affetto', category: 'emotion_positive' },
  curiosity: { label: 'Curiosità', category: 'emotion_positive' },
  nostalgia: { label: 'Nostalgia', category: 'emotion_positive' }, // Neutral/positive
  surprise: { label: 'Sorpresa', category: 'emotion_positive' },
  // Negative emotions
  sadness: { label: 'Tristezza', category: 'emotion_negative' },
  anger: { label: 'Rabbia', category: 'emotion_negative' },
  fear: { label: 'Paura', category: 'emotion_negative' },
  apathy: { label: 'Apatia', category: 'emotion_negative' },
  shame: { label: 'Vergogna', category: 'emotion_negative' },
  jealousy: { label: 'Gelosia', category: 'emotion_negative' },
  frustration: { label: 'Frustrazione', category: 'emotion_negative' },
  nervousness: { label: 'Nervosismo', category: 'emotion_negative' },
  overwhelm: { label: 'Sopraffazione', category: 'emotion_negative' },
  disappointment: { label: 'Delusione', category: 'emotion_negative' },
  disgust: { label: 'Disgusto', category: 'emotion_negative' },
};

// All 9 life areas
const LIFE_AREA_CONFIG: Record<keyof ExtendedLifeAreas, MetricConfig> = {
  love: { label: 'Amore', category: 'life_area' },
  work: { label: 'Lavoro', category: 'life_area' },
  school: { label: 'Studio', category: 'life_area' },
  health: { label: 'Salute', category: 'life_area' },
  social: { label: 'Socialità', category: 'life_area' },
  growth: { label: 'Crescita', category: 'life_area' },
  family: { label: 'Famiglia', category: 'life_area' },
  leisure: { label: 'Svago', category: 'life_area' },
  finances: { label: 'Finanze', category: 'life_area' },
};

// Psychology resources (positive)
const RESOURCE_KEYS: (keyof ExtendedPsychology)[] = [
  'motivation', 'self_efficacy', 'mental_clarity', 'concentration',
  'coping_ability', 'gratitude', 'self_worth', 'sense_of_purpose',
  'life_satisfaction', 'perceived_social_support', 'emotional_regulation',
  'resilience', 'mindfulness', 'sunlight_exposure'
];

// Psychology attention signals (negative)
const ATTENTION_KEYS: (keyof ExtendedPsychology)[] = [
  'rumination', 'burnout_level', 'loneliness_perceived', 'somatic_tension',
  'appetite_changes', 'guilt', 'irritability', 'intrusive_thoughts',
  'hopelessness', 'dissociation', 'confusion', 'racing_thoughts',
  'avoidance', 'social_withdrawal', 'compulsive_urges', 'procrastination'
];

const PSYCHOLOGY_LABELS: Record<string, string> = {
  motivation: 'Motivazione',
  self_efficacy: 'Autoefficacia',
  mental_clarity: 'Chiarezza',
  concentration: 'Concentrazione',
  coping_ability: 'Resilienza',
  gratitude: 'Gratitudine',
  self_worth: 'Autostima',
  sense_of_purpose: 'Scopo',
  life_satisfaction: 'Soddisfazione',
  perceived_social_support: 'Supporto',
  emotional_regulation: 'Regolazione',
  resilience: 'Resilienza',
  mindfulness: 'Mindfulness',
  sunlight_exposure: 'Luce solare',
  // Attention signals
  rumination: 'Rimuginazione',
  burnout_level: 'Burnout',
  loneliness_perceived: 'Solitudine',
  somatic_tension: 'Tensione',
  appetite_changes: 'Appetito',
  guilt: 'Senso di colpa',
  irritability: 'Irritabilità',
  intrusive_thoughts: 'Pensieri intrusivi',
  hopelessness: 'Disperazione',
  dissociation: 'Dissociazione',
  confusion: 'Confusione',
  racing_thoughts: 'Pensieri accelerati',
  avoidance: 'Evitamento',
  social_withdrawal: 'Ritiro sociale',
  compulsive_urges: 'Compulsioni',
  procrastination: 'Procrastinazione',
};

// Category styling
const CATEGORY_STYLES: Record<MetricCategory, string> = {
  emotion_positive: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50',
  emotion_negative: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700/50',
  life_area: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50',
  resource: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700/50',
  attention: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50',
};

const CATEGORY_LABELS: Record<MetricCategory, string> = {
  emotion_positive: 'emozione',
  emotion_negative: 'emozione',
  life_area: 'area vita',
  resource: 'risorsa',
  attention: 'attenzione',
};

interface FocusItem {
  key: string;
  label: string;
  value: number;
  category: MetricCategory;
}

const FocusTopics: React.FC = () => {
  // Use 30-day lookback with 10-day half-life
  const { emotions, lifeAreas, deepPsychology, hasData } = useTimeWeightedMetrics(30, 10);

  // Collect ALL metrics with value >= 5 and sort by intensity
  const focusItems = React.useMemo<FocusItem[]>(() => {
    if (!hasData) return [];
    
    const items: FocusItem[] = [];

    // Add emotions (all 20) - include any with data
    (Object.keys(EMOTION_CONFIG) as (keyof ExtendedEmotions)[]).forEach(key => {
      const value = emotions[key];
      if (value !== null && value > 0) {
        items.push({
          key,
          label: EMOTION_CONFIG[key].label,
          value,
          category: EMOTION_CONFIG[key].category,
        });
      }
    });

    // Add life areas (all 9) - include any with data
    (Object.keys(LIFE_AREA_CONFIG) as (keyof ExtendedLifeAreas)[]).forEach(key => {
      const value = lifeAreas[key];
      if (value !== null && value > 0) {
        items.push({
          key,
          label: LIFE_AREA_CONFIG[key].label,
          value,
          category: 'life_area',
        });
      }
    });

    // Add psychology resources (positive) - include any with data
    RESOURCE_KEYS.forEach(key => {
      const value = deepPsychology[key];
      if (value !== null && value > 0) {
        items.push({
          key,
          label: PSYCHOLOGY_LABELS[key] || key,
          value,
          category: 'resource',
        });
      }
    });

    // Add attention signals (negative) - include any with data (these are concerning when present)
    ATTENTION_KEYS.forEach(key => {
      const value = deepPsychology[key];
      if (value !== null && value > 0) {
        items.push({
          key,
          label: PSYCHOLOGY_LABELS[key] || key,
          value,
          category: 'attention',
        });
      }
    });

    // Sort by value descending and take top 4 most important
    return items
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [emotions, lifeAreas, deepPsychology, hasData]);

  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-5 shadow-soft border border-border/50 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-accent">
          <Hash className="w-4 h-4 text-accent-foreground" />
        </div>
        <h3 className="font-display font-semibold text-foreground">
          I tuoi Focus
        </h3>
      </div>

      {focusItems.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {focusItems.map((item, index) => (
            <div
              key={item.key}
              className={cn(
                "px-3 py-2 rounded-full text-sm font-medium border transition-all duration-300",
                "hover:scale-105 cursor-default",
                CATEGORY_STYLES[item.category]
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <span className="capitalize">{item.label}</span>
              <span className="ml-1.5 text-xs opacity-70">
                {Math.round(item.value)}/10
              </span>
              <span className="ml-1 text-[10px] opacity-50">
                ({CATEGORY_LABELS[item.category]})
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-20 text-center">
          <Sparkles className="w-6 h-6 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            Inizia a parlare per<br />scoprire i tuoi temi
          </p>
        </div>
      )}
    </div>
  );
};

export default FocusTopics;
