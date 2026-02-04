import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useDailyMetricsRange, DailyMetrics, DeepPsychology } from './useDailyMetrics';
import { subDays, format } from 'date-fns';

/**
 * Trend types for visual indicators
 */
export type TrendType = 'improving' | 'declining' | 'stable' | 'volatile' | 'unknown';

export interface TrendInfo {
  type: TrendType;
  icon: string;
  label: string;
  delta: number;
}

/**
 * Calcola una media ponderata dove i dati più recenti hanno più peso.
 * Utilizza una funzione di decay esponenziale.
 */
const calculateTimeWeightedAverage = (
  values: { value: number | null; timestamp: number }[],
  halfLifeDays: number = 10
): number | null => {
  const validValues = values.filter(v => v.value !== null && v.value > 0);
  if (validValues.length === 0) return null;

  const now = Date.now();
  const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;
  const decayConstant = Math.LN2 / halfLifeMs;

  let weightedSum = 0;
  let totalWeight = 0;

  validValues.forEach(({ value, timestamp }) => {
    const age = now - timestamp;
    const weight = Math.exp(-decayConstant * age);
    weightedSum += (value as number) * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;
};

/**
 * Calculate trend based on recent values vs period average
 */
const calculateTrend = (
  values: { value: number | null; timestamp: number }[],
  periodAverage: number | null
): TrendInfo => {
  if (!periodAverage || periodAverage === 0) {
    return { type: 'unknown', icon: '•', label: 'Nessun dato', delta: 0 };
  }

  const now = Date.now();
  const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000);
  
  const recentValues = values
    .filter(v => v.value !== null && v.value > 0 && v.timestamp >= threeDaysAgo)
    .map(v => v.value as number);
  
  if (recentValues.length === 0) {
    return { type: 'unknown', icon: '•', label: 'Nessun dato recente', delta: 0 };
  }

  const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
  const delta = recentAvg - periodAverage;
  
  const allValid = values.filter(v => v.value !== null && v.value > 0).map(v => v.value as number);
  const variance = allValid.length > 1 
    ? allValid.reduce((sum, val) => sum + Math.pow(val - periodAverage, 2), 0) / allValid.length
    : 0;
  const stdDev = Math.sqrt(variance);

  if (stdDev > 3.0) {
    return { type: 'volatile', icon: '⚡', label: 'Volatile', delta: Math.round(delta * 10) / 10 };
  } else if (delta > 1.0) {
    return { type: 'improving', icon: '↗️', label: 'In miglioramento', delta: Math.round(delta * 10) / 10 };
  } else if (delta < -1.0) {
    return { type: 'declining', icon: '↘️', label: 'In calo', delta: Math.round(delta * 10) / 10 };
  } else {
    return { type: 'stable', icon: '➡️', label: 'Stabile', delta: Math.round(delta * 10) / 10 };
  }
};

// ===========================================
// EXTENDED TYPE DEFINITIONS
// All 20 emotions, 9 life areas, 32 psychology params
// ===========================================

export interface ExtendedEmotions {
  // Primary (5)
  joy: number | null;
  sadness: number | null;
  anger: number | null;
  fear: number | null;
  apathy: number | null;
  // Secondary (9)
  shame: number | null;
  jealousy: number | null;
  hope: number | null;
  frustration: number | null;
  nostalgia: number | null;
  nervousness: number | null;
  overwhelm: number | null;
  excitement: number | null;
  disappointment: number | null;
  // NEW: Extended (6)
  disgust: number | null;
  surprise: number | null;
  serenity: number | null;
  pride: number | null;
  affection: number | null;
  curiosity: number | null;
}

export interface ExtendedLifeAreas {
  love: number | null;
  work: number | null;
  school: number | null;
  health: number | null;
  social: number | null;
  growth: number | null;
  // NEW: Extended (3)
  family: number | null;
  leisure: number | null;
  finances: number | null;
}

export interface ExtendedPsychology {
  // Attention Signals (negative)
  rumination: number | null;
  burnout_level: number | null;
  loneliness_perceived: number | null;
  somatic_tension: number | null;
  appetite_changes: number | null;
  guilt: number | null;
  irritability: number | null;
  intrusive_thoughts: number | null;
  // Safety indicators
  suicidal_ideation: number | null;
  hopelessness: number | null;
  self_harm_urges: number | null;
  // Cognitive
  dissociation: number | null;
  confusion: number | null;
  racing_thoughts: number | null;
  // Behavioral
  avoidance: number | null;
  social_withdrawal: number | null;
  compulsive_urges: number | null;
  procrastination: number | null;
  // Resources (positive)
  self_efficacy: number | null;
  mental_clarity: number | null;
  concentration: number | null;
  coping_ability: number | null;
  sunlight_exposure: number | null;
  gratitude: number | null;
  motivation: number | null;
  self_worth: number | null;
  sense_of_purpose: number | null;
  life_satisfaction: number | null;
  perceived_social_support: number | null;
  emotional_regulation: number | null;
  resilience: number | null;
  mindfulness: number | null;
}

export interface TimeWeightedData {
  vitals: {
    mood: number | null;
    anxiety: number | null;
    energy: number | null;
    sleep: number | null;
  };
  vitalsTrends: {
    mood: TrendInfo;
    anxiety: TrendInfo;
    energy: TrendInfo;
    sleep: TrendInfo;
  };
  emotions: ExtendedEmotions;
  lifeAreas: ExtendedLifeAreas;
  lifeAreasTrends: {
    love: TrendInfo;
    work: TrendInfo;
    school: TrendInfo;
    health: TrendInfo;
    social: TrendInfo;
    growth: TrendInfo;
    family: TrendInfo;
    leisure: TrendInfo;
    finances: TrendInfo;
  };
  deepPsychology: ExtendedPsychology;
  hasData: boolean;
  daysWithData: number;
}

interface LifeAreaRecord {
  love: number | null;
  work: number | null;
  school: number | null;
  health: number | null;
  social: number | null;
  growth: number | null;
  family: number | null;
  leisure: number | null;
  finances: number | null;
  updated_at: string;
}

interface EmotionRecord {
  joy: number | null;
  sadness: number | null;
  anger: number | null;
  fear: number | null;
  apathy: number | null;
  shame: number | null;
  jealousy: number | null;
  hope: number | null;
  frustration: number | null;
  nostalgia: number | null;
  nervousness: number | null;
  overwhelm: number | null;
  excitement: number | null;
  disappointment: number | null;
  disgust: number | null;
  surprise: number | null;
  serenity: number | null;
  pride: number | null;
  affection: number | null;
  curiosity: number | null;
  updated_at: string;
}

/**
 * Hook che calcola metriche con media ponderata temporale.
 * EXTENDED: Includes ALL 20 emotions, 9 life areas, and 32 psychology parameters.
 */
export const useTimeWeightedMetrics = (
  lookbackDays: number = 30,
  halfLifeDays: number = 10
) => {
  const { user } = useAuth();
  
  const getRomeDate = () => {
    const formatter = new Intl.DateTimeFormat('sv-SE', { 
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit'
    });
    return formatter.format(new Date());
  };
  
  const todayRome = getRomeDate();
  const today = new Date();
  const startDate = subDays(today, lookbackDays);
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  
  const { metricsRange, isLoading: metricsLoading } = useDailyMetricsRange(startDate, today);

  // Fetch ALL 20 emotions from daily_emotions
  const { data: rawEmotionsData, isLoading: emotionsLoading } = useQuery({
    queryKey: ['emotions-weighted-extended', user?.id, startDateStr, todayRome],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('daily_emotions')
        .select('joy, sadness, anger, fear, apathy, shame, jealousy, hope, frustration, nostalgia, nervousness, overwhelm, excitement, disappointment, disgust, surprise, serenity, pride, affection, curiosity, updated_at')
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .lte('date', todayRome)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('[useTimeWeightedMetrics] Error fetching emotions:', error);
        return [];
      }
      
      return (data || []) as EmotionRecord[];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  // Fetch ALL 9 life areas
  const { data: lifeAreasData, isLoading: lifeAreasLoading } = useQuery({
    queryKey: ['life-areas-weighted-extended', user?.id, startDateStr, todayRome],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('daily_life_areas')
        .select('love, work, school, health, social, growth, family, leisure, finances, updated_at')
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .lte('date', todayRome)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('[useTimeWeightedMetrics] Error fetching life areas:', error);
        return [];
      }
      
      return (data || []) as LifeAreaRecord[];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  // Fetch ALL psychology data including new extended params
  const { data: psychologyData, isLoading: psychologyLoading } = useQuery({
    queryKey: ['psychology-weighted-extended', user?.id, startDateStr, todayRome],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('daily_psychology')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .lte('date', todayRome)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('[useTimeWeightedMetrics] Error fetching psychology:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const isLoading = metricsLoading || lifeAreasLoading || emotionsLoading || psychologyLoading;

  const weightedData = useMemo<TimeWeightedData>(() => {
    const daysWithData = metricsRange.filter(m => 
      m.has_checkin || m.has_sessions || m.has_emotions || m.has_life_areas || m.has_psychology
    );

    const extractVitalWithTimestamp = (
      data: DailyMetrics[],
      getter: (m: DailyMetrics) => number
    ): { value: number | null; timestamp: number }[] => {
      return data.map(m => ({
        value: getter(m) > 0 ? getter(m) : null,
        timestamp: new Date(m.date).getTime(),
      }));
    };

    const defaultTrend: TrendInfo = { type: 'unknown', icon: '•', label: 'Nessun dato', delta: 0 };

    const hasAnyData = daysWithData.length > 0 || 
                       (lifeAreasData && lifeAreasData.length > 0) ||
                       (rawEmotionsData && rawEmotionsData.length > 0) ||
                       (psychologyData && psychologyData.length > 0);

    if (!hasAnyData) {
      return {
        vitals: { mood: null, anxiety: null, energy: null, sleep: null },
        vitalsTrends: { mood: defaultTrend, anxiety: defaultTrend, energy: defaultTrend, sleep: defaultTrend },
        emotions: { 
          joy: null, sadness: null, anger: null, fear: null, apathy: null,
          shame: null, jealousy: null, hope: null, frustration: null, nostalgia: null,
          nervousness: null, overwhelm: null, excitement: null, disappointment: null,
          disgust: null, surprise: null, serenity: null, pride: null, affection: null, curiosity: null
        },
        lifeAreas: { 
          love: null, work: null, school: null, health: null, social: null, growth: null,
          family: null, leisure: null, finances: null 
        },
        lifeAreasTrends: { 
          love: defaultTrend, work: defaultTrend, school: defaultTrend, 
          health: defaultTrend, social: defaultTrend, growth: defaultTrend,
          family: defaultTrend, leisure: defaultTrend, finances: defaultTrend
        },
        deepPsychology: getEmptyPsychology(),
        hasData: false,
        daysWithData: 0,
      };
    }

    // VITALS
    const moodValues = extractVitalWithTimestamp(daysWithData, m => m.vitals.mood);
    const anxietyValues = extractVitalWithTimestamp(daysWithData, m => m.vitals.anxiety);
    const energyValues = extractVitalWithTimestamp(daysWithData, m => m.vitals.energy);
    const sleepValues = extractVitalWithTimestamp(daysWithData, m => m.vitals.sleep);

    const vitals = {
      mood: calculateTimeWeightedAverage(moodValues, halfLifeDays),
      anxiety: calculateTimeWeightedAverage(anxietyValues, halfLifeDays),
      energy: calculateTimeWeightedAverage(energyValues, halfLifeDays),
      sleep: calculateTimeWeightedAverage(sleepValues, halfLifeDays),
    };

    const vitalsTrends = {
      mood: calculateTrend(moodValues, vitals.mood),
      anxiety: calculateTrend(anxietyValues, vitals.anxiety),
      energy: calculateTrend(energyValues, vitals.energy),
      sleep: calculateTrend(sleepValues, vitals.sleep),
    };

    // ALL 20 EMOTIONS
    const emotionKeys: (keyof EmotionRecord)[] = [
      'joy', 'sadness', 'anger', 'fear', 'apathy',
      'shame', 'jealousy', 'hope', 'frustration', 'nostalgia',
      'nervousness', 'overwhelm', 'excitement', 'disappointment',
      'disgust', 'surprise', 'serenity', 'pride', 'affection', 'curiosity'
    ];

    const extractEmotionWithTimestamp = (key: keyof EmotionRecord): { value: number | null; timestamp: number }[] => {
      if (!rawEmotionsData || rawEmotionsData.length === 0) return [];
      return rawEmotionsData.map(record => ({
        value: typeof record[key] === 'number' ? record[key] as number : null,
        timestamp: new Date(record.updated_at).getTime(),
      }));
    };

    const emotions: ExtendedEmotions = {} as ExtendedEmotions;
    emotionKeys.forEach(key => {
      if (key !== 'updated_at') {
        (emotions as any)[key] = calculateTimeWeightedAverage(extractEmotionWithTimestamp(key), halfLifeDays);
      }
    });

    // ALL 9 LIFE AREAS
    const lifeAreaKeys: (keyof LifeAreaRecord)[] = [
      'love', 'work', 'school', 'health', 'social', 'growth',
      'family', 'leisure', 'finances'
    ];

    const extractLifeAreaWithTimestamp = (key: keyof LifeAreaRecord): { value: number | null; timestamp: number }[] => {
      if (!lifeAreasData || lifeAreasData.length === 0) return [];
      return lifeAreasData.map(record => ({
        value: typeof record[key] === 'number' && record[key] !== null ? record[key] as number : null,
        timestamp: new Date(record.updated_at).getTime(),
      }));
    };

    const lifeAreas: ExtendedLifeAreas = {} as ExtendedLifeAreas;
    const lifeAreasTrends: TimeWeightedData['lifeAreasTrends'] = {} as TimeWeightedData['lifeAreasTrends'];
    
    lifeAreaKeys.forEach(key => {
      if (key !== 'updated_at') {
        const values = extractLifeAreaWithTimestamp(key);
        (lifeAreas as any)[key] = calculateTimeWeightedAverage(values, halfLifeDays);
        (lifeAreasTrends as any)[key] = calculateTrend(values, (lifeAreas as any)[key]);
      }
    });

    // ALL 32 PSYCHOLOGY PARAMETERS
    const psychologyKeys: (keyof ExtendedPsychology)[] = [
      // Attention signals
      'rumination', 'burnout_level', 'loneliness_perceived', 'somatic_tension',
      'appetite_changes', 'guilt', 'irritability', 'intrusive_thoughts',
      // Safety
      'suicidal_ideation', 'hopelessness', 'self_harm_urges',
      // Cognitive
      'dissociation', 'confusion', 'racing_thoughts',
      // Behavioral
      'avoidance', 'social_withdrawal', 'compulsive_urges', 'procrastination',
      // Resources
      'self_efficacy', 'mental_clarity', 'concentration', 'coping_ability',
      'sunlight_exposure', 'gratitude', 'motivation', 'self_worth',
      'sense_of_purpose', 'life_satisfaction', 'perceived_social_support',
      'emotional_regulation', 'resilience', 'mindfulness'
    ];

    const extractPsychologyWithTimestamp = (key: keyof ExtendedPsychology): { value: number | null; timestamp: number }[] => {
      if (!psychologyData || psychologyData.length === 0) return [];
      return psychologyData.map((record: any) => ({
        value: record[key] ?? null,
        timestamp: new Date(record.updated_at).getTime(),
      }));
    };

    const deepPsychology: ExtendedPsychology = {} as ExtendedPsychology;
    psychologyKeys.forEach(key => {
      deepPsychology[key] = calculateTimeWeightedAverage(extractPsychologyWithTimestamp(key), halfLifeDays);
    });

    return {
      vitals,
      vitalsTrends,
      emotions,
      lifeAreas,
      lifeAreasTrends,
      deepPsychology,
      hasData: true,
      daysWithData: Math.max(
        daysWithData.length, 
        lifeAreasData?.length || 0,
        rawEmotionsData?.length || 0,
        psychologyData?.length || 0
      ),
    };
  }, [metricsRange, lifeAreasData, rawEmotionsData, psychologyData, halfLifeDays]);

  return {
    ...weightedData,
    isLoading,
    rawMetrics: metricsRange,
  };
};

function getEmptyPsychology(): ExtendedPsychology {
  return {
    rumination: null, burnout_level: null, loneliness_perceived: null,
    somatic_tension: null, appetite_changes: null, guilt: null,
    irritability: null, intrusive_thoughts: null, suicidal_ideation: null,
    hopelessness: null, self_harm_urges: null, dissociation: null,
    confusion: null, racing_thoughts: null, avoidance: null,
    social_withdrawal: null, compulsive_urges: null, procrastination: null,
    self_efficacy: null, mental_clarity: null, concentration: null,
    coping_ability: null, sunlight_exposure: null, gratitude: null,
    motivation: null, self_worth: null, sense_of_purpose: null,
    life_satisfaction: null, perceived_social_support: null,
    emotional_regulation: null, resilience: null, mindfulness: null,
  };
}

export default useTimeWeightedMetrics;
