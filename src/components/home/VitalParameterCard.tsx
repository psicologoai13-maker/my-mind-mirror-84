import React from 'react';
import { cn } from '@/lib/utils';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

interface VitalParameterCardProps {
  icon: string;
  label: string;
  value: number; // 0-100
  color: 'anxiety' | 'energy' | 'mood' | 'sleep';
  subtitle?: string;
}

const colorConfig = {
  anxiety: {
    // Green (low) to Red (high) - inverted because high anxiety is bad
    getColor: (v: number) => {
      if (v <= 30) return 'hsl(150, 60%, 45%)'; // Green - low anxiety
      if (v <= 60) return 'hsl(45, 70%, 50%)';  // Yellow - medium
      return 'hsl(0, 65%, 55%)';                 // Red - high anxiety
    },
    bg: 'from-destructive/10 to-destructive/5',
    iconBg: 'bg-destructive/15',
  },
  energy: {
    getColor: () => 'hsl(45, 75%, 50%)', // Amber
    bg: 'from-amber-500/10 to-yellow-400/5',
    iconBg: 'bg-amber-500/15',
  },
  mood: {
    getColor: () => 'hsl(var(--mood-excellent))', // Emerald
    bg: 'from-emerald-500/10 to-green-400/5',
    iconBg: 'bg-emerald-500/15',
  },
  sleep: {
    getColor: () => 'hsl(260, 50%, 55%)', // Lavender
    bg: 'from-violet-500/10 to-purple-400/5',
    iconBg: 'bg-violet-500/15',
  },
};

const VitalParameterCard: React.FC<VitalParameterCardProps> = ({
  icon,
  label,
  value,
  color,
  subtitle,
}) => {
  const config = colorConfig[color];
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
            <span className="text-lg">{icon}</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
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

export default VitalParameterCard;
