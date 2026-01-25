import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTimeWeightedMetrics } from './useTimeWeightedMetrics';
import { useProfile } from './useProfile';
import { useCheckins } from './useCheckins';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  Smile, Brain, Zap, Moon, Heart, Briefcase, Users, Sprout, Activity,
  Flame, CloudRain, Wind, Eye, Battery, Frown, ThumbsUp, AlertCircle,
  Sparkles, TrendingDown, Coffee, Sun
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CheckinItemType = 'vital' | 'life_area' | 'emotion' | 'psychology';

// Different response types for more intelligent UX
export type ResponseType = 'emoji' | 'yesno' | 'intensity' | 'slider';

export interface CheckinItem {
  key: string;
  icon: LucideIcon;
  label: string;
  question: string;
  color: string;
  bgColor: string;
  type: CheckinItemType;
  responseType: ResponseType;
  priority: number;
  reason?: string;
}

// Response type configurations - LEFT = negative, RIGHT = positive (always)
export const responseTypeConfig = {
  emoji: {
    options: ['😔', '😕', '😐', '🙂', '😊'],
    labels: ['Molto male', 'Male', 'Così così', 'Bene', 'Benissimo'],
  },
  yesno: {
    options: ['Per niente', 'Poco', 'Neutro', 'Un po\'', 'Sì, molto'],
    labels: ['Per niente', 'Poco', 'Neutro', 'Un po\'', 'Sì, molto'],
  },
  intensity: {
    options: ['Nessuna', 'Bassa', 'Media', 'Alta', 'Altissima'],
    labels: ['Nessuna', 'Bassa', 'Media', 'Alta', 'Altissima'],
  },
  slider: {
    options: ['1', '2', '3', '4', '5'],
    labels: ['Minimo', '', '', '', 'Massimo'],
  },
};

// All available check-in items with intelligent response types
const allCheckinItems: Omit<CheckinItem, 'priority' | 'reason'>[] = [
  // Vitals (emoji for general feeling, intensity for measurable states)
  { key: 'mood', icon: Smile, label: 'Umore', question: 'Come ti senti emotivamente?', color: 'text-primary', bgColor: 'bg-primary/10', type: 'vital', responseType: 'emoji' },
  { key: 'anxiety', icon: Brain, label: 'Ansia', question: 'Quanta ansia senti?', color: 'text-rose-500', bgColor: 'bg-rose-50', type: 'vital', responseType: 'intensity' },
  { key: 'energy', icon: Zap, label: 'Energia', question: 'Quanta energia hai?', color: 'text-amber-500', bgColor: 'bg-amber-50', type: 'vital', responseType: 'slider' },
  { key: 'sleep', icon: Moon, label: 'Sonno', question: 'Come hai dormito?', color: 'text-indigo-500', bgColor: 'bg-indigo-50', type: 'vital', responseType: 'emoji' },
  
  // Life Areas (emoji for satisfaction)
  { key: 'love', icon: Heart, label: 'Amore', question: 'Come va la tua vita sentimentale?', color: 'text-rose-500', bgColor: 'bg-rose-50', type: 'life_area', responseType: 'emoji' },
  { key: 'work', icon: Briefcase, label: 'Lavoro', question: 'Come va il lavoro/studio?', color: 'text-blue-500', bgColor: 'bg-blue-50', type: 'life_area', responseType: 'emoji' },
  { key: 'social', icon: Users, label: 'Socialità', question: 'Come vanno le relazioni sociali?', color: 'text-amber-500', bgColor: 'bg-amber-50', type: 'life_area', responseType: 'emoji' },
  { key: 'growth', icon: Sprout, label: 'Crescita', question: 'Ti senti in crescita personale?', color: 'text-purple-500', bgColor: 'bg-purple-50', type: 'life_area', responseType: 'yesno' },
  { key: 'health', icon: Activity, label: 'Salute', question: 'Come sta il tuo corpo?', color: 'text-emerald-500', bgColor: 'bg-emerald-50', type: 'life_area', responseType: 'emoji' },

  // Emotions (yesno for presence, intensity for strength)
  { key: 'sadness', icon: CloudRain, label: 'Tristezza', question: 'Ti senti triste oggi?', color: 'text-blue-400', bgColor: 'bg-blue-50', type: 'emotion', responseType: 'yesno' },
  { key: 'anger', icon: Flame, label: 'Rabbia', question: 'Senti frustrazione o rabbia?', color: 'text-red-500', bgColor: 'bg-red-50', type: 'emotion', responseType: 'yesno' },
  { key: 'fear', icon: AlertCircle, label: 'Paura', question: 'Hai paure o preoccupazioni?', color: 'text-orange-500', bgColor: 'bg-orange-50', type: 'emotion', responseType: 'yesno' },
  { key: 'joy', icon: Sparkles, label: 'Gioia', question: 'Quanta gioia senti?', color: 'text-yellow-500', bgColor: 'bg-yellow-50', type: 'emotion', responseType: 'intensity' },

  // Deep Psychology (intensity for measurable, yesno for yes/no questions)
  { key: 'rumination', icon: Wind, label: 'Pensieri', question: 'Stai rimuginando su qualcosa?', color: 'text-slate-500', bgColor: 'bg-slate-50', type: 'psychology', responseType: 'yesno' },
  { key: 'burnout_level', icon: Battery, label: 'Burnout', question: 'Ti senti esausto/a?', color: 'text-red-400', bgColor: 'bg-red-50', type: 'psychology', responseType: 'yesno' },
  { key: 'loneliness_perceived', icon: Frown, label: 'Solitudine', question: 'Ti senti solo/a?', color: 'text-purple-400', bgColor: 'bg-purple-50', type: 'psychology', responseType: 'yesno' },
  { key: 'gratitude', icon: ThumbsUp, label: 'Gratitudine', question: 'Sei grato/a per qualcosa oggi?', color: 'text-emerald-500', bgColor: 'bg-emerald-50', type: 'psychology', responseType: 'yesno' },
  { key: 'mental_clarity', icon: Eye, label: 'Chiarezza', question: 'Hai chiarezza mentale?', color: 'text-cyan-500', bgColor: 'bg-cyan-50', type: 'psychology', responseType: 'slider' },
  { key: 'somatic_tension', icon: TrendingDown, label: 'Tensione', question: 'Senti tensione nel corpo?', color: 'text-orange-400', bgColor: 'bg-orange-50', type: 'psychology', responseType: 'yesno' },
  { key: 'coping_ability', icon: Coffee, label: 'Resilienza', question: 'Ti senti capace di affrontare le sfide?', color: 'text-teal-500', bgColor: 'bg-teal-50', type: 'psychology', responseType: 'yesno' },
  { key: 'sunlight_exposure', icon: Sun, label: 'Luce solare', question: 'Hai preso abbastanza sole?', color: 'text-yellow-500', bgColor: 'bg-yellow-50', type: 'psychology', responseType: 'yesno' },
];

/**
 * Hook che calcola quali check-in mostrare oggi basandosi su:
 * 1. Dati storici dell'utente (metriche basse = priorità alta)
 * 2. Obiettivi selezionati dall'utente
 * 3. Dati già inseriti OGGI da check-in O sessioni/diari
 * 4. Check-in già completati oggi
 */
export const usePersonalizedCheckins = () => {
  const { user } = useAuth();
  const { vitals, emotions, lifeAreas, deepPsychology, hasData } = useTimeWeightedMetrics(14, 3);
  const { profile } = useProfile();
  const { todayCheckin } = useCheckins();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch ALL today's data from ALL sources (checkin + session)
  const { data: todayAllData, refetch: refetchTodayData } = useQuery({
    queryKey: ['today-all-sources', user?.id, today],
    queryFn: async () => {
      if (!user) return { lifeAreas: [], emotions: [], psychology: [] };

      const [lifeAreasResult, emotionsResult, psychologyResult] = await Promise.all([
        supabase.from('daily_life_areas').select('*').eq('user_id', user.id).eq('date', today),
        supabase.from('daily_emotions').select('*').eq('user_id', user.id).eq('date', today),
        supabase.from('daily_psychology').select('*').eq('user_id', user.id).eq('date', today),
      ]);

      return {
        lifeAreas: lifeAreasResult.data || [],
        emotions: emotionsResult.data || [],
        psychology: psychologyResult.data || [],
      };
    },
    enabled: !!user,
    staleTime: 1000 * 10, // 10 seconds - refresh often
  });

  // Parse completed check-ins from today (from ALL sources)
  const completedToday = useMemo(() => {
    const completed: Record<string, number> = {};
    
    // From daily_checkins (vitals)
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

    // From ALL life areas records today (both sources)
    if (todayAllData?.lifeAreas) {
      todayAllData.lifeAreas.forEach((record: any) => {
        ['love', 'work', 'social', 'growth', 'health'].forEach(key => {
          const value = record[key];
          if (value && typeof value === 'number') {
            // Take the highest value if multiple sources
            const current = completed[key] || 0;
            completed[key] = Math.max(current, Math.ceil(value / 2));
          }
        });
      });
    }

    // From ALL emotions records today (both sources)
    if (todayAllData?.emotions) {
      todayAllData.emotions.forEach((record: any) => {
        ['joy', 'sadness', 'anger', 'fear', 'apathy'].forEach(key => {
          const value = record[key];
          if (value && typeof value === 'number') {
            const current = completed[key] || 0;
            completed[key] = Math.max(current, Math.ceil(value / 2));
          }
        });
      });
    }

    // From ALL psychology records today (both sources)
    if (todayAllData?.psychology) {
      todayAllData.psychology.forEach((record: any) => {
        ['rumination', 'burnout_level', 'loneliness_perceived', 'gratitude', 
         'mental_clarity', 'somatic_tension', 'coping_ability', 'sunlight_exposure',
         'self_efficacy', 'appetite_changes', 'guilt', 'irritability'].forEach(key => {
          const value = record[key];
          if (value && typeof value === 'number') {
            const current = completed[key] || 0;
            completed[key] = Math.max(current, Math.ceil(value / 2));
          }
        });
      });
    }

    return completed;
  }, [todayCheckin, todayAllData]);

  // Calculate priority for each check-in item
  const prioritizedItems = useMemo<CheckinItem[]>(() => {
    const items: CheckinItem[] = [];
    const userGoals = profile?.selected_goals || [];

    allCheckinItems.forEach(item => {
      let priority = 0;
      let reason: string | undefined;

      // Skip if already completed today (from ANY source)
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
        reason = 'Focus del tuo percorso';
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
    refetchTodayData,
  };
};

export default usePersonalizedCheckins;
