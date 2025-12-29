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
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
          <Compass className="w-3.5 h-3.5 text-emerald-500" />
        </div>
        <h4 className="text-sm font-semibold text-gray-900">Aree della Vita</h4>
      </div>

      {!hasData ? (
        <div className="h-28 flex flex-col items-center justify-center text-gray-400 text-center px-4">
          <MessageCircle className="w-6 h-6 text-gray-300 mb-1" />
          <p className="text-[11px]">Parla con l'AI per generare il grafico</p>
        </div>
      ) : (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 5, right: 15, bottom: 5, left: 15 }}>
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#9ca3af', fontSize: 9 }}
                tickLine={false}
              />
              <Radar
                name="Attuale"
                dataKey="value"
                stroke="hsl(152, 60%, 45%)"
                fill="hsl(152, 60%, 45%)"
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default LifeBalanceRadar;
