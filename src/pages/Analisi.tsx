import React, { useState, useMemo } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { subDays, startOfDay } from 'date-fns';
import MetricDetailSheet, { TimeRange } from '@/components/analisi/MetricDetailSheet';
import CategorySection from '@/components/analisi/CategorySection';
import CompactTimeSelector from '@/components/analisi/CompactTimeSelector';
import CorpoTab from '@/components/analisi/CorpoTab';
import AbitudiniTab from '@/components/analisi/AbitudiniTab';
import { useDailyMetricsRange, DailyMetrics } from '@/hooks/useDailyMetrics';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { useHabits } from '@/hooks/useHabits';
import { Loader2 } from 'lucide-react';
import { 
  VITAL_METRICS, 
  EMOTION_METRICS, 
  PSYCHOLOGY_METRICS, 
  LIFE_AREA_METRICS,
  MetricConfig 
} from '@/lib/metricConfigs';

// Re-export TimeRange for backward compatibility
export type { TimeRange };

// Legacy types for backward compatibility
export type MetricType = 'mood' | 'anxiety' | 'energy' | 'sleep' | 'joy' | 'sadness' | 'anger' | 'fear' | 'apathy' | 'love' | 'work' | 'school' | 'social' | 'health' | 'growth' | 'rumination' | 'burnout_level' | 'somatic_tension' | 'self_efficacy' | 'mental_clarity' | 'gratitude' | 'motivation' | 'concentration' | 'self_worth' | 'irritability' | 'loneliness_perceived' | 'guilt';

export interface MetricData {
  key: MetricType;
  label: string;
  category: 'vitali' | 'emozioni' | 'aree' | 'psicologia';
  icon: string;
  color: string;
  average: number | null;
  trend: 'up' | 'down' | 'stable';
  unit?: string;
}

// Helper to calculate trend
const calculateTrend = (values: number[]): 'up' | 'down' | 'stable' => {
  if (values.length < 2) return 'stable';
  const midpoint = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, midpoint);
  const secondHalf = values.slice(midpoint);
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  if (secondAvg > firstAvg + 0.3) return 'up';
  if (secondAvg < firstAvg - 0.3) return 'down';
  return 'stable';
};

// Helper to extract metric value from daily data
const extractValue = (dayData: DailyMetrics, key: string, source: MetricConfig['source']): number | null => {
  let value: number | null = null;
  
  switch (source) {
    case 'vitals':
      value = dayData.vitals[key as keyof typeof dayData.vitals];
      break;
    case 'emotions':
      value = (dayData.emotions as Record<string, number>)?.[key] ?? null;
      break;
    case 'psychology':
      value = (dayData.deep_psychology as unknown as Record<string, number | null>)?.[key] ?? null;
      break;
    case 'life_areas':
      value = dayData.life_areas[key as keyof typeof dayData.life_areas];
      break;
  }
  
  return value && value > 0 ? value : null;
};

interface MetricDataItem {
  value: number | null;
  trend: 'up' | 'down' | 'stable';
  chartData: { value: number }[];
}

const Analisi: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return { start: startOfDay(now), end: now };
      case 'week':
        return { start: subDays(now, 7), end: now };
      case 'month':
        return { start: subDays(now, 30), end: now };
      case 'all':
      default:
        return { start: subDays(now, 365), end: now };
    }
  }, [timeRange]);

  // Fetch data
  const { metricsRange, isLoading } = useDailyMetricsRange(dateRange.start, dateRange.end);
  const { metricsHistory: bodyMetrics } = useBodyMetrics();
  const { habits } = useHabits();

  // Filter days with data
  const daysWithData = useMemo(() => {
    return metricsRange.filter(m => 
      m.has_checkin || m.has_sessions || m.has_emotions || m.has_life_areas || m.has_psychology
    );
  }, [metricsRange]);

  // Build metric data for all categories
  const buildMetricData = (metrics: MetricConfig[]): Record<string, MetricDataItem> => {
    const result: Record<string, MetricDataItem> = {};
    
    metrics.forEach(metric => {
      const values = daysWithData
        .map(m => extractValue(m, metric.key, metric.source))
        .filter((v): v is number => v !== null);
      
      const average = values.length > 0 
        ? values.reduce((a, b) => a + b, 0) / values.length 
        : null;
      
      result[metric.key] = {
        value: average,
        trend: calculateTrend(values),
        chartData: values.map(v => ({ value: Math.round(v * 10) })),
      };
    });
    
    return result;
  };

  // Computed metric data for each category
  const vitalData = useMemo(() => buildMetricData(VITAL_METRICS), [daysWithData]);
  const emotionData = useMemo(() => buildMetricData(EMOTION_METRICS), [daysWithData]);
  const psychologyData = useMemo(() => buildMetricData(PSYCHOLOGY_METRICS), [daysWithData]);
  const lifeAreaData = useMemo(() => buildMetricData(LIFE_AREA_METRICS), [daysWithData]);

  // Check which sections have data
  const hasVitalData = Object.values(vitalData).some(d => d.value !== null);
  const hasEmotionData = Object.values(emotionData).some(d => d.value !== null);
  const hasPsychologyData = Object.values(psychologyData).some(d => d.value !== null);
  const hasLifeAreaData = Object.values(lifeAreaData).some(d => d.value !== null);
  const hasCorpoData = (bodyMetrics || []).some(m => m.weight || m.sleep_hours || m.resting_heart_rate);
  const hasAbitudiniData = (habits || []).length > 0;

  const hasMenteData = hasVitalData || hasEmotionData || hasPsychologyData || hasLifeAreaData;
  const hasAnyData = hasMenteData || hasCorpoData || hasAbitudiniData;

  // Calculate lookback days
  const lookbackDays = useMemo(() => {
    switch (timeRange) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'all': return 365;
    }
  }, [timeRange]);

  return (
    <MobileLayout>
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Analisi</h1>
            <p className="text-muted-foreground text-sm mt-1">Il tuo wellness a 360°</p>
          </div>
          {isLoading && (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          )}
        </div>
      </header>

      <div className="px-4 pb-8 space-y-8">
        
        {/* Global Time Selector */}
        {hasAnyData && (
          <div className="flex justify-center">
            <CompactTimeSelector value={timeRange} onChange={setTimeRange} />
          </div>
        )}

        {/* === MENTE SECTION === */}
        {hasMenteData && (
          <div className="space-y-6">
            {/* Parametri Vitali */}
            {hasVitalData && (
              <CategorySection
                title="Parametri Vitali"
                icon="💫"
                metrics={VITAL_METRICS}
                data={vitalData}
                onMetricClick={setSelectedMetric}
                layout="grid"
              />
            )}

            {/* Emozioni */}
            {hasEmotionData && (
              <CategorySection
                title="Emozioni"
                icon="🎭"
                metrics={EMOTION_METRICS}
                data={emotionData}
                onMetricClick={setSelectedMetric}
                layout="scroll"
              />
            )}

            {/* Psicologia */}
            {hasPsychologyData && (
              <CategorySection
                title="Psicologia"
                icon="🧠"
                metrics={PSYCHOLOGY_METRICS}
                data={psychologyData}
                onMetricClick={setSelectedMetric}
                layout="scroll"
              />
            )}

            {/* Aree della Vita */}
            {hasLifeAreaData && (
              <CategorySection
                title="Aree della Vita"
                icon="🧭"
                metrics={LIFE_AREA_METRICS}
                data={lifeAreaData}
                onMetricClick={setSelectedMetric}
                layout="scroll"
              />
            )}
          </div>
        )}

        {/* === CORPO SECTION === */}
        {hasCorpoData && (
          <section>
            <h2 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <span>💪</span> Corpo
            </h2>
            <CorpoTab />
          </section>
        )}

        {/* === ABITUDINI SECTION === */}
        {hasAbitudiniData && (
          <section>
            <h2 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <span>📊</span> Abitudini
            </h2>
            <AbitudiniTab lookbackDays={lookbackDays} />
          </section>
        )}

        {/* Empty State */}
        {!hasAnyData && !isLoading && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="font-display font-semibold text-lg text-foreground mb-2">
              Nessun dato disponibile
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Completa check-in, sessioni con Aria o traccia abitudini per vedere le tue analisi
            </p>
          </div>
        )}
      </div>

      {/* Metric Detail Sheet */}
      <MetricDetailSheet 
        metricKey={selectedMetric}
        isOpen={!!selectedMetric}
        onClose={() => setSelectedMetric(null)}
        timeRange={timeRange}
      />
    </MobileLayout>
  );
};

export default Analisi;
