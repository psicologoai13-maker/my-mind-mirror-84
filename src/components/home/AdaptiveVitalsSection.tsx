import React from 'react';
import { useAIDashboard, MetricConfig } from '@/hooks/useAIDashboard';
import { useTimeWeightedMetrics, TrendInfo } from '@/hooks/useTimeWeightedMetrics';
import AdaptiveVitalCard, { MetricKey, METRIC_CONFIG } from './AdaptiveVitalCard';
import { cn } from '@/lib/utils';

const AdaptiveVitalsSection: React.FC = () => {
  // 🎯 AI-DRIVEN: Layout deciso dall'AI in base al focus utente - includes CACHED values!
  const { layout, isLoading: isLoadingAI, error: aiError } = useAIDashboard();
  // 🎯 TIME-WEIGHTED: Valori calcolati con pesatura temporale (30 giorni, half-life 10 giorni)
  const { vitals, vitalsTrends, emotions, lifeAreas, lifeAreasTrends, deepPsychology, daysWithData, isLoading: isLoadingMetrics } = useTimeWeightedMetrics(30, 10);
  const [showSecondary, setShowSecondary] = React.useState(false);

  // CRITICAL FIX: Use AI cache values FIRST if available (from primary_metrics)
  // This enables INSTANT render without waiting for useTimeWeightedMetrics DB queries
  const cachedMetricValues = React.useMemo((): Partial<Record<MetricKey, number | undefined>> => {
    const values: Partial<Record<MetricKey, number | undefined>> = {};
    
    // Extract values from AI layout cache - these are pre-computed!
    if (layout.primary_metrics) {
      layout.primary_metrics.forEach(metric => {
        if (metric.value && metric.value > 0) {
          // AI cache stores 0-10 scale, convert to 0-100 percentage
          values[metric.key as MetricKey] = Math.min(100, Math.max(0, metric.value * 10));
        }
      });
    }
    
    return values;
  }, [layout.primary_metrics]);

  // Build metric values from time-weighted source (fresh data when available)
  const freshMetricValues = React.useMemo((): Partial<Record<MetricKey, number | undefined>> => {
    const toPercentage = (val: number | null | undefined): number | undefined => 
      val !== null && val !== undefined && val > 0 
        ? Math.min(100, Math.max(0, val * 10)) 
        : undefined;

    return {
      mood: toPercentage(vitals.mood),
      anxiety: toPercentage(vitals.anxiety),
      energy: toPercentage(vitals.energy),
      sleep: toPercentage(vitals.sleep),
      joy: toPercentage(emotions.joy),
      sadness: toPercentage(emotions.sadness),
      anger: toPercentage(emotions.anger),
      fear: toPercentage(emotions.fear),
      apathy: toPercentage(emotions.apathy),
      love: toPercentage(lifeAreas.love),
      work: toPercentage(lifeAreas.work),
      friendship: toPercentage(lifeAreas.social),
      social: toPercentage(lifeAreas.social),
      growth: toPercentage(lifeAreas.growth),
      health: toPercentage(lifeAreas.health),
      stress: toPercentage(vitals.anxiety),
      calmness: toPercentage(vitals.anxiety ? 10 - vitals.anxiety : null),
      loneliness: toPercentage(lifeAreas.social ? 10 - lifeAreas.social : null),
      emotional_clarity: toPercentage(vitals.mood),
      // Psychology metrics
      self_efficacy: toPercentage(deepPsychology.self_efficacy),
      mental_clarity: toPercentage(deepPsychology.mental_clarity),
      motivation: toPercentage(deepPsychology.motivation),
      rumination: toPercentage(deepPsychology.rumination),
      burnout_level: toPercentage(deepPsychology.burnout_level),
      self_worth: toPercentage(deepPsychology.self_worth),
      gratitude: toPercentage(deepPsychology.gratitude),
      concentration: toPercentage(deepPsychology.concentration),
      resilience: toPercentage(deepPsychology.resilience),
      mindfulness: toPercentage(deepPsychology.mindfulness),
      life_satisfaction: toPercentage(deepPsychology.life_satisfaction),
      sense_of_purpose: toPercentage(deepPsychology.sense_of_purpose),
    };
  }, [vitals, emotions, lifeAreas, deepPsychology]);

  // MERGE: Use fresh values when available, fallback to cached values
  const metricValues = React.useMemo((): Partial<Record<MetricKey, number | undefined>> => {
    const merged: Partial<Record<MetricKey, number | undefined>> = { ...cachedMetricValues };
    
    // Override with fresh values when available
    Object.entries(freshMetricValues).forEach(([key, value]) => {
      if (value !== undefined) {
        merged[key as MetricKey] = value;
      }
    });
    
    return merged;
  }, [cachedMetricValues, freshMetricValues]);

  // Build trend mapping for each metric key
  const metricTrends = React.useMemo((): Partial<Record<MetricKey, TrendInfo>> => {
    const defaultTrend: TrendInfo = { type: 'unknown', icon: '•', label: 'Nessun dato', delta: 0 };
    
    return {
      mood: vitalsTrends.mood,
      anxiety: vitalsTrends.anxiety,
      energy: vitalsTrends.energy,
      sleep: vitalsTrends.sleep,
      love: lifeAreasTrends.love,
      work: lifeAreasTrends.work,
      health: lifeAreasTrends.health,
      social: lifeAreasTrends.social,
      friendship: lifeAreasTrends.social,
      growth: lifeAreasTrends.growth,
      // For derived metrics, use related trends
      stress: vitalsTrends.anxiety,
      calmness: vitalsTrends.anxiety,
      loneliness: lifeAreasTrends.social,
      emotional_clarity: vitalsTrends.mood,
      // Emotions don't have dedicated trends yet, use default
      joy: defaultTrend,
      sadness: defaultTrend,
      anger: defaultTrend,
      fear: defaultTrend,
      apathy: defaultTrend,
      // Psychology metrics - use default trends for now
      self_efficacy: defaultTrend,
      mental_clarity: defaultTrend,
      motivation: defaultTrend,
      rumination: defaultTrend,
      burnout_level: defaultTrend,
      self_worth: defaultTrend,
      gratitude: defaultTrend,
      concentration: defaultTrend,
      resilience: defaultTrend,
      mindfulness: defaultTrend,
      life_satisfaction: defaultTrend,
      sense_of_purpose: defaultTrend,
    };
  }, [vitalsTrends, lifeAreasTrends]);

  // Get metrics from AI layout - ALWAYS ensure 8 metrics
  const primaryMetrics = React.useMemo((): MetricConfig[] => {
    let metrics: MetricConfig[] = [];
    
    if (layout.primary_metrics && layout.primary_metrics.length > 0) {
      metrics = layout.primary_metrics.slice(0, 8);
    }
    
    // Ensure we always have exactly 8 metrics for consistent grid
    if (metrics.length < 8) {
      const existingKeys = new Set(metrics.map(m => m.key));
      const fallbacks = [
        { key: 'mood', priority: 1, reason: 'Umore generale', value: 0 },
        { key: 'anxiety', priority: 2, reason: 'Livello di stress', value: 0 },
        { key: 'energy', priority: 3, reason: 'Energia disponibile', value: 0 },
        { key: 'sleep', priority: 4, reason: 'Qualità del sonno', value: 0 },
        { key: 'motivation', priority: 5, reason: 'Spinta interiore', value: 0 },
        { key: 'self_worth', priority: 6, reason: 'Autostima', value: 0 },
        { key: 'concentration', priority: 7, reason: 'Concentrazione', value: 0 },
        { key: 'resilience', priority: 8, reason: 'Resilienza', value: 0 },
      ];
      
      for (const fb of fallbacks) {
        if (metrics.length >= 8) break;
        if (!existingKeys.has(fb.key)) {
          metrics.push(fb);
        }
      }
    }
    
    return metrics.slice(0, 8); // Exactly 8 for 2x4 grid
  }, [layout]);

  // CRITICAL FIX: Check if we have CACHED values to show immediately
  // Only show loading skeleton if:
  // 1. AI layout is loading AND we have no cached metrics
  // 2. This prevents 3-4 second delay when cache exists
  const hasCachedValues = Object.values(cachedMetricValues).some(v => v !== undefined);
  const isLoading = isLoadingAI && !hasCachedValues;
  
  // Show skeleton only if truly loading with no cached data
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 px-1">
          <span className="text-xl">🎯</span>
          <h3 className="font-display font-semibold text-sm text-foreground">I tuoi focus</h3>
        </div>
        {/* Silent skeleton grid */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-glass/30 border border-glass-border/30 rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-tutorial="vitals">
      {/* Section Title */}
      <div className="flex items-center gap-2.5 px-1">
        <span className="text-xl">🎯</span>
        <h3 className="font-display font-semibold text-sm text-foreground">I tuoi focus</h3>
      </div>

      {/* Priority Metrics - 2x4 grid */}
      <div className="grid grid-cols-2 gap-3">
        {primaryMetrics.map((metric, index) => {
          const metricKey = metric.key as MetricKey;
          const config = METRIC_CONFIG[metricKey];
          if (!config) return null;

          return (
            <div 
              key={metricKey}
              className="animate-scale-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <AdaptiveVitalCard
                metricKey={metricKey}
                value={metricValues[metricKey]}
                trend={metricTrends[metricKey]}
                isWeeklyAverage={true}
                isSecondary={true}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdaptiveVitalsSection;
