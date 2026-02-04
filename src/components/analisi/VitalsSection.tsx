import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import DomainCard from './DomainCard';
import { ClinicalDomain } from '@/lib/clinicalDomains';

interface VitalsSectionProps {
  allMetricsData: Record<string, { value: number | null; trend?: 'up' | 'down' | 'stable' }>;
  onMetricClick: (key: string) => void;
}

const VITALS_DOMAIN: ClinicalDomain = {
  id: 'activation',
  label: 'Parametri Vitali',
  icon: '💓',
  description: 'I tuoi indicatori fondamentali',
  color: 'hsl(340, 70%, 55%)'
};

const VITALS_CONFIG = [
  { key: 'mood', label: 'Umore', icon: '😌', color: 'hsl(150, 60%, 45%)', isNegative: false },
  { key: 'anxiety', label: 'Ansia', icon: '😰', color: 'hsl(0, 70%, 55%)', isNegative: true },
  { key: 'energy', label: 'Energia', icon: '⚡', color: 'hsl(45, 80%, 50%)', isNegative: false },
  { key: 'sleep', label: 'Sonno', icon: '💤', color: 'hsl(260, 60%, 55%)', isNegative: false },
];

const VitalsSection: React.FC<VitalsSectionProps> = ({
  allMetricsData,
  onMetricClick
}) => {
  const vitalsList = useMemo(() => {
    return VITALS_CONFIG
      .map(config => {
        const data = allMetricsData[config.key];
        const value = data?.value ?? 0;
        const trend = data?.trend ?? 'stable';
        return {
          ...config,
          value: Math.round(value * 10) / 10,
          trend,
        };
      })
      .filter(v => v.value > 0);
  }, [allMetricsData]);

  if (vitalsList.length === 0) return null;

  const getTrendIcon = (trend: string, isNegative: boolean) => {
    if (trend === 'up') return isNegative ? '📈' : '📈';
    if (trend === 'down') return isNegative ? '📉' : '📉';
    return '➡️';
  };

  const getTrendColor = (trend: string, isNegative: boolean) => {
    if (trend === 'up') return isNegative ? 'text-red-500' : 'text-green-500';
    if (trend === 'down') return isNegative ? 'text-green-500' : 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <DomainCard domain={VITALS_DOMAIN}>
      <div className="grid grid-cols-2 gap-3">
        {vitalsList.map((vital) => (
          <button
            key={vital.key}
            onClick={() => onMetricClick(vital.key)}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-2xl",
              "bg-glass/30 border border-glass-border/40",
              "hover:bg-glass/50 transition-all duration-200",
              "active:scale-[0.97]"
            )}
          >
            {/* Icon */}
            <span className="text-3xl mb-2">{vital.icon}</span>
            
            {/* Label */}
            <span className="text-xs text-muted-foreground mb-1">
              {vital.label}
            </span>
            
            {/* Value */}
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold text-foreground">
                {vital.value}
              </span>
              <span className="text-xs text-muted-foreground">/10</span>
            </div>
            
            {/* Trend */}
            <div className={cn(
              "mt-1 text-xs flex items-center gap-1",
              getTrendColor(vital.trend, vital.isNegative)
            )}>
              <span>{getTrendIcon(vital.trend, vital.isNegative)}</span>
              <span>
                {vital.trend === 'up' ? 'In aumento' : 
                 vital.trend === 'down' ? 'In calo' : 'Stabile'}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-muted/20 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${vital.value * 10}%`,
                  backgroundColor: vital.color,
                }}
              />
            </div>
          </button>
        ))}
      </div>
    </DomainCard>
  );
};

export default VitalsSection;
