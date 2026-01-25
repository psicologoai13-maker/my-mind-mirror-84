import React from 'react';
import { useTimeWeightedMetrics } from '@/hooks/useTimeWeightedMetrics';
import { useProfile } from '@/hooks/useProfile';
import AdaptiveVitalCard, { MetricKey, METRIC_CONFIG } from './AdaptiveVitalCard';
import { Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Default metrics for users without config
const DEFAULT_PRIORITY_METRICS: MetricKey[] = ['mood', 'anxiety', 'energy', 'sleep'];

// All available metrics that can be displayed
const ALL_METRICS: MetricKey[] = [
  'mood', 'anxiety', 'energy', 'sleep',
  'joy', 'sadness', 'anger', 'fear', 'apathy',
  'love', 'work', 'friendship', 'growth', 'health',
];

interface DashboardConfig {
  priority_metrics?: string[];
  secondary_metrics?: string[];
  hidden_metrics?: string[];
  theme?: string;
}

const AdaptiveVitalsSection: React.FC = () => {
  // 🎯 TIME-WEIGHTED AVERAGE: Dati più recenti hanno più rilevanza
  const { vitals, emotions, lifeAreas, hasData, daysWithData, isLoading: isLoadingMetrics } = useTimeWeightedMetrics(30, 7);
  const { profile, isLoading: isLoadingProfile } = useProfile();
  const [showSecondary, setShowSecondary] = React.useState(false);

  // Parse dashboard_config from profile
  const dashboardConfig = React.useMemo((): DashboardConfig => {
    const config = (profile as any)?.dashboard_config;
    if (config && typeof config === 'object') {
      return config as DashboardConfig;
    }
    return { priority_metrics: DEFAULT_PRIORITY_METRICS };
  }, [profile]);

  // Get priority and secondary metrics from config
  const priorityMetrics = React.useMemo((): MetricKey[] => {
    const configMetrics = dashboardConfig.priority_metrics || [];
    const validMetrics = configMetrics.filter(
      (m): m is MetricKey => ALL_METRICS.includes(m as MetricKey)
    );
    return validMetrics.length > 0 ? validMetrics.slice(0, 6) : DEFAULT_PRIORITY_METRICS;
  }, [dashboardConfig]);

  const secondaryMetrics = React.useMemo((): MetricKey[] => {
    const configMetrics = dashboardConfig.secondary_metrics || [];
    const hiddenMetrics = dashboardConfig.hidden_metrics || [];
    return configMetrics.filter(
      (m): m is MetricKey => 
        ALL_METRICS.includes(m as MetricKey) && 
        !hiddenMetrics.includes(m) &&
        !priorityMetrics.includes(m as MetricKey)
    ).slice(0, 4);
  }, [dashboardConfig, priorityMetrics]);

  // Build metric values from time-weighted source
  const metricValues = React.useMemo((): Partial<Record<MetricKey, number>> => {
    // Convert 1-10 scale to 0-100 for display
    const toPercentage = (val: number | null | undefined) => 
      val ? Math.min(100, Math.max(0, val * 10)) : 0;

    return {
      // Vitals from time-weighted averages
      mood: toPercentage(vitals.mood),
      anxiety: toPercentage(vitals.anxiety),
      energy: toPercentage(vitals.energy),
      sleep: toPercentage(vitals.sleep),
      // Emotions from time-weighted averages
      joy: toPercentage(emotions.joy),
      sadness: toPercentage(emotions.sadness),
      anger: toPercentage(emotions.anger),
      fear: toPercentage(emotions.fear),
      apathy: toPercentage(emotions.apathy),
      // Life Areas from time-weighted averages
      love: toPercentage(lifeAreas.love),
      work: toPercentage(lifeAreas.work),
      friendship: toPercentage(lifeAreas.social),
      social: toPercentage(lifeAreas.social),
      growth: toPercentage(lifeAreas.growth),
      health: toPercentage(lifeAreas.health),
      // Derived metrics
      stress: toPercentage(vitals.anxiety),
      calmness: toPercentage(vitals.anxiety ? 10 - vitals.anxiety : null),
      loneliness: toPercentage(lifeAreas.social ? 10 - lifeAreas.social : null),
      emotional_clarity: toPercentage(vitals.mood),
    };
  }, [vitals, emotions, lifeAreas]);

  const isLoading = isLoadingMetrics || isLoadingProfile;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide px-1">
          I Tuoi Focus
        </h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          I Tuoi Focus
        </h3>
        <span className="text-xs text-muted-foreground">
          Media ponderata {daysWithData > 0 && `(${daysWithData} giorni)`}
        </span>
      </div>
      
      {/* Priority Metrics Grid - Dynamic */}
      <div className={cn(
        "grid gap-4",
        priorityMetrics.length <= 2 ? "grid-cols-2" : 
        priorityMetrics.length <= 4 ? "grid-cols-2" :
        "grid-cols-2 sm:grid-cols-3"
      )}>
        {priorityMetrics.map((metricKey, index) => (
          <div 
            key={metricKey}
            className="animate-scale-in"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <AdaptiveVitalCard
              metricKey={metricKey}
              value={metricValues[metricKey]}
              isWeeklyAverage={true}
            />
          </div>
        ))}
      </div>

      {/* Secondary Metrics - Collapsible */}
      {secondaryMetrics.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowSecondary(!showSecondary)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{showSecondary ? 'Nascondi' : 'Altri parametri'}</span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              showSecondary && "rotate-180"
            )} />
          </button>
          
          {showSecondary && (
            <div className="grid grid-cols-2 gap-3 mt-3 animate-slide-up">
              {secondaryMetrics.map((metricKey, index) => (
                <div 
                  key={metricKey}
                  className="animate-scale-in"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <AdaptiveVitalCard
                    metricKey={metricKey}
                    value={metricValues[metricKey]}
                    isWeeklyAverage={true}
                    isSecondary={true}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdaptiveVitalsSection;
