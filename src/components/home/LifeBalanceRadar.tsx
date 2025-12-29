import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
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
  
  // Get life areas scores from profile first
  const profileScores = profile?.life_areas_scores as Record<string, number | null> | undefined;
  
  // If profile scores are empty, try to get from the most recent session
  const lastSessionWithScores = React.useMemo(() => {
    if (!completedSessions) return null;
    
    // Find the most recent session with life_balance_scores
    const sorted = [...completedSessions]
      .filter(s => {
        const scores = s.life_balance_scores as unknown as Record<string, number | null> | null;
        return scores && Object.values(scores).some(v => v && v > 0);
      })
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    
    return sorted[0]?.life_balance_scores as unknown as Record<string, number | null> | undefined;
  }, [completedSessions]);

  // Use profile scores if available, otherwise fall back to last session scores
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
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
          <Compass className="w-4 h-4 text-primary" />
        </div>
        <h4 className="font-semibold text-gray-900">Aree della Vita</h4>
      </div>

      {!hasData ? (
        <div className="h-32 flex flex-col items-center justify-center text-gray-500 text-center px-4">
          <MessageCircle className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-xs leading-relaxed">Parla con l'AI per generare il tuo primo grafico</p>
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
