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

// Color logic for DISPLAY value (after inversion for negative metrics)
// At this point, higher displayValue = better, regardless of original metric type
const getDisplayColor = (displayValue: number): string => {
  const normalized = displayValue / 10;
  // Higher = better (green), Lower = worse (red)
  if (normalized >= 7) return 'hsl(var(--mood-excellent))';
  if (normalized >= 4) return 'hsl(var(--mood-neutral))';
  return 'hsl(var(--mood-low))';
};

// Get status label based on DISPLAY value (after inversion)
// Higher displayValue = better, so we use positive labels
const getStatusLabel = (key: MetricKey, displayValue: number): string => {
  const normalized = displayValue / 10;
  
  // Labels specific to each metric, but mapped to displayValue (higher = better)
  const labelsByMetric: Partial<Record<MetricKey, [string, string, string]>> = {
    // Positive metrics (original scale preserved)
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
    // Negative metrics (inverted, so high displayValue = low original = good)
    anxiety: ['Alta', 'Gestibile', 'Calma'],
    stress: ['Elevato', 'Gestibile', 'Rilassato'],
    loneliness: ['Isolato', 'Neutro', 'Connesso'],
    sadness: ['Intensa', 'Presente', 'Sereno'],
    anger: ['Intensa', 'Presente', 'Calmo'],
    fear: ['Elevata', 'Presente', 'Sicuro'],
    apathy: ['Elevata', 'Neutro', 'Motivato'],
  };

  const labels = labelsByMetric[key] || ['Basso', 'Medio', 'Buono'];
  
  // Higher displayValue = better = last label
  if (normalized >= 7) return labels[2];
  if (normalized >= 4) return labels[1];
  return labels[0];
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
  // After inversion: higher displayValue = better for ALL metrics
  const displayValue = hasData 
    ? (isNegative ? (100 - value) : value)
    : 0;
  
  // Use unified color logic since displayValue is already normalized (higher = better)
  const color = hasData 
    ? getDisplayColor(displayValue)
    : 'hsl(var(--muted-foreground))';
  
  const statusLabel = hasData 
    ? getStatusLabel(metricKey, displayValue)
    : '–';

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
