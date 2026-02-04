import React, { useState, useMemo } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { subDays, startOfDay, format } from 'date-fns';
import MetricDetailSheet from '@/components/analisi/MetricDetailSheet';
import MenteTab from '@/components/analisi/AnalisiTabContent';
import CorpoTab from '@/components/analisi/CorpoTab';
import AbitudiniTab from '@/components/analisi/AbitudiniTab';
import { useDailyMetricsRange } from '@/hooks/useDailyMetrics';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { useChartVisibility } from '@/hooks/useChartVisibility';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { useHabits } from '@/hooks/useHabits';
import { useObjectives } from '@/hooks/useObjectives';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';

export type TimeRange = 'day' | 'week' | 'month' | 'all';
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

const Analisi: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);

  // Fetch user profile for goals
  const { profile } = useProfile();
  const userGoals = profile?.selected_goals || [];

  // 🎯 AI-DRIVEN: Layout deciso dall'AI
  const { layout: aiLayout, isLoading: isLoadingAI } = useAIAnalysis(timeRange);

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

  // 🎯 SINGLE SOURCE OF TRUTH: Use the unified RPC hook
  const { metricsRange, isLoading } = useDailyMetricsRange(dateRange.start, dateRange.end);
  
  // Get body metrics, habits, objectives for chart visibility
  const { metricsHistory: bodyMetrics } = useBodyMetrics();
  const { habits } = useHabits();
  const { objectives } = useObjectives();

  // 🎯 DYNAMIC CHART VISIBILITY: Based on user data
  const { visibleCharts, coreVitalsOnly, availability } = useChartVisibility(
    metricsRange,
    bodyMetrics || [],
    habits || [],
    objectives || [],
    userGoals
  );

  // Filter days with actual data
  const daysWithData = useMemo(() => {
    return metricsRange.filter(m => 
      m.has_checkin || m.has_sessions || m.has_emotions || m.has_life_areas || m.has_psychology
    );
  }, [metricsRange]);

  // Check if today has data
  const hasTodayData = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return metricsRange.some(m => 
      m.date === todayStr && (m.has_checkin || m.has_sessions || m.has_emotions || m.has_life_areas || m.has_psychology)
    );
  }, [metricsRange]);

  // Check if sections have data - use coreVitalsOnly length to always show mente section
  // This ensures time selector is always visible even with no data for current range
  const hasMenteData = coreVitalsOnly.length > 0;
  const hasCorpoData = (bodyMetrics || []).some(m => m.weight || m.sleep_hours || m.resting_heart_rate);
  const hasAbitudiniData = (habits || []).length > 0;

  // Calculate metrics from unified source (for compatibility)
  const metrics = useMemo<MetricData[]>(() => {
    const calculateAverage = (values: (number | null | undefined)[]) => {
      const valid = values.filter((v): v is number => v !== null && v !== undefined && v > 0);
      if (valid.length === 0) return null;
      return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
    };

    const calculateTrend = (values: (number | null | undefined)[]): 'up' | 'down' | 'stable' => {
      const valid = values.filter((v): v is number => v !== null && v !== undefined && v > 0);
      if (valid.length < 2) return 'stable';
      const midpoint = Math.floor(valid.length / 2);
      const firstHalf = valid.slice(0, midpoint);
      const secondHalf = valid.slice(midpoint);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      if (secondAvg > firstAvg + 0.3) return 'up';
      if (secondAvg < firstAvg - 0.3) return 'down';
      return 'stable';
    };

    const moodValues = daysWithData.map(m => m.vitals.mood);
    const anxietyValues = daysWithData.map(m => m.vitals.anxiety);
    const energyValues = daysWithData.map(m => m.vitals.energy);
    const sleepValues = daysWithData.map(m => m.vitals.sleep);

    return [
      { key: 'mood' as MetricType, label: 'Umore', category: 'vitali' as const, icon: '😌', color: 'hsl(150, 60%, 45%)', average: calculateAverage(moodValues), trend: calculateTrend(moodValues), unit: '/10' },
      { key: 'anxiety' as MetricType, label: 'Ansia', category: 'vitali' as const, icon: '😰', color: 'hsl(25, 80%, 55%)', average: calculateAverage(anxietyValues), trend: calculateTrend(anxietyValues), unit: '/10' },
      { key: 'energy' as MetricType, label: 'Energia', category: 'vitali' as const, icon: '⚡', color: 'hsl(45, 80%, 50%)', average: calculateAverage(energyValues), trend: calculateTrend(energyValues), unit: '/10' },
      { key: 'sleep' as MetricType, label: 'Sonno', category: 'vitali' as const, icon: '💤', color: 'hsl(260, 60%, 55%)', average: calculateAverage(sleepValues), trend: calculateTrend(sleepValues), unit: '/10' },
    ];
  }, [daysWithData]);

  // Get psychology data
  const psychologyData = useMemo(() => {
    const result: Record<string, number | null> = {};
    const psychKeys = ['rumination', 'burnout_level', 'somatic_tension', 'self_efficacy', 'mental_clarity', 'gratitude', 'guilt', 'irritability', 'loneliness_perceived', 'coping_ability', 'concentration', 'motivation', 'self_worth'];
    
    psychKeys.forEach(key => {
      const values = daysWithData
        .map(m => m.deep_psychology?.[key])
        .filter((v): v is number => v !== null && v !== undefined && v > 0);
      result[key] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    });
    
    return result;
  }, [daysWithData]);

  const selectedMetricData = selectedMetric ? metrics.find(m => m.key === selectedMetric) : null;

  // Calculate lookback days based on time range
  const lookbackDays = useMemo(() => {
    switch (timeRange) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'all': return 365;
    }
  }, [timeRange]);

  const hasAnyData = hasMenteData || hasCorpoData || hasAbitudiniData;

  return (
    <MobileLayout>
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Analisi</h1>
            <p className="text-muted-foreground text-sm mt-1">Il tuo wellness a 360°</p>
          </div>
          {(isLoadingAI || isLoading) && (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          )}
        </div>
      </header>

      {/* All Content - Only show sections with data */}
      <div className="px-4 pb-8 space-y-8">
        {/* Mente Section */}
        {hasMenteData && (
          <section>
            <MenteTab
              metricsRange={metricsRange}
              dynamicVitals={coreVitalsOnly}
              visibleCharts={visibleCharts.mente}
              psychologyData={psychologyData}
              highlightedMetrics={aiLayout.highlighted_metrics}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              onMetricClick={(key) => setSelectedMetric(key as MetricType)}
              hasTodayData={hasTodayData}
            />
          </section>
        )}

        {/* Corpo Section */}
        {hasCorpoData && (
          <section>
            <h2 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <span>💪</span> Corpo
            </h2>
            <CorpoTab />
          </section>
        )}

        {/* Abitudini Section */}
        {hasAbitudiniData && (
          <section>
            <h2 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <span>📊</span> Abitudini
            </h2>
            <AbitudiniTab lookbackDays={lookbackDays} />
          </section>
        )}

        {/* Empty state */}
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
        metric={selectedMetricData}
        isOpen={!!selectedMetric}
        onClose={() => setSelectedMetric(null)}
        timeRange={timeRange}
      />
    </MobileLayout>
  );
};

export default Analisi;
