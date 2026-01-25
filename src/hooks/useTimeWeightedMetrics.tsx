import { useMemo } from 'react';
import { useDailyMetricsRange, DailyMetrics, DeepPsychology } from './useDailyMetrics';
import { subDays } from 'date-fns';

/**
 * Calcola una media ponderata dove i dati più recenti hanno più peso.
 * Utilizza una funzione di decay esponenziale.
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

/**
 * Hook che calcola metriche con media ponderata temporale.
 * I dati più recenti hanno più rilevanza rispetto ai dati più vecchi.
 * 
 * @param lookbackDays Numero di giorni da considerare (default: 30)
 * @param halfLifeDays Dopo quanti giorni il peso si dimezza (default: 7)
 */
export const useTimeWeightedMetrics = (
  lookbackDays: number = 30,
  halfLifeDays: number = 7
) => {
  const today = new Date();
  const startDate = subDays(today, lookbackDays);
  const { metricsRange, isLoading } = useDailyMetricsRange(startDate, today);

  const weightedData = useMemo<TimeWeightedData>(() => {
    const daysWithData = metricsRange.filter(m => 
      m.has_checkin || m.has_sessions || m.has_emotions || m.has_life_areas || m.has_psychology
    );

    if (daysWithData.length === 0) {
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

    // Helper to extract values with timestamps
    const extractWithTimestamp = <T extends number | null>(
      data: DailyMetrics[],
      getter: (m: DailyMetrics) => T
    ) => {
      return data.map(m => ({
        value: getter(m),
        timestamp: new Date(m.date).getTime(),
      }));
    };

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

    // Calculate weighted life areas
    const lifeAreas = {
      love: calculateTimeWeightedAverage(
        extractWithTimestamp(daysWithData, m => m.life_areas.love),
        halfLifeDays
      ),
      work: calculateTimeWeightedAverage(
        extractWithTimestamp(daysWithData, m => m.life_areas.work),
        halfLifeDays
      ),
      health: calculateTimeWeightedAverage(
        extractWithTimestamp(daysWithData, m => m.life_areas.health),
        halfLifeDays
      ),
      social: calculateTimeWeightedAverage(
        extractWithTimestamp(daysWithData, m => m.life_areas.social),
        halfLifeDays
      ),
      growth: calculateTimeWeightedAverage(
        extractWithTimestamp(daysWithData, m => m.life_areas.growth),
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
      daysWithData: daysWithData.length,
    };
  }, [metricsRange, halfLifeDays]);

  return {
    ...weightedData,
    isLoading,
    rawMetrics: metricsRange,
  };
};

export default useTimeWeightedMetrics;
