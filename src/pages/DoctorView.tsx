import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  Brain, 
  Calendar, 
  TrendingUp, 
  Heart, 
  Briefcase, 
  Users, 
  Zap, 
  Star,
  Clock,
  Shield,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import LegalDisclaimer from '@/components/layout/LegalDisclaimer';

interface DoctorViewData {
  patient: {
    firstName: string;
    memberSince: string;
    wellnessScore: number;
    lifeAreasScores: Record<string, number>;
  };
  metrics: {
    totalSessions: number;
    totalCheckins: number;
    avgMood: string | null;
    avgAnxiety: string | null;
    periodDays: number;
  };
  topThemes: { tag: string; count: number }[];
  recentEvents: string[];
  moodTrend: { date: string; mood: number; anxiety: number }[];
  recentSummaries: string[];
  accessInfo: {
    expiresAt: string;
    accessCount: number;
  };
}

const lifeAreaConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  love: { label: 'Amore', icon: Heart, color: 'text-rose-500' },
  work: { label: 'Lavoro', icon: Briefcase, color: 'text-blue-500' },
  friendship: { label: 'Amicizia', icon: Users, color: 'text-amber-500' },
  energy: { label: 'Energia', icon: Zap, color: 'text-green-500' },
  growth: { label: 'Crescita', icon: Star, color: 'text-purple-500' },
};

const DoctorView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<DoctorViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError('Token mancante');
        setLoading(false);
        return;
      }

      try {
        const { data: responseData, error: fetchError } = await supabase.functions.invoke('doctor-view-data', {
          body: { token }
        });

        if (fetchError || responseData?.error) {
          setError(responseData?.error || 'Token non valido o scaduto');
          setLoading(false);
          return;
        }

        setData(responseData);
      } catch (err) {
        console.error('Error fetching doctor view data:', err);
        setError('Errore nel caricamento dei dati');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Caricamento dati paziente...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Accesso Non Valido</h1>
          <p className="text-slate-600">{error}</p>
          <p className="text-sm text-slate-500 mt-4">
            Il link potrebbe essere scaduto o revocato dal paziente.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Dashboard Clinica</h1>
              <p className="text-sm text-slate-500">Visualizzazione sola lettura</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            <span>Scade: {formatDate(data.accessInfo.expiresAt)}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Patient Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-2xl font-bold">
                {data.patient.firstName.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{data.patient.firstName}</h2>
                <p className="text-slate-500">
                  Utente dal {formatDate(data.patient.memberSince)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Punteggio Benessere</p>
              <p className="text-4xl font-bold text-primary">{data.patient.wellnessScore}</p>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-primary" />
              <span className="text-sm text-slate-500">Sessioni</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{data.metrics.totalSessions}</p>
            <p className="text-xs text-slate-500">ultimi {data.metrics.periodDays} giorni</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-slate-500">Check-in</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{data.metrics.totalCheckins}</p>
            <p className="text-xs text-slate-500">ultimi {data.metrics.periodDays} giorni</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm text-slate-500">Media Umore</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {data.metrics.avgMood || 'N/A'}<span className="text-lg text-slate-400">/10</span>
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Brain className="w-5 h-5 text-red-500" />
              <span className="text-sm text-slate-500">Media Ansia</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {data.metrics.avgAnxiety || 'N/A'}<span className="text-lg text-slate-400">/10</span>
            </p>
          </div>
        </div>

        {/* Charts and Life Areas */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Mood Trend Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Andamento Umore/Ansia</h3>
            {data.moodTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.moodTrend}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    name="Umore"
                    dot={{ fill: '#22c55e' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="anxiety" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Ansia"
                    dot={{ fill: '#ef4444' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500">
                Dati insufficienti per il grafico
              </div>
            )}
          </div>

          {/* Life Areas */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Aree di Vita</h3>
            <div className="space-y-4">
              {Object.entries(lifeAreaConfig).map(([key, config]) => {
                const score = data.patient.lifeAreasScores[key] || 0;
                const Icon = config.icon;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <span className="text-sm text-slate-600 w-20">{config.label}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${score * 10}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-8">{score}/10</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Themes and Events */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Themes */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Temi Frequenti</h3>
            <div className="flex flex-wrap gap-2">
              {data.topThemes.length > 0 ? (
                data.topThemes.map((theme) => (
                  <span 
                    key={theme.tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {theme.tag}
                    <span className="text-xs text-primary/60">({theme.count})</span>
                  </span>
                ))
              ) : (
                <p className="text-slate-500">Nessun tema rilevato</p>
              )}
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Eventi di Vita Recenti</h3>
            {data.recentEvents.length > 0 ? (
              <ul className="space-y-2">
                {data.recentEvents.map((event, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    {event}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">Nessun evento registrato</p>
            )}
          </div>
        </div>

        {/* AI Summaries */}
        {data.recentSummaries.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Note AI dalle Sessioni Recenti</h3>
            <div className="space-y-3">
              {data.recentSummaries.map((summary, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700">
                  {summary}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legal Disclaimer */}
        <LegalDisclaimer variant="full" className="bg-white border border-slate-200" />
      </main>
    </div>
  );
};

export default DoctorView;
