import React from 'react';
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricData } from '@/pages/Analisi';

interface MetricRowProps {
  metric: MetricData;
  onClick: () => void;
  isLast?: boolean;
}

// Metriche dove valori BASSI sono positivi (1=bene, 10=male)
const NEGATIVE_METRICS = ['anxiety', 'anger', 'sadness', 'fear', 'apathy', 'stress', 'rumination', 'perceived_stress'];

const getScoreLabel = (score: number, isNegative: boolean): string => {
  if (isNegative) {
    if (score <= 2) return 'Ottimo';
    if (score <= 4) return 'Buono';
    if (score <= 6) return 'Moderato';
    if (score <= 8) return 'Elevato';
    return 'Critico';
  } else {
    if (score >= 8) return 'Ottimo';
    if (score >= 6) return 'Buono';
    if (score >= 4) return 'Moderato';
    if (score >= 2) return 'Basso';
    return 'Critico';
  }
};

const getScoreColor = (score: number, isNegative: boolean): string => {
  const effectiveScore = isNegative ? 11 - score : score; // Inverti per metriche negative
  if (effectiveScore >= 8) return 'text-emerald-500';
  if (effectiveScore >= 6) return 'text-lime-500';
  if (effectiveScore >= 4) return 'text-amber-500';
  if (effectiveScore >= 2) return 'text-orange-500';
  return 'text-destructive';
};

const MetricRow: React.FC<MetricRowProps> = ({ metric, onClick, isLast }) => {
  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
  
  const isNegative = NEGATIVE_METRICS.includes(metric.key);
  
  // Trend color: per metriche negative, "up" è male (rosso), "down" è bene (verde)
  const trendColor = isNegative
    ? (metric.trend === 'up' ? 'text-destructive' : metric.trend === 'down' ? 'text-emerald-500' : 'text-muted-foreground')
    : (metric.trend === 'up' ? 'text-emerald-500' : metric.trend === 'down' ? 'text-destructive' : 'text-muted-foreground');

  // Converti tutto in scala 1-10
  const score10 = metric.average !== null 
    ? Math.round((metric.average / 10)) // da 0-100 a 1-10
    : null;
  
  const displayScore = score10 !== null ? (score10 / 1).toFixed(1) : '—';
  const scoreLabel = score10 !== null ? getScoreLabel(score10, isNegative) : '';
  const scoreColor = score10 !== null ? getScoreColor(score10, isNegative) : 'text-muted-foreground';

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
        <div className="text-right flex items-center gap-2">
          <span className={cn("font-bold text-lg", scoreColor)}>
            {displayScore}
          </span>
          {scoreLabel && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {scoreLabel}
            </span>
          )}
        </div>
        <TrendIcon className={cn("w-4 h-4", trendColor)} />
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );
};

export default MetricRow;