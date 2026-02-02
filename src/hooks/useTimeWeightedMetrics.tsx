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
  delta: number; // Difference between recent (3 days) and period average
}

/**
 * Calcola una media ponderata dove i dati più recenti hanno più peso.
 * Utilizza una funzione di decay esponenziale.
 * 
 * IMPORTANTE: Usa l'updated_at esatto per pesare i dati più recenti più fortemente,
 * anche se sono dello stesso giorno.
 * 
 * @param values Array di valori con timestamp
 * @param halfLifeDays Dopo quanti giorni il peso si dimezza (default: 10)
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
  
  // Get recent values (last 3 days)
  const recentValues = values
    .filter(v => v.value !== null && v.value > 0 && v.timestamp >= threeDaysAgo)
    .map(v => v.value as number);
  
  if (recentValues.length === 0) {
    return { type: 'unknown', icon: '•', label: 'Nessun dato recente', delta: 0 };
  }

  const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
  const delta = recentAvg - periodAverage;
  
  // Calculate variance for volatility detection
  const allValid = values.filter(v => v.value !== null && v.value > 0).map(v => v.value as number);
  const variance = allValid.length > 1 
    ? allValid.reduce((sum, val) => sum + Math.pow(val - periodAverage, 2), 0) / allValid.length
    : 0;
  const stdDev = Math.sqrt(variance);

  // Determine trend type
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
  emotions: {
    joy: number | null;
    sadness: number | null;
    anger: number | null;
    fear: number | null;
    apathy: number | null;
    // Secondary emotions
    shame: number | null;
    jealousy: number | null;
    hope: number | null;
    frustration: number | null;
    nostalgia: number | null;
    // NEW: Extended emotions
    nervousness: number | null;
    overwhelm: number | null;
    excitement: number | null;
    disappointment: number | null;
  };
  lifeAreas: {
    love: number | null;
    work: number | null;
    health: number | null;
    social: number | null;
    growth: number | null;
  };
  lifeAreasTrends: {
    love: TrendInfo;
    work: TrendInfo;
    health: TrendInfo;
    social: TrendInfo;
    growth: TrendInfo;
  };
  deepPsychology: DeepPsychology;
  hasData: boolean;
  daysWithData: number;
}

interface LifeAreaRecord {
  love: number | null;
  work: number | null;
  health: number | null;
  social: number | null;
  growth: number | null;
  updated_at: string;
}

/**
 * Hook che calcola metriche con media ponderata temporale.
 * I dati più recenti hanno più rilevanza rispetto ai dati più vecchi.
 * 
 * CRITICO: Ora usa updated_at per pesare le life areas, non solo la data!
 * Questo significa che un'entry fatta 5 minuti fa pesa molto di più
 * di una fatta stamattina o ieri.
 * 
 * @param lookbackDays Numero di giorni da considerare (default: 30)
 * @param halfLifeDays Dopo quanti giorni il peso si dimezza (default: 10)
 */
export const useTimeWeightedMetrics = (
  lookbackDays: number = 30,
  halfLifeDays: number = 10
) => {
  const { user } = useAuth();
  
  // Use Rome timezone for date calculations to match the rest of the app
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
  
  // Use the existing daily metrics range for vitals, life areas, psychology
  const { metricsRange, isLoading: metricsLoading } = useDailyMetricsRange(startDate, today);

  // 🎯 CRITICAL: Fetch emotions DIRECTLY from daily_emotions table
  // The RPC only returns the latest record per day, but we need MAX of all values
  const { data: rawEmotionsData, isLoading: emotionsLoading } = useQuery({
    queryKey: ['emotions-weighted', user?.id, startDateStr, todayRome],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('daily_emotions')
        .select('joy, sadness, anger, fear, apathy, shame, jealousy, hope, frustration, nostalgia, updated_at')
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .lte('date', todayRome)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('[useTimeWeightedMetrics] Error fetching emotions:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  // Fetch life areas directly with updated_at for proper time-weighting
  // CRITICAL: Use Rome date to include today's data correctly
  const { data: lifeAreasData, isLoading: lifeAreasLoading } = useQuery({
    queryKey: ['life-areas-weighted', user?.id, startDateStr, todayRome],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('daily_life_areas')
        .select('love, work, health, social, growth, updated_at')
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .lte('date', todayRome) // Use Rome date to include today
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('[useTimeWeightedMetrics] Error fetching life areas:', error);
        return [];
      }
      
      return (data || []) as LifeAreaRecord[];
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds - refresh often for recent changes
  });

  const isLoading = metricsLoading || lifeAreasLoading || emotionsLoading;

  const weightedData = useMemo<TimeWeightedData>(() => {
    const daysWithData = metricsRange.filter(m => 
      m.has_checkin || m.has_sessions || m.has_emotions || m.has_life_areas || m.has_psychology
    );

    // Helper to extract values with timestamps
    const extractVitalWithTimestamp = (
      data: DailyMetrics[],
      getter: (m: DailyMetrics) => number
    ): { value: number | null; timestamp: number }[] => {
      return data.map(m => ({
        value: getter(m) > 0 ? getter(m) : null,
        timestamp: new Date(m.date).getTime(),
      }));
    };

    // Default trend for no data
    const defaultTrend: TrendInfo = { type: 'unknown', icon: '•', label: 'Nessun dato', delta: 0 };

    if (daysWithData.length === 0 && (!lifeAreasData || lifeAreasData.length === 0)) {
      return {
        vitals: { mood: null, anxiety: null, energy: null, sleep: null },
        vitalsTrends: { mood: defaultTrend, anxiety: defaultTrend, energy: defaultTrend, sleep: defaultTrend },
        emotions: { 
          joy: null, sadness: null, anger: null, fear: null, apathy: null,
          shame: null, jealousy: null, hope: null, frustration: null, nostalgia: null,
          nervousness: null, overwhelm: null, excitement: null, disappointment: null
        },
        lifeAreas: { love: null, work: null, health: null, social: null, growth: null },
        lifeAreasTrends: { love: defaultTrend, work: defaultTrend, health: defaultTrend, social: defaultTrend, growth: defaultTrend },
        deepPsychology: {
          rumination: null, self_efficacy: null, mental_clarity: null, concentration: null,
          burnout_level: null, coping_ability: null, loneliness_perceived: null,
          somatic_tension: null, appetite_changes: null, sunlight_exposure: null,
          guilt: null, gratitude: null, irritability: null,
          motivation: null, intrusive_thoughts: null, self_worth: null,
        },
        hasData: false,
        daysWithData: 0,
      };
    }

    // 🎯 VITALS: WEIGHTED RECENT (30 giorni, half-life 10 giorni)
    // Media ponderata dove i dati recenti pesano di più
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

    // Calculate trends for vitals
    const vitalsTrends = {
      mood: calculateTrend(moodValues, vitals.mood),
      anxiety: calculateTrend(anxietyValues, vitals.anxiety),
      energy: calculateTrend(energyValues, vitals.energy),
      sleep: calculateTrend(sleepValues, vitals.sleep),
    };

    // 🎯 EMOTIONS: Query diretta sulla tabella daily_emotions
    type EmotionKey = 'joy' | 'sadness' | 'anger' | 'fear' | 'apathy' | 'shame' | 'jealousy' | 'hope' | 'frustration' | 'nostalgia' | 'nervousness' | 'overwhelm' | 'excitement' | 'disappointment';
    
    // For emotions, extract with timestamps from raw data
    const extractEmotionWithTimestamp = (key: EmotionKey): { value: number | null; timestamp: number }[] => {
      if (!rawEmotionsData || rawEmotionsData.length === 0) return [];
      return rawEmotionsData.map(record => ({
        value: typeof record[key as keyof typeof record] === 'number' ? record[key as keyof typeof record] as number : null,
        timestamp: new Date(record.updated_at).getTime(),
      }));
    };

    const emotions = {
      // Primary emotions (5) - weighted average
      joy: calculateTimeWeightedAverage(extractEmotionWithTimestamp('joy'), halfLifeDays),
      sadness: calculateTimeWeightedAverage(extractEmotionWithTimestamp('sadness'), halfLifeDays),
      anger: calculateTimeWeightedAverage(extractEmotionWithTimestamp('anger'), halfLifeDays),
      fear: calculateTimeWeightedAverage(extractEmotionWithTimestamp('fear'), halfLifeDays),
      apathy: calculateTimeWeightedAverage(extractEmotionWithTimestamp('apathy'), halfLifeDays),
      // Secondary emotions (5)
      shame: calculateTimeWeightedAverage(extractEmotionWithTimestamp('shame'), halfLifeDays),
      jealousy: calculateTimeWeightedAverage(extractEmotionWithTimestamp('jealousy'), halfLifeDays),
      hope: calculateTimeWeightedAverage(extractEmotionWithTimestamp('hope'), halfLifeDays),
      frustration: calculateTimeWeightedAverage(extractEmotionWithTimestamp('frustration'), halfLifeDays),
      nostalgia: calculateTimeWeightedAverage(extractEmotionWithTimestamp('nostalgia'), halfLifeDays),
      // Extended emotions (4)
      nervousness: calculateTimeWeightedAverage(extractEmotionWithTimestamp('nervousness'), halfLifeDays),
      overwhelm: calculateTimeWeightedAverage(extractEmotionWithTimestamp('overwhelm'), halfLifeDays),
      excitement: calculateTimeWeightedAverage(extractEmotionWithTimestamp('excitement'), halfLifeDays),
      disappointment: calculateTimeWeightedAverage(extractEmotionWithTimestamp('disappointment'), halfLifeDays),
    };

    // 🎯 LIFE AREAS: WEIGHTED RECENT (30 giorni, half-life 10 giorni)
    const extractLifeAreaWithTimestamp = (key: keyof LifeAreaRecord): { value: number | null; timestamp: number }[] => {
      if (!lifeAreasData || lifeAreasData.length === 0) return [];
      return lifeAreasData.map(record => ({
        value: typeof record[key] === 'number' && record[key] !== null ? record[key] as number : null,
        timestamp: new Date(record.updated_at).getTime(),
      }));
    };

    const loveValues = extractLifeAreaWithTimestamp('love');
    const workValues = extractLifeAreaWithTimestamp('work');
    const healthValues = extractLifeAreaWithTimestamp('health');
    const socialValues = extractLifeAreaWithTimestamp('social');
    const growthValues = extractLifeAreaWithTimestamp('growth');

    const lifeAreas = {
      love: calculateTimeWeightedAverage(loveValues, halfLifeDays),
      work: calculateTimeWeightedAverage(workValues, halfLifeDays),
      health: calculateTimeWeightedAverage(healthValues, halfLifeDays),
      social: calculateTimeWeightedAverage(socialValues, halfLifeDays),
      growth: calculateTimeWeightedAverage(growthValues, halfLifeDays),
    };

    // Calculate trends for life areas
    const lifeAreasTrends = {
      love: calculateTrend(loveValues, lifeAreas.love),
      work: calculateTrend(workValues, lifeAreas.work),
      health: calculateTrend(healthValues, lifeAreas.health),
      social: calculateTrend(socialValues, lifeAreas.social),
      growth: calculateTrend(growthValues, lifeAreas.growth),
    };

    // 🎯 DEEP PSYCHOLOGY: Weighted average (16 parametri totali)
    const sortedByDate = [...daysWithData].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const psychologyKeys: (keyof DeepPsychology)[] = [
      'rumination', 'self_efficacy', 'mental_clarity', 'concentration',
      'burnout_level', 'coping_ability', 'loneliness_perceived',
      'somatic_tension', 'appetite_changes', 'sunlight_exposure', 
      'guilt', 'gratitude', 'irritability',
      'motivation', 'intrusive_thoughts', 'self_worth'
    ];

    const extractPsychologyWithTimestamp = (key: keyof DeepPsychology): { value: number | null; timestamp: number }[] => {
      return daysWithData.map(m => ({
        value: m.deep_psychology?.[key] ?? null,
        timestamp: new Date(m.date).getTime(),
      }));
    };

    const deepPsychology: DeepPsychology = {} as DeepPsychology;
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
      daysWithData: Math.max(daysWithData.length, lifeAreasData?.length || 0),
    };
  }, [metricsRange, lifeAreasData, rawEmotionsData, halfLifeDays]);

  return {
    ...weightedData,
    isLoading,
    rawMetrics: metricsRange,
  };
};

export default useTimeWeightedMetrics;
