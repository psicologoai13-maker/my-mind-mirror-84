import React, { useState, useMemo } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { useSessions } from '@/hooks/useSessions';
import { useCheckins } from '@/hooks/useCheckins';
import { subDays, isAfter, startOfDay, isSameDay } from 'date-fns';
import MetricRow from '@/components/analisi/MetricRow';
import MetricDetailSheet from '@/components/analisi/MetricDetailSheet';
import TimeRangeSelector from '@/components/analisi/TimeRangeSelector';

export type TimeRange = 'day' | 'week' | 'month' | 'all';
export type MetricType = 'mood' | 'anxiety' | 'energy' | 'sleep' | 'joy' | 'sadness' | 'anger' | 'fear' | 'apathy' | 'love' | 'work' | 'friendship' | 'wellness';

export interface MetricData {
  key: MetricType;
  label: string;
  category: 'vitali' | 'emozioni' | 'aree';
  icon: string;
  color: string;
  average: number | null;
  trend: 'up' | 'down' | 'stable';
  unit?: string;
}

const Analisi: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);
  
  const { completedSessions, journalSessions } = useSessions();
  const { weeklyCheckins } = useCheckins();

  // Calculate date range
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
        return { start: new Date(0), end: now };
    }
  }, [timeRange]);

  // Filter sessions by date range
  const filteredSessions = useMemo(() => {
    return completedSessions.filter(s => 
      isAfter(new Date(s.start_time), dateRange.start)
    );
  }, [completedSessions, dateRange]);

  // Calculate metrics
  const metrics = useMemo<MetricData[]>(() => {
    const calculateAverage = (values: (number | null | undefined)[]) => {
      const valid = values.filter((v): v is number => v !== null && v !== undefined);
      if (valid.length === 0) return null;
      return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
    };

    const calculateTrend = (values: (number | null | undefined)[]): 'up' | 'down' | 'stable' => {
      const valid = values.filter((v): v is number => v !== null && v !== undefined);
      if (valid.length < 2) return 'stable';
      const midpoint = Math.floor(valid.length / 2);
      const firstHalf = valid.slice(0, midpoint);
      const secondHalf = valid.slice(midpoint);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      if (secondAvg > firstAvg + 0.5) return 'up';
      if (secondAvg < firstAvg - 0.5) return 'down';
      return 'stable';
    };

    // Vitals
    const moodValues = filteredSessions.map(s => s.mood_score_detected ? s.mood_score_detected * 10 : null);
    const anxietyValues = filteredSessions.map(s => s.anxiety_score_detected ? s.anxiety_score_detected * 10 : null);
    const sleepValues = filteredSessions.map(s => (s as any).sleep_quality ? (s as any).sleep_quality * 10 : null);
    const energyValues = moodValues.map((m, i) => {
      if (m === null) return null;
      const a = anxietyValues[i] ?? 50;
      return Math.max(0, Math.min(100, m - (a * 0.3) + 20));
    });

    // Emotions from specific_emotions
    const joyValues = filteredSessions.map(s => (s as any).specific_emotions?.joy ?? null);
    const sadnessValues = filteredSessions.map(s => (s as any).specific_emotions?.sadness ?? null);
    const angerValues = filteredSessions.map(s => (s as any).specific_emotions?.anger ?? null);
    const fearValues = filteredSessions.map(s => (s as any).specific_emotions?.fear ?? null);
    const apathyValues = filteredSessions.map(s => (s as any).specific_emotions?.apathy ?? null);

    // Life areas from life_balance_scores
    const loveValues = filteredSessions.map(s => s.life_balance_scores?.love ? s.life_balance_scores.love * 10 : null);
    const workValues = filteredSessions.map(s => s.life_balance_scores?.work ? s.life_balance_scores.work * 10 : null);
    const friendshipValues = filteredSessions.map(s => s.life_balance_scores?.friendship ? s.life_balance_scores.friendship * 10 : null);
    const wellnessValues = filteredSessions.map(s => s.life_balance_scores?.energy ? s.life_balance_scores.energy * 10 : null);

    return [
      // Vitali
      { key: 'mood' as MetricType, label: 'Umore', category: 'vitali' as const, icon: '😌', color: 'hsl(150, 60%, 45%)', average: calculateAverage(moodValues), trend: calculateTrend(moodValues), unit: '%' },
      { key: 'anxiety' as MetricType, label: 'Ansia', category: 'vitali' as const, icon: '😰', color: 'hsl(25, 80%, 55%)', average: calculateAverage(anxietyValues), trend: calculateTrend(anxietyValues), unit: '%' },
      { key: 'energy' as MetricType, label: 'Energia', category: 'vitali' as const, icon: '🔋', color: 'hsl(45, 80%, 50%)', average: calculateAverage(energyValues), trend: calculateTrend(energyValues), unit: '%' },
      { key: 'sleep' as MetricType, label: 'Sonno', category: 'vitali' as const, icon: '💤', color: 'hsl(260, 60%, 55%)', average: calculateAverage(sleepValues), trend: calculateTrend(sleepValues), unit: '%' },
      // Emozioni
      { key: 'joy' as MetricType, label: 'Gioia', category: 'emozioni' as const, icon: '😊', color: 'hsl(50, 90%, 55%)', average: calculateAverage(joyValues), trend: calculateTrend(joyValues), unit: '%' },
      { key: 'sadness' as MetricType, label: 'Tristezza', category: 'emozioni' as const, icon: '😢', color: 'hsl(210, 70%, 55%)', average: calculateAverage(sadnessValues), trend: calculateTrend(sadnessValues), unit: '%' },
      { key: 'anger' as MetricType, label: 'Rabbia', category: 'emozioni' as const, icon: '😠', color: 'hsl(0, 75%, 55%)', average: calculateAverage(angerValues), trend: calculateTrend(angerValues), unit: '%' },
      { key: 'fear' as MetricType, label: 'Paura', category: 'emozioni' as const, icon: '😨', color: 'hsl(280, 60%, 55%)', average: calculateAverage(fearValues), trend: calculateTrend(fearValues), unit: '%' },
      { key: 'apathy' as MetricType, label: 'Apatia', category: 'emozioni' as const, icon: '😶', color: 'hsl(0, 0%, 55%)', average: calculateAverage(apathyValues), trend: calculateTrend(apathyValues), unit: '%' },
      // Aree Vita
      { key: 'love' as MetricType, label: 'Amore', category: 'aree' as const, icon: '❤️', color: 'hsl(350, 80%, 55%)', average: calculateAverage(loveValues), trend: calculateTrend(loveValues), unit: '/10' },
      { key: 'work' as MetricType, label: 'Lavoro', category: 'aree' as const, icon: '💼', color: 'hsl(35, 80%, 50%)', average: calculateAverage(workValues), trend: calculateTrend(workValues), unit: '/10' },
      { key: 'friendship' as MetricType, label: 'Amicizia', category: 'aree' as const, icon: '🤝', color: 'hsl(200, 70%, 50%)', average: calculateAverage(friendshipValues), trend: calculateTrend(friendshipValues), unit: '/10' },
      { key: 'wellness' as MetricType, label: 'Benessere', category: 'aree' as const, icon: '🧘', color: 'hsl(150, 60%, 45%)', average: calculateAverage(wellnessValues), trend: calculateTrend(wellnessValues), unit: '/10' },
    ];
  }, [filteredSessions]);

  const vitalMetrics = metrics.filter(m => m.category === 'vitali');
  const emotionMetrics = metrics.filter(m => m.category === 'emozioni');
  const areaMetrics = metrics.filter(m => m.category === 'aree');

  const selectedMetricData = selectedMetric ? metrics.find(m => m.key === selectedMetric) : null;

  return (
    <MobileLayout>
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Analisi</h1>
        <p className="text-muted-foreground text-sm mt-1">Centro dati e statistiche</p>
      </header>

      {/* Time Range Selector */}
      <div className="px-4 mb-5">
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      <div className="px-4 space-y-6 pb-8">
        {/* Vitals Section */}
        <section className="animate-fade-in">
          <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 px-1">
            <span>📊</span> Parametri Vitali
          </h2>
          <div className="bg-card rounded-2xl shadow-sm border border-border/20 overflow-hidden">
            {vitalMetrics.map((metric, i) => (
              <MetricRow 
                key={metric.key} 
                metric={metric} 
                onClick={() => setSelectedMetric(metric.key)}
                isLast={i === vitalMetrics.length - 1}
              />
            ))}
          </div>
        </section>

        {/* Emotions Section */}
        <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 px-1">
            <span>🎭</span> Emozioni
          </h2>
          <div className="bg-card rounded-2xl shadow-sm border border-border/20 overflow-hidden">
            {emotionMetrics.map((metric, i) => (
              <MetricRow 
                key={metric.key} 
                metric={metric} 
                onClick={() => setSelectedMetric(metric.key)}
                isLast={i === emotionMetrics.length - 1}
              />
            ))}
          </div>
        </section>

        {/* Life Areas Section */}
        <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 px-1">
            <span>⚖️</span> Aree della Vita
          </h2>
          <div className="bg-card rounded-2xl shadow-sm border border-border/20 overflow-hidden">
            {areaMetrics.map((metric, i) => (
              <MetricRow 
                key={metric.key} 
                metric={metric} 
                onClick={() => setSelectedMetric(metric.key)}
                isLast={i === areaMetrics.length - 1}
              />
            ))}
          </div>
        </section>
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