import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useDailyMetricsRange, DailyMetrics, DeepPsychology } from './useDailyMetrics';
import { subDays, format } from 'date-fns';

/**
 * Calcola una media ponderata dove i dati più recenti hanno più peso.
 * Utilizza una funzione di decay esponenziale.
 * 
 * IMPORTANTE: Usa l'updated_at esatto per pesare i dati più recenti più fortemente,
 * anche se sono dello stesso giorno.
 * 
 * @param values Array di valori con timestamp
 * @param halfLifeDays Dopo quanti giorni il peso si dimezza (default: 7)
 */
const calculateTimeWeightedAverage = (
  values: { value: number | null; timestamp: number }[],
  halfLifeDays: number = 7
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

export interface TimeWeightedData {
  vitals: {
    mood: number | null;
    anxiety: number | null;
    energy: number | null;
    sleep: number | null;
  };
  emotions: {
    joy: number | null;
    sadness: number | null;
    anger: number | null;
    fear: number | null;
    apathy: number | null;
  };
  lifeAreas: {
    love: number | null;
    work: number | null;
    health: number | null;
    social: number | null;
    growth: number | null;
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
 * @param halfLifeDays Dopo quanti giorni il peso si dimezza (default: 7)
 */
export const useTimeWeightedMetrics = (
  lookbackDays: number = 30,
  halfLifeDays: number = 7
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
  
  // Use the existing daily metrics range for vitals, emotions, psychology
  const { metricsRange, isLoading: metricsLoading } = useDailyMetricsRange(startDate, today);

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

  const isLoading = metricsLoading || lifeAreasLoading;

  const weightedData = useMemo<TimeWeightedData>(() => {
    const daysWithData = metricsRange.filter(m => 
      m.has_checkin || m.has_sessions || m.has_emotions || m.has_life_areas || m.has_psychology
    );

    // Helper to extract values with timestamps (uses date, fine for vitals/emotions)
    const extractWithTimestamp = <T extends number | null>(
      data: DailyMetrics[],
      getter: (m: DailyMetrics) => T
    ) => {
      return data.map(m => ({
        value: getter(m),
        timestamp: new Date(m.date).getTime(),
      }));
    };

    if (daysWithData.length === 0 && (!lifeAreasData || lifeAreasData.length === 0)) {
      return {
        vitals: { mood: null, anxiety: null, energy: null, sleep: null },
        emotions: { joy: null, sadness: null, anger: null, fear: null, apathy: null },
        lifeAreas: { love: null, work: null, health: null, social: null, growth: null },
        deepPsychology: {
          rumination: null, self_efficacy: null, mental_clarity: null,
          burnout_level: null, coping_ability: null, loneliness_perceived: null,
          somatic_tension: null, appetite_changes: null, sunlight_exposure: null,
          guilt: null, gratitude: null, irritability: null,
        },
        hasData: false,
        daysWithData: 0,
      };
    }

    // Calculate weighted vitals
    const vitals = {
      mood: calculateTimeWeightedAverage(
        extractWithTimestamp(daysWithData, m => m.vitals.mood > 0 ? m.vitals.mood : null),
        halfLifeDays
      ),
      anxiety: calculateTimeWeightedAverage(
        extractWithTimestamp(daysWithData, m => m.vitals.anxiety > 0 ? m.vitals.anxiety : null),
        halfLifeDays
      ),
      energy: calculateTimeWeightedAverage(
        extractWithTimestamp(daysWithData, m => m.vitals.energy > 0 ? m.vitals.energy : null),
        halfLifeDays
      ),
      sleep: calculateTimeWeightedAverage(
        extractWithTimestamp(daysWithData, m => m.vitals.sleep > 0 ? m.vitals.sleep : null),
        halfLifeDays
      ),
    };

    // Calculate weighted emotions
    const emotions = {
      joy: calculateTimeWeightedAverage(
        extractWithTimestamp(daysWithData, m => m.emotions.joy > 0 ? m.emotions.joy : null),
        halfLifeDays
      ),
      sadness: calculateTimeWeightedAverage(
        extractWithTimestamp(daysWithData, m => m.emotions.sadness > 0 ? m.emotions.sadness : null),
        halfLifeDays
      ),
      anger: calculateTimeWeightedAverage(
        extractWithTimestamp(daysWithData, m => m.emotions.anger > 0 ? m.emotions.anger : null),
        halfLifeDays
      ),
      fear: calculateTimeWeightedAverage(
        extractWithTimestamp(daysWithData, m => m.emotions.fear > 0 ? m.emotions.fear : null),
        halfLifeDays
      ),
      apathy: calculateTimeWeightedAverage(
        extractWithTimestamp(daysWithData, m => m.emotions.apathy > 0 ? m.emotions.apathy : null),
        halfLifeDays
      ),
    };

    // Calculate weighted life areas using ACTUAL updated_at timestamps
    // This is the KEY FIX: ensures recent diary entries override old data properly
    // A breakup entry from 5 minutes ago will heavily outweigh a positive entry from 2 days ago
    const lifeAreasWithTimestamp = (lifeAreasData || []).map(record => ({
      ...record,
      timestamp: new Date(record.updated_at).getTime(),
    }));

    const lifeAreas = {
      love: calculateTimeWeightedAverage(
        lifeAreasWithTimestamp.map(r => ({ value: r.love, timestamp: r.timestamp })),
        halfLifeDays
      ),
      work: calculateTimeWeightedAverage(
        lifeAreasWithTimestamp.map(r => ({ value: r.work, timestamp: r.timestamp })),
        halfLifeDays
      ),
      health: calculateTimeWeightedAverage(
        lifeAreasWithTimestamp.map(r => ({ value: r.health, timestamp: r.timestamp })),
        halfLifeDays
      ),
      social: calculateTimeWeightedAverage(
        lifeAreasWithTimestamp.map(r => ({ value: r.social, timestamp: r.timestamp })),
        halfLifeDays
      ),
      growth: calculateTimeWeightedAverage(
        lifeAreasWithTimestamp.map(r => ({ value: r.growth, timestamp: r.timestamp })),
        halfLifeDays
      ),
    };

    // Calculate weighted deep psychology
    const psychologyKeys: (keyof DeepPsychology)[] = [
      'rumination', 'self_efficacy', 'mental_clarity', 'burnout_level',
      'coping_ability', 'loneliness_perceived', 'somatic_tension',
      'appetite_changes', 'sunlight_exposure', 'guilt', 'gratitude', 'irritability'
    ];

    const deepPsychology: DeepPsychology = {} as DeepPsychology;
    psychologyKeys.forEach(key => {
      deepPsychology[key] = calculateTimeWeightedAverage(
        extractWithTimestamp(daysWithData, m => m.deep_psychology?.[key] ?? null),
        halfLifeDays
      );
    });

    return {
      vitals,
      emotions,
      lifeAreas,
      deepPsychology,
      hasData: true,
      daysWithData: Math.max(daysWithData.length, lifeAreasData?.length || 0),
    };
  }, [metricsRange, lifeAreasData, halfLifeDays]);

  return {
    ...weightedData,
    isLoading,
    rawMetrics: metricsRange,
  };
};

export default useTimeWeightedMetrics;
