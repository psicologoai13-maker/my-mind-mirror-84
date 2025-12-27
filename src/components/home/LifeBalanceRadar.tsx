import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { useProfile } from '@/hooks/useProfile';
import { Compass } from 'lucide-react';

const LIFE_AREAS = [
  { key: 'love', label: 'Amore' },
  { key: 'work', label: 'Lavoro' },
  { key: 'friendship', label: 'Socialità' },
  { key: 'growth', label: 'Crescita' },
  { key: 'energy', label: 'Salute' },
];

const LifeBalanceRadar: React.FC = () => {
  const { profile } = useProfile();
  const lifeAreasScores = profile?.life_areas_scores as Record<string, number | null> | undefined;

  const radarData = LIFE_AREAS.map(area => ({
    subject: area.label,
    value: (lifeAreasScores?.[area.key] || 0) as number,
    fullMark: 10,
  }));

  const hasData = radarData.some(d => d.value > 0);

  return (
    <div className="bg-card/60 backdrop-blur-sm rounded-2xl p-4 border border-border/30 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Compass className="w-3.5 h-3.5 text-primary" />
        </div>
        <h4 className="font-display font-semibold text-sm text-foreground">Aree della Vita</h4>
      </div>

      {!hasData ? (
        <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
          <Compass className="w-8 h-8 text-muted-foreground/30 mb-1" />
          <p className="text-xs">Nessun dato</p>
        </div>
      ) : (
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid 
                stroke="hsl(var(--border))" 
                strokeOpacity={0.2}
                strokeWidth={1}
              />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                tickLine={false}
              />
              <Radar
                name="Attuale"
                dataKey="value"
                stroke="hsl(150, 60%, 45%)"
                fill="hsl(150, 60%, 45%)"
                fillOpacity={0.2}
                strokeWidth={1.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default LifeBalanceRadar;
