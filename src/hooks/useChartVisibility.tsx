import { useMemo } from 'react';
import { ChartConfig, CHART_LIBRARY, ChartCategory, ALL_VITAL_METRICS, VitalMetricConfig } from '@/lib/chartLibrary';
import { DailyMetrics } from '@/hooks/useDailyMetrics';

export interface UserDataAvailability {
  hasVitals: boolean;
  hasMood: boolean;
  hasAnxiety: boolean;
  hasEnergy: boolean;
  hasSleep: boolean;
  hasEmotions: boolean;
  hasLifeAreas: boolean;
  hasPsychology: boolean;
  hasSessions: boolean;
  sessionCount: number;
  
  // Body
  hasWeight: boolean;
  hasSleepHours: boolean;
  hasHeartRate: boolean;
  hasSteps: boolean;
  hasCalories: boolean;
  hasBodyFat: boolean;
  hasMuscleMass: boolean;
  
  // Habits & Objectives
  hasHabits: boolean;
  habitCount: number;
  hasObjectives: boolean;
  objectiveCount: number;
  
  // Data points count for trends
  dataPointsCount: number;
  
  // Psychology metrics available
  psychologyMetrics: string[];
  
  // User goals from onboarding
  userGoals: string[];
}

// Analyze user data to determine availability
export function analyzeUserData(
  metricsRange: DailyMetrics[],
  bodyMetrics: any[] = [],
  habits: any[] = [],
  objectives: any[] = [],
  userGoals: string[] = []
): UserDataAvailability {
  const daysWithData = metricsRange.filter(m => 
    m.has_checkin || m.has_sessions || m.has_emotions || m.has_life_areas || m.has_psychology
  );

  // Check vital availability
  const hasVitalData = (key: 'mood' | 'anxiety' | 'energy' | 'sleep') => 
    daysWithData.some(m => m.vitals[key] > 0);

  // Check emotions
  const hasEmotions = daysWithData.some(m => m.has_emotions);
  
  // Check life areas
  const hasLifeAreas = daysWithData.some(m => m.has_life_areas);
  
  // Check psychology
  const hasPsychology = daysWithData.some(m => m.has_psychology);
  
  // Get available psychology metrics
  const psychologyMetrics: string[] = [];
  const psychKeys = ['rumination', 'burnout_level', 'somatic_tension', 'self_efficacy', 'mental_clarity', 'gratitude', 'guilt', 'irritability', 'loneliness_perceived', 'concentration', 'motivation', 'self_worth'];
  
  psychKeys.forEach(key => {
    if (daysWithData.some(m => {
      const psych = m.deep_psychology as unknown as Record<string, number | null>;
      return psych?.[key] !== null && psych?.[key] !== undefined;
    })) {
      psychologyMetrics.push(key);
    }
  });

  // Body metrics
  const hasWeight = bodyMetrics.some(b => b.weight !== null);
  const hasSleepHours = bodyMetrics.some(b => b.sleep_hours !== null);
  const hasHeartRate = bodyMetrics.some(b => b.resting_heart_rate !== null);
  const hasSteps = bodyMetrics.some(b => b.steps !== null);
  const hasCalories = bodyMetrics.some(b => b.calories_burned !== null);
  const hasBodyFat = bodyMetrics.some(b => b.body_fat_percentage !== null);
  const hasMuscleMass = bodyMetrics.some(b => b.muscle_mass !== null);

  return {
    hasVitals: hasVitalData('mood') || hasVitalData('anxiety') || hasVitalData('energy') || hasVitalData('sleep'),
    hasMood: hasVitalData('mood'),
    hasAnxiety: hasVitalData('anxiety'),
    hasEnergy: hasVitalData('energy'),
    hasSleep: hasVitalData('sleep'),
    hasEmotions,
    hasLifeAreas,
    hasPsychology,
    hasSessions: daysWithData.some(m => m.has_sessions),
    sessionCount: daysWithData.filter(m => m.has_sessions).length,
    hasWeight,
    hasSleepHours,
    hasHeartRate,
    hasSteps,
    hasCalories,
    hasBodyFat,
    hasMuscleMass,
    hasHabits: habits.length > 0,
    habitCount: habits.length,
    hasObjectives: objectives.length > 0,
    objectiveCount: objectives.length,
    dataPointsCount: daysWithData.length,
    psychologyMetrics,
    userGoals,
  };
}

// Determine which charts should be visible
export function selectVisibleCharts(
  availability: UserDataAvailability,
  category: ChartCategory
): ChartConfig[] {
  const categoryCharts = CHART_LIBRARY.filter(c => c.category === category);
  
  return categoryCharts.filter(chart => {
    // Check minimum data points
    if (chart.minDataPoints && availability.dataPointsCount < chart.minDataPoints) {
      return false;
    }
    
    // Check required data availability
    return chart.requiredData.every(req => {
      switch (req) {
        case 'vitals':
          return availability.hasVitals;
        case 'mood':
          return availability.hasMood;
        case 'anxiety':
          return availability.hasAnxiety;
        case 'energy':
          return availability.hasEnergy;
        case 'sleep':
          return availability.hasSleep;
        case 'emotions':
          return availability.hasEmotions;
        case 'life_areas':
          return availability.hasLifeAreas;
        case 'psychology':
          return availability.hasPsychology;
        case 'sessions':
          return availability.hasSessions;
        case 'weight':
          return availability.hasWeight;
        case 'sleep_hours':
          return availability.hasSleepHours;
        case 'heart_rate':
          return availability.hasHeartRate;
        case 'steps':
          return availability.hasSteps;
        case 'calories':
          return availability.hasCalories;
        case 'body_fat':
          return availability.hasBodyFat;
        case 'muscle_mass':
          return availability.hasMuscleMass;
        case 'habits':
          return availability.hasHabits;
        case 'objectives':
          return availability.hasObjectives;
        default:
          return true;
      }
    });
  }).sort((a, b) => a.priority - b.priority);
}

// Select dynamic vital metrics based on user data and goals
export function selectDynamicVitals(
  availability: UserDataAvailability,
  maxMetrics: number = 6
): VitalMetricConfig[] {
  const selectedMetrics: VitalMetricConfig[] = [];
  const { userGoals, psychologyMetrics } = availability;
  
  // Priority 1: Always include core vitals if available
  const coreVitals = ['mood', 'energy'];
  coreVitals.forEach(key => {
    const metric = ALL_VITAL_METRICS.find(m => m.key === key);
    if (metric && availability[`has${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof UserDataAvailability]) {
      selectedMetrics.push(metric);
    }
  });
  
  // Priority 2: Add anxiety if user tracks it
  if (availability.hasAnxiety && selectedMetrics.length < maxMetrics) {
    const anxiety = ALL_VITAL_METRICS.find(m => m.key === 'anxiety');
    if (anxiety) selectedMetrics.push(anxiety);
  }
  
  // Priority 3: Add sleep if user tracks it
  if (availability.hasSleep && selectedMetrics.length < maxMetrics) {
    const sleep = ALL_VITAL_METRICS.find(m => m.key === 'sleep');
    if (sleep) selectedMetrics.push(sleep);
  }
  
  // Priority 4: Add psychology metrics based on user goals
  const goalToMetricMap: Record<string, string[]> = {
    'reduce_anxiety': ['anxiety', 'mental_clarity', 'somatic_tension'],
    'improve_sleep': ['sleep', 'energy', 'burnout_level'],
    'boost_mood': ['mood', 'gratitude', 'joy'],
    'manage_stress': ['burnout_level', 'rumination', 'somatic_tension'],
    'build_confidence': ['self_efficacy', 'self_worth', 'motivation'],
    'increase_focus': ['concentration', 'mental_clarity', 'motivation'],
    'emotional_balance': ['irritability', 'rumination', 'gratitude'],
  };
  
  userGoals.forEach(goal => {
    const relevantMetrics = goalToMetricMap[goal] || [];
    relevantMetrics.forEach(metricKey => {
      if (selectedMetrics.length >= maxMetrics) return;
      if (selectedMetrics.some(m => m.key === metricKey)) return;
      
      // Only add if we have data for this metric
      if (psychologyMetrics.includes(metricKey) || 
          ['mood', 'anxiety', 'energy', 'sleep'].includes(metricKey)) {
        const metric = ALL_VITAL_METRICS.find(m => m.key === metricKey);
        if (metric) selectedMetrics.push(metric);
      }
    });
  });
  
  // Priority 5: Fill remaining slots with available psychology metrics
  if (selectedMetrics.length < maxMetrics) {
    const positiveMetrics = ['mental_clarity', 'self_efficacy', 'motivation', 'gratitude', 'concentration'];
    positiveMetrics.forEach(key => {
      if (selectedMetrics.length >= maxMetrics) return;
      if (selectedMetrics.some(m => m.key === key)) return;
      if (psychologyMetrics.includes(key)) {
        const metric = ALL_VITAL_METRICS.find(m => m.key === key);
        if (metric) selectedMetrics.push(metric);
      }
    });
  }
  
  return selectedMetrics.slice(0, maxMetrics);
}

// Main hook
export function useChartVisibility(
  metricsRange: DailyMetrics[],
  bodyMetrics: any[] = [],
  habits: any[] = [],
  objectives: any[] = [],
  userGoals: string[] = []
) {
  const availability = useMemo(() => 
    analyzeUserData(metricsRange, bodyMetrics, habits, objectives, userGoals),
    [metricsRange, bodyMetrics, habits, objectives, userGoals]
  );
  
  const visibleCharts = useMemo(() => ({
    mente: selectVisibleCharts(availability, 'mente'),
    corpo: selectVisibleCharts(availability, 'corpo'),
    abitudini: selectVisibleCharts(availability, 'abitudini'),
    obiettivi: selectVisibleCharts(availability, 'obiettivi'),
  }), [availability]);
  
  const dynamicVitals = useMemo(() => 
    selectDynamicVitals(availability, 6),
    [availability]
  );
  
  return {
    availability,
    visibleCharts,
    dynamicVitals,
  };
}
