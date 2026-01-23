import React, { useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { useDailyMetricsRange } from '@/hooks/useDailyMetrics';
import { Compass, MessageCircle, Heart, Briefcase, Users, Sprout, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subDays } from 'date-fns';

const LIFE_AREAS = [
  { key: 'love', label: 'Amore', icon: Heart, color: 'hsl(340, 70%, 60%)' },
  { key: 'work', label: 'Lavoro', icon: Briefcase, color: 'hsl(220, 70%, 55%)' },
  { key: 'social', label: 'Socialità', icon: Users, color: 'hsl(45, 80%, 50%)' },
  { key: 'growth', label: 'Crescita', icon: Sprout, color: 'hsl(280, 60%, 55%)' },
  { key: 'health', label: 'Salute', icon: Activity, color: 'hsl(150, 60%, 45%)' },
];

const LifeBalanceRadar: React.FC = () => {
  // 🎯 SINGLE SOURCE OF TRUTH: Use the unified RPC hook (same as Analisi page)
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  const { metricsRange, isLoading } = useDailyMetricsRange(thirtyDaysAgo, today);

  // Get the LATEST life areas data from the unified source
  const lifeAreasScores = useMemo(() => {
    // Filter days that have life_areas data
    const daysWithLifeAreas = metricsRange.filter(m => m.has_life_areas);
    
    // Get the most recent day with data
    const latest = daysWithLifeAreas[daysWithLifeAreas.length - 1];
    
    if (!latest) {
      return {
        love: null,
        work: null,
        social: null,
        growth: null,
        health: null,
      };
    }
    
    return {
      love: latest.life_areas?.love ?? null,
      work: latest.life_areas?.work ?? null,
      social: latest.life_areas?.social ?? null,
      growth: latest.life_areas?.growth ?? null,
      health: latest.life_areas?.health ?? null,
    };
  }, [metricsRange]);

  const radarData = LIFE_AREAS.map(area => ({
    subject: area.label,
    value: (lifeAreasScores?.[area.key as keyof typeof lifeAreasScores] || 0) as number,
    fullMark: 10,
  }));

  const hasData = radarData.some(d => d.value > 0);
  
  // Count missing areas for the prompt
  const missingAreas = LIFE_AREAS.filter(
    area => !lifeAreasScores?.[area.key as keyof typeof lifeAreasScores]
  );

  return (
    <div className="rounded-3xl p-6 bg-card shadow-premium">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Compass className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Aree della Vita
            </h3>
            {hasData && missingAreas.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {5 - missingAreas.length}/5 aree tracciate
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Always show the radar chart - with or without data */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart 
            data={radarData} 
            margin={{ top: 30, right: 40, bottom: 30, left: 40 }}
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
                const offsetX = Math.cos(angle) * 15;
                const offsetY = Math.sin(angle) * 15;
                
                return (
                  <text
                    x={x + offsetX}
                    y={y + offsetY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="hsl(var(--foreground))"
                    fontSize={12}
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
      <div className="grid grid-cols-5 gap-2 mt-4">
        {LIFE_AREAS.map(area => {
          const value = lifeAreasScores?.[area.key as keyof typeof lifeAreasScores];
          const Icon = area.icon;
          const hasValue = value !== null && value !== undefined && value > 0;
          
          return (
            <div 
              key={area.key} 
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all",
                hasValue ? "bg-muted/50" : "bg-muted/20 opacity-60"
              )}
            >
              <Icon 
                className="w-4 h-4" 
                style={{ color: hasValue ? area.color : 'hsl(var(--muted-foreground))' }} 
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
        <div className="flex items-center justify-center gap-2 mt-4 py-3 bg-muted/30 rounded-xl">
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
