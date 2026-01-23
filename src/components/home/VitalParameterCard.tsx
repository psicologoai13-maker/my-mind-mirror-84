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
  },
  energy: {
    getColor: () => 'hsl(45, 75%, 50%)', // Amber
  },
  mood: {
    getColor: () => 'hsl(150, 60%, 45%)', // Emerald
  },
  sleep: {
    getColor: () => 'hsl(260, 50%, 55%)', // Lavender
  },
};

// Negative metrics where the visual value should be inverted
const NEGATIVE_COLORS = ['anxiety'];

const VitalParameterCard: React.FC<VitalParameterCardProps> = ({
  icon,
  label,
  value,
  color,
  subtitle,
}) => {
  const config = colorConfig[color];
  
  // For anxiety: invert the visual value
  // User votes 10 ("I feel great!") -> show 0 (no anxiety, GREEN)
  // User votes 2 ("I feel bad") -> show 80 (high anxiety, RED)
  const isNegative = NEGATIVE_COLORS.includes(color);
  const visualValue = isNegative ? (100 - value) : value;
  
  const fillColor = config.getColor(visualValue);
  
  const data = [
    { name: 'value', value: visualValue, fill: fillColor },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 bg-white border border-gray-100 shadow-sm">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-xl bg-gray-50">
            <span className="text-lg">{icon}</span>
          </div>
          <span className="text-xs font-medium text-gray-500 truncate">{label}</span>
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
            {/* Center value - show inverted value for negative metrics */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span 
                className="font-semibold text-xl text-gray-900"
                style={{ color: fillColor }}
              >
                {visualValue}
              </span>
            </div>
          </div>
        </div>
        
        {/* Subtitle */}
        {subtitle && (
          <p className="text-[10px] text-gray-500 text-center mt-1 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default VitalParameterCard;
