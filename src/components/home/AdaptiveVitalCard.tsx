import React from 'react';
import { cn } from '@/lib/utils';
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
    getColor: () => 'hsl(150, 60%, 45%)',
  },
  anxiety: {
    icon: '😰',
    label: 'Ansia',
    getColor: (v) => {
      if (v <= 30) return 'hsl(150, 60%, 45%)';
      if (v <= 60) return 'hsl(45, 70%, 50%)';
      return 'hsl(0, 65%, 55%)';
    },
  },
  energy: {
    icon: '🔋',
    label: 'Energia',
    getColor: () => 'hsl(45, 75%, 50%)',
  },
  sleep: {
    icon: '💤',
    label: 'Riposo',
    getColor: () => 'hsl(260, 50%, 55%)',
  },
  // Emotions
  joy: {
    icon: '😊',
    label: 'Gioia',
    getColor: () => 'hsl(45, 90%, 55%)',
  },
  sadness: {
    icon: '😢',
    label: 'Tristezza',
    getColor: () => 'hsl(220, 70%, 55%)',
  },
  anger: {
    icon: '😠',
    label: 'Rabbia',
    getColor: () => 'hsl(0, 70%, 55%)',
  },
  fear: {
    icon: '😨',
    label: 'Paura',
    getColor: () => 'hsl(280, 60%, 55%)',
  },
  apathy: {
    icon: '😶',
    label: 'Apatia',
    getColor: () => 'hsl(220, 10%, 60%)',
  },
  // Life Areas
  love: {
    icon: '❤️',
    label: 'Amore',
    getColor: () => 'hsl(350, 70%, 55%)',
  },
  work: {
    icon: '💼',
    label: 'Lavoro',
    getColor: () => 'hsl(210, 60%, 50%)',
  },
  friendship: {
    icon: '👥',
    label: 'Socialità',
    getColor: () => 'hsl(30, 70%, 55%)',
  },
  growth: {
    icon: '🌱',
    label: 'Crescita',
    getColor: () => 'hsl(80, 60%, 45%)',
  },
  health: {
    icon: '💪',
    label: 'Salute',
    getColor: () => 'hsl(170, 60%, 45%)',
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
  
  const data = [
    { name: 'value', value: value, fill: fillColor },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl p-3 bg-white border border-gray-100 shadow-sm">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm">{config.icon}</span>
          <span className="text-[11px] font-medium text-gray-600">{config.label}</span>
        </div>
        
        {/* Chart - Compact */}
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="65%" 
                outerRadius="100%" 
                barSize={6} 
                data={data}
                startAngle={90} 
                endAngle={-270}
              >
                <RadialBar
                  background={{ fill: '#f3f4f6' }}
                  dataKey="value"
                  cornerRadius={8}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            {/* Center value */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span 
                className="font-bold text-base"
                style={{ color: fillColor }}
              >
                {value}
              </span>
            </div>
          </div>
        </div>
        
        {/* Subtitle - Smaller */}
        {subtitle && (
          <p className="text-[9px] text-gray-400 text-center mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdaptiveVitalCard;
export { METRIC_CONFIG };
