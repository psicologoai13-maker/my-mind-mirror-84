import React, { useMemo } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import DomainCard from './DomainCard';
import { ClinicalDomain } from '@/lib/clinicalDomains';

interface LifeAreasSectionProps {
  allMetricsData: Record<string, { value: number | null }>;
  onMetricClick: (key: string) => void;
}

const LIFE_DOMAIN: ClinicalDomain = {
  id: 'functioning',
  label: 'Aree della Vita',
  icon: '🧭',
  description: 'Bilancio quotidiano',
  color: 'hsl(150, 60%, 45%)'
};

const LIFE_AREAS_CONFIG = [
  { key: 'work', label: 'Lavoro', icon: '💼', color: 'hsl(200, 60%, 50%)' },
  { key: 'school', label: 'Studio', icon: '📚', color: 'hsl(220, 60%, 55%)' },
  { key: 'love', label: 'Amore', icon: '❤️', color: 'hsl(350, 70%, 55%)' },
  { key: 'family', label: 'Famiglia', icon: '👨‍👩‍👧', color: 'hsl(30, 65%, 50%)' },
  { key: 'social', label: 'Sociale', icon: '👥', color: 'hsl(180, 55%, 45%)' },
  { key: 'health', label: 'Salute', icon: '🏃', color: 'hsl(150, 60%, 45%)' },
  { key: 'growth', label: 'Crescita', icon: '🌱', color: 'hsl(120, 50%, 45%)' },
  { key: 'leisure', label: 'Tempo Libero', icon: '🎮', color: 'hsl(280, 55%, 55%)' },
  { key: 'finances', label: 'Finanze', icon: '💰', color: 'hsl(140, 60%, 40%)' },
];

const LifeAreasSection: React.FC<LifeAreasSectionProps> = ({
  allMetricsData,
  onMetricClick
}) => {
  // Build radar data from life areas
  const { radarData, areasList, hasData } = useMemo(() => {
    const areas = LIFE_AREAS_CONFIG
      .map(config => {
        const data = allMetricsData[config.key];
        const value = data?.value ?? 0;
        return {
          ...config,
          value: Math.round(value * 10) / 10,
          fullMark: 10,
        };
      })
      .filter(a => a.value > 0);
    
    return {
      radarData: areas,
      areasList: areas.sort((a, b) => b.value - a.value),
      hasData: areas.length > 0,
    };
  }, [allMetricsData]);
  
  if (!hasData) return null;
  
  return (
    <DomainCard domain={LIFE_DOMAIN}>
      {/* Radar Chart - only if 3+ areas */}
      {radarData.length >= 3 && (
        <div className="h-52 w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid 
                stroke="hsl(var(--muted-foreground))" 
                strokeOpacity={0.15} 
              />
              <PolarAngleAxis
                dataKey="label"
                tick={{ 
                  fill: 'hsl(var(--muted-foreground))', 
                  fontSize: 10,
                  fontWeight: 500,
                }}
                tickLine={false}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 10]} 
                tick={false} 
                axisLine={false}
              />
              <Radar
                name="Aree"
                dataKey="value"
                stroke="hsl(150, 60%, 45%)"
                strokeWidth={2}
                fill="hsl(150, 60%, 45%)"
                fillOpacity={0.2}
                dot={{
                  r: 3,
                  fill: 'hsl(150, 60%, 45%)',
                  strokeWidth: 0,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* Areas List */}
      <div className="grid grid-cols-2 gap-2">
        {areasList.map((area) => (
          <button
            key={area.key}
            onClick={() => onMetricClick(area.key)}
            className={cn(
              "flex items-center gap-2.5 p-3 rounded-xl",
              "bg-glass/20 border border-glass-border/40",
              "hover:bg-glass/40 transition-all duration-200",
              "active:scale-[0.98]"
            )}
          >
            {/* Icon */}
            <span className="text-xl">{area.icon}</span>
            
            {/* Label & Value */}
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs text-muted-foreground truncate">
                {area.label}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-foreground">
                  {area.value}
                </span>
                <span className="text-xs text-muted-foreground">/10</span>
              </div>
            </div>
            
            {/* Mini progress indicator */}
            <div className="w-1.5 h-10 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="w-full rounded-full transition-all duration-500"
                style={{ 
                  height: `${area.value * 10}%`,
                  backgroundColor: area.color,
                  marginTop: 'auto',
                }}
              />
            </div>
          </button>
        ))}
      </div>
    </DomainCard>
  );
};

export default LifeAreasSection;
