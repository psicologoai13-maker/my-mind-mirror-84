import React from 'react';
import { cn } from '@/lib/utils';

export type MetricKey = 
  | 'mood' | 'anxiety' | 'energy' | 'sleep' 
  | 'joy' | 'sadness' | 'anger' | 'fear' | 'apathy'
  | 'love' | 'work' | 'friendship' | 'growth' | 'health';

interface AdaptiveVitalCardProps {
  metricKey: MetricKey;
  value: number; // 0-100
  isWeeklyAverage?: boolean;
}

// Negative metrics: lower is BETTER
const NEGATIVE_METRICS = ['anxiety', 'sadness', 'anger', 'fear', 'apathy'];

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
        label: key === 'anxiety' ? 'Calma' : 'Basso',
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
      label: key === 'anxiety' ? 'Alta' : 'Elevato',
    };
  } else {
    // For positive metrics: HIGH = GOOD (green), LOW = BAD (red)
    if (normalized >= 7) {
      return {
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-500',
        ringColor: 'ring-emerald-200',
        label: key === 'mood' ? 'Ottimo' : key === 'energy' ? 'Carico' : key === 'sleep' ? 'Riposato' : 'Buono',
      };
    }
    if (normalized >= 4) {
      return {
        color: 'text-amber-600',
        bgColor: 'bg-amber-500',
        ringColor: 'ring-amber-200',
        label: key === 'mood' ? 'Neutro' : key === 'energy' ? 'Normale' : key === 'sleep' ? 'Ok' : 'Medio',
      };
    }
    return {
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      ringColor: 'ring-red-200',
      label: key === 'mood' ? 'Basso' : key === 'energy' ? 'Scarso' : key === 'sleep' ? 'Stanco' : 'Critico',
    };
  }
};

// Configuration for ALL possible metrics
const METRIC_CONFIG: Record<MetricKey, {
  icon: string;
  label: string;
}> = {
  mood: { icon: '😌', label: 'Umore' },
  anxiety: { icon: '😰', label: 'Ansia' },
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
};

const AdaptiveVitalCard: React.FC<AdaptiveVitalCardProps> = ({
  metricKey,
  value,
  isWeeklyAverage = false,
}) => {
  const config = METRIC_CONFIG[metricKey];
  if (!config) return null;
  
  const status = getMetricStatus(metricKey, value);
  
  // Convert 0-100 scale to 0-10 scale for display
  const displayValue = (value / 10).toFixed(1);
  
  // Calculate circle progress (0-100 for stroke-dashoffset)
  const circumference = 2 * Math.PI * 32; // radius = 32
  const progress = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="rounded-3xl p-5 bg-card shadow-premium hover:shadow-elevated transition-all duration-300">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{config.icon}</span>
          <span className="text-sm font-medium text-muted-foreground">{config.label}</span>
        </div>
        
        {/* Custom SVG Circle Chart - Fixed sizing */}
        <div className="flex items-center justify-center">
          <div className="relative w-20 h-20">
            <svg 
              viewBox="0 0 80 80" 
              className="w-full h-full transform -rotate-90"
            >
              {/* Background circle */}
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="hsl(var(--muted))"
                strokeWidth="6"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn("transition-all duration-500", status.color)}
                style={{ color: `var(--${status.bgColor.replace('bg-', '')})` }}
              />
            </svg>
            
            {/* Center value - Fixed text sizing */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="flex items-baseline gap-0.5">
                <span 
                  className={cn(
                    "font-semibold text-xl leading-none",
                    status.color
                  )}
                >
                  {displayValue}
                </span>
                <span className="text-[10px] text-muted-foreground leading-none">/10</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Status label */}
        <div className="mt-3 text-center">
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
            status.bgColor.replace('bg-', 'bg-') + '/10',
            status.color
          )}>
            {status.label}
          </span>
          {isWeeklyAverage && (
            <p className="text-[10px] text-muted-foreground mt-1">Media 7gg</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdaptiveVitalCard;
export { METRIC_CONFIG };
