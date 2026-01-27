import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { MetricData } from '@/pages/Analisi';

interface WellnessScoreHeroProps {
  metrics: MetricData[];
  timeRangeLabel: string;
}

const WellnessScoreHero: React.FC<WellnessScoreHeroProps> = ({ metrics, timeRangeLabel }) => {
  // Calculate global wellness score from vital metrics
  const vitalMetrics = metrics.filter(m => m.category === 'vitali');
  const validScores = vitalMetrics
    .map(m => {
      if (m.average === null) return null;
      // For anxiety, invert the score (10 = calm = good, 1 = anxious = bad)
      if (m.key === 'anxiety') {
        return 10 - m.average;
      }
      return m.average;
    })
    .filter((v): v is number => v !== null);
  
  const globalScore = validScores.length > 0 
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length * 10) / 10
    : null;

  const chartData = [
    { name: 'score', value: globalScore ?? 0, fill: 'hsl(var(--primary))' }
  ];

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 7) return 'text-emerald-500';
    if (score >= 5) return 'text-amber-500';
    return 'text-orange-500';
  };

  const getScoreLabel = (score: number | null) => {
    if (score === null) return 'Nessun dato';
    if (score >= 8) return 'Ottimo';
    if (score >= 6) return 'Buono';
    if (score >= 4) return 'Discreto';
    return 'Da migliorare';
  };

  return (
    <div className="bg-card rounded-3xl shadow-premium p-5">
      <div className="flex items-center gap-4">
        {/* Ring Chart */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="70%"
              outerRadius="100%"
              data={chartData}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                dataKey="value"
                cornerRadius={10}
                background={{ fill: 'hsl(var(--muted))' }}
                max={10}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-2xl font-bold", getScoreColor(globalScore))}>
              {globalScore?.toFixed(1) ?? '—'}
            </span>
          </div>
        </div>

        {/* Score label */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">
            Wellness Score
          </h3>
          <p className={cn("text-sm font-medium", getScoreColor(globalScore))}>
            {getScoreLabel(globalScore)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {timeRangeLabel}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WellnessScoreHero;
