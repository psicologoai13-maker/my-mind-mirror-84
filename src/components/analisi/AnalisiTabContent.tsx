import React from 'react';
import DynamicVitalsGrid from './DynamicVitalsGrid';
import EmotionalSpectrumRadar from './EmotionalSpectrumRadar';
import CorrelationCard from './CorrelationCard';
import DeepPsychologyCard from './DeepPsychologyCard';
import EmotionalMixBar from '@/components/home/EmotionalMixBar';
import LifeBalanceRadar from '@/components/home/LifeBalanceRadar';
import { VitalMetricConfig, ChartConfig } from '@/lib/chartLibrary';
import { MetricConfig } from '@/hooks/useAIAnalysis';
import { TimeRange } from '@/pages/Analisi';
import { DailyMetrics } from '@/hooks/useDailyMetrics';
import { format } from 'date-fns';

interface MenteTabProps {
  metricsRange: DailyMetrics[];
  dynamicVitals: VitalMetricConfig[];
  visibleCharts: ChartConfig[];
  psychologyData: Record<string, number | null>;
  highlightedMetrics: MetricConfig[];
  timeRange: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  onMetricClick: (key: string) => void;
  hasTodayData?: boolean;
}

// Calculate trend for metrics
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

// Calculate correlation between two metrics
const calculateCorrelation = (values1: number[], values2: number[]): 'positive' | 'negative' | 'neutral' => {
  if (values1.length < 3 || values2.length < 3) return 'neutral';
  
  const n = Math.min(values1.length, values2.length);
  const mean1 = values1.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const mean2 = values2.slice(0, n).reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let sum1 = 0;
  let sum2 = 0;
  
  for (let i = 0; i < n; i++) {
    const diff1 = values1[i] - mean1;
    const diff2 = values2[i] - mean2;
    numerator += diff1 * diff2;
    sum1 += diff1 * diff1;
    sum2 += diff2 * diff2;
  }
  
  const denominator = Math.sqrt(sum1) * Math.sqrt(sum2);
  if (denominator === 0) return 'neutral';
  
  const r = numerator / denominator;
  if (r > 0.3) return 'positive';
  if (r < -0.3) return 'negative';
  return 'neutral';
};

export const MenteTab: React.FC<MenteTabProps> = ({
  metricsRange,
  dynamicVitals,
  visibleCharts,
  psychologyData,
  highlightedMetrics,
  timeRange,
  onTimeRangeChange,
  onMetricClick,
  hasTodayData = true,
}) => {
  // Filter days with data
  const daysWithData = metricsRange.filter(m => 
    m.has_checkin || m.has_sessions || m.has_emotions || m.has_life_areas || m.has_psychology
  );

  // Calculate data for dynamic vitals
  const vitalData: Record<string, { value: number | null; trend: 'up' | 'down' | 'stable'; chartData: { value: number }[] }> = {};
  
  dynamicVitals.forEach(metric => {
    let values: number[] = [];
    
    if (metric.source === 'vitals') {
      values = daysWithData
        .map(m => m.vitals[metric.key as keyof typeof m.vitals])
        .filter((v): v is number => v !== null && v !== undefined && v > 0);
    } else if (metric.source === 'psychology') {
      values = daysWithData
        .map(m => {
          const psych = m.deep_psychology as unknown as Record<string, number | null>;
          return psych?.[metric.key];
        })
        .filter((v): v is number => v !== null && v !== undefined && v > 0);
    } else if (metric.source === 'emotions') {
      values = daysWithData
        .map(m => {
          const emotions = m.emotions as Record<string, number>;
          return emotions?.[metric.key];
        })
        .filter((v): v is number => v !== null && v !== undefined && v > 0);
    }

    const average = values.length > 0 
      ? values.reduce((a, b) => a + b, 0) / values.length 
      : null;
    
    vitalData[metric.key] = {
      value: average,
      trend: calculateTrend(values),
      chartData: values.map(v => ({ value: Math.round(v * 10) })),
    };
  });

  // Prepare mood vs anxiety correlation data
  const correlationData = daysWithData
    .filter(m => m.vitals.mood > 0 && m.vitals.anxiety > 0)
    .map(m => ({
      date: format(new Date(m.date), 'dd/MM'),
      metric1: Math.round(m.vitals.mood * 10) / 10,
      metric2: Math.round(m.vitals.anxiety * 10) / 10,
    }))
    .slice(-14); // Last 14 days

  const moodValues = correlationData.map(d => d.metric1);
  const anxietyValues = correlationData.map(d => d.metric2);
  const correlation = calculateCorrelation(moodValues, anxietyValues);

  // Get emotions data
  const latestEmotions = daysWithData[0]?.emotions || { joy: 0, sadness: 0, anger: 0, fear: 0, apathy: 0 };

  // Calculate wellness score trend
  const moodScores = daysWithData.map(m => m.vitals.mood).filter(v => v > 0);
  const wellnessTrend = calculateTrend(moodScores);
  const previousWellnessScore = moodScores.length > 1 
    ? moodScores.slice(-Math.ceil(moodScores.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(moodScores.length / 2)
    : null;

  // Check which charts should be visible
  // Show all charts - don't require strict data availability
  const hasAnyData = daysWithData.length > 0;
  const hasPsychologyData = Object.values(psychologyData).some(v => v !== null && v > 0);
  const hasEmotionData = latestEmotions.joy > 0 || latestEmotions.sadness > 0 || latestEmotions.anger > 0 || latestEmotions.fear > 0;

  return (
    <div className="space-y-6">

      {/* Dynamic Vitals Grid - Always show with time selector */}
      {dynamicVitals.length > 0 && (
        <DynamicVitalsGrid
          metrics={dynamicVitals}
          data={vitalData}
          timeRange={timeRange}
          onTimeRangeChange={onTimeRangeChange}
          onMetricClick={onMetricClick}
          hasTodayData={hasTodayData}
        />
      )}

      {/* Mood vs Anxiety Correlation - Only show with sufficient data */}
      {correlationData.length >= 3 && (
        <CorrelationCard
          title="Umore vs Ansia"
          metric1={{ key: 'mood', label: 'Umore', color: 'hsl(150, 60%, 45%)' }}
          metric2={{ key: 'anxiety', label: 'Ansia', color: 'hsl(25, 80%, 55%)' }}
          data={correlationData}
          correlation={correlation}
          insight={
            correlation === 'negative' 
              ? "Quando l'ansia aumenta, il tuo umore tende a diminuire. Prova tecniche di rilassamento."
              : correlation === 'positive'
              ? "Umore e ansia sembrano muoversi insieme. Potrebbe indicare stress generale."
              : "Non c'è una correlazione significativa tra umore e ansia in questo periodo."
          }
        />
      )}

      {/* Emotional Spectrum Radar - Only show with actual emotion data */}
      {hasEmotionData && (
        <EmotionalSpectrumRadar emotions={latestEmotions} />
      )}

      {/* Emotional Mix Bar - Only show if emotions data exists */}
      {hasEmotionData && (
        <section className="animate-fade-in">
          <EmotionalMixBar />
        </section>
      )}

      {/* Life Balance Radar */}
      {hasAnyData && (
        <section className="animate-fade-in">
          <LifeBalanceRadar />
        </section>
      )}

      {/* Deep Psychology - Always show with placeholder if no data */}
      {hasAnyData && (
        <section className="animate-fade-in">
          <DeepPsychologyCard
            metrics={highlightedMetrics.filter(m => m.category === 'psicologia')}
            psychologyData={psychologyData}
            onMetricClick={(key) => onMetricClick(key)}
          />
        </section>
      )}

      {/* Empty state if no data at all */}
      {!hasAnyData && (
        <div className="text-center py-12 px-6">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="font-display font-semibold text-lg text-foreground mb-2">
            Nessun dato disponibile
          </h3>
          <p className="text-sm text-muted-foreground">
            Completa check-in e sessioni per vedere le tue analisi personalizzate
          </p>
        </div>
      )}
    </div>
  );
};

export default MenteTab;
