import React from 'react';
import { cn } from '@/lib/utils';
import { AnimatedRing } from '@/components/ui/animated-ring';

export type MetricKey = 
  | 'mood' | 'anxiety' | 'energy' | 'sleep' 
  | 'joy' | 'sadness' | 'anger' | 'fear' | 'apathy'
  | 'love' | 'work' | 'friendship' | 'growth' | 'health'
  | 'stress' | 'calmness' | 'social' | 'loneliness' | 'emotional_clarity';

interface AdaptiveVitalCardProps {
  metricKey: MetricKey;
  value?: number; // 0-100, undefined means "no data"
  isWeeklyAverage?: boolean;
  isSecondary?: boolean;
}

// Negative metrics: lower is BETTER
const NEGATIVE_METRICS = ['anxiety', 'sadness', 'anger', 'fear', 'apathy', 'stress', 'loneliness'];

// Smart color logic based on metric type
const getMetricColor = (key: MetricKey, value: number): string => {
  const isNegative = NEGATIVE_METRICS.includes(key);
  const normalized = value / 10;
  
  if (isNegative) {
    // For negative metrics: LOW = GOOD (green), HIGH = BAD (red)
    if (normalized <= 3) return 'hsl(var(--mood-excellent))';
    if (normalized <= 6) return 'hsl(var(--mood-neutral))';
    return 'hsl(var(--mood-bad))';
  } else {
    // For positive metrics: HIGH = GOOD (green), LOW = BAD (red)
    if (normalized >= 7) return 'hsl(var(--mood-excellent))';
    if (normalized >= 4) return 'hsl(var(--mood-neutral))';
    return 'hsl(var(--mood-low))';
  }
};

// Get status label
const getStatusLabel = (key: MetricKey, value: number): string => {
  const isNegative = NEGATIVE_METRICS.includes(key);
  const normalized = value / 10;
  
  const positiveLabels: Partial<Record<MetricKey, [string, string, string]>> = {
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
  };

  const negativeLabels: Partial<Record<MetricKey, [string, string, string]>> = {
    anxiety: ['Calma', 'Gestibile', 'Alta'],
    stress: ['Rilassato', 'Gestibile', 'Elevato'],
    loneliness: ['Connesso', 'Neutro', 'Isolato'],
    sadness: ['Sereno', 'Presente', 'Intensa'],
    anger: ['Calmo', 'Presente', 'Intensa'],
    fear: ['Sicuro', 'Presente', 'Elevata'],
    apathy: ['Motivato', 'Neutro', 'Elevata'],
  };

  if (isNegative) {
    const labels = negativeLabels[key] || ['Basso', 'Medio', 'Alto'];
    if (normalized <= 3) return labels[0];
    if (normalized <= 6) return labels[1];
    return labels[2];
  } else {
    const labels = positiveLabels[key] || ['Basso', 'Medio', 'Buono'];
    if (normalized >= 7) return labels[2];
    if (normalized >= 4) return labels[1];
    return labels[0];
  }
};

// Configuration for ALL possible metrics
const METRIC_CONFIG: Record<MetricKey, {
  icon: string;
  label: string;
}> = {
  // Core Vitals
  mood: { icon: '😌', label: 'Umore' },
  anxiety: { icon: '😰', label: 'Ansia' },
  energy: { icon: '🔋', label: 'Energia' },
  sleep: { icon: '💤', label: 'Riposo' },
  // Emotions
  joy: { icon: '😊', label: 'Gioia' },
  sadness: { icon: '😢', label: 'Tristezza' },
  anger: { icon: '😠', label: 'Rabbia' },
  fear: { icon: '😨', label: 'Paura' },
  apathy: { icon: '😶', label: 'Apatia' },
  // Life Areas
  love: { icon: '❤️', label: 'Amore' },
  work: { icon: '💼', label: 'Lavoro' },
  friendship: { icon: '👥', label: 'Socialità' },
  growth: { icon: '🌱', label: 'Crescita' },
  health: { icon: '💪', label: 'Salute' },
  // Extended metrics
  stress: { icon: '🤯', label: 'Stress' },
  calmness: { icon: '🧘', label: 'Calma' },
  social: { icon: '🤝', label: 'Socialità' },
  loneliness: { icon: '🏝️', label: 'Solitudine' },
  emotional_clarity: { icon: '🔮', label: 'Chiarezza' },
};

const AdaptiveVitalCard: React.FC<AdaptiveVitalCardProps> = ({
  metricKey,
  value,
  isWeeklyAverage = false,
  isSecondary = false,
}) => {
  const config = METRIC_CONFIG[metricKey];
  if (!config) return null;
  
  const isNegative = NEGATIVE_METRICS.includes(metricKey);
  const hasData = value !== undefined && value !== null;
  
  // INVERSION LOGIC for negative metrics (only when we have data!)
  const displayValue = hasData 
    ? (isNegative ? (100 - value) : value)
    : 0; // Show 0 ring when no data
  const color = hasData 
    ? getMetricColor(metricKey, displayValue)
    : 'hsl(var(--muted-foreground))'; // Gray when no data
  const statusLabel = hasData 
    ? getStatusLabel(metricKey, displayValue)
    : '–'; // Dash when no data

  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl",
      "bg-glass backdrop-blur-xl border border-glass-border",
      "shadow-glass hover:shadow-glass-elevated",
      "transition-all duration-300 ease-out",
      "hover:-translate-y-0.5 active:translate-y-0",
      isSecondary ? "p-4" : "p-5"
    )}>
      {/* Inner light reflection */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className={cn(
            "transition-transform duration-300 hover:scale-110",
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
        
        {/* Animated Ring */}
        <div className="flex items-center justify-center">
          <AnimatedRing
            value={displayValue}
            size={isSecondary ? "md" : "lg"}
            thickness={isSecondary ? 5 : 7}
            color={color}
            glowColor={color}
            showValue={hasData}
          />
        </div>
        
        {/* Status label */}
        <div className="mt-3 text-center">
          <span className={cn(
            "font-medium",
            isSecondary ? "text-xs" : "text-sm"
          )} style={{ color }}>
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdaptiveVitalCard;
export { METRIC_CONFIG };
