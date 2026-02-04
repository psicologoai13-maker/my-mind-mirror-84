import React, { useMemo } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
    <div className="space-y-3">
      {/* Domain Header */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-xl">{domain.icon}</span>
        <div>
          <h3 className="font-display font-semibold text-base text-foreground">
            {domain.label}
          </h3>
          <p className="text-xs text-muted-foreground">
            {domain.description}
          </p>
        </div>
      </div>
      
      {/* Metrics Grid with Horizontal Scroll */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {metricsWithData.map((metric) => {
            const data = metricsData[metric.key] || {
              value: null,
              trend: 'stable' as const,
              sparklineData: []
            };
            
            return (
              <div key={metric.key} className="flex-shrink-0 w-[100px]">
                <UnifiedMetricCard
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
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default ClinicalDomainSection;
