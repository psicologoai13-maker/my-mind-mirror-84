import React from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import UnifiedMetricCard from './UnifiedMetricCard';
import { MetricConfig } from '@/lib/metricConfigs';

interface MetricDataItem {
  value: number | null;
  trend: 'up' | 'down' | 'stable';
  chartData: { value: number }[];
}

interface CategorySectionProps {
  title: string;
  icon: string;
  metrics: MetricConfig[];
  data: Record<string, MetricDataItem>;
  onMetricClick: (key: string) => void;
  layout?: 'grid' | 'scroll';
  className?: string;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  icon,
  metrics,
  data,
  onMetricClick,
  layout = 'grid',
  className,
}) => {
  // Filter out metrics with no data
  const metricsWithData = metrics.filter(m => {
    const d = data[m.key];
    return d && (d.value !== null || d.chartData.length > 0);
  });

  if (metricsWithData.length === 0) {
    return null;
  }

  const renderCards = () => (
    metricsWithData.map((metric) => {
      const metricData = data[metric.key] || { value: null, trend: 'stable' as const, chartData: [] };
      return (
        <UnifiedMetricCard
          key={metric.key}
          config={metric}
          value={metricData.value}
          trend={metricData.trend}
          chartData={metricData.chartData}
          onClick={() => onMetricClick(metric.key)}
        />
      );
    })
  );

  return (
    <section className={cn("animate-fade-in", className)}>
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-lg">{icon}</span>
        <h2 className="font-display font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground ml-auto">
          {metricsWithData.length} metriche
        </span>
      </div>

      {/* Cards */}
      {layout === 'scroll' ? (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-2">
            {renderCards()}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {renderCards()}
        </div>
      )}
    </section>
  );
};

export default CategorySection;
