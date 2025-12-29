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
  bg: string;
  iconBg: string;
}> = {
  // Vitals
  mood: {
    icon: '😌',
    label: 'Umore',
    getColor: () => 'hsl(150, 60%, 45%)',
    bg: 'from-emerald-500/10 to-green-400/5',
    iconBg: 'bg-emerald-500/15',
  },
  anxiety: {
    icon: '😰',
    label: 'Ansia',
    getColor: (v) => {
      if (v <= 30) return 'hsl(150, 60%, 45%)';
      if (v <= 60) return 'hsl(45, 70%, 50%)';
      return 'hsl(0, 65%, 55%)';
    },
    bg: 'from-destructive/10 to-destructive/5',
    iconBg: 'bg-destructive/15',
  },
  energy: {
    icon: '🔋',
    label: 'Energia',
    getColor: () => 'hsl(45, 75%, 50%)',
    bg: 'from-amber-500/10 to-yellow-400/5',
    iconBg: 'bg-amber-500/15',
  },
  sleep: {
    icon: '💤',
    label: 'Riposo',
    getColor: () => 'hsl(260, 50%, 55%)',
    bg: 'from-violet-500/10 to-purple-400/5',
    iconBg: 'bg-violet-500/15',
  },
  // Emotions
  joy: {
    icon: '😊',
    label: 'Gioia',
    getColor: () => 'hsl(45, 90%, 55%)',
    bg: 'from-yellow-400/10 to-amber-300/5',
    iconBg: 'bg-yellow-400/15',
  },
  sadness: {
    icon: '😢',
    label: 'Tristezza',
    getColor: () => 'hsl(220, 70%, 55%)',
    bg: 'from-blue-500/10 to-indigo-400/5',
    iconBg: 'bg-blue-500/15',
  },
  anger: {
    icon: '😠',
    label: 'Rabbia',
    getColor: () => 'hsl(0, 70%, 55%)',
    bg: 'from-red-500/10 to-rose-400/5',
    iconBg: 'bg-red-500/15',
  },
  fear: {
    icon: '😨',
    label: 'Paura',
    getColor: () => 'hsl(280, 60%, 55%)',
    bg: 'from-purple-500/10 to-fuchsia-400/5',
    iconBg: 'bg-purple-500/15',
  },
  apathy: {
    icon: '😶',
    label: 'Apatia',
    getColor: () => 'hsl(220, 10%, 60%)',
    bg: 'from-slate-400/10 to-gray-300/5',
    iconBg: 'bg-slate-400/15',
  },
  // Life Areas
  love: {
    icon: '❤️',
    label: 'Amore',
    getColor: () => 'hsl(350, 70%, 55%)',
    bg: 'from-rose-500/10 to-pink-400/5',
    iconBg: 'bg-rose-500/15',
  },
  work: {
    icon: '💼',
    label: 'Lavoro',
    getColor: () => 'hsl(210, 60%, 50%)',
    bg: 'from-blue-600/10 to-sky-400/5',
    iconBg: 'bg-blue-600/15',
  },
  friendship: {
    icon: '👥',
    label: 'Socialità',
    getColor: () => 'hsl(30, 70%, 55%)',
    bg: 'from-orange-500/10 to-amber-400/5',
    iconBg: 'bg-orange-500/15',
  },
  growth: {
    icon: '🌱',
    label: 'Crescita',
    getColor: () => 'hsl(80, 60%, 45%)',
    bg: 'from-lime-500/10 to-green-400/5',
    iconBg: 'bg-lime-500/15',
  },
  health: {
    icon: '💪',
    label: 'Salute',
    getColor: () => 'hsl(170, 60%, 45%)',
    bg: 'from-teal-500/10 to-cyan-400/5',
    iconBg: 'bg-teal-500/15',
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
    <div className={cn(
      "relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br border border-border/50",
      config.bg,
      "shadow-soft hover:shadow-card transition-shadow duration-300"
    )}>
      {/* Decorative blur */}
      <div 
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30"
        style={{ backgroundColor: fillColor }}
      />
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("p-1.5 rounded-xl", config.iconBg)}>
            <span className="text-lg">{config.icon}</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground truncate">{config.label}</span>
        </div>
        
        {/* Chart */}
        <div className="flex-1 flex items-center justify-center -my-2">
          <div className="w-20 h-20 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="70%" 
                outerRadius="100%" 
                barSize={8} 
                data={data}
                startAngle={180} 
                endAngle={-180}
              >
                <RadialBar
                  background={{ fill: 'hsl(var(--muted))' }}
                  dataKey="value"
                  cornerRadius={10}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            {/* Center value */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span 
                className="font-display text-xl font-bold"
                style={{ color: fillColor }}
              >
                {value}
              </span>
            </div>
          </div>
        </div>
        
        {/* Subtitle */}
        {subtitle && (
          <p className="text-[10px] text-muted-foreground text-center mt-1 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdaptiveVitalCard;
export { METRIC_CONFIG };
