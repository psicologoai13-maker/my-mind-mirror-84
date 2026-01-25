import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Printer,
  Clock,
  Shield,
  AlertCircle,
  Loader2,
  FileText,
  TrendingUp,
  Calendar,
  Moon,
  Activity,
  ArrowLeft
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface PatientViewData {
  patient: {
    firstName: string;
    memberSince: string;
    wellnessScore: number;
    lifeAreasScores: Record<string, number>;
    lastSessionDate: string | null;
  };
  metrics: {
    totalSessions: number;
    totalCheckins: number;
    avgMood: string | null;
    avgAnxiety: string | null;
    peakAnxiety: number | null;
    estimatedSleepQuality: string | null;
    periodDays: number;
  };
  topThemes: { tag: string; count: number }[];
  recentEvents: { date: string; event: string }[];
  moodTrend: { date: string; mood: number; anxiety: number }[];
  clinicalSummary: string;
  riskStatus: 'stable' | 'attention' | 'critical';
}

const riskStatusConfig = {
  stable: { label: 'Stabile', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '🟢' },
  attention: { label: 'Attenzione', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: '🟡' },
  critical: { label: 'Critico', color: 'bg-red-100 text-red-700 border-red-200', icon: '🔴' },
};

const DoctorPatientView: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<PatientViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!patientId || !user) {
        setError('Accesso non valido');
        setLoading(false);
        return;
      }

      try {
        // Verify doctor has access to this patient
        const { data: access, error: accessError } = await supabase
          .from('doctor_patient_access')
          .select('*')
          .eq('doctor_id', user.id)
          .eq('patient_id', patientId)
          .eq('is_active', true)
          .maybeSingle();

        if (accessError || !access) {
          setError('Non hai accesso a questo paziente');
          setLoading(false);
          return;
        }

        // Fetch patient profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name, wellness_score, life_areas_scores, created_at')
          .eq('user_id', patientId)
          .single();

        // 🎯 USE UNIFIED RPC: Get daily metrics for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const metricsPromises = [];
        const current = new Date(thirtyDaysAgo);
        const today = new Date();
        
        while (current <= today) {
          const dateStr = format(current, 'yyyy-MM-dd');
          metricsPromises.push(
            supabase.rpc('get_daily_metrics', {
              p_user_id: patientId,
              p_date: dateStr,
            }).then(res => ({ date: dateStr, ...res }))
          );
          current.setDate(current.getDate() + 1);
        }

        const metricsResults = await Promise.all(metricsPromises);
        const dailyMetrics = metricsResults
          .filter(r => r.data && (r.data.has_checkin || r.data.has_sessions))
          .map(r => r.data);

        // Calculate averages from unified metrics
        const moodScores = dailyMetrics.filter(m => m.vitals?.mood > 0).map(m => m.vitals.mood);
        const anxietyScores = dailyMetrics.filter(m => m.vitals?.anxiety > 0).map(m => m.vitals.anxiety);
        const sleepScores = dailyMetrics.filter(m => m.vitals?.sleep > 0).map(m => m.vitals.sleep);

        const avgMood = moodScores.length > 0 
          ? (moodScores.reduce((a, b) => a + b, 0) / moodScores.length).toFixed(1)
          : null;
        const avgAnxiety = anxietyScores.length > 0 
          ? (anxietyScores.reduce((a, b) => a + b, 0) / anxietyScores.length).toFixed(1)
          : null;
        const avgSleep = sleepScores.length > 0
          ? (sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length).toFixed(1)
          : null;
        const peakAnxiety = anxietyScores.length > 0 ? Math.max(...anxietyScores) : null;

        // Sleep quality from actual data
        let estimatedSleepQuality: string | null = null;
        if (avgSleep) {
          const sleepVal = parseFloat(avgSleep);
          if (sleepVal >= 7) estimatedSleepQuality = 'Buona';
          else if (sleepVal >= 5) estimatedSleepQuality = 'Moderata';
          else estimatedSleepQuality = 'Scarsa';
        } else if (avgMood && avgAnxiety) {
          const moodVal = parseFloat(avgMood);
          const anxietyVal = parseFloat(avgAnxiety);
          if (moodVal >= 7 && anxietyVal <= 3) estimatedSleepQuality = 'Buona';
          else if (moodVal >= 5 && anxietyVal <= 5) estimatedSleepQuality = 'Moderata';
          else if (moodVal < 5 || anxietyVal > 6) estimatedSleepQuality = 'Scarsa';
        }

        // Fetch sessions for themes, events, and crisis detection
        const { data: sessions } = await supabase
          .from('sessions')
          .select('start_time, mood_score_detected, anxiety_score_detected, emotion_tags, ai_summary, key_events, crisis_alert')
          .eq('user_id', patientId)
          .eq('status', 'completed')
          .gte('start_time', thirtyDaysAgo.toISOString())
          .order('start_time', { ascending: false });

        const { data: checkins } = await supabase
          .from('daily_checkins')
          .select('created_at')
          .eq('user_id', patientId)
          .gte('created_at', thirtyDaysAgo.toISOString());

        const completedSessions = sessions || [];

        // Risk status based on unified metrics
        let riskStatus: 'stable' | 'attention' | 'critical' = 'stable';
        const hasCrisis = completedSessions.some(s => s.crisis_alert);
        if (hasCrisis || (peakAnxiety && peakAnxiety >= 9)) {
          riskStatus = 'critical';
        } else if ((avgAnxiety && parseFloat(avgAnxiety) >= 6) || (avgMood && parseFloat(avgMood) <= 4)) {
          riskStatus = 'attention';
        }

        // Extract themes
        const allTags: string[] = [];
        completedSessions.forEach(s => {
          if (s.emotion_tags) allTags.push(...(s.emotion_tags as string[]));
        });
        const tagCounts = allTags.reduce((acc, tag) => {
          acc[tag] = (acc[tag] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const topThemes = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([tag, count]) => ({ tag, count }));

        // Extract events
        const recentEvents: { date: string; event: string }[] = [];
        completedSessions.forEach(s => {
          if (s.key_events && Array.isArray(s.key_events)) {
            const sessionDate = format(new Date(s.start_time), 'dd/MM', { locale: it });
            (s.key_events as string[]).forEach(event => {
              recentEvents.push({ date: sessionDate, event });
            });
          }
        });

        // Mood trend from unified daily metrics
        const moodTrend = dailyMetrics
          .filter(m => m.vitals?.mood > 0 && m.vitals?.anxiety > 0)
          .slice(-14)
          .map(m => ({
            date: format(new Date(m.date), 'dd MMM', { locale: it }),
            mood: m.vitals.mood as number,
            anxiety: m.vitals.anxiety as number,
          }));

        // Clinical summary from AI summaries
        const clinicalSummary = completedSessions
          .slice(0, 3)
          .filter(s => s.ai_summary)
          .map(s => s.ai_summary)
          .join('\n\n---\n\n');

        setData({
          patient: {
            firstName: profile?.name?.split(' ')[0] || 'Paziente',
            memberSince: profile?.created_at || '',
            wellnessScore: profile?.wellness_score || 0,
            lifeAreasScores: (profile?.life_areas_scores as Record<string, number>) || {},
            lastSessionDate: completedSessions[0]?.start_time || null,
          },
          metrics: {
            totalSessions: completedSessions.length,
            totalCheckins: (checkins || []).length,
            avgMood,
            avgAnxiety,
            peakAnxiety,
            estimatedSleepQuality,
            periodDays: 30,
          },
          topThemes,
          recentEvents: recentEvents.slice(0, 10),
          moodTrend,
          clinicalSummary,
          riskStatus,
        });
      } catch (err) {
        console.error('Error fetching patient data:', err);
        setError('Errore nel caricamento dei dati');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [patientId, user]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Accesso Non Valido</h1>
          <p className="text-slate-600 text-sm mb-4">{error}</p>
          <Button onClick={() => navigate('/doctor-dashboard')}>
            Torna alla Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const riskConfig = riskStatusConfig[data.riskStatus];

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 print:border-b-2">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/doctor-dashboard')}
              className="print:hidden"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Cartella Clinica</h1>
              <p className="text-xs text-slate-500">VISUALIZZAZIONE SOLA LETTURA</p>
            </div>
          </div>
          <Button onClick={handlePrint} className="print:hidden bg-slate-900 hover:bg-slate-800">
            <Printer className="w-4 h-4 mr-2" />
            Stampa Report
          </Button>
        </div>
      </header>

      {/* Patient Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 text-xl font-bold">
              {data.patient.firstName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{data.patient.firstName}</h2>
              <p className="text-xs text-slate-500">
                Membro dal {data.patient.memberSince ? format(new Date(data.patient.memberSince), 'dd MMMM yyyy', { locale: it }) : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-500">Ultima sessione</p>
              <p className="text-sm font-medium text-slate-700">
                {data.patient.lastSessionDate ? format(new Date(data.patient.lastSessionDate), 'dd/MM/yyyy', { locale: it }) : '—'}
              </p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${riskConfig.color}`}>
              <span className="text-lg">{riskConfig.icon}</span>
              <div>
                <p className="text-xs font-medium">Status</p>
                <p className="text-sm font-semibold">{riskConfig.label}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 3 Columns */}
      <main className="max-w-[1400px] mx-auto p-6">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* LEFT - Metrics */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Metriche (30gg)</h3>
            
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 text-slate-500 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      Media Umore
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {data.metrics.avgMood || '—'}/10
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-500 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-red-500" />
                      Picco Ansia
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {data.metrics.peakAnxiety || '—'}/10
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-500 flex items-center gap-2">
                      <Moon className="w-4 h-4 text-indigo-500" />
                      Qualità Sonno*
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {data.metrics.estimatedSleepQuality || '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-500 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      Sessioni
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {data.metrics.totalSessions}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-500 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      Check-in
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {data.metrics.totalCheckins}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                <p className="text-[10px] text-slate-400">*Stima basata su pattern conversazionali</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h4 className="text-xs font-semibold text-slate-700 mb-3">Trend Mensile</h4>
              {data.moodTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data.moodTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                    <Line type="monotone" dataKey="mood" stroke="#10b981" strokeWidth={1.5} dot={false} name="Umore" />
                    <Line type="monotone" dataKey="anxiety" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Ansia" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-xs text-slate-400">
                  Dati insufficienti
                </div>
              )}
            </div>
          </div>

          {/* CENTER - Clinical Summary */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sintesi Clinica</h3>
            
            <div className="bg-white rounded-lg border border-slate-200">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">Note dalle Sessioni Recenti</span>
              </div>
              <div className="p-5">
                {data.clinicalSummary ? (
                  <div className="prose prose-sm prose-slate max-w-none">
                    {data.clinicalSummary.split('\n\n').map((p, i) => (
                      <p key={i} className="text-sm text-slate-700 leading-relaxed mb-4 last:mb-0">{p}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Nessuna sintesi disponibile.</p>
                )}
              </div>
              <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 rounded-b-lg">
                <p className="text-[10px] text-amber-700">
                  ⚠️ Contenuto generato da AI. NON costituisce diagnosi medica.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h4 className="text-xs font-semibold text-slate-700 mb-3">Note Tecniche</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Benessere Attuale</p>
                  <p className="font-semibold text-slate-900">{data.patient.wellnessScore}/100</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Media Ansia</p>
                  <p className="font-semibold text-slate-900">{data.metrics.avgAnxiety || '—'}/10</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT - Events & Themes */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Eventi & Temi</h3>

            <div className="bg-white rounded-lg border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Timeline Eventi</span>
              </div>
              <div className="p-4 max-h-[280px] overflow-y-auto">
                {data.recentEvents.length > 0 ? (
                  <div className="space-y-3">
                    {data.recentEvents.map((item, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                          {idx < data.recentEvents.length - 1 && <div className="w-px h-full bg-slate-200 mt-1" />}
                        </div>
                        <div className="pb-3">
                          <p className="text-[10px] text-slate-400">{item.date}</p>
                          <p className="text-xs text-slate-700">{item.event}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">Nessun evento</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Temi Ricorrenti</span>
              </div>
              <div className="p-4">
                {data.topThemes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {data.topThemes.map((theme) => (
                      <span key={theme.tag} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                        #{theme.tag}
                        <span className="text-slate-400 text-[10px]">({theme.count})</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">Nessun tema</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Aree di Vita</span>
              </div>
              <div className="p-4 space-y-2">
                {Object.entries(data.patient.lifeAreasScores).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-20 capitalize">{key}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full" style={{ width: `${(value as number) * 10}%` }} />
                    </div>
                    <span className="text-xs font-medium text-slate-600 w-8 text-right">{value as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 bg-slate-100 rounded-lg border border-slate-200">
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-slate-400 mt-0.5" />
            <p className="text-[10px] text-slate-500">
              Questo report è generato automaticamente. Non costituisce diagnosi medica. 
              Verificare sempre con valutazione clinica diretta.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorPatientView;