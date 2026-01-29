import React from 'react';
import VitalMetricCard from './VitalMetricCard';
import EmotionalMixBar from '@/components/home/EmotionalMixBar';
import LifeBalanceRadar from '@/components/home/LifeBalanceRadar';
import DeepPsychologyCard from './DeepPsychologyCard';
import { MetricData, MetricType } from '@/pages/Analisi';
import { MetricConfig } from '@/hooks/useAIAnalysis';
import { Sparkles } from 'lucide-react';

interface MenteTabProps {
  vitalMetrics: MetricData[];
  chartDataByMetric: Record<string, { value: number; date?: string; timestamp: number }[]>;
  psychologyData: Record<string, number | null>;
  highlightedMetrics: MetricConfig[];
  onMetricClick: (key: MetricType) => void;
}

export const MenteTab: React.FC<MenteTabProps> = ({
  vitalMetrics,
  chartDataByMetric,
  psychologyData,
  highlightedMetrics,
  onMetricClick,
}) => {
  return (
    <div className="space-y-5">
      {/* Vitals Grid */}
      <section className="animate-fade-in">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
            <span>📊</span> Parametri Vitali
          </h2>
          <span className="px-2 py-0.5 text-[10px] font-medium bg-gradient-aria-subtle text-aria-violet rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {vitalMetrics.map((metric) => (
            <VitalMetricCard
              key={metric.key}
              metric={metric}
              chartData={chartDataByMetric[metric.key] || []}
              onClick={() => onMetricClick(metric.key)}
            />
          ))}
        </div>
      </section>

      {/* Emotional Mix */}
      <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <EmotionalMixBar />
      </section>

      {/* Life Balance Radar */}
      <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <LifeBalanceRadar />
      </section>

      {/* Deep Psychology */}
      <section className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <DeepPsychologyCard
          metrics={highlightedMetrics.filter(m => m.category === 'psicologia')}
          psychologyData={psychologyData}
          onMetricClick={(key) => onMetricClick(key as MetricType)}
        />
      </section>
    </div>
  );
};

export default MenteTab;
