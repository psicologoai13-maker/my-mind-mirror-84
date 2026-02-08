import React from 'react';
import { useAIDashboard, MetricConfig } from '@/hooks/useAIDashboard';
import { useTimeWeightedMetrics, TrendInfo } from '@/hooks/useTimeWeightedMetrics';
import AdaptiveVitalCard, { MetricKey, METRIC_CONFIG } from './AdaptiveVitalCard';
import { cn } from '@/lib/utils';

const AdaptiveVitalsSection: React.FC = () => {
  // 🎯 AI-DRIVEN: Layout deciso dall'AI in base al focus utente
  const { layout, isLoading: isLoadingAI, error: aiError } = useAIDashboard();
  // 🎯 TIME-WEIGHTED: Valori calcolati con pesatura temporale (30 giorni, half-life 10 giorni)
  const { vitals, vitalsTrends, emotions, lifeAreas, lifeAreasTrends, deepPsychology, daysWithData, isLoading: isLoadingMetrics } = useTimeWeightedMetrics(30, 10);
  const [showSecondary, setShowSecondary] = React.useState(false);

  // Build metric values and trends from time-weighted source
  // CRITICAL: Return undefined for null values to indicate "no data"
  const metricValues = React.useMemo((): Partial<Record<MetricKey, number | undefined>> => {
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

  // Get metrics from AI layout - ALWAYS ensure 4 metrics
  const primaryMetrics = React.useMemo((): MetricConfig[] => {
    let metrics: MetricConfig[] = [];
    
    if (layout.primary_metrics && layout.primary_metrics.length > 0) {
      metrics = layout.primary_metrics.slice(0, 4);
    }
    
    // Ensure we always have exactly 4 metrics for consistent grid
    if (metrics.length < 4) {
      const existingKeys = new Set(metrics.map(m => m.key));
      const fallbacks = [
        { key: 'mood', priority: 5, reason: 'Umore generale', value: 0 },
        { key: 'anxiety', priority: 6, reason: 'Livello di stress', value: 0 },
        { key: 'energy', priority: 7, reason: 'Energia disponibile', value: 0 },
        { key: 'sleep', priority: 8, reason: 'Qualità del sonno', value: 0 },
      ];
      
      for (const fb of fallbacks) {
        if (metrics.length >= 4) break;
        if (!existingKeys.has(fb.key)) {
          metrics.push(fb);
        }
      }
    }
    
    return metrics.slice(0, 4); // Exactly 4 for 2x2 grid
  }, [layout]);

  // CRITICAL: Wait for BOTH sources to be ready before showing any cards
  // This prevents the staggered loading effect where some cards appear before others
  const isLoading = isLoadingAI || isLoadingMetrics;
  
  // Show skeleton until ALL data sources are ready - unified loading experience
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 px-1">
          <span className="text-xl">🎯</span>
          <h3 className="font-display font-semibold text-sm text-foreground">I tuoi focus</h3>
        </div>
        {/* Silent skeleton grid */}
        <div className="flex gap-3">
          <div className="flex-1 flex flex-col gap-3">
            <div className="h-32 bg-glass/30 border border-glass-border/30 rounded-3xl animate-pulse" />
            <div className="h-32 bg-glass/30 border border-glass-border/30 rounded-3xl animate-pulse" />
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <div className="h-32 bg-glass/30 border border-glass-border/30 rounded-3xl animate-pulse" />
            <div className="h-32 bg-glass/30 border border-glass-border/30 rounded-3xl animate-pulse" />
          </div>
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

      {/* Priority Metrics - 2 independent columns */}
      <div className="flex gap-3">
        {/* Left Column */}
        <div className="flex-1 flex flex-col gap-3">
          {primaryMetrics.filter((_, i) => i % 2 === 0).map((metric, index) => {
            const metricKey = metric.key as MetricKey;
            const config = METRIC_CONFIG[metricKey];
            if (!config) return null;

            return (
              <div 
                key={metricKey}
                className="animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <AdaptiveVitalCard
                  metricKey={metricKey}
                  value={metricValues[metricKey]}
                  trend={metricTrends[metricKey]}
                  isWeeklyAverage={true}
                />
              </div>
            );
          })}
        </div>
        {/* Right Column */}
        <div className="flex-1 flex flex-col gap-3">
          {primaryMetrics.filter((_, i) => i % 2 === 1).map((metric, index) => {
            const metricKey = metric.key as MetricKey;
            const config = METRIC_CONFIG[metricKey];
            if (!config) return null;

            return (
              <div 
                key={metricKey}
                className="animate-scale-in"
                style={{ animationDelay: `${(index * 0.1) + 0.05}s` }}
              >
                <AdaptiveVitalCard
                  metricKey={metricKey}
                  value={metricValues[metricKey]}
                  trend={metricTrends[metricKey]}
                  isWeeklyAverage={true}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdaptiveVitalsSection;
