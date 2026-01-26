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
  const metricValues = React.useMemo((): Partial<Record<MetricKey, number>> => {
    const toPercentage = (val: number | null | undefined) => 
      val ? Math.min(100, Math.max(0, val * 10)) : 0;

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

  // Get metrics from AI layout
  const primaryMetrics = React.useMemo((): MetricConfig[] => {
    if (layout.primary_metrics && layout.primary_metrics.length > 0) {
      return layout.primary_metrics.slice(0, 6);
    }
    // Fallback
    return [
      { key: 'mood', priority: 1, reason: 'Umore generale', value: 0 },
      { key: 'anxiety', priority: 2, reason: 'Livello di stress', value: 0 },
      { key: 'energy', priority: 3, reason: 'Energia disponibile', value: 0 },
      { key: 'sleep', priority: 4, reason: 'Qualità del sonno', value: 0 },
    ];
  }, [layout]);

  const isLoading = isLoadingAI || isLoadingMetrics;

  if (isLoading) {
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
      {/* Priority Metrics Grid - AI Driven (no separate header, title is in SmartCheckinSection) */}
      <div className={cn(
        "grid gap-4",
        primaryMetrics.length <= 2 ? "grid-cols-2" : 
        primaryMetrics.length <= 4 ? "grid-cols-2" :
        "grid-cols-2 sm:grid-cols-3"
      )}>
        {primaryMetrics.map((metric, index) => {
          const metricKey = metric.key as MetricKey;
          const config = METRIC_CONFIG[metricKey];
          
          if (!config) return null;

          return (
            <div 
              key={metricKey}
              className="animate-scale-in relative group"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <AdaptiveVitalCard
                metricKey={metricKey}
                value={metricValues[metricKey]}
                isWeeklyAverage={true}
              />
              {/* AI Reason tooltip on hover */}
              {metric.reason && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-border">
                  {metric.reason}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default AdaptiveVitalsSection;
