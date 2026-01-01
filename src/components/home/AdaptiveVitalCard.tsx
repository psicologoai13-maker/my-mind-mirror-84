import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

export type MetricKey = 
  | 'mood' | 'anxiety' | 'energy' | 'sleep' 
  | 'joy' | 'sadness' | 'anger' | 'fear' | 'apathy'
  | 'love' | 'work' | 'friendship' | 'growth' | 'health';

interface AdaptiveVitalCardProps {
  metricKey: MetricKey;
  value: number; // 0-100
  subtitle?: string;
}

// Configuration for ALL possible metrics
const METRIC_CONFIG: Record<MetricKey, {
  icon: string;
  label: string;
  getColor: (v: number) => string;
}> = {
  // Vitals
  mood: {
    icon: '😌',
    label: 'Umore',
    getColor: () => 'hsl(var(--primary))',
  },
  anxiety: {
    icon: '😰',
    label: 'Ansia',
    getColor: (v) => {
      if (v <= 30) return 'hsl(var(--mood-excellent))';
      if (v <= 60) return 'hsl(var(--mood-neutral))';
      return 'hsl(var(--mood-bad))';
    },
  },
  energy: {
    icon: '🔋',
    label: 'Energia',
    getColor: () => 'hsl(var(--area-work))',
  },
  sleep: {
    icon: '💤',
    label: 'Riposo',
    getColor: () => 'hsl(var(--accent-foreground))',
  },
  // Emotions
  joy: {
    icon: '😊',
    label: 'Gioia',
    getColor: () => 'hsl(var(--mood-neutral))',
  },
  sadness: {
    icon: '😢',
    label: 'Tristezza',
    getColor: () => 'hsl(var(--area-friendship))',
  },
  anger: {
    icon: '😠',
    label: 'Rabbia',
    getColor: () => 'hsl(var(--mood-bad))',
  },
  fear: {
    icon: '😨',
    label: 'Paura',
    getColor: () => 'hsl(var(--accent-foreground))',
  },
  apathy: {
    icon: '😶',
    label: 'Apatia',
    getColor: () => 'hsl(var(--muted-foreground))',
  },
  // Life Areas
  love: {
    icon: '❤️',
    label: 'Amore',
    getColor: () => 'hsl(var(--area-love))',
  },
  work: {
    icon: '💼',
    label: 'Lavoro',
    getColor: () => 'hsl(var(--area-friendship))',
  },
  friendship: {
    icon: '👥',
    label: 'Socialità',
    getColor: () => 'hsl(var(--area-work))',
  },
  growth: {
    icon: '🌱',
    label: 'Crescita',
    getColor: () => 'hsl(var(--mood-good))',
  },
  health: {
    icon: '💪',
    label: 'Salute',
    getColor: () => 'hsl(var(--area-wellness))',
  },
};

const AdaptiveVitalCard: React.FC<AdaptiveVitalCardProps> = ({
  metricKey,
  value,
  subtitle,
}) => {
  const config = METRIC_CONFIG[metricKey];
  if (!config) return null;
  
  const fillColor = config.getColor(value);
  
  // Convert 0-100 scale to 0-10 scale for display
  const displayValue = (value / 10).toFixed(1);
  
  const data = [
    { name: 'value', value: value, fill: fillColor },
  ];

  return (
    <div className="rounded-3xl p-5 bg-card shadow-premium hover:shadow-elevated transition-all duration-300">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{config.icon}</span>
          <span className="text-sm font-medium text-muted-foreground">{config.label}</span>
        </div>
        
        {/* Chart */}
        <div className="flex items-center justify-center">
          <div className="w-20 h-20 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="70%" 
                outerRadius="100%" 
                barSize={8} 
                data={data}
                startAngle={90} 
                endAngle={-270}
              >
                <RadialBar
                  background={{ fill: 'hsl(var(--muted))' }}
                  dataKey="value"
                  cornerRadius={10}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            {/* Center value - shows X.X/10 format */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="flex items-baseline gap-0.5">
                <span 
                  className="font-semibold text-lg"
                  style={{ color: fillColor }}
                >
                  {displayValue}
                </span>
                <span className="text-[10px] text-muted-foreground">/10</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-muted-foreground text-center mt-2 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdaptiveVitalCard;
export { METRIC_CONFIG };