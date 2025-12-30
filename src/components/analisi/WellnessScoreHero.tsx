import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricData } from '@/pages/Analisi';

interface WellnessScoreHeroProps {
  metrics: MetricData[];
  timeRangeLabel: string;
}

const WellnessScoreHero: React.FC<WellnessScoreHeroProps> = ({ metrics, timeRangeLabel }) => {
  // Calculate global wellness score (average of all vital metrics)
  const vitalMetrics = metrics.filter(m => m.category === 'vitali');
  const validScores = vitalMetrics
    .map(m => m.average)
    .filter((v): v is number => v !== null);
  
  const globalScore = validScores.length > 0 
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length / 10)
    : null;

  // Find concerning and improving metrics
  const anxietyMetric = metrics.find(m => m.key === 'anxiety');
  const moodMetric = metrics.find(m => m.key === 'mood');
  const energyMetric = metrics.find(m => m.key === 'energy');
  
  // Generate AI insight text
  const generateInsight = () => {
    if (globalScore === null) return "Non ci sono ancora dati sufficienti per un'analisi.";
    
    const insights: string[] = [];
    
    if (globalScore >= 7) {
      insights.push(`${timeRangeLabel} stai andando molto bene`);
    } else if (globalScore >= 5) {
      insights.push(`${timeRangeLabel} sei stabile`);
    } else {
      insights.push(`${timeRangeLabel} potresti aver bisogno di più supporto`);
    }
    
    // Check anxiety trend
    if (anxietyMetric?.trend === 'up' && anxietyMetric.average && anxietyMetric.average > 50) {
      insights.push("l'ansia è in leggero aumento");
    } else if (anxietyMetric?.trend === 'down') {
      insights.push("l'ansia sta diminuendo");
    }
    
    // Check mood
    if (moodMetric?.trend === 'up') {
      insights.push("l'umore sta migliorando");
    } else if (moodMetric?.trend === 'down' && moodMetric.average && moodMetric.average < 50) {
      insights.push("l'umore richiede attenzione");
    }
    
    return insights.length > 1 
      ? `${insights[0]}, ma ${insights.slice(1).join(' e ')}.`
      : `${insights[0]}.`;
  };

  const chartData = [
    { name: 'score', value: globalScore ?? 0, fill: 'hsl(var(--primary))' }
  ];

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 7) return 'text-emerald-500';
    if (score >= 5) return 'text-amber-500';
    return 'text-orange-500';
  };

  return (
    <div className="bg-card rounded-3xl shadow-premium p-6">
      <div className="flex items-center gap-5">
        {/* Ring Chart */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="75%"
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
            <span className={cn("text-3xl font-bold", getScoreColor(globalScore))}>
              {globalScore ?? '—'}
            </span>
            <span className="text-xs text-muted-foreground">/10</span>
          </div>
        </div>

        {/* AI Insight */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wide">Insight AI</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {generateInsight()}
          </p>
          
          {/* Quick trend indicators */}
          <div className="flex items-center gap-3 mt-3">
            {vitalMetrics.slice(0, 3).map(m => {
              const TrendIcon = m.trend === 'up' ? TrendingUp : m.trend === 'down' ? TrendingDown : Minus;
              const isNegative = m.key === 'anxiety';
              const trendColor = isNegative
                ? (m.trend === 'up' ? 'text-orange-500' : m.trend === 'down' ? 'text-emerald-500' : 'text-muted-foreground')
                : (m.trend === 'up' ? 'text-emerald-500' : m.trend === 'down' ? 'text-orange-500' : 'text-muted-foreground');
              
              return (
                <div key={m.key} className="flex items-center gap-1">
                  <span className="text-xs">{m.icon}</span>
                  <TrendIcon className={cn("w-3 h-3", trendColor)} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WellnessScoreHero;
