import React from 'react';
import { RadarChart, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { useProfile } from '@/hooks/useProfile';
import { useSessions } from '@/hooks/useSessions';
import { Compass, MessageCircle } from 'lucide-react';

const LIFE_AREAS = [
  { key: 'love', label: 'Amore' },
  { key: 'work', label: 'Lavoro' },
  { key: 'friendship', label: 'Socialità' },
  { key: 'growth', label: 'Crescita' },
  { key: 'energy', label: 'Salute' },
];

const LifeBalanceRadar: React.FC = () => {
  const { profile } = useProfile();
  const { completedSessions } = useSessions();
  
  const profileScores = profile?.life_areas_scores as Record<string, number | null> | undefined;
  
  const lastSessionWithScores = React.useMemo(() => {
    if (!completedSessions) return null;
    
    const sorted = [...completedSessions]
      .filter(s => {
        const scores = s.life_balance_scores as unknown as Record<string, number | null> | null;
        return scores && Object.values(scores).some(v => v && v > 0);
      })
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    
    return sorted[0]?.life_balance_scores as unknown as Record<string, number | null> | undefined;
  }, [completedSessions]);

  const lifeAreasScores = React.useMemo(() => {
    const hasProfileData = profileScores && Object.values(profileScores).some(v => v && v > 0);
    if (hasProfileData) return profileScores;
    return lastSessionWithScores || {};
  }, [profileScores, lastSessionWithScores]);

  const radarData = LIFE_AREAS.map(area => ({
    subject: area.label,
    value: (lifeAreasScores?.[area.key] || 0) as number,
    fullMark: 10,
  }));

  const hasData = radarData.some(d => d.value > 0);

  return (
    <div className="rounded-3xl p-6 bg-card shadow-premium">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Compass className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Aree della Vita
        </h3>
      </div>

      {!hasData ? (
        <div className="h-36 flex flex-col items-center justify-center text-muted-foreground text-center">
          <MessageCircle className="w-8 h-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm">Parla con l'AI per generare il grafico</p>
        </div>
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarAngleAxis
                dataKey="subject"
                tick={{ 
                  fill: 'hsl(var(--muted-foreground))', 
                  fontSize: 11,
                  fontWeight: 500,
                }}
                tickLine={false}
              />
              <Radar
                name="Attuale"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.2}
                strokeWidth={2}
                dot={{
                  r: 4,
                  fill: 'hsl(var(--primary))',
                  strokeWidth: 0,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default LifeBalanceRadar;