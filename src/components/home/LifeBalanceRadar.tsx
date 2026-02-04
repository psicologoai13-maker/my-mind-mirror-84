import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { useTimeWeightedMetrics } from '@/hooks/useTimeWeightedMetrics';
import { useOccupationContext, LifeAreaConfig } from '@/hooks/useOccupationContext';
import { Compass, MessageCircle, Heart, Briefcase, Users, Sprout, Activity, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

// Icon map for dynamic areas
const ICON_MAP: Record<string, React.ElementType> = {
  love: Heart,
  work: Briefcase,
  school: GraduationCap,
  social: Users,
  growth: Sprout,
  health: Activity,
};

const COLOR_MAP: Record<string, string> = {
  love: 'hsl(340, 70%, 60%)',
  work: 'hsl(45, 80%, 50%)',
  school: 'hsl(220, 70%, 55%)',
  social: 'hsl(200, 70%, 55%)',
  growth: 'hsl(280, 60%, 55%)',
  health: 'hsl(150, 60%, 45%)',
};

const LifeBalanceRadar: React.FC = () => {
  // 🎯 TIME-WEIGHTED AVERAGE: Dati più recenti hanno più rilevanza (30 giorni, half-life 10 giorni)
  const { lifeAreas: scores, lifeAreasTrends, hasData: hasWeightedData, isLoading } = useTimeWeightedMetrics(30, 10);
  // 🎯 OCCUPATION CONTEXT: Dynamic life areas based on age/occupation
  const { lifeAreas: dynamicAreas, needsOccupationClarification } = useOccupationContext();

  const radarData = dynamicAreas.map(area => ({
    subject: area.label,
    value: (scores?.[area.dbField as keyof typeof scores] || 0) as number,
    fullMark: 10,
  }));

  const hasData = radarData.some(d => d.value > 0);
  
  // Count missing areas for the prompt
  const missingAreas = dynamicAreas.filter(
    area => !scores?.[area.dbField as keyof typeof scores]
  );

  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl p-5",
      "bg-glass backdrop-blur-xl border border-glass-border",
      "shadow-glass"
    )}>
      {/* Inner light */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Compass className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          Aree della Vita
        </h3>
      </div>

      {/* Radar chart - larger and filling the space */}
      <div className="relative z-10 h-72 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart 
            data={radarData} 
            margin={{ top: 25, right: 35, bottom: 25, left: 35 }}
          >
            {/* Always visible grid - shows the pentagon shape */}
            <PolarGrid 
              stroke="hsl(var(--border))" 
              strokeOpacity={0.4}
              strokeWidth={1}
              gridType="polygon"
            />
            
            {/* Radius axis with fixed domain 0-10 */}
            <PolarRadiusAxis
              angle={90}
              domain={[0, 10]}
              tick={false}
              axisLine={false}
              tickCount={5}
            />
            
            {/* Labels - larger font, positioned outside */}
            <PolarAngleAxis
              dataKey="subject"
              tick={({ x, y, payload, cx, cy }) => {
                // Calculate position to push labels outward
                const angle = Math.atan2(y - cy, x - cx);
                const offsetX = Math.cos(angle) * 12;
                const offsetY = Math.sin(angle) * 12;
                
                return (
                  <text
                    x={x + offsetX}
                    y={y + offsetY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="hsl(var(--foreground))"
                    fontSize={11}
                    fontWeight={600}
                    className="select-none"
                  >
                    {payload.value}
                  </text>
                );
              }}
              tickLine={false}
            />
            
            {/* Data polygon - filled with primary color */}
            <Radar
              name="Attuale"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              strokeWidth={2.5}
              dot={{
                r: 5,
                fill: 'hsl(var(--primary))',
                strokeWidth: 2,
                stroke: 'hsl(var(--background))',
              }}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend with icons and values */}
      <div className={cn(
        "relative z-10 grid gap-2 mt-4",
        dynamicAreas.length <= 5 ? "grid-cols-5" : "grid-cols-6"
      )}>
        {dynamicAreas.map(area => {
          const value = scores?.[area.dbField as keyof typeof scores];
          const Icon = ICON_MAP[area.key] || Activity;
          const hasValue = value !== null && value !== undefined && value > 0;
          
          return (
            <div 
              key={area.key} 
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all",
                hasValue 
                  ? "bg-glass-subtle backdrop-blur-sm" 
                  : "bg-muted/20 opacity-60"
              )}
            >
              <Icon 
                className="w-4 h-4" 
                style={{ color: hasValue ? COLOR_MAP[area.key] : 'hsl(var(--muted-foreground))' }} 
              />
              <span className={cn(
                "text-sm font-bold",
                hasValue ? "text-foreground" : "text-muted-foreground"
              )}>
                {hasValue ? value : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Empty state hint - only if no data at all */}
      {!hasData && !isLoading && (
        <div className="relative z-10 flex items-center justify-center gap-2 mt-4 py-3 bg-muted/30 rounded-xl">
          <MessageCircle className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Parla con l'AI per riempire il radar
          </p>
        </div>
      )}
    </div>
  );
};

export default LifeBalanceRadar;
