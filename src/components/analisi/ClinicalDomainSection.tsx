import React, { useMemo } from 'react';
import RichMetricCard from './RichMetricCard';
import DomainCard from './DomainCard';
import { ClinicalMetric, ClinicalDomain } from '@/lib/clinicalDomains';
import { cn } from '@/lib/utils';

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

// Smart grid layout logic
const getGridClass = (count: number): string => {
  if (count === 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  return 'grid-cols-3';
};

const getColSpan = (count: number, index: number): string => {
  if (count === 1) return 'col-span-1';
  if (count === 2) return 'col-span-1';
  
  const remainder = count % 3;
  const lastRowStart = count - remainder;
  
  // Handle last row for anti-gap logic
  if (remainder === 1 && index === lastRowStart) {
    return 'col-span-3'; // Single item spans full width
  }
  if (remainder === 2 && index >= lastRowStart) {
    return 'col-span-1'; // Two items at half width each - use special class
  }
  
  return 'col-span-1';
};

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
  
  const count = metricsWithData.length;
  const isSingleMetric = count === 1;
  
  // For last row with 2 items, use special layout
  const remainder = count % 3;
  const lastRowStart = count - remainder;
  
  return (
    <DomainCard domain={domain}>
      <div className={cn(
        "grid gap-2",
        getGridClass(count)
      )}>
        {metricsWithData.map((metric, index) => {
          const data = metricsData[metric.key] || {
            value: null,
            trend: 'stable' as const,
            sparklineData: []
          };
          
          const colSpan = getColSpan(count, index);
          
          // Special handling for last row with 2 items - center them
          const isInLastRowOfTwo = remainder === 2 && index >= lastRowStart;
          
          return (
            <div
              key={metric.key}
              className={cn(
                colSpan,
                // For 2-item last row, make them take 1.5 cols each visually
                isInLastRowOfTwo && index === lastRowStart && 'col-start-1',
                isInLastRowOfTwo && index === lastRowStart + 1 && 'col-start-2'
              )}
              style={
                // For single expanded card with 2 items in last row, center them
                isInLastRowOfTwo ? { 
                  gridColumn: index === lastRowStart ? '1 / 2' : '2 / 4'
                } : undefined
              }
            >
              <RichMetricCard
                metricKey={metric.key}
                label={metric.label}
                icon={metric.icon}
                color={metric.color}
                value={data.value}
                trend={data.trend}
                isNegative={metric.isNegative}
                size={isSingleMetric ? 'expanded' : 'compact'}
                onClick={() => onMetricClick(metric.key)}
              />
            </div>
          );
        })}
      </div>
    </DomainCard>
  );
};

export default ClinicalDomainSection;
