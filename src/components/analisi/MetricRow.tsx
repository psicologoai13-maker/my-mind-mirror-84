import React from 'react';
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricData } from '@/pages/Analisi';

interface MetricRowProps {
  metric: MetricData;
  onClick: () => void;
  isLast?: boolean;
}

const MetricRow: React.FC<MetricRowProps> = ({ metric, onClick, isLast }) => {
  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
  const trendColor = metric.trend === 'up' ? 'text-emerald-500' : metric.trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  const displayValue = metric.average !== null 
    ? metric.unit === '/10' 
      ? `${Math.round(metric.average / 10)}/10`
      : `${metric.average}%`
    : '—';

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors",
        !isLast && "border-b border-border/30"
      )}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${metric.color}20` }}
        >
          <span className="text-lg">{metric.icon}</span>
        </div>
        <span className="font-medium text-foreground">{metric.label}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="font-bold text-foreground" style={{ color: metric.color }}>
            {displayValue}
          </span>
        </div>
        <TrendIcon className={cn("w-4 h-4", trendColor)} />
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );
};

export default MetricRow;