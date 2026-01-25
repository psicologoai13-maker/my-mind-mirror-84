import React, { useMemo } from 'react';
import { useTimeWeightedMetrics } from '@/hooks/useTimeWeightedMetrics';
import { useProfile } from '@/hooks/useProfile';
import { usePersonalizedCheckins } from '@/hooks/usePersonalizedCheckins';
import { Lightbulb, TrendingDown, TrendingUp, AlertTriangle, Sparkles, Target, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Insight {
  id: string;
  type: 'correlation' | 'alert' | 'positive' | 'suggestion' | 'goal';
  icon: React.ReactNode;
  title: string;
  message: string;
  color: string;
  bgColor: string;
  priority: number;
}

const FlashInsights: React.FC = () => {
  // 🎯 TIME-WEIGHTED AVERAGE: Dati più recenti hanno più rilevanza
  const { vitals, deepPsychology, emotions, lifeAreas, hasData } = useTimeWeightedMetrics(30, 7);
  const { profile } = useProfile();
  const { completedToday } = usePersonalizedCheckins();
  
  const userGoals = profile?.selected_goals || [];

  const insights = useMemo<Insight[]>(() => {
    const result: Insight[] = [];

    if (!hasData) return result;

    const psych = deepPsychology;
    
    // 🔄 L'ansia usa logica inversa: nel DB alto = bene, nella UI basso = bene
    const actualAnxiety = vitals?.anxiety !== null ? 10 - vitals.anxiety : null;

    // === GOAL-BASED INSIGHTS (priorità alta) ===
    
    // Se l'utente ha obiettivo ansia e l'ansia è migliorata
    if (userGoals.some(g => g.toLowerCase().includes('ansia') || g.toLowerCase().includes('stress'))) {
      if (actualAnxiety !== null && actualAnxiety <= 3) {
        result.push({
          id: 'goal-anxiety-good',
          type: 'goal',
          icon: <Target className="w-4 h-4" />,
          title: 'Obiettivo: Ansia sotto controllo',
          message: 'Stai gestendo bene l\'ansia! Continua con le tue strategie.',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          priority: 100,
        });
      } else if (actualAnxiety !== null && actualAnxiety >= 6) {
        result.push({
          id: 'goal-anxiety-high',
          type: 'goal',
          icon: <Target className="w-4 h-4" />,
          title: 'Focus: Gestione ansia',
          message: 'L\'ansia è elevata. Prova una sessione vocale per elaborare i pensieri.',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          priority: 95,
        });
      }
    }

    // Se l'utente ha obiettivo sonno
    if (userGoals.some(g => g.toLowerCase().includes('sonno') || g.toLowerCase().includes('dormire'))) {
      if (vitals?.sleep && vitals.sleep >= 7) {
        result.push({
          id: 'goal-sleep-good',
          type: 'goal',
          icon: <Target className="w-4 h-4" />,
          title: 'Obiettivo: Sonno migliorato',
          message: 'La qualità del sonno sta migliorando. Ottimo lavoro!',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          priority: 100,
        });
      } else if (vitals?.sleep && vitals.sleep <= 4) {
        result.push({
          id: 'goal-sleep-low',
          type: 'goal',
          icon: <Target className="w-4 h-4" />,
          title: 'Focus: Qualità del sonno',
          message: 'Il sonno è ancora critico. Prova a ridurre schermi prima di dormire.',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          priority: 95,
        });
      }
    }

    // Se l'utente ha obiettivo relazioni
    if (userGoals.some(g => g.toLowerCase().includes('relazion') || g.toLowerCase().includes('social'))) {
      if (lifeAreas?.social && lifeAreas.social >= 7) {
        result.push({
          id: 'goal-social-good',
          type: 'goal',
          icon: <Heart className="w-4 h-4" />,
          title: 'Relazioni in crescita',
          message: 'Le tue connessioni sociali stanno fiorendo!',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          priority: 90,
        });
      }
    }

    // === CORRELATION INSIGHTS ===
    
    // Rumination -> Sleep correlation
    if (psych?.rumination && psych.rumination >= 7 && vitals?.sleep && vitals.sleep <= 4) {
      result.push({
        id: 'rumination-sleep',
        type: 'correlation',
        icon: <TrendingDown className="w-4 h-4" />,
        title: 'Pattern rilevato',
        message: 'Quando la ruminazione sale, il sonno scende. Prova a scrivere i pensieri prima di dormire.',
        color: 'text-violet-600',
        bgColor: 'bg-violet-50',
        priority: 80,
      });
    }

    // High burnout alert (solo se non già completato oggi)
    if (psych?.burnout_level && psych.burnout_level >= 8 && !('burnout_level' in completedToday)) {
      result.push({
        id: 'burnout-alert',
        type: 'alert',
        icon: <AlertTriangle className="w-4 h-4" />,
        title: 'Segnale di esaurimento',
        message: 'Il tuo livello di burnout è alto. Considera di prenderti una pausa.',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        priority: 85,
      });
    }

    // Low self-efficacy
    if (psych?.self_efficacy && psych.self_efficacy <= 3) {
      result.push({
        id: 'self-efficacy-low',
        type: 'suggestion',
        icon: <Lightbulb className="w-4 h-4" />,
        title: 'Fiducia in sé bassa',
        message: 'Ricorda: hai superato sfide prima. Fai una lista dei tuoi successi recenti.',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        priority: 70,
      });
    }

    // High loneliness
    if (psych?.loneliness_perceived && psych.loneliness_perceived >= 7 && !('loneliness_perceived' in completedToday)) {
      result.push({
        id: 'loneliness-high',
        type: 'alert',
        icon: <AlertTriangle className="w-4 h-4" />,
        title: 'Solitudine percepita',
        message: 'Ti sei sentito solo ultimamente. Anche una breve chiamata può aiutare.',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        priority: 75,
      });
    }

    // Somatic tension -> anxiety correlation
    if (psych?.somatic_tension && psych.somatic_tension >= 6 && actualAnxiety !== null && actualAnxiety >= 6) {
      result.push({
        id: 'somatic-anxiety',
        type: 'correlation',
        icon: <TrendingUp className="w-4 h-4" />,
        title: 'Stress corporeo',
        message: 'Il tuo corpo sta portando tensione. Prova stretching o respirazione profonda.',
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
        priority: 80,
      });
    }

    // Positive: High gratitude
    if (psych?.gratitude && psych.gratitude >= 8) {
      result.push({
        id: 'gratitude-high',
        type: 'positive',
        icon: <Sparkles className="w-4 h-4" />,
        title: 'Gratitudine alta!',
        message: 'Stai apprezzando le cose buone della vita. Questo protegge la salute mentale.',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        priority: 60,
      });
    }

    // Low sunlight exposure (solo se non già completato oggi)
    if (psych?.sunlight_exposure && psych.sunlight_exposure <= 3 && vitals?.mood && vitals.mood <= 5 && !('sunlight_exposure' in completedToday)) {
      result.push({
        id: 'sunlight-mood',
        type: 'suggestion',
        icon: <Lightbulb className="w-4 h-4" />,
        title: 'Poca luce solare',
        message: 'L\'umore potrebbe beneficiare di più tempo all\'aperto. Anche 15 minuti aiutano.',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        priority: 65,
      });
    }

    // High guilt
    if (psych?.guilt && psych.guilt >= 7) {
      result.push({
        id: 'guilt-high',
        type: 'alert',
        icon: <AlertTriangle className="w-4 h-4" />,
        title: 'Senso di colpa',
        message: 'Stai portando un peso. Ricorda: essere gentili con sé stessi è importante.',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        priority: 70,
      });
    }

    // High irritability + low sleep
    if (psych?.irritability && psych.irritability >= 7 && vitals?.sleep && vitals.sleep <= 4) {
      result.push({
        id: 'irritability-sleep',
        type: 'correlation',
        icon: <TrendingDown className="w-4 h-4" />,
        title: 'Irritabilità e sonno',
        message: 'Dormire poco aumenta l\'irritabilità. Prova a migliorare la qualità del riposo.',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        priority: 75,
      });
    }

    // Positive: High coping + low anxiety
    if (psych?.coping_ability && psych.coping_ability >= 7 && actualAnxiety !== null && actualAnxiety <= 4) {
      result.push({
        id: 'coping-resilience',
        type: 'positive',
        icon: <Sparkles className="w-4 h-4" />,
        title: 'Resilienza attiva',
        message: 'Stai gestendo bene lo stress. Le tue strategie funzionano!',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        priority: 60,
      });
    }

    // Positive: Mood improving
    if (vitals?.mood && vitals.mood >= 8) {
      result.push({
        id: 'mood-high',
        type: 'positive',
        icon: <Sparkles className="w-4 h-4" />,
        title: 'Umore positivo',
        message: 'Il tuo stato d\'animo è buono! Cosa sta funzionando per te?',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        priority: 55,
      });
    }

    // Energy low correlation
    if (vitals?.energy && vitals.energy <= 3 && psych?.burnout_level && psych.burnout_level >= 6) {
      result.push({
        id: 'energy-burnout',
        type: 'correlation',
        icon: <TrendingDown className="w-4 h-4" />,
        title: 'Energia e burnout',
        message: 'Energia bassa e burnout alto sono collegati. Prenditi momenti di recupero.',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        priority: 78,
      });
    }

    // Sort by priority and return top insights
    return result.sort((a, b) => b.priority - a.priority).slice(0, 3);
  }, [vitals, deepPsychology, emotions, lifeAreas, hasData, userGoals, completedToday]);

  if (insights.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        Flash Insights
      </h3>
      
      <div className="space-y-2">
        {insights.map(insight => (
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
