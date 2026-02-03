import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { AnimatedRing } from '@/components/ui/animated-ring';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendInfo, TrendType } from '@/hooks/useTimeWeightedMetrics';

export type MetricKey = 
  | 'mood' | 'anxiety' | 'energy' | 'sleep' 
  | 'joy' | 'sadness' | 'anger' | 'fear' | 'apathy'
  | 'love' | 'work' | 'friendship' | 'growth' | 'health'
  | 'stress' | 'calmness' | 'social' | 'loneliness' | 'emotional_clarity';

interface AdaptiveVitalCardProps {
  metricKey: MetricKey;
  value?: number; // 0-100, undefined means "no data"
  trend?: TrendInfo;
  isWeeklyAverage?: boolean;
  isSecondary?: boolean;
}

// Negative metrics: lower is BETTER
const NEGATIVE_METRICS = ['anxiety', 'sadness', 'anger', 'fear', 'apathy', 'stress', 'loneliness'];

// Color logic for DISPLAY value (after inversion for negative metrics)
const getDisplayColor = (displayValue: number): string => {
  const normalized = displayValue / 10;
  if (normalized >= 7) return 'hsl(var(--mood-excellent))';
  if (normalized >= 4) return 'hsl(var(--mood-neutral))';
  return 'hsl(var(--mood-low))';
};

// Get status label based on DISPLAY value (after inversion)
const getStatusLabel = (key: MetricKey, displayValue: number): string => {
  const normalized = displayValue / 10;
  
  const labelsByMetric: Partial<Record<MetricKey, [string, string, string]>> = {
    mood: ['Basso', 'Neutro', 'Ottimo'],
    energy: ['Scarso', 'Normale', 'Carico'],
    sleep: ['Stanco', 'Ok', 'Riposato'],
    joy: ['Assente', 'Presente', 'Gioioso'],
    love: ['Carente', 'Stabile', 'Appagato'],
    work: ['Difficile', 'Nella media', 'Produttivo'],
    growth: ['Stagnante', 'In corso', 'In crescita'],
    health: ['Debole', 'Stabile', 'In forma'],
    calmness: ['Agitato', 'Neutro', 'Sereno'],
    social: ['Isolato', 'Neutro', 'Connesso'],
    friendship: ['Solo', 'Neutro', 'Sociale'],
    emotional_clarity: ['Confuso', 'Neutro', 'Lucido'],
    anxiety: ['Alta', 'Gestibile', 'Calma'],
    stress: ['Elevato', 'Gestibile', 'Rilassato'],
    loneliness: ['Isolato', 'Neutro', 'Connesso'],
    sadness: ['Intensa', 'Presente', 'Sereno'],
    anger: ['Intensa', 'Presente', 'Calmo'],
    fear: ['Elevata', 'Presente', 'Sicuro'],
    apathy: ['Elevata', 'Neutro', 'Motivato'],
  };

  const labels = labelsByMetric[key] || ['Basso', 'Medio', 'Buono'];
  
  if (normalized >= 7) return labels[2];
  if (normalized >= 4) return labels[1];
  return labels[0];
};

// Descriptions for each metric (2-3 lines max)
const METRIC_DESCRIPTIONS: Record<MetricKey, string> = {
  mood: 'Il tuo umore generale riflette come ti senti emotivamente. Un buon umore favorisce energia e motivazione.',
  anxiety: 'Misura il livello di preoccupazione e tensione. Gestire l\'ansia migliora concentrazione e benessere.',
  energy: 'Indica la tua vitalità fisica e mentale. Riposo adeguato e attività fisica la mantengono alta.',
  sleep: 'La qualità del sonno influenza umore, concentrazione e salute generale.',
  joy: 'La gioia rappresenta momenti di felicità autentica. Coltivala con gratitudine e connessioni.',
  sadness: 'La tristezza è un\'emozione naturale. Riconoscerla aiuta a elaborarla in modo sano.',
  anger: 'La rabbia segnala bisogni non soddisfatti. Esprimerla costruttivamente è fondamentale.',
  fear: 'La paura ci protegge dai pericoli. Affrontarla gradualmente costruisce resilienza.',
  apathy: 'L\'apatia può indicare stanchezza emotiva. Piccole azioni quotidiane aiutano a ritrovare interesse.',
  love: 'Le relazioni affettive nutrono il benessere. Investi tempo in chi ami.',
  work: 'L\'equilibrio lavorativo influenza la soddisfazione generale. Celebra i piccoli successi.',
  friendship: 'Le amicizie arricchiscono la vita. Coltiva connessioni genuine e supportive.',
  growth: 'La crescita personale dà senso alla vita. Ogni sfida è un\'opportunità di apprendimento.',
  health: 'La salute fisica sostiene quella mentale. Movimento e alimentazione fanno la differenza.',
  stress: 'Lo stress prolungato logora corpo e mente. Tecniche di rilassamento aiutano a gestirlo.',
  calmness: 'La calma interiore favorisce decisioni sagge. Pratica mindfulness per coltivarla.',
  social: 'Le connessioni sociali sono vitali. Anche brevi interazioni positive fanno bene.',
  loneliness: 'La solitudine può essere trasformata. Cerca attività che ti connettano con altri.',
  emotional_clarity: 'Capire le proprie emozioni aiuta a gestirle. L\'autoconsapevolezza è una skill che si allena.',
};

// Configuration for ALL possible metrics
const METRIC_CONFIG: Record<MetricKey, {
  icon: string;
  label: string;
}> = {
  mood: { icon: '😌', label: 'Umore' },
  anxiety: { icon: '🧠', label: 'Ansia' },
  energy: { icon: '🔋', label: 'Energia' },
  sleep: { icon: '💤', label: 'Riposo' },
  joy: { icon: '😊', label: 'Gioia' },
  sadness: { icon: '😢', label: 'Tristezza' },
  anger: { icon: '😠', label: 'Rabbia' },
  fear: { icon: '😨', label: 'Paura' },
  apathy: { icon: '😶', label: 'Apatia' },
  love: { icon: '❤️', label: 'Amore' },
  work: { icon: '💼', label: 'Lavoro' },
  friendship: { icon: '👥', label: 'Socialità' },
  growth: { icon: '🌱', label: 'Crescita' },
  health: { icon: '💪', label: 'Salute' },
  stress: { icon: '🤯', label: 'Stress' },
  calmness: { icon: '🧘', label: 'Calma' },
  social: { icon: '🤝', label: 'Socialità' },
  loneliness: { icon: '🏝️', label: 'Solitudine' },
  emotional_clarity: { icon: '🔮', label: 'Chiarezza' },
};

// Trend badge color mapping
const getTrendBadgeStyles = (type: TrendType): { bg: string; text: string } => {
  switch (type) {
    case 'improving':
      return { bg: 'bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' };
    case 'declining':
      return { bg: 'bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400' };
    case 'volatile':
      return { bg: 'bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400' };
    case 'stable':
      return { bg: 'bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' };
    default:
      return { bg: 'bg-muted', text: 'text-muted-foreground' };
  }
};

const AdaptiveVitalCard: React.FC<AdaptiveVitalCardProps> = ({
  metricKey,
  value,
  trend,
  isWeeklyAverage = false,
  isSecondary = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const config = METRIC_CONFIG[metricKey];
  if (!config) return null;
  
  const isNegative = NEGATIVE_METRICS.includes(metricKey);
  const hasData = value !== undefined && value !== null;
  
  const displayValue = hasData 
    ? (isNegative ? (100 - value) : value)
    : 0;
  
  const color = hasData 
    ? getDisplayColor(displayValue)
    : 'hsl(var(--muted-foreground))';
  
  const statusLabel = hasData 
    ? getStatusLabel(metricKey, displayValue)
    : '–';

  const description = METRIC_DESCRIPTIONS[metricKey];

  const handleClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-3xl cursor-pointer select-none",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass",
        "transition-shadow duration-300 ease-out",
        "active:scale-[0.98]",
        isSecondary ? "p-4" : "p-5"
      )}
      onClick={handleClick}
    >
      {/* Inner light reflection */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Header with Trend Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={cn(
              isSecondary ? "text-xl" : "text-2xl"
            )}>
              {config.icon}
            </span>
            <span className={cn(
              "font-medium text-muted-foreground",
              isSecondary ? "text-xs" : "text-sm"
            )}>
              {config.label}
            </span>
          </div>
          
          {/* Trend Badge - spaced from label */}
          {hasData && trend && trend.type !== 'unknown' && (
            <div className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium ml-3",
              getTrendBadgeStyles(trend.type).bg,
              getTrendBadgeStyles(trend.type).text
            )}>
              <span>{trend.icon}</span>
            </div>
          )}
        </div>
        
        {/* Animated Ring or Empty State */}
        <div className="flex items-center justify-center">
          {hasData ? (
            <AnimatedRing
              value={displayValue}
              size={isSecondary ? "md" : "lg"}
              thickness={isSecondary ? 5 : 7}
              color={color}
              glowColor={color}
              showValue={true}
            />
          ) : (
            // Empty state with dashed circle
            <div className={cn(
              "rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center",
              isSecondary ? "w-16 h-16" : "w-20 h-20"
            )}>
              <span className="text-muted-foreground/50 text-xs font-medium">
                –
              </span>
            </div>
          )}
        </div>
        
        {/* Status label or CTA hint */}
        <div className="mt-3 text-center">
          {hasData ? (
            <span className={cn(
              "font-medium",
              isSecondary ? "text-xs" : "text-sm"
            )} style={{ color }}>
              {statusLabel}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/60">
              Fai un check-in
            </span>
          )}
        </div>

        {/* Expandable description */}
        <AnimatePresence>
          {isExpanded && hasData && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-3 border-t border-border/30">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdaptiveVitalCard;
export { METRIC_CONFIG };
