import React from 'react';
import { cn } from '@/lib/utils';

export type MetricKey = 
  | 'mood' | 'anxiety' | 'energy' | 'sleep' 
  | 'joy' | 'sadness' | 'anger' | 'fear' | 'apathy'
  | 'love' | 'work' | 'friendship' | 'growth' | 'health'
  | 'stress' | 'calmness' | 'social' | 'loneliness' | 'emotional_clarity';

interface AdaptiveVitalCardProps {
  metricKey: MetricKey;
  value: number; // 0-100
  isWeeklyAverage?: boolean;
  isSecondary?: boolean;
}

// Negative metrics: lower is BETTER
const NEGATIVE_METRICS = ['anxiety', 'sadness', 'anger', 'fear', 'apathy', 'stress', 'loneliness'];

// Smart color/label logic based on metric type
const getMetricStatus = (key: MetricKey, value: number): { 
  color: string; 
  bgColor: string; 
  label: string;
  ringColor: string;
} => {
  const isNegative = NEGATIVE_METRICS.includes(key);
  const normalized = value / 10; // Convert to 0-10 scale
  
  if (isNegative) {
    // For negative metrics: LOW = GOOD (green), HIGH = BAD (red)
    if (normalized <= 3) {
      return {
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-500',
        ringColor: 'ring-emerald-200',
        label: key === 'anxiety' ? 'Calma' : key === 'stress' ? 'Rilassato' : key === 'loneliness' ? 'Connesso' : 'Basso',
      };
    }
    if (normalized <= 6) {
      return {
        color: 'text-amber-600',
        bgColor: 'bg-amber-500',
        ringColor: 'ring-amber-200',
        label: 'Gestibile',
      };
    }
    return {
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      ringColor: 'ring-red-200',
      label: key === 'anxiety' ? 'Alta' : key === 'stress' ? 'Elevato' : key === 'loneliness' ? 'Isolato' : 'Elevato',
    };
  } else {
    // For positive metrics: HIGH = GOOD (green), LOW = BAD (red)
    if (normalized >= 7) {
      return {
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-500',
        ringColor: 'ring-emerald-200',
        label: getHighLabel(key),
      };
    }
    if (normalized >= 4) {
      return {
        color: 'text-amber-600',
        bgColor: 'bg-amber-500',
        ringColor: 'ring-amber-200',
        label: getMediumLabel(key),
      };
    }
    return {
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      ringColor: 'ring-red-200',
      label: getLowLabel(key),
    };
  }
};

const getHighLabel = (key: MetricKey): string => {
  const labels: Partial<Record<MetricKey, string>> = {
    mood: 'Ottimo',
    energy: 'Carico',
    sleep: 'Riposato',
    joy: 'Gioioso',
    love: 'Appagato',
    social: 'Connesso',
    friendship: 'Sociale',
    work: 'Produttivo',
    growth: 'In crescita',
    health: 'In forma',
    calmness: 'Sereno',
    emotional_clarity: 'Lucido',
  };
  return labels[key] || 'Buono';
};

const getMediumLabel = (key: MetricKey): string => {
  const labels: Partial<Record<MetricKey, string>> = {
    mood: 'Neutro',
    energy: 'Normale',
    sleep: 'Ok',
    love: 'Stabile',
    social: 'Neutro',
    work: 'Nella media',
  };
  return labels[key] || 'Medio';
};

const getLowLabel = (key: MetricKey): string => {
  const labels: Partial<Record<MetricKey, string>> = {
    mood: 'Basso',
    energy: 'Scarso',
    sleep: 'Stanco',
    joy: 'Assente',
    love: 'Carente',
    social: 'Isolato',
    friendship: 'Solo',
    work: 'Difficile',
    growth: 'Stagnante',
    health: 'Debole',
  };
  return labels[key] || 'Critico';
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
  emotional_clarity: { icon: '🔮', label: 'Chiarezza Emotiva' },
};

const AdaptiveVitalCard: React.FC<AdaptiveVitalCardProps> = ({
  metricKey,
  value,
  isWeeklyAverage = false,
  isSecondary = false,
}) => {
  const config = METRIC_CONFIG[metricKey];
  if (!config) return null;
  
  const status = getMetricStatus(metricKey, value);
  
  // Convert 0-100 scale to 0-10 scale for display
  const displayValue = (value / 10).toFixed(1);
  
  // Calculate circle progress (0-100 for stroke-dashoffset)
  const radius = isSecondary ? 24 : 32;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const viewBoxSize = isSecondary ? 60 : 80;
  const center = viewBoxSize / 2;

  return (
    <div className={cn(
      "rounded-3xl bg-card shadow-premium hover:shadow-elevated transition-all duration-300",
      isSecondary ? "p-4" : "p-5"
    )}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className={isSecondary ? "text-base" : "text-lg"}>{config.icon}</span>
          <span className={cn(
            "font-medium text-muted-foreground",
            isSecondary ? "text-xs" : "text-sm"
          )}>
            {config.label}
          </span>
        </div>
        
        {/* Custom SVG Circle Chart */}
        <div className="flex items-center justify-center">
          <div className={cn(
            "relative",
            isSecondary ? "w-14 h-14" : "w-20 h-20"
          )}>
            <svg 
              viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
              className="w-full h-full transform -rotate-90"
            >
              {/* Background circle */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="hsl(var(--muted))"
                strokeWidth={isSecondary ? 5 : 6}
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="currentColor"
                strokeWidth={isSecondary ? 5 : 6}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn("transition-all duration-500", status.color)}
              />
            </svg>
            
            {/* Center value */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="flex items-baseline gap-0.5">
                <span 
                  className={cn(
                    "font-semibold leading-none",
                    status.color,
                    isSecondary ? "text-base" : "text-xl"
                  )}
                >
                  {displayValue}
                </span>
                <span className={cn(
                  "text-muted-foreground leading-none",
                  isSecondary ? "text-[8px]" : "text-[10px]"
                )}>/10</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Status label */}
        <div className="mt-3 text-center">
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full font-medium",
            status.bgColor.replace('bg-', 'bg-') + '/10',
            status.color,
            isSecondary ? "text-[10px]" : "text-xs"
          )}>
            {status.label}
          </span>
          {isWeeklyAverage && !isSecondary && (
            <p className="text-[10px] text-muted-foreground mt-1">Media 7gg</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdaptiveVitalCard;
export { METRIC_CONFIG };
