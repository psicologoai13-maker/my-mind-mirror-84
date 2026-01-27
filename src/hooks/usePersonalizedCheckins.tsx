import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useCheckins } from './useCheckins';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Smile, Brain, Zap, Moon, Heart, Briefcase, Users, Sprout, Activity,
  Flame, CloudRain, Wind, Eye, Battery, Frown, ThumbsUp, AlertCircle,
  Sparkles, TrendingDown, Coffee, Sun, Target
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CheckinItemType = 'vital' | 'life_area' | 'emotion' | 'psychology' | 'objective';
export type ResponseType = 'emoji' | 'yesno' | 'intensity' | 'slider' | 'numeric';

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
  objectiveId?: string;
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
  numeric: {
    options: [],
    labels: [],
  },
};

// Icon and color mapping for items from AI
const iconMap: Record<string, LucideIcon> = {
  mood: Smile, anxiety: Brain, energy: Zap, sleep: Moon,
  love: Heart, work: Briefcase, social: Users, growth: Sprout, health: Activity,
  sadness: CloudRain, anger: Flame, fear: AlertCircle, joy: Sparkles,
  rumination: Wind, burnout_level: Battery, loneliness_perceived: Frown,
  gratitude: ThumbsUp, mental_clarity: Eye, somatic_tension: TrendingDown,
  coping_ability: Coffee, sunlight_exposure: Sun,
};

const colorMap: Record<string, { color: string; bgColor: string }> = {
  mood: { color: 'text-primary', bgColor: 'bg-primary/10' },
  anxiety: { color: 'text-rose-500', bgColor: 'bg-rose-50' },
  energy: { color: 'text-amber-500', bgColor: 'bg-amber-50' },
  sleep: { color: 'text-indigo-500', bgColor: 'bg-indigo-50' },
  love: { color: 'text-rose-500', bgColor: 'bg-rose-50' },
  work: { color: 'text-blue-500', bgColor: 'bg-blue-50' },
  social: { color: 'text-amber-500', bgColor: 'bg-amber-50' },
  growth: { color: 'text-purple-500', bgColor: 'bg-purple-50' },
  health: { color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
  sadness: { color: 'text-blue-400', bgColor: 'bg-blue-50' },
  anger: { color: 'text-red-500', bgColor: 'bg-red-50' },
  fear: { color: 'text-orange-500', bgColor: 'bg-orange-50' },
  joy: { color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
  rumination: { color: 'text-slate-500', bgColor: 'bg-slate-50' },
  burnout_level: { color: 'text-red-400', bgColor: 'bg-red-50' },
  loneliness_perceived: { color: 'text-purple-400', bgColor: 'bg-purple-50' },
  gratitude: { color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
  mental_clarity: { color: 'text-cyan-500', bgColor: 'bg-cyan-50' },
  somatic_tension: { color: 'text-orange-400', bgColor: 'bg-orange-50' },
  coping_ability: { color: 'text-teal-500', bgColor: 'bg-teal-50' },
  sunlight_exposure: { color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
};

interface AICheckinResponse {
  key: string;
  label: string;
  question: string;
  type: string;
  responseType: string;
  reason?: string;
  unit?: string;
  objectiveId?: string;
}

interface CachedCheckinsData {
  checkins: AICheckinResponse[];
  allCompleted: boolean;
  aiGenerated: boolean;
  cachedAt: string;
  cachedDate: string;
  // The FIXED daily list that never changes throughout the day
  fixedDailyList?: AICheckinResponse[];
}

// Get current date in Rome timezone (Europe/Rome = UTC+1 in winter, UTC+2 in summer)
function getRomeDateString(): string {
  const now = new Date();
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now); // Returns 'YYYY-MM-DD'
}

export const usePersonalizedCheckins = () => {
  const { user, session } = useAuth();
  const { todayCheckin } = useCheckins();
  const queryClient = useQueryClient();
  const today = getRomeDateString();
  const backgroundRefreshTriggered = useRef(false);
  const [cachedData, setCachedData] = useState<CachedCheckinsData | null>(null);

  // 🎯 STEP 1: Instantly load from profile cache (no loading state for user!)
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
      
      // Only return cache if it's from today (Rome timezone)
      if (cache?.cachedDate === today) {
        console.log('[usePersonalizedCheckins] Using cached checkins from profile');
        return cache;
      }
      
      return null;
    },
    enabled: !!user,
    staleTime: Infinity, // Never auto-refetch - we control refresh
    gcTime: 1000 * 60 * 30,
  });

  // Set cached data when profile cache loads
  useEffect(() => {
    if (profileCache) {
      setCachedData(profileCache);
    }
  }, [profileCache]);

  // 🎯 STEP 2: Background refresh - fetch fresh data from AI
  const { data: freshAIData, isLoading: aiLoading, refetch: refetchAI } = useQuery({
    queryKey: ['ai-checkins-fresh', user?.id, today],
    queryFn: async (): Promise<{ checkins: AICheckinResponse[]; allCompleted: boolean; aiGenerated: boolean }> => {
      if (!user || !session?.access_token) {
        return { checkins: [], allCompleted: false, aiGenerated: false };
      }

      try {
        console.log('[usePersonalizedCheckins] Fetching fresh checkins from AI...');
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
        
        // 🎯 Save to profile cache for instant loading next time
        const cachePayload: CachedCheckinsData = {
          checkins: data.checkins || [],
          allCompleted: data.allCompleted || false,
          aiGenerated: data.aiGenerated || false,
          cachedAt: new Date().toISOString(),
          cachedDate: today,
        };
        
        await supabase
          .from('user_profiles')
          .update({ ai_checkins_cache: cachePayload as unknown as null })
          .eq('user_id', user.id);
        
        console.log('[usePersonalizedCheckins] Cached new checkins to profile');
        
        // Update local state immediately
        setCachedData(cachePayload);
        
        return {
          checkins: data.checkins || [],
          allCompleted: data.allCompleted || false,
          aiGenerated: data.aiGenerated || false,
        };
      } catch (err) {
        console.error('[usePersonalizedCheckins] Fetch error:', err);
        return { checkins: [], allCompleted: false, aiGenerated: false };
      }
    },
    enabled: false, // Manual trigger only
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  // 🎯 STEP 3: Trigger background refresh if no cache or cache is stale
  useEffect(() => {
    if (!user || !session?.access_token || backgroundRefreshTriggered.current) return;
    
    const hasValidCache = cachedData && cachedData.cachedDate === today;
    
    // If we have cache, use it immediately but still refresh in background
    // If no cache, we need to fetch (but won't show loading to user)
    if (!profileLoading) {
      backgroundRefreshTriggered.current = true;
      
      // Small delay to not block initial render
      const timer = setTimeout(() => {
        refetchAI();
      }, hasValidCache ? 2000 : 100);
      
      return () => clearTimeout(timer);
    }
  }, [user, session, profileLoading, cachedData, today, refetchAI]);

  // Fetch today's completed data for local tracking
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
    staleTime: 1000 * 10,
  });

  // Parse completed items from all sources
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

    if (todayAllData?.lifeAreas) {
      todayAllData.lifeAreas.forEach((record: any) => {
        ['love', 'work', 'social', 'growth', 'health'].forEach(key => {
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

    return completed;
  }, [todayCheckin, todayAllData]);

  // 🎯 Use cached data OR fresh data (prefer cached for instant render)
  // Use fixedDailyList if available (the immutable daily list)
  const aiData = cachedData || (freshAIData ? {
    checkins: freshAIData.checkins,
    allCompleted: freshAIData.allCompleted,
    aiGenerated: freshAIData.aiGenerated,
    cachedAt: '',
    cachedDate: today,
    fixedDailyList: freshAIData.checkins,
  } : null);

  // Convert AI response to CheckinItem format
  // 🎯 Use the FIXED daily list and filter by completed items locally
  const dailyCheckins = useMemo<CheckinItem[]>(() => {
    // Use fixedDailyList if available, otherwise fall back to checkins
    const sourceList = aiData?.fixedDailyList || aiData?.checkins;
    if (!sourceList) return [];

    return sourceList
      .filter(item => !(item.key in completedToday))
      .map((item, index) => {
        // Dynamic colors for objectives
        const isObjective = item.key.startsWith('objective_');
        const colors = isObjective 
          ? { color: 'text-emerald-500', bgColor: 'bg-emerald-50' }
          : (colorMap[item.key] || { color: 'text-gray-500', bgColor: 'bg-gray-50' });
        const Icon = isObjective ? Target : (iconMap[item.key] || Sparkles);

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
          objectiveId: item.objectiveId,
        };
      });
  }, [aiData, completedToday]);

  const completedCount = Object.keys(completedToday).length;
  const allCompleted = aiData?.allCompleted || false;
  const aiGenerated = aiData?.aiGenerated || false;
  
  // 🎯 CRITICAL: isLoading is false if we have ANY cached data (instant render!)
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
    refetchTodayData: useCallback(() => {
      refetchTodayData();
      backgroundRefreshTriggered.current = false;
      refetchAI();
      queryClient.invalidateQueries({ queryKey: ['ai-checkins-fresh'] });
      queryClient.invalidateQueries({ queryKey: ['profile-checkins-cache'] });
    }, [refetchTodayData, refetchAI, queryClient]),
  };
};

export default usePersonalizedCheckins;
