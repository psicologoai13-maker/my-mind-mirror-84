import React from 'react';
import { useSessions } from '@/hooks/useSessions';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useProfile } from '@/hooks/useProfile';
import AdaptiveVitalCard, { MetricKey, METRIC_CONFIG } from './AdaptiveVitalCard';

const DEFAULT_METRICS: MetricKey[] = ['mood', 'anxiety', 'energy', 'sleep'];

const AdaptiveVitalsSection: React.FC = () => {
  const { completedSessions } = useSessions();
  const { vitalsPercentage, emotions } = useDailyMetrics();
  const { profile } = useProfile();
  
  // Get active metrics from profile or use defaults
  const activeMetrics: MetricKey[] = React.useMemo(() => {
    const profileMetrics = (profile as any)?.active_dashboard_metrics as string[] | undefined;
    if (profileMetrics && profileMetrics.length === 4) {
      return profileMetrics.filter((m): m is MetricKey => m in METRIC_CONFIG) as MetricKey[];
    }
    return DEFAULT_METRICS;
  }, [profile]);

  // Use unified daily metrics as primary source, with fallbacks
  const metricValues = React.useMemo(() => {
    const latestSession = completedSessions?.[0];
    const lifeScores = (latestSession as any)?.life_balance_scores || profile?.life_areas_scores || {};
    
    // Primary: Use aggregated daily metrics from RPC
    // Fallback: Calculate from sessions for life areas
    const normalizeLifeScore = (score: number | null) => 
      score ? Math.min(100, Math.max(0, score * 10)) : 50;

    const values: Record<MetricKey, number> = {
      // Vitals from unified source
      mood: vitalsPercentage?.mood ?? 50,
      anxiety: vitalsPercentage?.anxiety ?? 30,
      energy: vitalsPercentage?.energy ?? 50,
      sleep: vitalsPercentage?.sleep ?? 50,
      // Emotions from unified source
      joy: emotions?.joy ?? 0,
      sadness: emotions?.sadness ?? 0,
      anger: emotions?.anger ?? 0,
      fear: emotions?.fear ?? 0,
      apathy: emotions?.apathy ?? 0,
      // Life Areas from sessions
      love: normalizeLifeScore(lifeScores.love),
      work: normalizeLifeScore(lifeScores.work),
      friendship: normalizeLifeScore(lifeScores.friendship),
      growth: normalizeLifeScore(lifeScores.growth),
      health: normalizeLifeScore(lifeScores.energy),
    };

    return values;
  }, [vitalsPercentage, emotions, completedSessions, profile]);

  // Generate subtitle based on metric type
  const getSubtitle = (key: MetricKey, value: number): string => {
    // Vitals (0-100 scale)
    if (key === 'anxiety') {
      if (value <= 30) return 'Basso';
      if (value <= 60) return 'Moderato';
      return 'Alto';
    }
    if (key === 'energy') {
      if (value >= 70) return 'Carico';
      if (value >= 40) return 'Normale';
      return 'Scarso';
    }
    if (key === 'mood') {
      if (value >= 80) return 'Ottimo';
      if (value >= 60) return 'Buono';
      if (value >= 40) return 'Neutro';
      return 'Basso';
    }
    if (key === 'sleep') {
      if (value >= 70) return 'Riposato';
      if (value >= 40) return 'Ok';
      return 'Stanco';
    }
    // Emotions - show only if present
    if (['joy', 'sadness', 'anger', 'fear', 'apathy'].includes(key)) {
      if (value === 0) return 'Non rilevato';
      if (value >= 60) return 'Forte';
      if (value >= 30) return 'Presente';
      return 'Lieve';
    }
    // Life areas
    if (value >= 70) return 'Buono';
    if (value >= 40) return 'Neutro';
    return 'Critico';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide px-1">
        Focus Attuali
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {activeMetrics.map((metricKey, index) => (
          <div 
            key={metricKey}
            className="animate-scale-in"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <AdaptiveVitalCard
              metricKey={metricKey}
              value={metricValues[metricKey]}
              subtitle={getSubtitle(metricKey, metricValues[metricKey])}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdaptiveVitalsSection;