import React from 'react';
import { useSessions } from '@/hooks/useSessions';
import { useCheckins } from '@/hooks/useCheckins';
import { useProfile } from '@/hooks/useProfile';
import AdaptiveVitalCard, { MetricKey, METRIC_CONFIG } from './AdaptiveVitalCard';

const DEFAULT_METRICS: MetricKey[] = ['mood', 'anxiety', 'energy', 'sleep'];

const AdaptiveVitalsSection: React.FC = () => {
  const { journalSessions, completedSessions } = useSessions();
  const { todayCheckin, weeklyCheckins } = useCheckins();
  const { profile } = useProfile();
  
  // Get active metrics from profile or use defaults
  const activeMetrics: MetricKey[] = React.useMemo(() => {
    const profileMetrics = (profile as any)?.active_dashboard_metrics as string[] | undefined;
    if (profileMetrics && profileMetrics.length === 4) {
      return profileMetrics.filter((m): m is MetricKey => m in METRIC_CONFIG) as MetricKey[];
    }
    return DEFAULT_METRICS;
  }, [profile]);

  // Calculate all possible metric values
  const metricValues = React.useMemo(() => {
    const latestSession = journalSessions?.[0];
    const latestCompleted = completedSessions?.[0];
    const specificEmotions = (latestCompleted as any)?.specific_emotions || {};
    const lifeScores = (latestCompleted as any)?.life_balance_scores || profile?.life_areas_scores || {};
    
    // Base vitals calculation
    const anxietyScore = latestSession?.anxiety_score_detected ?? 30;
    const anxiety = Math.min(100, Math.max(0, anxietyScore * 10));
    
    let mood = 50;
    if (todayCheckin) {
      mood = (todayCheckin.mood_value / 5) * 100;
    } else if (latestSession?.mood_score_detected) {
      mood = Math.min(100, Math.max(0, latestSession.mood_score_detected * 10));
    }
    
    const baseEnergy = mood - (anxiety * 0.3);
    const energy = Math.min(100, Math.max(0, baseEnergy + 20));
    
    const weeklyMoodAvg = weeklyCheckins?.length 
      ? weeklyCheckins.reduce((acc, c) => acc + c.mood_value, 0) / weeklyCheckins.length 
      : 3;
    
    // Get sleep from session if available, otherwise calculate
    const sleepFromSession = (latestCompleted as any)?.sleep_quality;
    const sleep = sleepFromSession 
      ? sleepFromSession * 10 
      : Math.min(100, Math.max(0, ((weeklyMoodAvg / 5) * 60) + 20));

    // Convert life area scores (1-10) to 0-100
    const normalizeLifeScore = (score: number | null) => 
      score ? Math.min(100, Math.max(0, score * 10)) : 50;

    const values: Record<MetricKey, number> = {
      // Vitals
      mood: Math.round(mood),
      anxiety: Math.round(anxiety),
      energy: Math.round(energy),
      sleep: Math.round(sleep),
      // Emotions (already 0-100)
      joy: specificEmotions.joy || 20,
      sadness: specificEmotions.sadness || 20,
      anger: specificEmotions.anger || 15,
      fear: specificEmotions.fear || 15,
      apathy: specificEmotions.apathy || 30,
      // Life Areas
      love: normalizeLifeScore(lifeScores.love),
      work: normalizeLifeScore(lifeScores.work),
      friendship: normalizeLifeScore(lifeScores.friendship),
      growth: normalizeLifeScore(lifeScores.growth),
      health: normalizeLifeScore(lifeScores.energy),
    };

    return values;
  }, [journalSessions, completedSessions, todayCheckin, weeklyCheckins, profile]);

  // Generate subtitle based on metric type
  const getSubtitle = (key: MetricKey, value: number): string => {
    // Vitals
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
    // Emotions - use intensity
    if (['joy', 'sadness', 'anger', 'fear', 'apathy'].includes(key)) {
      if (value >= 60) return 'Forte';
      if (value >= 30) return 'Presente';
      return 'Lieve';
    }
    // Life areas - satisfaction
    if (value >= 70) return 'Buono';
    if (value >= 40) return 'Neutro';
    return 'Critico';
  };

  return (
    <div className="space-y-3">
      <h3 className="font-display font-semibold text-foreground flex items-center gap-2 px-1">
        <span className="text-lg">📊</span>
        I tuoi focus attuali
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {activeMetrics.map((metricKey) => (
          <AdaptiveVitalCard
            key={metricKey}
            metricKey={metricKey}
            value={metricValues[metricKey]}
            subtitle={getSubtitle(metricKey, metricValues[metricKey])}
          />
        ))}
      </div>
    </div>
  );
};

export default AdaptiveVitalsSection;
