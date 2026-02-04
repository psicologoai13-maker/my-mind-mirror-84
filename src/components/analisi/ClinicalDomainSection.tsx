import React, { useMemo } from 'react';
import UnifiedMetricCard from './UnifiedMetricCard';
import { ClinicalMetric, ClinicalDomain } from '@/lib/clinicalDomains';

export interface MetricData {
  value: number | null;
  trend: 'up' | 'down' | 'stable';
  sparklineData: number[];
}

interface ClinicalDomainSectionProps {
  domain: ClinicalDomain;
  metrics: ClinicalMetric[];
  metricsData: Record<string, MetricData>;
  onMetricClick: (key: string) => void;
}

const ClinicalDomainSection: React.FC<ClinicalDomainSectionProps> = ({
  domain,
  metrics,
  metricsData,
  onMetricClick
}) => {
  // Filter metrics that have data
  const metricsWithData = useMemo(() => {
    return metrics.filter(m => {
      const data = metricsData[m.key];
      return data && data.value !== null;
    });
  }, [metrics, metricsData]);
  
  // Don't render if no metrics have data
  if (metricsWithData.length === 0) return null;
  
  return (
    <div className="space-y-2">
      {/* Domain Header - Compact */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{domain.icon}</span>
        <h3 className="font-display font-semibold text-sm text-foreground">
          {domain.label}
        </h3>
        <span className="text-xs text-muted-foreground">
          ({metricsWithData.length})
        </span>
      </div>
      
      {/* Metrics Grid - Responsive 2 columns */}
      <div className="grid grid-cols-2 gap-1.5">
        {metricsWithData.map((metric) => {
          const data = metricsData[metric.key] || {
            value: null,
            trend: 'stable' as const,
            sparklineData: []
          };
          
          return (
            <UnifiedMetricCard
              key={metric.key}
              metricKey={metric.key}
              label={metric.label}
              icon={metric.icon}
              color={metric.color}
              value={data.value}
              trend={data.trend}
              sparklineData={data.sparklineData}
              isNegative={metric.isNegative}
              onClick={() => onMetricClick(metric.key)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ClinicalDomainSection;
