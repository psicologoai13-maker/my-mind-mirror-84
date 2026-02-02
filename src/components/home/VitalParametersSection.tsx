import React from 'react';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import VitalParameterCard from './VitalParameterCard';

const VitalParametersSection: React.FC = () => {
  // 🎯 SINGLE SOURCE OF TRUTH: Use the unified RPC hook
  const { vitalsPercentage } = useDailyMetrics();

  const getAnxietyLabel = (v: number) => {
    if (v <= 30) return 'Calmo';
    if (v <= 50) return 'Leggera';
    if (v <= 70) return 'Moderata';
    return 'Alta';
  };

  const getEnergyLabel = (v: number) => {
    if (v >= 70) return 'Energico';
    if (v >= 50) return 'Buona';
    if (v >= 30) return 'Stanco';
    return 'Esausto';
  };

  const getMoodLabel = (v: number) => {
    if (v >= 70) return 'Ottimo';
    if (v >= 50) return 'Buono';
    if (v >= 30) return 'Così così';
    return 'Difficile';
  };

  const getSleepLabel = (v: number) => {
    if (v >= 70) return 'Riposato';
    if (v >= 50) return 'Discreto';
    if (v >= 30) return 'Stanco';
    return 'Esausto';
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-display font-semibold text-foreground px-1">
        I tuoi livelli attuali
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <VitalParameterCard
          label="Ansia"
          value={vitalsPercentage.anxiety}
          color="anxiety"
          icon="🧠"
          subtitle={getAnxietyLabel(vitalsPercentage.anxiety)}
        />
        <VitalParameterCard
          label="Energia"
          value={vitalsPercentage.energy}
          color="energy"
          icon="⚡"
          subtitle={getEnergyLabel(vitalsPercentage.energy)}
        />
        <VitalParameterCard
          label="Umore"
          value={vitalsPercentage.mood}
          color="mood"
          icon="❤️"
          subtitle={getMoodLabel(vitalsPercentage.mood)}
        />
        <VitalParameterCard
          label="Sonno"
          value={vitalsPercentage.sleep}
          color="sleep"
          icon="🌙"
          subtitle={getSleepLabel(vitalsPercentage.sleep)}
        />
      </div>
    </div>
  );
};

export default VitalParametersSection;
