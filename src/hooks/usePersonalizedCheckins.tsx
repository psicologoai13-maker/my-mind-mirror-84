import React, { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useCheckins } from './useCheckins';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { 
  Smile, Brain, Zap, Moon, Heart, Briefcase, Users, Sprout, Activity,
  Flame, CloudRain, Wind, Eye, Battery, Frown, ThumbsUp, AlertCircle,
  Sparkles, TrendingDown, Coffee, Sun
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CheckinItemType = 'vital' | 'life_area' | 'emotion' | 'psychology';
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
}

export const usePersonalizedCheckins = () => {
  const { user, session } = useAuth();
  const { todayCheckin } = useCheckins();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch AI-selected checkins
  const { data: aiData, isLoading: aiLoading, refetch: refetchAI, error: aiError } = useQuery({
    queryKey: ['ai-checkins', user?.id, today],
    queryFn: async (): Promise<{ checkins: AICheckinResponse[]; allCompleted: boolean; aiGenerated: boolean }> => {
      if (!user || !session?.access_token) {
        return { checkins: [], allCompleted: false, aiGenerated: false };
      }

      try {
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
    enabled: !!user && !!session?.access_token,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: false,
  });

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

  // Convert AI response to CheckinItem format
  const dailyCheckins = useMemo<CheckinItem[]>(() => {
    if (!aiData?.checkins) return [];

    return aiData.checkins
      .filter(item => !(item.key in completedToday))
      .map((item, index) => {
        const colors = colorMap[item.key] || { color: 'text-gray-500', bgColor: 'bg-gray-50' };
        const Icon = iconMap[item.key] || Sparkles;

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
        };
      });
  }, [aiData, completedToday]);

  const completedCount = Object.keys(completedToday).length;
  const allCompleted = aiData?.allCompleted || false;
  const aiGenerated = aiData?.aiGenerated || false;

  return {
    dailyCheckins,
    nextCheckins: [],
    completedToday,
    completedCount,
    allPrioritized: dailyCheckins,
    hasData: dailyCheckins.length > 0 || completedCount > 0,
    isLoading: aiLoading,
    aiGenerated,
    allCompleted,
    refetchTodayData: useCallback(() => {
      refetchTodayData();
      refetchAI();
      queryClient.invalidateQueries({ queryKey: ['ai-checkins'] });
    }, [refetchTodayData, refetchAI, queryClient]),
  };
};

export default usePersonalizedCheckins;
