import React, { useState, useMemo } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { subDays, startOfDay, format } from 'date-fns';
import MetricDetailSheet from '@/components/analisi/MetricDetailSheet';
import TimeRangeSelector from '@/components/analisi/TimeRangeSelector';
import WellnessScoreHero from '@/components/analisi/WellnessScoreHero';
import VitalMetricCard from '@/components/analisi/VitalMetricCard';
import EmotionalMixBar from '@/components/home/EmotionalMixBar';
import LifeAreasCard from '@/components/analisi/LifeAreasCard';
import DeepPsychologyCard from '@/components/analisi/DeepPsychologyCard';
import { useDailyMetricsRange } from '@/hooks/useDailyMetrics';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { Sparkles, Loader2, Lightbulb, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimeRange = 'day' | 'week' | 'month' | 'all';
export type MetricType = 'mood' | 'anxiety' | 'energy' | 'sleep' | 'joy' | 'sadness' | 'anger' | 'fear' | 'apathy' | 'love' | 'work' | 'social' | 'health' | 'growth' | 'rumination' | 'burnout_level' | 'somatic_tension' | 'self_efficacy' | 'mental_clarity' | 'gratitude';

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

  // Filter days with actual data
  const daysWithData = useMemo(() => {
    return metricsRange.filter(m => 
      m.has_checkin || m.has_sessions || m.has_emotions || m.has_life_areas || m.has_psychology
    );
  }, [metricsRange]);

  // Generate chart data for vitals from unified source
  const chartDataByMetric = useMemo(() => {
    const result: Record<string, { value: number; date?: string; timestamp: number }[]> = {};
    const vitalKeys: MetricType[] = ['mood', 'anxiety', 'energy', 'sleep'];

    vitalKeys.forEach(key => {
      result[key] = daysWithData
        .filter(m => m.vitals[key] > 0)
        .map(m => ({
          value: Math.round(m.vitals[key] * 10),
          date: format(new Date(m.date), 'dd/MM'),
          timestamp: new Date(m.date).getTime(),
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
    });

    return result;
  }, [daysWithData]);

  // Calculate metrics from unified source
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

    const joyValues = daysWithData.map(m => m.emotions.joy);
    const sadnessValues = daysWithData.map(m => m.emotions.sadness);
    const angerValues = daysWithData.map(m => m.emotions.anger);
    const fearValues = daysWithData.map(m => m.emotions.fear);
    const apathyValues = daysWithData.map(m => m.emotions.apathy);

    const loveValues = daysWithData.map(m => m.life_areas.love);
    const workValues = daysWithData.map(m => m.life_areas.work);
    const healthValues = daysWithData.map(m => m.life_areas.health);
    const socialValues = daysWithData.map(m => m.life_areas.social);
    const growthValues = daysWithData.map(m => m.life_areas.growth);

    return [
      { key: 'mood' as MetricType, label: 'Umore', category: 'vitali' as const, icon: '😌', color: 'hsl(150, 60%, 45%)', average: calculateAverage(moodValues), trend: calculateTrend(moodValues), unit: '/10' },
      { key: 'anxiety' as MetricType, label: 'Ansia', category: 'vitali' as const, icon: '😰', color: 'hsl(25, 80%, 55%)', average: calculateAverage(anxietyValues), trend: calculateTrend(anxietyValues), unit: '/10' },
      { key: 'energy' as MetricType, label: 'Energia', category: 'vitali' as const, icon: '⚡', color: 'hsl(45, 80%, 50%)', average: calculateAverage(energyValues), trend: calculateTrend(energyValues), unit: '/10' },
      { key: 'sleep' as MetricType, label: 'Sonno', category: 'vitali' as const, icon: '💤', color: 'hsl(260, 60%, 55%)', average: calculateAverage(sleepValues), trend: calculateTrend(sleepValues), unit: '/10' },
      { key: 'joy' as MetricType, label: 'Gioia', category: 'emozioni' as const, icon: '😊', color: 'hsl(50, 90%, 55%)', average: calculateAverage(joyValues), trend: calculateTrend(joyValues), unit: '/10' },
      { key: 'sadness' as MetricType, label: 'Tristezza', category: 'emozioni' as const, icon: '😢', color: 'hsl(210, 70%, 55%)', average: calculateAverage(sadnessValues), trend: calculateTrend(sadnessValues), unit: '/10' },
      { key: 'anger' as MetricType, label: 'Rabbia', category: 'emozioni' as const, icon: '😠', color: 'hsl(0, 75%, 55%)', average: calculateAverage(angerValues), trend: calculateTrend(angerValues), unit: '/10' },
      { key: 'fear' as MetricType, label: 'Paura', category: 'emozioni' as const, icon: '😨', color: 'hsl(280, 60%, 55%)', average: calculateAverage(fearValues), trend: calculateTrend(fearValues), unit: '/10' },
      { key: 'apathy' as MetricType, label: 'Apatia', category: 'emozioni' as const, icon: '😶', color: 'hsl(0, 0%, 55%)', average: calculateAverage(apathyValues), trend: calculateTrend(apathyValues), unit: '/10' },
      { key: 'love' as MetricType, label: 'Amore', category: 'aree' as const, icon: '❤️', color: 'hsl(350, 80%, 55%)', average: calculateAverage(loveValues), trend: calculateTrend(loveValues), unit: '/10' },
      { key: 'work' as MetricType, label: 'Lavoro', category: 'aree' as const, icon: '💼', color: 'hsl(220, 70%, 55%)', average: calculateAverage(workValues), trend: calculateTrend(workValues), unit: '/10' },
      { key: 'social' as MetricType, label: 'Socialità', category: 'aree' as const, icon: '🤝', color: 'hsl(45, 80%, 50%)', average: calculateAverage(socialValues), trend: calculateTrend(socialValues), unit: '/10' },
      { key: 'growth' as MetricType, label: 'Crescita', category: 'aree' as const, icon: '🌱', color: 'hsl(280, 60%, 55%)', average: calculateAverage(growthValues), trend: calculateTrend(growthValues), unit: '/10' },
      { key: 'health' as MetricType, label: 'Salute', category: 'aree' as const, icon: '💪', color: 'hsl(150, 60%, 45%)', average: calculateAverage(healthValues), trend: calculateTrend(healthValues), unit: '/10' },
    ];
  }, [daysWithData]);

  // Get psychology data
  const psychologyData = useMemo(() => {
    const result: Record<string, number | null> = {};
    const psychKeys = ['rumination', 'burnout_level', 'somatic_tension', 'self_efficacy', 'mental_clarity', 'gratitude', 'guilt', 'irritability', 'loneliness_perceived', 'coping_ability'];
    
    psychKeys.forEach(key => {
      const values = daysWithData
        .map(m => m.deep_psychology?.[key])
        .filter((v): v is number => v !== null && v !== undefined && v > 0);
      result[key] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    });
    
    return result;
  }, [daysWithData]);

  const vitalMetrics = metrics.filter(m => m.category === 'vitali');
  const areaMetrics = metrics.filter(m => m.category === 'aree');

  const selectedMetricData = selectedMetric ? metrics.find(m => m.key === selectedMetric) : null;

  const timeRangeLabel = timeRange === 'day' ? 'Oggi' : timeRange === 'week' ? 'Questa settimana' : timeRange === 'month' ? 'Questo mese' : 'In generale';

  // Sort sections by AI priority
  const sortedSections = useMemo(() => {
    if (!aiLayout.sections) return [];
    return [...aiLayout.sections]
      .filter(s => s.visible)
      .sort((a, b) => a.priority - b.priority);
  }, [aiLayout.sections]);

  // Render section by ID
  const renderSection = (sectionId: string, index: number) => {
    const section = sortedSections.find(s => s.id === sectionId);
    if (!section) return null;

    const animationStyle = { animationDelay: `${index * 0.1}s` };

    switch (sectionId) {
      case 'wellness_hero':
        return (
          <section key={sectionId} className="animate-fade-in" style={animationStyle}>
            <WellnessScoreHero metrics={metrics} timeRangeLabel={timeRangeLabel} />
          </section>
        );
      case 'vitals_grid':
        return (
          <section key={sectionId} className="animate-fade-in" style={animationStyle}>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                <span>📊</span> {section.title}
              </h2>
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">AI</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {vitalMetrics.map((metric) => (
                <VitalMetricCard
                  key={metric.key}
                  metric={metric}
                  chartData={chartDataByMetric[metric.key] || []}
                  onClick={() => setSelectedMetric(metric.key)}
                />
              ))}
            </div>
          </section>
        );
      case 'emotional_mix':
        return (
          <section key={sectionId} className="animate-fade-in" style={animationStyle}>
            <EmotionalMixBar />
          </section>
        );
      case 'life_areas':
        return (
          <section key={sectionId} className="animate-fade-in" style={animationStyle}>
            <LifeAreasCard 
              areas={areaMetrics} 
              onClick={(key) => setSelectedMetric(key as MetricType)} 
            />
          </section>
        );
      case 'deep_psychology':
        return (
          <section key={sectionId} className="animate-fade-in" style={animationStyle}>
            <DeepPsychologyCard
              metrics={aiLayout.highlighted_metrics.filter(m => m.category === 'psicologia')}
              psychologyData={psychologyData}
              onMetricClick={(key) => setSelectedMetric(key as MetricType)}
            />
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <MobileLayout>
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Analisi</h1>
            <p className="text-muted-foreground text-sm mt-1">La tua dashboard del benessere</p>
          </div>
          {isLoadingAI && (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          )}
        </div>
      </header>

      {/* Time Range Selector */}
      <div className="px-4 mb-5">
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* AI Summary & Insight */}
      {aiLayout.ai_summary && !isLoadingAI && (
        <div className="px-4 mb-5 space-y-3">
          {/* AI Summary */}
          <div className="px-4 py-3 bg-primary/5 rounded-2xl border border-primary/10">
            <p className="text-sm text-foreground/80 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>{aiLayout.ai_summary}</span>
            </p>
          </div>

          {/* Focus Insight */}
          {aiLayout.focus_insight && (
            <div className="px-4 py-3 bg-accent/30 rounded-2xl">
              <p className="text-sm text-foreground/80 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>{aiLayout.focus_insight}</span>
              </p>
            </div>
          )}

          {/* Deep Dive Recommendations */}
          {aiLayout.recommended_deep_dive.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Target className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Approfondisci:</span>
              {aiLayout.recommended_deep_dive.map(key => {
                const metric = metrics.find(m => m.key === key);
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedMetric(key as MetricType)}
                    className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                  >
                    {metric?.label || key}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* AI-Ordered Sections */}
      <div className="px-4 space-y-5 pb-8">
        {sortedSections.map((section, index) => renderSection(section.id, index))}
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
