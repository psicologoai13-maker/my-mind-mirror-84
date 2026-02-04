import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { MetricConfig } from '@/hooks/useAIAnalysis';
import { ChevronDown } from 'lucide-react';

interface DeepPsychologyCardProps {
  metrics: MetricConfig[];
  psychologyData: Record<string, number | null>;
  onMetricClick: (key: string) => void;
}

const PSYCHOLOGY_META: Record<string, { label: string; icon: string; isNegative: boolean; description: string }> = {
  rumination: { 
    label: 'Ruminazione', 
    icon: '🔄', 
    isNegative: true,
    description: 'Tendenza a ripensare ripetutamente a eventi passati o preoccupazioni. Punteggi alti indicano pensieri ciclici difficili da interrompere.'
  },
  burnout_level: { 
    label: 'Burnout', 
    icon: '🔥', 
    isNegative: true,
    description: 'Livello di esaurimento emotivo e mentale. Punteggi alti segnalano stanchezza cronica e distacco dalle attività quotidiane.'
  },
  somatic_tension: { 
    label: 'Tensione Somatica', 
    icon: '💪', 
    isNegative: true,
    description: 'Tensione fisica accumulata nel corpo (collo, spalle, mascella). Riflette lo stress emotivo manifestato fisicamente.'
  },
  self_efficacy: { 
    label: 'Autoefficacia', 
    icon: '💫', 
    isNegative: false,
    description: 'Fiducia nella propria capacità di affrontare sfide e raggiungere obiettivi. Punteggi alti indicano sicurezza in sé stessi.'
  },
  mental_clarity: { 
    label: 'Chiarezza Mentale', 
    icon: '🧠', 
    isNegative: false,
    description: 'Capacità di pensare lucidamente e prendere decisioni. Punteggi alti indicano mente sgombra e concentrazione.'
  },
  gratitude: { 
    label: 'Gratitudine', 
    icon: '🙏', 
    isNegative: false,
    description: 'Capacità di apprezzare le cose positive nella vita. Fortemente correlata al benessere emotivo generale.'
  },
  guilt: { 
    label: 'Senso di Colpa', 
    icon: '😔', 
    isNegative: true,
    description: 'Sensazione di aver fatto qualcosa di sbagliato o di non essere all\'altezza. Può essere adattivo o eccessivo.'
  },
  irritability: { 
    label: 'Irritabilità', 
    icon: '😤', 
    isNegative: true,
    description: 'Tendenza a reagire con frustrazione o impazienza. Spesso segnala stress accumulato o bisogni insoddisfatti.'
  },
  loneliness_perceived: { 
    label: 'Solitudine', 
    icon: '🏝️', 
    isNegative: true,
    description: 'Sensazione soggettiva di isolamento sociale, indipendentemente dai contatti reali. Impatta profondamente il benessere.'
  },
  coping_ability: { 
    label: 'Capacità di Coping', 
    icon: '🛡️', 
    isNegative: false,
    description: 'Abilità di gestire situazioni stressanti in modo efficace. Include strategie cognitive ed emotive.'
  },
  appetite_changes: { 
    label: 'Appetito', 
    icon: '🍽️', 
    isNegative: true,
    description: 'Variazioni nell\'appetito (aumento o diminuzione). Spesso riflette lo stato emotivo e lo stress.'
  },
  sunlight_exposure: { 
    label: 'Esposizione Solare', 
    icon: '☀️', 
    isNegative: false,
    description: 'Tempo trascorso all\'aperto con luce naturale. Fondamentale per umore, energia e ritmo circadiano.'
  },
};

const DeepPsychologyCard: React.FC<DeepPsychologyCardProps> = ({ 
  metrics, 
  psychologyData, 
  onMetricClick 
}) => {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const getScoreColor = (score: number | null, isNegative: boolean) => {
    if (score === null) return 'text-muted-foreground';
    const effectiveScore = isNegative ? 10 - score : score;
    if (effectiveScore >= 7) return 'text-emerald-500';
    if (effectiveScore >= 4) return 'text-amber-500';
    return 'text-orange-500';
  };

  // Get all available psychology metrics
  const displayMetrics = Object.keys(PSYCHOLOGY_META).filter(key => {
    const value = psychologyData[key];
    return value !== null && value !== undefined;
  });

  const handleClick = (key: string) => {
    setExpandedKey(prev => prev === key ? null : key);
  };

  if (displayMetrics.length === 0) {
    return (
      <div className={cn(
        "relative overflow-hidden rounded-3xl p-6",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass"
      )}>
        {/* Inner light */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-2 mb-4">
          <span className="text-lg">🧠</span>
          <h3 className="font-semibold text-foreground">Psicologia Profonda</h3>
        </div>
        <div className="relative z-10 text-center py-6 text-muted-foreground">
          <p className="text-sm">Parla con l'AI per sbloccare metriche avanzate</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl p-6",
      "bg-glass backdrop-blur-xl border border-glass-border",
      "shadow-glass"
    )}>
      {/* Inner light */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 flex items-center gap-2 mb-5">
        <span className="text-lg">🧠</span>
        <h3 className="font-semibold text-foreground">Psicologia Profonda</h3>
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gradient-aria-subtle text-aria-violet rounded-full ml-auto">
          AI
        </span>
      </div>

      <div className="relative z-10 space-y-2">
        {displayMetrics.map((key) => {
          const meta = PSYCHOLOGY_META[key];
          const value = psychologyData[key];
          const highlighted = metrics.find(m => m.key === key);
          const isExpanded = expandedKey === key;
          
          return (
            <button
              key={key}
              onClick={() => handleClick(key)}
              className={cn(
                "w-full p-3 rounded-2xl transition-all text-left",
                "bg-glass-subtle backdrop-blur-lg",
                highlighted 
                  ? "border border-aria-violet/30 shadow-aria-glow" 
                  : "border border-transparent hover:border-border/50 hover:bg-muted/50"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{meta.icon}</span>
                  <span className="font-medium text-foreground text-sm">{meta.label}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className={cn("font-bold", getScoreColor(value, meta.isNegative))}>
                      {value !== null ? Math.round(value) : '—'}
                    </span>
                    <span className="text-xs text-muted-foreground">/10</span>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )} />
                </div>
              </div>
              
              {/* Expandable description */}
              <div className={cn(
                "overflow-hidden transition-all duration-200",
                isExpanded ? "max-h-24 mt-3 opacity-100" : "max-h-0 opacity-0"
              )}>
                <p className="text-xs text-muted-foreground line-clamp-3 pl-8">
                  {highlighted?.reason || meta.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DeepPsychologyCard;
