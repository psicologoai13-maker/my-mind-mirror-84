import React, { useMemo } from 'react';
import { useTimeWeightedMetrics } from '@/hooks/useTimeWeightedMetrics';
import { useCriticalPsychologyMetrics } from '@/hooks/useCriticalPsychologyMetrics';
import { Lightbulb, TrendingDown, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Insight {
  id: string;
  type: 'correlation' | 'alert' | 'positive' | 'suggestion';
  icon: React.ReactNode;
  title: string;
  message: string;
  color: string;
  bgColor: string;
}

const FlashInsights: React.FC = () => {
  // 🎯 TIME-WEIGHTED AVERAGE: Dati più recenti hanno più rilevanza
  const { vitals, deepPsychology, hasData } = useTimeWeightedMetrics(30, 7);
  const { criticalMetrics } = useCriticalPsychologyMetrics();

  const insights = useMemo<Insight[]>(() => {
    const result: Insight[] = [];

    if (!hasData) return result;

    const psych = deepPsychology;

    // 1. Rumination -> Sleep correlation
    if (psych?.rumination && psych.rumination >= 7 && vitals?.sleep && vitals.sleep <= 4) {
      result.push({
        id: 'rumination-sleep',
        type: 'correlation',
        icon: <TrendingDown className="w-4 h-4" />,
        title: 'Pattern rilevato',
        message: 'Quando la ruminazione sale, il sonno scende. Prova a scrivere i pensieri prima di dormire.',
        color: 'text-violet-600',
        bgColor: 'bg-violet-50',
      });
    }

    // 2. High burnout alert
    if (psych?.burnout_level && psych.burnout_level >= 8) {
      result.push({
        id: 'burnout-alert',
        type: 'alert',
        icon: <AlertTriangle className="w-4 h-4" />,
        title: 'Segnale di esaurimento',
        message: 'Il tuo livello di burnout è alto. Considera di prenderti una pausa.',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
      });
    }

    // 3. Low self-efficacy
    if (psych?.self_efficacy && psych.self_efficacy <= 3) {
      result.push({
        id: 'self-efficacy-low',
        type: 'suggestion',
        icon: <Lightbulb className="w-4 h-4" />,
        title: 'Fiducia in sé bassa',
        message: 'Ricorda: hai superato sfide prima. Fai una lista dei tuoi successi recenti.',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      });
    }

    // 4. High loneliness
    if (psych?.loneliness_perceived && psych.loneliness_perceived >= 7) {
      result.push({
        id: 'loneliness-high',
        type: 'alert',
        icon: <AlertTriangle className="w-4 h-4" />,
        title: 'Solitudine percepita',
        message: 'Ti sei sentito solo ultimamente. Anche una breve chiamata può aiutare.',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
      });
    }

    // 5. Somatic tension -> anxiety correlation
    if (psych?.somatic_tension && psych.somatic_tension >= 6 && vitals?.anxiety && vitals.anxiety >= 6) {
      result.push({
        id: 'somatic-anxiety',
        type: 'correlation',
        icon: <TrendingUp className="w-4 h-4" />,
        title: 'Stress corporeo',
        message: 'Il tuo corpo sta portando tensione. Prova stretching o respirazione profonda.',
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
      });
    }

    // 6. Positive: High gratitude
    if (psych?.gratitude && psych.gratitude >= 8) {
      result.push({
        id: 'gratitude-high',
        type: 'positive',
        icon: <Sparkles className="w-4 h-4" />,
        title: 'Gratitudine alta!',
        message: 'Stai apprezzando le cose buone della vita. Questo protegge la salute mentale.',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
      });
    }

    // 7. Low sunlight exposure
    if (psych?.sunlight_exposure && psych.sunlight_exposure <= 3 && vitals?.mood && vitals.mood <= 5) {
      result.push({
        id: 'sunlight-mood',
        type: 'suggestion',
        icon: <Lightbulb className="w-4 h-4" />,
        title: 'Poca luce solare',
        message: 'L\'umore potrebbe beneficiare di più tempo all\'aperto. Anche 15 minuti aiutano.',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
      });
    }

    // 8. High guilt
    if (psych?.guilt && psych.guilt >= 7) {
      result.push({
        id: 'guilt-high',
        type: 'alert',
        icon: <AlertTriangle className="w-4 h-4" />,
        title: 'Senso di colpa',
        message: 'Stai portando un peso. Ricorda: essere gentili con sé stessi è importante.',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
      });
    }

    // 9. High irritability + low sleep
    if (psych?.irritability && psych.irritability >= 7 && vitals?.sleep && vitals.sleep <= 4) {
      result.push({
        id: 'irritability-sleep',
        type: 'correlation',
        icon: <TrendingDown className="w-4 h-4" />,
        title: 'Irritabilità e sonno',
        message: 'Dormire poco aumenta l\'irritabilità. Prova a migliorare la qualità del riposo.',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
      });
    }

    // 10. Positive: High coping + low anxiety
    if (psych?.coping_ability && psych.coping_ability >= 7 && vitals?.anxiety && vitals.anxiety <= 4) {
      result.push({
        id: 'coping-resilience',
        type: 'positive',
        icon: <Sparkles className="w-4 h-4" />,
        title: 'Resilienza attiva',
        message: 'Stai gestendo bene lo stress. Le tue strategie funzionano!',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
      });
    }

    return result.slice(0, 3); // Max 3 insights
  }, [vitals, deepPsychology, hasData]);

  // Also add insights based on critical metrics history
  const criticalInsights = useMemo<Insight[]>(() => {
    if (criticalMetrics.length === 0) return [];

    return criticalMetrics.slice(0, 2).map(metric => ({
      id: `critical-${metric.key}`,
      type: 'alert' as const,
      icon: <AlertTriangle className="w-4 h-4" />,
      title: `${metric.label} richiede attenzione`,
      message: `Questo parametro è stato critico negli ultimi giorni. Rispondi al check-in per monitorarlo.`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    }));
  }, [criticalMetrics]);

  const allInsights = [...insights, ...criticalInsights].slice(0, 3);

  if (allInsights.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        Flash Insights
      </h3>
      
      <div className="space-y-2">
        {allInsights.map(insight => (
          <div
            key={insight.id}
            className={cn(
              "p-3 rounded-xl border transition-all duration-200",
              insight.bgColor,
              "border-transparent"
            )}
          >
            <div className="flex items-start gap-2">
              <div className={cn("mt-0.5", insight.color)}>
                {insight.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={cn("text-sm font-medium", insight.color)}>
                  {insight.title}
                </h4>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                  {insight.message}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlashInsights;
