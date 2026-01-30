import React from 'react';
import { useAIDashboard, MetricConfig } from '@/hooks/useAIDashboard';
import { useTimeWeightedMetrics } from '@/hooks/useTimeWeightedMetrics';
import AdaptiveVitalCard, { MetricKey, METRIC_CONFIG } from './AdaptiveVitalCard';
import { Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const AdaptiveVitalsSection: React.FC = () => {
  // 🎯 AI-DRIVEN: Layout deciso dall'AI in base al focus utente
  const { layout, isLoading: isLoadingAI, error: aiError } = useAIDashboard();
  // 🎯 TIME-WEIGHTED: Valori calcolati con pesatura temporale
  const { vitals, emotions, lifeAreas, daysWithData, isLoading: isLoadingMetrics } = useTimeWeightedMetrics(30, 7);
  const [showSecondary, setShowSecondary] = React.useState(false);

  // Build metric values from time-weighted source
  // CRITICAL: Return undefined for null values to indicate "no data"
  // This prevents the inversion bug where anxiety 0 becomes 100%
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
    };
  }, [vitals, emotions, lifeAreas]);

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

  const isLoading = isLoadingAI || isLoadingMetrics;
  const hasCachedData = primaryMetrics.length > 0 && primaryMetrics[0].key !== 'mood' || layout.wellness_score !== 5;

  // Only show loading if we have NO data at all
  if (isLoading && !hasCachedData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            AI sta analizzando...
          </span>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Title */}
      <div className="flex items-center gap-2 px-1">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">I tuoi focus</h3>
      </div>

      {/* Priority Metrics - 2 independent columns */}
      <div className="flex gap-4">
        {/* Left Column */}
        <div className="flex-1 flex flex-col gap-4">
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
                  isWeeklyAverage={true}
                />
              </div>
            );
          })}
        </div>
        
        {/* Right Column */}
        <div className="flex-1 flex flex-col gap-4">
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
