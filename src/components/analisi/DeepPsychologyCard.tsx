import React from 'react';
import { cn } from '@/lib/utils';
import { MetricConfig } from '@/hooks/useAIAnalysis';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';

interface DeepPsychologyCardProps {
  metrics: MetricConfig[];
  psychologyData: Record<string, number | null>;
  onMetricClick: (key: string) => void;
}

const PSYCHOLOGY_META: Record<string, { label: string; icon: string; isNegative: boolean }> = {
  rumination: { label: 'Ruminazione', icon: '🔄', isNegative: true },
  burnout_level: { label: 'Burnout', icon: '🔥', isNegative: true },
  somatic_tension: { label: 'Tensione Somatica', icon: '💪', isNegative: true },
  self_efficacy: { label: 'Autoefficacia', icon: '💫', isNegative: false },
  mental_clarity: { label: 'Chiarezza Mentale', icon: '🧠', isNegative: false },
  gratitude: { label: 'Gratitudine', icon: '🙏', isNegative: false },
  guilt: { label: 'Senso di Colpa', icon: '😔', isNegative: true },
  irritability: { label: 'Irritabilità', icon: '😤', isNegative: true },
  loneliness_perceived: { label: 'Solitudine', icon: '🏝️', isNegative: true },
  coping_ability: { label: 'Capacità di Coping', icon: '🛡️', isNegative: false },
  appetite_changes: { label: 'Appetito', icon: '🍽️', isNegative: true },
  sunlight_exposure: { label: 'Esposizione Solare', icon: '☀️', isNegative: false },
};

const DeepPsychologyCard: React.FC<DeepPsychologyCardProps> = ({ 
  metrics, 
  psychologyData, 
  onMetricClick 
}) => {
  const getScoreColor = (score: number | null, isNegative: boolean) => {
    if (score === null) return 'text-muted-foreground';
    const effectiveScore = isNegative ? 10 - score : score;
    if (effectiveScore >= 7) return 'text-emerald-500';
    if (effectiveScore >= 4) return 'text-amber-500';
    return 'text-orange-500';
  };

  const getScoreLabel = (score: number | null, isNegative: boolean) => {
    if (score === null) return '';
    const effectiveScore = isNegative ? 10 - score : score;
    if (effectiveScore >= 7) return 'Ottimo';
    if (effectiveScore >= 4) return 'Moderato';
    return 'Da migliorare';
  };

  // Get all available psychology metrics
  const displayMetrics = Object.keys(PSYCHOLOGY_META).filter(key => {
    const value = psychologyData[key];
    return value !== null && value !== undefined;
  });

  if (displayMetrics.length === 0) {
    return (
      <div className="bg-card rounded-3xl shadow-premium p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🧠</span>
          <h3 className="font-semibold text-foreground">Psicologia Profonda</h3>
        </div>
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">Parla con l'AI per sbloccare metriche avanzate</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl shadow-premium p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-lg">🧠</span>
        <h3 className="font-semibold text-foreground">Psicologia Profonda</h3>
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full ml-auto">
          AI
        </span>
      </div>

      <div className="space-y-2">
        {displayMetrics.map((key) => {
          const meta = PSYCHOLOGY_META[key];
          const value = psychologyData[key];
          const highlighted = metrics.find(m => m.key === key);
          
          return (
            <button
              key={key}
              onClick={() => onMetricClick(key)}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-2xl transition-all",
                highlighted ? "bg-primary/5 border border-primary/20" : "bg-muted/50 hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{meta.icon}</span>
                <div className="text-left">
                  <span className="font-medium text-foreground text-sm">{meta.label}</span>
                  {highlighted?.reason && (
                    <p className="text-xs text-primary">{highlighted.reason}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className={cn("font-bold", getScoreColor(value, meta.isNegative))}>
                    {value !== null ? Math.round(value) : '—'}
                  </span>
                  <span className="text-xs text-muted-foreground">/10</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DeepPsychologyCard;
