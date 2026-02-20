import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays } from 'date-fns';

// Deep Psychology metrics interface (16 parameters)
export interface DeepPsychology {
  // Cognitive (4)
  rumination: number | null;
  self_efficacy: number | null;
  mental_clarity: number | null;
  concentration: number | null;
  // Stress & Coping (3)
  burnout_level: number | null;
  coping_ability: number | null;
  loneliness_perceived: number | null;
  // Physiological (3)
  somatic_tension: number | null;
  appetite_changes: number | null;
  sunlight_exposure: number | null;
  // Complex Emotional (3)
  guilt: number | null;
  gratitude: number | null;
  irritability: number | null;
  // NEW: Extended Psychology (3)
  motivation: number | null;
  intrusive_thoughts: number | null;
  self_worth: number | null;
}

// Extended Emotions interface (18 emotions)
export interface ExtendedEmotions {
  // Primary (5)
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  apathy: number;
  // Secondary (5)
  shame?: number | null;
  jealousy?: number | null;
  hope?: number | null;
  frustration?: number | null;
  nostalgia?: number | null;
  // NEW: Extended (4)
  nervousness?: number | null;
  overwhelm?: number | null;
  excitement?: number | null;
  disappointment?: number | null;
}

export interface DailyMetrics {
  date: string;
  vitals: {
    mood: number;
    anxiety: number;
    energy: number;
    sleep: number;
  };
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    apathy: number;
  };
  life_areas: {
    love: number | null;
    work: number | null;
    school: number | null;
    health: number | null;
    social: number | null;
    growth: number | null;
  };
  deep_psychology: DeepPsychology;
  has_checkin: boolean;
  has_sessions: boolean;
  has_emotions: boolean;
  has_life_areas: boolean;
  has_psychology: boolean;
  checkin_priority: boolean;
}

export interface WeeklyAverages {
  mood: number;
  anxiety: number;
  energy: number;
  sleep: number;
  daysWithData: number;
}

/**
 * Hook unificato per ottenere le metriche giornaliere aggregate.
 * Questa è la SINGOLA FONTE DI VERITÀ per Dashboard e Analisi.
 */
export const useDailyMetrics = (date?: Date) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetDate = date || new Date();
  const dateString = format(targetDate, 'yyyy-MM-dd');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['daily-metrics', user?.id, dateString],
    queryFn: async (): Promise<DailyMetrics | null> => {
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_daily_metrics', {
        p_user_id: user.id,
        p_date: dateString,
      });

      if (error) {
        console.error('[useDailyMetrics] RPC error:', error);
        throw error;
      }

      return data as unknown as DailyMetrics;
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Function to invalidate and refetch metrics
  const invalidateMetrics = () => {
    queryClient.invalidateQueries({ queryKey: ['daily-metrics', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['weekly-averages', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['checkin-today'] });
    queryClient.invalidateQueries({ queryKey: ['checkins-weekly'] });
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };

  // Helper to convert 1-10 scale to 0-100 for display
  const toPercentage = (value: number) => Math.round(value * 10);

  // Get vitals as percentages (0-100)
  const vitalsPercentage = data?.vitals ? {
    mood: toPercentage(data.vitals.mood),
    anxiety: toPercentage(data.vitals.anxiety),
    energy: toPercentage(data.vitals.energy),
    sleep: toPercentage(data.vitals.sleep),
  } : null;

  // Default deep psychology object (16 parameters)
  const defaultDeepPsychology: DeepPsychology = {
    rumination: null,
    self_efficacy: null,
    mental_clarity: null,
    concentration: null,
    burnout_level: null,
    coping_ability: null,
    loneliness_perceived: null,
    somatic_tension: null,
    appetite_changes: null,
    sunlight_exposure: null,
    guilt: null,
    gratitude: null,
    irritability: null,
    motivation: null,
    intrusive_thoughts: null,
    self_worth: null,
  };

  return {
    metrics: data,
    vitals: data?.vitals || null,
    vitalsPercentage,
    emotions: data?.emotions || null,
    lifeAreas: data?.life_areas || null,
    deepPsychology: data?.deep_psychology || defaultDeepPsychology,
    hasData: data?.has_checkin || data?.has_sessions || data?.has_emotions || data?.has_life_areas || data?.has_psychology || false,
    hasPsychology: data?.has_psychology || false,
    isLoading,
    error,
    refetch,
    invalidateMetrics,
  };
};

/**
 * Hook per ottenere la MEDIA degli ultimi 7 giorni
 */
export const useWeeklyAverages = () => {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['weekly-averages', user?.id],
    queryFn: async (): Promise<WeeklyAverages> => {
      if (!user) {
        return { mood: 0, anxiety: 0, energy: 0, sleep: 0, daysWithData: 0 };
      }

      const today = new Date();
      const results: DailyMetrics[] = [];

      // Fetch last 7 days
      for (let i = 0; i < 7; i++) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');

        const { data, error } = await supabase.rpc('get_daily_metrics', {
          p_user_id: user.id,
          p_date: dateStr,
        });

        if (!error && data) {
          const metrics = data as unknown as DailyMetrics;
          // Only include days with actual data
          if (metrics.has_checkin || metrics.has_sessions) {
            results.push(metrics);
          }
        }
      }

      if (results.length === 0) {
        return { mood: 0, anxiety: 0, energy: 0, sleep: 0, daysWithData: 0 };
      }

      // Calculate averages
      const sum = results.reduce(
        (acc, m) => ({
          mood: acc.mood + (m.vitals?.mood || 0),
          anxiety: acc.anxiety + (m.vitals?.anxiety || 0),
          energy: acc.energy + (m.vitals?.energy || 0),
          sleep: acc.sleep + (m.vitals?.sleep || 0),
        }),
        { mood: 0, anxiety: 0, energy: 0, sleep: 0 }
      );

      return {
        mood: Number((sum.mood / results.length).toFixed(1)),
        anxiety: Number((sum.anxiety / results.length).toFixed(1)),
        energy: Number((sum.energy / results.length).toFixed(1)),
        sleep: Number((sum.sleep / results.length).toFixed(1)),
        daysWithData: results.length,
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute cache
  });

  return {
    averages: data || { mood: 0, anxiety: 0, energy: 0, sleep: 0, daysWithData: 0 },
    isLoading,
    refetch,
  };
};

/**
 * Hook per ottenere metriche per un range di date (per grafici)
 * Uses direct table queries instead of per-day RPC for performance
 */
export const useDailyMetricsRange = (startDate: Date, endDate: Date) => {
  const { user } = useAuth();
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['daily-metrics-range', user?.id, startStr, endStr],
    queryFn: async (): Promise<DailyMetrics[]> => {
      if (!user) return [];

      // Fetch all data sources in parallel with a single query each
      const [sessionsRes, emotionsRes, lifeAreasRes, psychologyRes, checkinsRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('start_time, mood_score_detected, anxiety_score_detected, energy_score_detected, sleep_quality')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('start_time', startStr)
          .lte('start_time', `${endStr}T23:59:59`)
          .order('start_time', { ascending: true }),
        supabase
          .from('daily_emotions')
          .select('date, joy, sadness, anger, fear, apathy, shame, jealousy, hope, frustration, nostalgia, nervousness, overwhelm, excitement, disappointment, disgust, surprise, serenity, pride, affection, curiosity')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .lte('date', endStr)
          .order('date', { ascending: true }),
        supabase
          .from('daily_life_areas')
          .select('date, work, school, love, family, social, health, growth, leisure, finances')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .lte('date', endStr)
          .order('date', { ascending: true }),
        supabase
          .from('daily_psychology')
          .select('date, rumination, self_efficacy, mental_clarity, concentration, burnout_level, coping_ability, loneliness_perceived, somatic_tension, appetite_changes, sunlight_exposure, guilt, gratitude, irritability, motivation, intrusive_thoughts, self_worth, suicidal_ideation, hopelessness, self_harm_urges, dissociation, confusion, racing_thoughts, avoidance, social_withdrawal, compulsive_urges, procrastination, sense_of_purpose, life_satisfaction, perceived_social_support, emotional_regulation, resilience, mindfulness')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .lte('date', endStr)
          .order('date', { ascending: true }),
        supabase
          .from('daily_checkins')
          .select('created_at, mood_value, notes')
          .eq('user_id', user.id)
          .gte('created_at', startStr)
          .lte('created_at', `${endStr}T23:59:59`)
          .order('created_at', { ascending: true }),
      ]);

      // Group by date
      const dateMap = new Map<string, DailyMetrics>();

      const getOrCreate = (dateKey: string): DailyMetrics => {
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            date: dateKey,
            vitals: { mood: 0, anxiety: 0, energy: 0, sleep: 0 },
            emotions: { joy: 0, sadness: 0, anger: 0, fear: 0, apathy: 0 },
            life_areas: { love: null, work: null, school: null, health: null, social: null, growth: null },
            deep_psychology: {
              rumination: null, self_efficacy: null, mental_clarity: null, concentration: null,
              burnout_level: null, coping_ability: null, loneliness_perceived: null,
              somatic_tension: null, appetite_changes: null, sunlight_exposure: null,
              guilt: null, gratitude: null, irritability: null,
              motivation: null, intrusive_thoughts: null, self_worth: null,
            },
            has_checkin: false, has_sessions: false, has_emotions: false,
            has_life_areas: false, has_psychology: false, checkin_priority: false,
          });
        }
        return dateMap.get(dateKey)!;
      };

      // Process sessions
      (sessionsRes.data || []).forEach(s => {
        const dateKey = format(new Date(s.start_time), 'yyyy-MM-dd');
        const m = getOrCreate(dateKey);
        m.has_sessions = true;
        if (s.mood_score_detected && s.mood_score_detected > m.vitals.mood) m.vitals.mood = s.mood_score_detected;
        if (s.anxiety_score_detected && s.anxiety_score_detected > m.vitals.anxiety) m.vitals.anxiety = s.anxiety_score_detected;
        if (s.energy_score_detected && s.energy_score_detected > m.vitals.energy) m.vitals.energy = s.energy_score_detected;
        if (s.sleep_quality && s.sleep_quality > m.vitals.sleep) m.vitals.sleep = s.sleep_quality;
      });

      // Process checkins
      (checkinsRes.data || []).forEach(c => {
        const dateKey = format(new Date(c.created_at), 'yyyy-MM-dd');
        const m = getOrCreate(dateKey);
        m.has_checkin = true;
        m.checkin_priority = true;
        const moodVal = c.mood_value * 2;
        if (moodVal > m.vitals.mood) m.vitals.mood = moodVal;
        if (c.notes) {
          try {
            const notes = JSON.parse(c.notes);
            if (notes.anxiety && notes.anxiety > m.vitals.anxiety) m.vitals.anxiety = notes.anxiety;
            if (notes.energy && notes.energy > m.vitals.energy) m.vitals.energy = notes.energy;
            if (notes.sleep && notes.sleep > m.vitals.sleep) m.vitals.sleep = notes.sleep;
          } catch { /* ignore */ }
        }
      });

      // Process emotions
      (emotionsRes.data || []).forEach(e => {
        const m = getOrCreate(e.date);
        m.has_emotions = true;
        const emo = m.emotions as Record<string, number>;
        for (const [k, v] of Object.entries(e)) {
          if (k !== 'date' && v !== null && typeof v === 'number') {
            emo[k] = Math.max(emo[k] || 0, v);
          }
        }
      });

      // Process life areas
      (lifeAreasRes.data || []).forEach(la => {
        const m = getOrCreate(la.date);
        m.has_life_areas = true;
        const areas = m.life_areas as Record<string, number | null>;
        for (const [k, v] of Object.entries(la)) {
          if (k !== 'date' && v !== null && typeof v === 'number') {
            areas[k] = Math.max(areas[k] || 0, v);
          }
        }
      });

      // Process psychology
      (psychologyRes.data || []).forEach(p => {
        const m = getOrCreate(p.date);
        m.has_psychology = true;
        const psych = m.deep_psychology as unknown as Record<string, number | null>;
        for (const [k, v] of Object.entries(p)) {
          if (k !== 'date' && v !== null && typeof v === 'number') {
            psych[k] = Math.max(psych[k] || 0, v);
          }
        }
      });

      // Sort by date and return
      return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  return {
    metricsRange: data || [],
    isLoading,
    refetch,
  };
};
