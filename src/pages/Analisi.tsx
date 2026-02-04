import React, { useState, useMemo } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { subDays, startOfDay, format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDailyMetricsRange } from '@/hooks/useDailyMetrics';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { useHabits } from '@/hooks/useHabits';
import { Loader2 } from 'lucide-react';
import CompactTimeSelector from '@/components/analisi/CompactTimeSelector';
import ClinicalDomainSection, { MetricData as ClinicalMetricData } from '@/components/analisi/ClinicalDomainSection';
import MetricDetailSheet from '@/components/analisi/MetricDetailSheet';
import CorpoTab from '@/components/analisi/CorpoTab';
import AbitudiniTab from '@/components/analisi/AbitudiniTab';
import EmotionalSpectrumSection from '@/components/analisi/EmotionalSpectrumSection';
import LifeAreasSection from '@/components/analisi/LifeAreasSection';
import { 
  CLINICAL_DOMAINS, 
  getMetricsByDomain, 
  DomainId,
  ClinicalMetric 
} from '@/lib/clinicalDomains';

export type TimeRange = 'day' | 'week' | 'month' | 'all';

// Legacy type exports for backward compatibility with old components
export type MetricType = string;
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
  const { user } = useAuth();
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

  // Fetch all data
  const { metricsRange, isLoading } = useDailyMetricsRange(dateRange.start, dateRange.end);
  const { metricsHistory: bodyMetrics } = useBodyMetrics();
  const { habits } = useHabits();
  
  // Fetch emotions directly from daily_emotions table (full 14 emotions)
  const { data: emotionsData } = useQuery({
    queryKey: ['daily-emotions-range', user?.id, format(dateRange.start, 'yyyy-MM-dd'), format(dateRange.end, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('daily_emotions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('date', format(dateRange.end, 'yyyy-MM-dd'))
        .order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  // Check if today has data (for time selector)
  const hasTodayData = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return metricsRange.some(m => 
      m.date === todayStr && (m.has_checkin || m.has_sessions || m.has_emotions || m.has_life_areas || m.has_psychology)
    );
  }, [metricsRange]);

  // Process all metrics data for clinical domains
  const allMetricsData = useMemo<Record<string, ClinicalMetricData>>(() => {
    const result: Record<string, ClinicalMetricData> = {};
    
    // Filter days with actual data
    const daysWithData = metricsRange.filter(m => 
      m.has_checkin || m.has_sessions || m.has_emotions || m.has_life_areas || m.has_psychology
    );

    // Helper to calculate metric data
    const calculateMetricData = (
      values: (number | null | undefined)[]
    ): ClinicalMetricData => {
      const validValues = values.filter((v): v is number => v !== null && v !== undefined && v > 0);
      
      // Calculate average
      const value = validValues.length > 0 
        ? Math.round((validValues.reduce((a, b) => a + b, 0) / validValues.length) * 10) / 10
        : null;
      
      // Calculate trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (validValues.length >= 2) {
        const midpoint = Math.floor(validValues.length / 2);
        const firstHalf = validValues.slice(0, midpoint);
        const secondHalf = validValues.slice(midpoint);
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        if (secondAvg > firstAvg + 0.3) trend = 'up';
        if (secondAvg < firstAvg - 0.3) trend = 'down';
      }
      
      // Get last 7 values for sparkline
      const sparklineData = validValues.slice(-7);
      
      return { value, trend, sparklineData };
    };

    // ══════════════════════════════════════════════════════════
    // VITALS
    // ══════════════════════════════════════════════════════════
    const vitalKeys = ['mood', 'anxiety', 'energy', 'sleep'] as const;
    vitalKeys.forEach(key => {
      const values = daysWithData.map(m => m.vitals[key]);
      result[key] = calculateMetricData(values);
    });

    // ══════════════════════════════════════════════════════════
    // EMOTIONS
    // ══════════════════════════════════════════════════════════
    const emotionKeys = [
      'joy', 'sadness', 'anger', 'fear', 'apathy', 
      'shame', 'jealousy', 'hope', 'frustration', 
      'nostalgia', 'nervousness', 'overwhelm', 
      'excitement', 'disappointment'
    ] as const;
    
    emotionKeys.forEach(key => {
      const values = daysWithData.map(m => m.emotions[key as keyof typeof m.emotions] as number | null);
      result[key] = calculateMetricData(values);
    });

    // ══════════════════════════════════════════════════════════
    // PSYCHOLOGY (deep_psychology)
    // ══════════════════════════════════════════════════════════
    const psychKeys = [
      'rumination', 'burnout_level', 'somatic_tension', 'self_efficacy',
      'mental_clarity', 'gratitude', 'guilt', 'irritability',
      'loneliness_perceived', 'coping_ability', 'concentration',
      'motivation', 'self_worth', 'intrusive_thoughts',
      'appetite_changes', 'sunlight_exposure'
    ] as const;
    
    psychKeys.forEach(key => {
      const values = daysWithData.map(m => m.deep_psychology?.[key] as number | null);
      result[key] = calculateMetricData(values);
    });

    // ══════════════════════════════════════════════════════════
    // LIFE AREAS
    // ══════════════════════════════════════════════════════════
    const lifeAreaKeys = ['work', 'school', 'love', 'social', 'health', 'growth'] as const;
    lifeAreaKeys.forEach(key => {
      const values = daysWithData.map(m => m.life_areas[key as keyof typeof m.life_areas] as number | null);
      result[key] = calculateMetricData(values);
    });

    return result;
  }, [metricsRange]);

  // Check data availability for sections
  const hasMenteData = useMemo(() => {
    return Object.values(allMetricsData).some(m => m.value !== null);
  }, [allMetricsData]);

  const hasCorpoData = (bodyMetrics || []).some(m => m.weight || m.sleep_hours || m.resting_heart_rate);
  const hasAbitudiniData = (habits || []).length > 0;
  const hasAnyData = hasMenteData || hasCorpoData || hasAbitudiniData;

  // Calculate lookback days for AbitudiniTab
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
            <p className="text-muted-foreground text-sm mt-1">Il tuo benessere psicologico</p>
          </div>
          {isLoading && (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          )}
        </div>
      </header>

      {/* Time Selector */}
      {hasMenteData && (
        <div className="px-4 pb-4">
          <CompactTimeSelector
            value={timeRange}
            onChange={setTimeRange}
            hasTodayData={hasTodayData}
          />
        </div>
      )}

      {/* Clinical Domains */}
      <div className="px-4 pb-8 space-y-6">
        {/* Emotional Spectrum - Full emotions breakdown */}
        <EmotionalSpectrumSection
          emotionsData={emotionsData || []}
          onMetricClick={(key) => setSelectedMetric(key)}
        />
        
        {/* Life Areas - Lavoro, Amore, etc. */}
        <LifeAreasSection
          allMetricsData={allMetricsData}
          onMetricClick={(key) => setSelectedMetric(key)}
        />
        
        {/* Render clinical domains (excluding emotional and functioning since we show them above) */}
        {CLINICAL_DOMAINS
          .filter(domain => domain.id !== 'emotional' && domain.id !== 'functioning')
          .map(domain => {
            const domainMetrics = getMetricsByDomain(domain.id);
            
            return (
              <ClinicalDomainSection
                key={domain.id}
                domain={domain}
                metrics={domainMetrics}
                metricsData={allMetricsData}
                onMetricClick={(key) => setSelectedMetric(key)}
              />
            );
          })}

        {/* Corpo Section */}
        {hasCorpoData && (
          <section>
            <div className="flex items-center gap-2 px-1 mb-3">
              <span className="text-xl">💪</span>
              <div>
                <h3 className="font-display font-semibold text-base text-foreground">
                  Corpo
                </h3>
                <p className="text-xs text-muted-foreground">
                  Metriche fisiche e attività
                </p>
              </div>
            </div>
            <CorpoTab />
          </section>
        )}

        {/* Abitudini Section */}
        {hasAbitudiniData && (
          <section>
            <div className="flex items-center gap-2 px-1 mb-3">
              <span className="text-xl">📊</span>
              <div>
                <h3 className="font-display font-semibold text-base text-foreground">
                  Abitudini
                </h3>
                <p className="text-xs text-muted-foreground">
                  Tracciamento delle tue routine
                </p>
              </div>
            </div>
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
        metricKey={selectedMetric}
        isOpen={!!selectedMetric}
        onClose={() => setSelectedMetric(null)}
        timeRange={timeRange}
      />
    </MobileLayout>
  );
};

export default Analisi;
