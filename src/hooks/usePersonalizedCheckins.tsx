import { useMemo } from 'react';
import { useTimeWeightedMetrics } from './useTimeWeightedMetrics';
import { useProfile } from './useProfile';
import { useDailyLifeAreas } from './useDailyLifeAreas';
import { useCheckins } from './useCheckins';
import { 
  Smile, Brain, Zap, Moon, Heart, Briefcase, Users, Sprout, Activity,
  Flame, CloudRain, Wind, Eye, Battery, Frown, ThumbsUp, AlertCircle,
  Sparkles, TrendingDown, Coffee, Sun
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CheckinItemType = 'vital' | 'life_area' | 'emotion' | 'psychology';

export interface CheckinItem {
  key: string;
  icon: LucideIcon;
  label: string;
  question: string;
  color: string;
  bgColor: string;
  type: CheckinItemType;
  priority: number; // Higher = more important to show
  reason?: string; // Why this is being shown
}

// All available check-in items
const allCheckinItems: Omit<CheckinItem, 'priority' | 'reason'>[] = [
  // Vitals (base)
  { key: 'mood', icon: Smile, label: 'Umore', question: 'Come ti senti emotivamente?', color: 'text-primary', bgColor: 'bg-primary/10', type: 'vital' },
  { key: 'anxiety', icon: Brain, label: 'Ansia', question: 'Quanto ti senti ansioso/a?', color: 'text-rose-500', bgColor: 'bg-rose-50', type: 'vital' },
  { key: 'energy', icon: Zap, label: 'Energia', question: 'Quanta energia hai?', color: 'text-amber-500', bgColor: 'bg-amber-50', type: 'vital' },
  { key: 'sleep', icon: Moon, label: 'Sonno', question: 'Come hai dormito?', color: 'text-indigo-500', bgColor: 'bg-indigo-50', type: 'vital' },
  
  // Life Areas
  { key: 'love', icon: Heart, label: 'Amore', question: 'Come va la tua vita sentimentale?', color: 'text-rose-500', bgColor: 'bg-rose-50', type: 'life_area' },
  { key: 'work', icon: Briefcase, label: 'Lavoro', question: 'Come va il lavoro/studio?', color: 'text-blue-500', bgColor: 'bg-blue-50', type: 'life_area' },
  { key: 'social', icon: Users, label: 'Socialità', question: 'Come vanno le relazioni sociali?', color: 'text-amber-500', bgColor: 'bg-amber-50', type: 'life_area' },
  { key: 'growth', icon: Sprout, label: 'Crescita', question: 'Ti senti in crescita personale?', color: 'text-purple-500', bgColor: 'bg-purple-50', type: 'life_area' },
  { key: 'health', icon: Activity, label: 'Salute', question: 'Come sta il tuo corpo?', color: 'text-emerald-500', bgColor: 'bg-emerald-50', type: 'life_area' },

  // Emotions
  { key: 'sadness', icon: CloudRain, label: 'Tristezza', question: 'Ti senti triste oggi?', color: 'text-blue-400', bgColor: 'bg-blue-50', type: 'emotion' },
  { key: 'anger', icon: Flame, label: 'Rabbia', question: 'Senti frustrazione o rabbia?', color: 'text-red-500', bgColor: 'bg-red-50', type: 'emotion' },
  { key: 'fear', icon: AlertCircle, label: 'Paura', question: 'Hai paure o preoccupazioni?', color: 'text-orange-500', bgColor: 'bg-orange-50', type: 'emotion' },
  { key: 'joy', icon: Sparkles, label: 'Gioia', question: 'Quanta gioia senti?', color: 'text-yellow-500', bgColor: 'bg-yellow-50', type: 'emotion' },

  // Deep Psychology
  { key: 'rumination', icon: Wind, label: 'Pensieri', question: 'Quanto stai rimuginando?', color: 'text-slate-500', bgColor: 'bg-slate-50', type: 'psychology' },
  { key: 'burnout_level', icon: Battery, label: 'Burnout', question: 'Ti senti esausto/a?', color: 'text-red-400', bgColor: 'bg-red-50', type: 'psychology' },
  { key: 'loneliness_perceived', icon: Frown, label: 'Solitudine', question: 'Ti senti solo/a?', color: 'text-purple-400', bgColor: 'bg-purple-50', type: 'psychology' },
  { key: 'gratitude', icon: ThumbsUp, label: 'Gratitudine', question: 'Per cosa sei grato/a oggi?', color: 'text-emerald-500', bgColor: 'bg-emerald-50', type: 'psychology' },
  { key: 'mental_clarity', icon: Eye, label: 'Chiarezza', question: 'Hai chiarezza mentale?', color: 'text-cyan-500', bgColor: 'bg-cyan-50', type: 'psychology' },
  { key: 'somatic_tension', icon: TrendingDown, label: 'Tensione', question: 'Senti tensione nel corpo?', color: 'text-orange-400', bgColor: 'bg-orange-50', type: 'psychology' },
  { key: 'coping_ability', icon: Coffee, label: 'Resilienza', question: 'Ti senti capace di affrontare le sfide?', color: 'text-teal-500', bgColor: 'bg-teal-50', type: 'psychology' },
  { key: 'sunlight_exposure', icon: Sun, label: 'Luce solare', question: 'Hai preso abbastanza sole?', color: 'text-yellow-500', bgColor: 'bg-yellow-50', type: 'psychology' },
];

/**
 * Hook che calcola quali check-in mostrare oggi basandosi su:
 * 1. Dati storici dell'utente (metriche basse = priorità alta)
 * 2. Obiettivi selezionati dall'utente
 * 3. Sessioni recenti (se ha parlato di ansia, mostra ansia)
 * 4. Check-in già completati oggi
 */
export const usePersonalizedCheckins = () => {
  const { vitals, emotions, lifeAreas, deepPsychology, hasData } = useTimeWeightedMetrics(14, 3);
  const { profile } = useProfile();
  const { todayLifeAreas } = useDailyLifeAreas();
  const { todayCheckin } = useCheckins();

  // Parse completed check-ins from today
  const completedToday = useMemo(() => {
    const completed: Record<string, number> = {};
    
    if (todayCheckin) {
      completed.mood = todayCheckin.mood_value;
      
      if (todayCheckin.notes) {
        try {
          const notes = JSON.parse(todayCheckin.notes);
          Object.entries(notes).forEach(([key, value]) => {
            if (typeof value === 'number') {
              completed[key] = Math.ceil(value / 2);
            }
          });
        } catch (e) {}
      }
    }

    // Life areas completed today (use todayLifeAreas specifically)
    if (todayLifeAreas) {
      ['love', 'work', 'social', 'growth', 'health'].forEach(key => {
        const value = todayLifeAreas[key as keyof typeof todayLifeAreas];
        if (value && typeof value === 'number') {
          completed[key] = Math.ceil(value / 2);
        }
      });
    }

    return completed;
  }, [todayCheckin, todayLifeAreas]);

  // Calculate priority for each check-in item
  const prioritizedItems = useMemo<CheckinItem[]>(() => {
    const items: CheckinItem[] = [];
    const userGoals = profile?.selected_goals || [];

    allCheckinItems.forEach(item => {
      let priority = 0;
      let reason: string | undefined;

      // Skip if already completed today
      if (item.key in completedToday) {
        return;
      }

      // Base priority by type
      if (item.type === 'vital') priority += 50;
      else if (item.type === 'life_area') priority += 30;
      else if (item.type === 'emotion') priority += 20;
      else if (item.type === 'psychology') priority += 10;

      // Boost priority if metric is concerning
      const getMetricValue = () => {
        if (item.type === 'vital') {
          return vitals?.[item.key as keyof typeof vitals];
        } else if (item.type === 'life_area') {
          return lifeAreas?.[item.key as keyof typeof lifeAreas];
        } else if (item.type === 'emotion') {
          return emotions?.[item.key as keyof typeof emotions];
        } else if (item.type === 'psychology') {
          return deepPsychology?.[item.key as keyof typeof deepPsychology];
        }
        return null;
      };

      const value = getMetricValue();

      // For negative metrics (anxiety, rumination, etc.) - high value = concern
      const isNegativeMetric = ['anxiety', 'sadness', 'anger', 'fear', 'rumination', 
        'burnout_level', 'loneliness_perceived', 'somatic_tension'].includes(item.key);

      if (value !== null && value !== undefined) {
        if (isNegativeMetric && value >= 6) {
          priority += 40;
          reason = `${item.label} alta ultimamente`;
        } else if (!isNegativeMetric && value <= 4) {
          priority += 35;
          reason = `${item.label} basso/a ultimamente`;
        }
      } else {
        // No data for this metric - boost to collect
        priority += 15;
        reason = 'Dati mancanti';
      }

      // Boost if aligned with user goals
      const goalMappings: Record<string, string[]> = {
        'anxiety': ['gestire-ansia', 'ridurre-stress', 'mental-health'],
        'sleep': ['dormire-meglio', 'sleep', 'riposo'],
        'mood': ['migliorare-umore', 'mood', 'happiness'],
        'energy': ['aumentare-energia', 'energy', 'productivity'],
        'work': ['work-life-balance', 'career', 'produttivita'],
        'love': ['relazioni', 'love', 'partner'],
        'social': ['amicizie', 'social', 'relazioni'],
        'health': ['salute', 'fitness', 'benessere-fisico'],
        'burnout_level': ['gestire-ansia', 'ridurre-stress', 'work-life-balance'],
        'rumination': ['gestire-ansia', 'mental-health', 'pensieri'],
      };

      const relatedGoals = goalMappings[item.key] || [];
      const hasMatchingGoal = userGoals.some(goal => 
        relatedGoals.some(rg => goal.toLowerCase().includes(rg))
      );

      if (hasMatchingGoal) {
        priority += 25;
        reason = 'Allineato ai tuoi obiettivi';
      }

      items.push({
        ...item,
        priority,
        reason,
      });
    });

    // Sort by priority and return top items
    return items.sort((a, b) => b.priority - a.priority);
  }, [vitals, emotions, lifeAreas, deepPsychology, profile, completedToday]);

  // Get the top 4 items to show
  const dailyCheckins = useMemo(() => {
    return prioritizedItems.slice(0, 4);
  }, [prioritizedItems]);

  // Get next items to show after completing current ones
  const nextCheckins = useMemo(() => {
    return prioritizedItems.slice(4, 8);
  }, [prioritizedItems]);

  // Count how many are completed today
  const completedCount = Object.keys(completedToday).length;

  return {
    dailyCheckins,
    nextCheckins,
    completedToday,
    completedCount,
    allPrioritized: prioritizedItems,
    hasData,
  };
};

export default usePersonalizedCheckins;
