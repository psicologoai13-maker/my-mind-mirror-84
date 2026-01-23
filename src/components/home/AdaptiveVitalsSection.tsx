import React from 'react';
import { useWeeklyAverages } from '@/hooks/useDailyMetrics';
import AdaptiveVitalCard, { MetricKey } from './AdaptiveVitalCard';
import { Loader2 } from 'lucide-react';

const FOCUS_METRICS: MetricKey[] = ['mood', 'anxiety', 'energy', 'sleep'];

const AdaptiveVitalsSection: React.FC = () => {
  const { averages, isLoading } = useWeeklyAverages();

  // Convert 1-10 scale to 0-100 for display
  const metricValues: Record<MetricKey, number> = {
    mood: averages.mood * 10,
    anxiety: averages.anxiety * 10,
    energy: averages.energy * 10,
    sleep: averages.sleep * 10,
    // Not used but required by type
    joy: 0, sadness: 0, anger: 0, fear: 0, apathy: 0,
    love: 0, work: 0, friendship: 0, growth: 0, health: 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide px-1">
          Focus Attuali
        </h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Focus Attuali
        </h3>
        <span className="text-xs text-muted-foreground">
          Media 7gg {averages.daysWithData > 0 && `(${averages.daysWithData} giorni)`}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {FOCUS_METRICS.map((metricKey, index) => (
          <div 
            key={metricKey}
            className="animate-scale-in"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <AdaptiveVitalCard
              metricKey={metricKey}
              value={metricValues[metricKey]}
              isWeeklyAverage={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdaptiveVitalsSection;
