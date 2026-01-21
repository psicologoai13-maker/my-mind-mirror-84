import React, { useState, useMemo } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { useSessions } from '@/hooks/useSessions';
import { useCheckins } from '@/hooks/useCheckins';
import { subDays, isAfter, startOfDay, format, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import MetricDetailSheet from '@/components/analisi/MetricDetailSheet';
import TimeRangeSelector from '@/components/analisi/TimeRangeSelector';
import WellnessScoreHero from '@/components/analisi/WellnessScoreHero';
import VitalMetricCard from '@/components/analisi/VitalMetricCard';
import EmotionalSpectrumCard from '@/components/analisi/EmotionalSpectrumCard';
import LifeAreasCard from '@/components/analisi/LifeAreasCard';

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
  
  const { completedSessions } = useSessions();
  const { weeklyCheckins, todayCheckin } = useCheckins();

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

  // Filter checkins by date range and parse notes for all metrics
  const filteredCheckins = useMemo(() => {
    if (!weeklyCheckins) return [];
    return weeklyCheckins.filter(c => 
      isAfter(new Date(c.created_at), dateRange.start)
    );
  }, [weeklyCheckins, dateRange]);

  // Parse checkin notes to extract anxiety, energy, sleep
  const parseCheckinNotes = (notes: string | null): { anxiety?: number; energy?: number; sleep?: number } => {
    if (!notes) return {};
    try {
      const parsed = JSON.parse(notes);
      return {
        anxiety: parsed.anxiety as number | undefined, // Already 1-10
        energy: parsed.energy as number | undefined,
        sleep: parsed.sleep as number | undefined,
      };
    } catch {
      return {};
    }
  };

  // For 'day' view, use today's specific checkin if available
  const dayCheckinData = useMemo(() => {
    if (timeRange !== 'day' || !todayCheckin) return null;
    const notes = parseCheckinNotes(todayCheckin.notes);
    return {
      mood: (todayCheckin.mood_value / 5) * 100,
      anxiety: notes.anxiety ? notes.anxiety * 10 : null, // 1-10 to 0-100
      energy: notes.energy ? notes.energy * 10 : null,
      sleep: notes.sleep ? notes.sleep * 10 : null,
    };
  }, [timeRange, todayCheckin]);

  // Generate chart data for each vital metric - combining sessions AND checkins with proper aggregation
  const chartDataByMetric = useMemo(() => {
    const vitalKeys: MetricType[] = ['mood', 'anxiety', 'energy', 'sleep'];
    const result: Record<string, { value: number; date?: string; timestamp: number }[]> = {};

    vitalKeys.forEach(key => {
      // Group data by date (aggregate multiple entries per day)
      const dataByDay = new Map<string, { values: number[]; timestamp: number }>();
      
      // Add data from checkins (now includes ALL metrics)
      filteredCheckins.forEach(c => {
        const dateKey = format(new Date(c.created_at), 'yyyy-MM-dd');
        const timestamp = new Date(c.created_at).getTime();
        const notes = parseCheckinNotes(c.notes);
        
        if (!dataByDay.has(dateKey)) {
          dataByDay.set(dateKey, { values: [], timestamp });
        }
        
        let value: number | null = null;
        switch (key) {
          case 'mood':
            value = (c.mood_value / 5) * 100;
            break;
          case 'anxiety':
            if (notes.anxiety) value = notes.anxiety * 10;
            break;
          case 'energy':
            if (notes.energy) value = notes.energy * 10;
            break;
          case 'sleep':
            if (notes.sleep) value = notes.sleep * 10;
            break;
        }
        
        if (value !== null) {
          dataByDay.get(dateKey)!.values.push(value);
        }
      });
      
      // Add data from sessions (as fallback)
      filteredSessions.forEach(s => {
        let value: number | null = null;
        const dateKey = format(new Date(s.start_time), 'yyyy-MM-dd');
        const timestamp = new Date(s.start_time).getTime();
        
        // Check if we already have data from checkin for this day
        const hasCheckinData = dataByDay.has(dateKey) && dataByDay.get(dateKey)!.values.length > 0;
        
        switch (key) {
          case 'mood':
            if (!hasCheckinData && s.mood_score_detected) {
              value = s.mood_score_detected * 10;
            }
            break;
          case 'anxiety':
            if (!hasCheckinData && s.anxiety_score_detected) {
              value = s.anxiety_score_detected * 10;
            }
            break;
          case 'sleep':
            if (!hasCheckinData && (s as any).sleep_quality) {
              value = (s as any).sleep_quality * 10;
            }
            break;
          case 'energy':
            if (!hasCheckinData) {
              const m = s.mood_score_detected ? s.mood_score_detected * 10 : null;
              const a = s.anxiety_score_detected ? s.anxiety_score_detected * 10 : 50;
              if (m !== null) value = Math.max(0, Math.min(100, m - (a * 0.3) + 20));
            }
            break;
        }
        
        if (value !== null) {
          if (!dataByDay.has(dateKey)) {
            dataByDay.set(dateKey, { values: [], timestamp });
          }
          dataByDay.get(dateKey)!.values.push(value);
        }
      });
      
      // Convert to array, calculate average per day, and sort by date
      const dataPoints = Array.from(dataByDay.entries())
        .map(([dateKey, { values, timestamp }]) => ({
          value: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          date: format(new Date(dateKey), 'dd/MM'),
          timestamp
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
      
      result[key] = dataPoints;
    });

    return result;
  }, [filteredSessions, filteredCheckins]);

  // Calculate metrics - using both sessions AND checkins as single source of truth
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

    // Mood: prioritize checkins, then use sessions
    const moodValues: number[] = [];
    const anxietyValues: number[] = [];
    const sleepValues: number[] = [];
    const energyValues: number[] = [];
    
    // For 'day' view, use today's checkin data if available
    if (timeRange === 'day' && dayCheckinData) {
      if (dayCheckinData.mood !== null) moodValues.push(dayCheckinData.mood);
      if (dayCheckinData.anxiety !== null) anxietyValues.push(dayCheckinData.anxiety);
      if (dayCheckinData.energy !== null) energyValues.push(dayCheckinData.energy);
      if (dayCheckinData.sleep !== null) sleepValues.push(dayCheckinData.sleep);
    } else {
      // Collect from all checkins
      filteredCheckins.forEach(c => {
        moodValues.push((c.mood_value / 5) * 100);
        const notes = parseCheckinNotes(c.notes);
        if (notes.anxiety) anxietyValues.push(notes.anxiety * 10);
        if (notes.energy) energyValues.push(notes.energy * 10);
        if (notes.sleep) sleepValues.push(notes.sleep * 10);
      });
      
      // Add session values as fallback (only if no checkin for that day)
      filteredSessions.forEach(s => {
        const sessionDate = new Date(s.start_time);
        const hasCheckinForDay = filteredCheckins.some(c => 
          isSameDay(new Date(c.created_at), sessionDate)
        );
        
        if (!hasCheckinForDay) {
          if (s.mood_score_detected) {
            moodValues.push(s.mood_score_detected * 10);
          }
          if (s.anxiety_score_detected) {
            anxietyValues.push(s.anxiety_score_detected * 10);
          }
          if ((s as any).sleep_quality) {
            sleepValues.push((s as any).sleep_quality * 10);
          }
        }
      });
    }

    // Calculate energy from mood and anxiety if not directly available
    if (energyValues.length === 0 && moodValues.length > 0) {
      moodValues.forEach((m, i) => {
        const a = anxietyValues[i] ?? 50;
        energyValues.push(Math.max(0, Math.min(100, m - (a * 0.3) + 20)));
      });
    }

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
      { key: 'energy' as MetricType, label: 'Energia', category: 'vitali' as const, icon: '⚡', color: 'hsl(45, 80%, 50%)', average: calculateAverage(energyValues), trend: calculateTrend(energyValues), unit: '%' },
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
  }, [filteredSessions, filteredCheckins, timeRange, dayCheckinData]);

  const vitalMetrics = metrics.filter(m => m.category === 'vitali');
  const emotionMetrics = metrics.filter(m => m.category === 'emozioni');
  const areaMetrics = metrics.filter(m => m.category === 'aree');

  const selectedMetricData = selectedMetric ? metrics.find(m => m.key === selectedMetric) : null;

  const timeRangeLabel = timeRange === 'day' ? 'Oggi' : timeRange === 'week' ? 'Questa settimana' : timeRange === 'month' ? 'Questo mese' : 'In generale';

  return (
    <MobileLayout>
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Analisi</h1>
        <p className="text-muted-foreground text-sm mt-1">La tua dashboard del benessere</p>
      </header>

      {/* Time Range Selector */}
      <div className="px-4 mb-5">
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      <div className="px-4 space-y-5 pb-8">
        {/* Hero: Wellness Score */}
        <section className="animate-fade-in">
          <WellnessScoreHero metrics={metrics} timeRangeLabel={timeRangeLabel} />
        </section>

        {/* Vitals Grid 2x2 */}
        <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 px-1">
            <span>📊</span> Parametri Vitali
          </h2>
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

        {/* Emotional Spectrum */}
        <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <EmotionalSpectrumCard emotions={emotionMetrics} />
        </section>

        {/* Life Areas */}
        <section className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <LifeAreasCard 
            areas={areaMetrics} 
            onClick={(key) => setSelectedMetric(key as MetricType)} 
          />
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
