import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useCheckins } from './useCheckins';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Smile, Brain, Zap, Moon, Heart, Briefcase, Users, Sprout, Activity,
  Flame, CloudRain, Wind, Eye, Battery, Frown, ThumbsUp, AlertCircle,
  Sparkles, TrendingDown, Coffee, Sun, Target,
  // Habit Icons
  Footprints, Dumbbell, Scale, Droplets, Pill, Timer, Ban, Wine, Cigarette,
  BookOpen, GraduationCap, Phone, UserCheck, Salad, Apple, Focus, Bed,
  PersonStanding, Bike, Waves, HeartPulse, Stethoscope, PenLine, Leaf
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CheckinItemType = 'vital' | 'life_area' | 'emotion' | 'psychology' | 'objective' | 'habit';
export type ResponseType = 'emoji' | 'yesno' | 'intensity' | 'slider' | 'numeric' | 'toggle' | 'abstain' | 'counter' | 'timer' | 'range';

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
  unit?: string;
  target?: number;
  step?: number;
  // For habits
  habitType?: string;
  // For objectives
  objectiveId?: string;
  // Repeatable items can be logged multiple times per day (e.g., spending)
  repeatable?: boolean;
  // Current value for accumulation
  currentValue?: number;
  // Finance tracking type
  financeType?: string;
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
  numeric: { options: [], labels: [] },
  toggle: { options: [], labels: [] },
  abstain: { options: [], labels: [] },
  counter: { options: [], labels: [] },
  timer: { options: [], labels: [] },
  range: { options: [], labels: [] }, // For preset range options
};

// ============================================
// ICON MAPPING - Standard check-ins
// ============================================
const standardIconMap: Record<string, LucideIcon> = {
  mood: Smile, anxiety: Brain, energy: Zap, sleep: Moon,
  love: Heart, work: Briefcase, social: Users, growth: Sprout, health: Activity,
  sadness: CloudRain, anger: Flame, fear: AlertCircle, joy: Sparkles,
  rumination: Wind, burnout_level: Battery, loneliness_perceived: Frown,
  gratitude: ThumbsUp, mental_clarity: Eye, somatic_tension: TrendingDown,
  coping_ability: Coffee, sunlight_exposure: Sun,
};

// ============================================
// HABIT ICON MAPPING - Lucide icons for habits
// ============================================
const habitIconMap: Record<string, LucideIcon> = {
  // Fitness
  steps: Footprints,
  exercise: Dumbbell,
  stretching: PersonStanding,
  strength: Dumbbell,
  cardio: HeartPulse,
  yoga: PersonStanding,
  swimming: Waves,
  cycling: Bike,
  // Health
  sleep: Bed,
  water: Droplets,
  weight: Scale,
  heart_rate: HeartPulse,
  vitamins: Pill,
  medication: Pill,
  sunlight: Sun,
  doctor_visit: Stethoscope,
  // Mental
  meditation: Leaf,
  journaling: PenLine,
  breathing: Wind,
  gratitude: ThumbsUp,
  therapy: Brain,
  mindfulness: Leaf,
  affirmations: Sparkles,
  digital_detox: Ban,
  // Nutrition
  healthy_meals: Salad,
  no_junk_food: Ban,
  fruits_veggies: Apple,
  meal_prep: Salad,
  no_sugar: Ban,
  intermittent_fasting: Timer,
  // Bad habits
  cigarettes: Cigarette,
  alcohol: Wine,
  caffeine: Coffee,
  social_media: Ban,
  nail_biting: Ban,
  late_snacking: Moon,
  // Productivity
  reading: BookOpen,
  learning: GraduationCap,
  deep_work: Focus,
  no_procrastination: Target,
  morning_routine: Sun,
  // Social
  social_interaction: Users,
  call_loved_one: Phone,
  quality_time: Heart,
  kindness: Heart,
  networking: UserCheck,
};

// ============================================
// COLOR MAPPING
// ============================================
const colorMap: Record<string, { color: string; bgColor: string }> = {
  // Standard vitals
  mood: { color: 'text-primary', bgColor: 'bg-primary/10' },
  anxiety: { color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-950/30' },
  energy: { color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/30' },
  sleep: { color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-950/30' },
  // Life areas
  love: { color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-950/30' },
  work: { color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950/30' },
  social: { color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/30' },
  growth: { color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-950/30' },
  health: { color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30' },
  // Emotions
  sadness: { color: 'text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950/30' },
  anger: { color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-950/30' },
  fear: { color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-950/30' },
  joy: { color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950/30' },
  // Psychology
  rumination: { color: 'text-slate-500', bgColor: 'bg-slate-50 dark:bg-slate-950/30' },
  burnout_level: { color: 'text-red-400', bgColor: 'bg-red-50 dark:bg-red-950/30' },
  loneliness_perceived: { color: 'text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950/30' },
  gratitude: { color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30' },
  mental_clarity: { color: 'text-cyan-500', bgColor: 'bg-cyan-50 dark:bg-cyan-950/30' },
  somatic_tension: { color: 'text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-950/30' },
  coping_ability: { color: 'text-teal-500', bgColor: 'bg-teal-50 dark:bg-teal-950/30' },
  sunlight_exposure: { color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950/30' },
};

// Habit-specific colors
const habitColorMap: Record<string, { color: string; bgColor: string }> = {
  // Fitness - Blue tones
  steps: { color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950/30' },
  exercise: { color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/30' },
  cardio: { color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-950/30' },
  yoga: { color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-950/30' },
  // Health - Green tones
  water: { color: 'text-cyan-500', bgColor: 'bg-cyan-50 dark:bg-cyan-950/30' },
  weight: { color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30' },
  vitamins: { color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-950/30' },
  sunlight: { color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950/30' },
  // Mental - Purple tones
  meditation: { color: 'text-violet-500', bgColor: 'bg-violet-50 dark:bg-violet-950/30' },
  journaling: { color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-950/30' },
  breathing: { color: 'text-sky-500', bgColor: 'bg-sky-50 dark:bg-sky-950/30' },
  // Bad habits - Red/warning tones
  cigarettes: { color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950/30' },
  alcohol: { color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/30' },
  no_junk_food: { color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950/30' },
};

interface AICheckinResponse {
  key: string;
  label: string;
  question: string;
  type: string;
  responseType: string;
  reason?: string;
  unit?: string;
  target?: number;
  step?: number;
  habitType?: string;
  objectiveId?: string;
  icon?: string;
  repeatable?: boolean;
  currentValue?: number;
  financeType?: string;
}

interface CachedCheckinsData {
  checkins: AICheckinResponse[];
  allCompleted: boolean;
  aiGenerated: boolean;
  cachedAt: string;
  cachedDate: string;
  fixedDailyList?: AICheckinResponse[];
}

// Get current date in Rome timezone
function getRomeDateString(): string {
  const now = new Date();
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

export const usePersonalizedCheckins = () => {
  const { user, session } = useAuth();
  const { todayCheckin } = useCheckins();
  const queryClient = useQueryClient();
  const today = getRomeDateString();
  const backgroundRefreshTriggered = useRef(false);
  const [cachedData, setCachedData] = useState<CachedCheckinsData | null>(null);

  // 🎯 STEP 1: Instantly load from profile cache
  const { data: profileCache, isLoading: profileLoading } = useQuery({
    queryKey: ['profile-checkins-cache', user?.id],
    queryFn: async (): Promise<CachedCheckinsData | null> => {
      if (!user) return null;
      
      const { data } = await supabase
        .from('user_profiles')
        .select('ai_checkins_cache')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const cache = data?.ai_checkins_cache as unknown as CachedCheckinsData | null;
      
      if (cache?.cachedDate === today) {
        console.log('[usePersonalizedCheckins] Using cached checkins from profile');
        return cache;
      }
      
      return null;
    },
    enabled: !!user,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    if (profileCache) {
      setCachedData(profileCache);
    }
  }, [profileCache]);

  // 🎯 STEP 2: Background refresh - ONLY if no valid cache exists
  // Once fixedDailyList is set, we DON'T regenerate it
  const { data: freshAIData, isLoading: aiLoading, refetch: refetchAI } = useQuery({
    queryKey: ['ai-checkins-fresh', user?.id, today],
    queryFn: async (): Promise<{ checkins: AICheckinResponse[]; fixedDailyList?: AICheckinResponse[]; allCompleted: boolean; aiGenerated: boolean }> => {
      if (!user || !session?.access_token) {
        return { checkins: [], allCompleted: false, aiGenerated: false };
      }

      // CRITICAL: If we already have a valid fixedDailyList, DON'T fetch again
      if (cachedData?.cachedDate === today && cachedData?.fixedDailyList?.length > 0) {
        console.log('[usePersonalizedCheckins] Already have fixedDailyList, skipping API call');
        return { 
          checkins: cachedData.fixedDailyList, 
          fixedDailyList: cachedData.fixedDailyList,
          allCompleted: false, 
          aiGenerated: cachedData.aiGenerated 
        };
      }

      try {
        console.log('[usePersonalizedCheckins] Fetching fresh checkins from AI (first time today)...');
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-checkins`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({}),
          }
        );

        if (!response.ok) {
          console.error('[usePersonalizedCheckins] AI error:', response.status);
          return { checkins: [], allCompleted: false, aiGenerated: false };
        }

        const data = await response.json();
        
        // Store the FIXED daily list
        const fixedList = data.fixedDailyList || data.checkins || [];
        
        const cachePayload: CachedCheckinsData = {
          checkins: fixedList,
          allCompleted: false,
          aiGenerated: data.aiGenerated || false,
          cachedAt: new Date().toISOString(),
          cachedDate: today,
          fixedDailyList: fixedList, // This is the IMMUTABLE list for the day
        };
        
        await supabase
          .from('user_profiles')
          .update({ ai_checkins_cache: cachePayload as unknown as null })
          .eq('user_id', user.id);
        
        setCachedData(cachePayload);
        
        return {
          checkins: fixedList,
          fixedDailyList: fixedList,
          allCompleted: false,
          aiGenerated: data.aiGenerated || false,
        };
      } catch (err) {
        console.error('[usePersonalizedCheckins] Fetch error:', err);
        return { checkins: [], allCompleted: false, aiGenerated: false };
      }
    },
    enabled: false,
    staleTime: Infinity, // Never stale - list is fixed for the day
    refetchOnWindowFocus: false,
  });

  // 🎯 STEP 3: Trigger background refresh
  useEffect(() => {
    if (!user || !session?.access_token || backgroundRefreshTriggered.current) return;
    
    const hasValidCache = cachedData && cachedData.cachedDate === today;
    
    if (!profileLoading) {
      backgroundRefreshTriggered.current = true;
      
      const timer = setTimeout(() => {
        refetchAI();
      }, hasValidCache ? 2000 : 100);
      
      return () => clearTimeout(timer);
    }
  }, [user, session, profileLoading, cachedData, today, refetchAI]);

  // Fetch today's completed data including SESSION data
  const { data: todayAllData, refetch: refetchTodayData } = useQuery({
    queryKey: ['today-all-sources', user?.id, today],
    queryFn: async () => {
      if (!user) return { lifeAreas: [], emotions: [], psychology: [], habits: [], sessions: [] };

      // Get start/end of today in Rome timezone for session query
      const todayStart = new Date(`${today}T00:00:00+01:00`).toISOString();
      const todayEnd = new Date(`${today}T23:59:59+01:00`).toISOString();

      const [lifeAreasResult, emotionsResult, psychologyResult, habitsResult, sessionsResult] = await Promise.all([
        supabase.from('daily_life_areas').select('*').eq('user_id', user.id).eq('date', today),
        supabase.from('daily_emotions').select('*').eq('user_id', user.id).eq('date', today),
        supabase.from('daily_psychology').select('*').eq('user_id', user.id).eq('date', today),
        supabase.from('daily_habits').select('*').eq('user_id', user.id).eq('date', today),
        // 🎯 CRITICAL: Also check sessions for extracted vitals from conversations
        supabase.from('sessions')
          .select('mood_score_detected, anxiety_score_detected, sleep_quality, specific_emotions, life_balance_scores, deep_psychology')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('start_time', todayStart)
          .lte('start_time', todayEnd),
      ]);

      return {
        lifeAreas: lifeAreasResult.data || [],
        emotions: emotionsResult.data || [],
        psychology: psychologyResult.data || [],
        habits: habitsResult.data || [],
        sessions: sessionsResult.data || [],
      };
    },
    enabled: !!user,
    staleTime: 1000 * 10,
  });

  // Parse completed items from all sources INCLUDING SESSION DATA
  const completedToday = useMemo(() => {
    const completed: Record<string, number> = {};
    
    // 🎯 CRITICAL FIX: Check session data FIRST for mood/anxiety/energy/sleep
    // This ensures that if Aria collected these during conversation, they count as completed
    if (todayAllData?.sessions) {
      todayAllData.sessions.forEach((session: any) => {
        // Vitals from session (1-10 scale → convert to 1-5)
        if (session.mood_score_detected && typeof session.mood_score_detected === 'number') {
          completed.mood = Math.max(completed.mood || 0, Math.ceil(session.mood_score_detected / 2));
        }
        if (session.anxiety_score_detected && typeof session.anxiety_score_detected === 'number') {
          completed.anxiety = Math.max(completed.anxiety || 0, Math.ceil(session.anxiety_score_detected / 2));
        }
        if (session.sleep_quality && typeof session.sleep_quality === 'number') {
          completed.sleep = Math.max(completed.sleep || 0, Math.ceil(session.sleep_quality / 2));
        }
        
        // Emotions from session (specific_emotions JSON)
        if (session.specific_emotions) {
          const emotions = typeof session.specific_emotions === 'string' 
            ? JSON.parse(session.specific_emotions) 
            : session.specific_emotions;
          ['joy', 'sadness', 'anger', 'fear', 'apathy'].forEach(key => {
            const value = emotions[key];
            if (value && typeof value === 'number' && value > 0) {
              completed[key] = Math.max(completed[key] || 0, Math.ceil(value / 2));
            }
          });
        }
        
        // Life areas from session (life_balance_scores JSON)
        if (session.life_balance_scores) {
          const areas = typeof session.life_balance_scores === 'string'
            ? JSON.parse(session.life_balance_scores)
            : session.life_balance_scores;
          ['love', 'work', 'social', 'health', 'energy'].forEach(key => {
            const value = areas[key];
            if (value && typeof value === 'number' && value > 0) {
              // Map 'energy' from life_balance to vitals energy
              const targetKey = key === 'energy' ? 'energy' : key;
              completed[targetKey] = Math.max(completed[targetKey] || 0, Math.ceil(value / 2));
            }
          });
        }
        
        // Deep psychology from session
        if (session.deep_psychology) {
          const psych = typeof session.deep_psychology === 'string'
            ? JSON.parse(session.deep_psychology)
            : session.deep_psychology;
          Object.keys(psych).forEach(key => {
            const value = psych[key];
            if (value && typeof value === 'number' && value > 0) {
              completed[key] = Math.max(completed[key] || 0, Math.ceil(value / 2));
            }
          });
        }
      });
    }
    
    // Also check daily_checkins (manual mood selector)
    if (todayCheckin) {
      completed.mood = Math.max(completed.mood || 0, todayCheckin.mood_value);
      if (todayCheckin.notes) {
        try {
          const notes = JSON.parse(todayCheckin.notes);
          Object.entries(notes).forEach(([key, value]) => {
            if (typeof value === 'number') {
              completed[key] = Math.max(completed[key] || 0, Math.ceil((value as number) / 2));
            }
          });
        } catch (e) {}
      }
    }

    if (todayAllData?.lifeAreas) {
      todayAllData.lifeAreas.forEach((record: any) => {
        // NOTE: 'growth' is excluded - it's AI-calculated, not user-reported
        ['love', 'work', 'social', 'health'].forEach(key => {
          const value = record[key];
          if (value && typeof value === 'number') {
            completed[key] = Math.max(completed[key] || 0, Math.ceil(value / 2));
          }
        });
      });
    }

    if (todayAllData?.emotions) {
      todayAllData.emotions.forEach((record: any) => {
        ['joy', 'sadness', 'anger', 'fear', 'apathy'].forEach(key => {
          const value = record[key];
          if (value && typeof value === 'number') {
            completed[key] = Math.max(completed[key] || 0, Math.ceil(value / 2));
          }
        });
      });
    }

    if (todayAllData?.psychology) {
      todayAllData.psychology.forEach((record: any) => {
        Object.keys(record).forEach(key => {
          const value = record[key];
          if (value && typeof value === 'number' && !['id', 'user_id', 'date', 'session_id', 'source', 'created_at', 'updated_at'].includes(key)) {
            completed[key] = Math.max(completed[key] || 0, Math.ceil(value / 2));
          }
        });
      });
    }

    // Mark completed habits
    if (todayAllData?.habits) {
      todayAllData.habits.forEach((record: any) => {
        if (record.value > 0) {
          completed[`habit_${record.habit_type}`] = record.value;
        }
      });
    }

    return completed;
  }, [todayCheckin, todayAllData]);

  // Use the FIXED daily list - filtering happens here, not in the API
  const fixedDailyList = cachedData?.fixedDailyList || freshAIData?.fixedDailyList || cachedData?.checkins || freshAIData?.checkins;
  
  const aiData = {
    checkins: fixedDailyList || [],
    fixedDailyList: fixedDailyList || [],
    allCompleted: false, // Calculated from completedToday
    aiGenerated: cachedData?.aiGenerated || freshAIData?.aiGenerated || false,
    cachedAt: cachedData?.cachedAt || '',
    cachedDate: today,
  };

  // Convert AI response to CheckinItem format with proper icons
  const dailyCheckins = useMemo<CheckinItem[]>(() => {
    const sourceList = aiData?.fixedDailyList || aiData?.checkins;
    if (!sourceList) return [];

    return sourceList
      // CRITICAL: Filter out 'growth' - it's AI-calculated, not a check-in item
      .filter(item => item.key !== 'growth')
      // Keep repeatable items even if they have been completed today
      .filter(item => item.repeatable || !(item.key in completedToday))
      .map((item, index) => {
        const isHabit = item.type === 'habit' || item.key.startsWith('habit_');
        const isObjective = item.type === 'objective' || item.key.startsWith('objective_');
        
        // Determine icon
        let Icon: LucideIcon = Sparkles;
        if (isHabit) {
          const habitType = item.habitType || item.key.replace('habit_', '');
          Icon = habitIconMap[habitType] || Activity;
        } else if (isObjective) {
          Icon = Target;
        } else {
          Icon = standardIconMap[item.key] || Sparkles;
        }

        // Determine colors
        let colors = { color: 'text-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-900/30' };
        if (isHabit) {
          const habitType = item.habitType || item.key.replace('habit_', '');
          colors = habitColorMap[habitType] || { color: 'text-primary', bgColor: 'bg-primary/10' };
        } else if (isObjective) {
          colors = { color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30' };
        } else {
          colors = colorMap[item.key] || colors;
        }

        return {
          key: item.key,
          icon: Icon,
          label: item.label,
          question: item.question,
          color: colors.color,
          bgColor: colors.bgColor,
          type: item.type as CheckinItemType,
          responseType: item.responseType as ResponseType,
          priority: 100 - index,
          reason: item.reason,
          unit: item.unit,
          target: item.target,
          step: item.step,
          habitType: item.habitType || (isHabit ? item.key.replace('habit_', '') : undefined),
          objectiveId: item.objectiveId,
          repeatable: item.repeatable,
          currentValue: item.currentValue,
          financeType: item.financeType,
        };
      });
  }, [aiData, completedToday]);

  const totalItemsInFixedList = (fixedDailyList || []).length;
  const completedCount = Object.keys(completedToday).length;
  
  // All completed = all items in fixed list are in completedToday
  const allCompleted = totalItemsInFixedList > 0 && dailyCheckins.length === 0;
  const aiGenerated = aiData?.aiGenerated || false;
  const isLoading = !cachedData && profileLoading && !freshAIData;

  return {
    dailyCheckins,
    nextCheckins: [],
    completedToday,
    completedCount,
    allPrioritized: dailyCheckins,
    hasData: dailyCheckins.length > 0 || completedCount > 0,
    isLoading,
    aiGenerated,
    allCompleted,
    // IMPORTANT: Only refresh completed data, NOT the fixed list
    refetchTodayData: useCallback(() => {
      refetchTodayData();
      // DON'T refetch AI - the list is FIXED for the day
      // Only invalidate the completed data queries
      queryClient.invalidateQueries({ queryKey: ['today-all-sources'] });
      queryClient.invalidateQueries({ queryKey: ['checkin-today'] });
    }, [refetchTodayData, queryClient]),
  };
};

export default usePersonalizedCheckins;
