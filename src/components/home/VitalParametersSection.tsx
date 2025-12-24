import React from 'react';
import { useSessions } from '@/hooks/useSessions';
import { useCheckins } from '@/hooks/useCheckins';
import VitalParameterCard from './VitalParameterCard';

const VitalParametersSection: React.FC = () => {
  const { journalSessions } = useSessions();
  const { todayCheckin, weeklyCheckins } = useCheckins();
  
  // Calculate current vital parameters from sessions and check-ins
  const vitals = React.useMemo(() => {
    // Get latest session data
    const latestSession = journalSessions?.[0];
    
    // Anxiety: from latest session or default
    const anxietyScore = latestSession?.anxiety_score_detected ?? 30;
    const anxiety = Math.min(100, Math.max(0, anxietyScore));
    
    // Mood: from today's check-in or latest session
    let mood = 50;
    if (todayCheckin) {
      mood = (todayCheckin.mood_value / 5) * 100;
    } else if (latestSession?.mood_score_detected) {
      mood = Math.min(100, Math.max(0, latestSession.mood_score_detected));
    }
    
    // Energy: derived from mood and anxiety (inverse relationship)
    const baseEnergy = mood - (anxiety * 0.3);
    const energy = Math.min(100, Math.max(0, baseEnergy + 20));
    
    // Sleep/Stress: inverse of anxiety with some randomness based on weekly trend
    const weeklyMoodAvg = weeklyCheckins?.length 
      ? weeklyCheckins.reduce((acc, c) => acc + c.mood_value, 0) / weeklyCheckins.length 
      : 3;
    const sleep = Math.min(100, Math.max(0, ((weeklyMoodAvg / 5) * 60) + 20));
    
    return {
      anxiety: Math.round(anxiety),
      energy: Math.round(energy),
      mood: Math.round(mood),
      sleep: Math.round(sleep),
    };
  }, [journalSessions, todayCheckin, weeklyCheckins]);

  const getAnxietyLabel = (v: number) => {
    if (v <= 30) return 'Basso';
    if (v <= 60) return 'Moderato';
    return 'Alto';
  };

  const getEnergyLabel = (v: number) => {
    if (v >= 70) return 'Carico';
    if (v >= 40) return 'Normale';
    return 'Scarso';
  };

  const getMoodLabel = (v: number) => {
    if (v >= 80) return 'Ottimo';
    if (v >= 60) return 'Buono';
    if (v >= 40) return 'Neutro';
    return 'Basso';
  };

  const getSleepLabel = (v: number) => {
    if (v >= 70) return 'Riposato';
    if (v >= 40) return 'Ok';
    return 'Stanco';
  };

  return (
    <div className="space-y-3">
      <h3 className="font-display font-semibold text-foreground flex items-center gap-2 px-1">
        <span className="text-lg">📊</span>
        I tuoi livelli attuali
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        <VitalParameterCard
          icon="😰"
          label="Ansia"
          value={vitals.anxiety}
          color="anxiety"
          subtitle={getAnxietyLabel(vitals.anxiety)}
        />
        <VitalParameterCard
          icon="🔋"
          label="Energia"
          value={vitals.energy}
          color="energy"
          subtitle={getEnergyLabel(vitals.energy)}
        />
        <VitalParameterCard
          icon="😌"
          label="Umore"
          value={vitals.mood}
          color="mood"
          subtitle={getMoodLabel(vitals.mood)}
        />
        <VitalParameterCard
          icon="💤"
          label="Riposo"
          value={vitals.sleep}
          color="sleep"
          subtitle={getSleepLabel(vitals.sleep)}
        />
      </div>
    </div>
  );
};

export default VitalParametersSection;
