import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
  Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DoctorViewData {
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
  accessInfo: {
    expiresAt: string;
    accessCount: number;
  };
}

const riskStatusConfig = {
  stable: { label: 'Stabile', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '🟢' },
  attention: { label: 'Attenzione', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: '🟡' },
  critical: { label: 'Critico', color: 'bg-red-100 text-red-700 border-red-200', icon: '🔴' },
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

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit',
      year: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-slate-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">Caricamento cartella clinica...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Accesso Non Valido</h1>
          <p className="text-slate-600 text-sm">{error}</p>
          <p className="text-xs text-slate-400 mt-4">
            Il link potrebbe essere scaduto o revocato dal paziente.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const riskConfig = riskStatusConfig[data.riskStatus];

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {/* Professional Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 print:border-b-2">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
                  Cartella Clinica Digitale
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  VISUALIZZAZIONE SOLA LETTURA • Dati sensibili
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-xs text-slate-500 hidden sm:block">
                <p>Accesso #{data.accessInfo.accessCount}</p>
                <p className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Scade: {formatShortDate(data.accessInfo.expiresAt)}
                </p>
              </div>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors print:hidden"
              >
                <Printer className="w-4 h-4" />
                Stampa Report
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Patient Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 text-xl font-bold">
                {data.patient.firstName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{data.patient.firstName}</h2>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                  <span>ID Paziente: {token?.slice(0, 8).toUpperCase()}</span>
                  <span>•</span>
                  <span>Iscritto dal {formatDate(data.patient.memberSince)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">Ultima sessione</p>
                <p className="text-sm font-medium text-slate-700">
                  {data.patient.lastSessionDate ? formatDate(data.patient.lastSessionDate) : 'N/A'}
                </p>
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${riskConfig.color}`}>
                <span className="text-lg">{riskConfig.icon}</span>
                <div>
                  <p className="text-xs font-medium">Status Rischio</p>
                  <p className="text-sm font-semibold">{riskConfig.label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 3-Column Content */}
      <main className="max-w-[1400px] mx-auto p-6">
        <div className="grid lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN - Metrics */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Metriche Periodo (30gg)
            </h3>
            
            {/* Metrics Table */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
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

            {/* Trend Chart */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
              <h4 className="text-xs font-semibold text-slate-700 mb-3">Trend Mensile</h4>
              {data.moodTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data.moodTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 9, fill: '#94a3b8' }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis 
                      domain={[0, 10]} 
                      tick={{ fontSize: 9, fill: '#94a3b8' }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        fontSize: 11, 
                        borderRadius: 6, 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="mood" 
                      stroke="#10b981" 
                      strokeWidth={1.5}
                      dot={false}
                      name="Umore"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="anxiety" 
                      stroke="#ef4444" 
                      strokeWidth={1.5}
                      dot={false}
                      name="Ansia"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-xs text-slate-400">
                  Dati insufficienti
                </div>
              )}
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-0.5 bg-emerald-500 rounded" />
                  <span className="text-[10px] text-slate-500">Umore</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-0.5 bg-red-500 rounded" />
                  <span className="text-[10px] text-slate-500">Ansia</span>
                </div>
              </div>
            </div>
          </div>

          {/* CENTER COLUMN - Clinical Summary */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Sintesi Clinica (AI-Generated)
            </h3>
            
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">Report Clinico Automatico</span>
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                  Ultimi 30 giorni
                </span>
              </div>
              <div className="p-5">
                {data.clinicalSummary ? (
                  <div className="prose prose-sm prose-slate max-w-none">
                    {data.clinicalSummary.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className="text-sm text-slate-700 leading-relaxed mb-4 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">
                    Nessuna sintesi disponibile. Il paziente potrebbe non avere sessioni sufficienti.
                  </p>
                )}
              </div>
              <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 rounded-b-lg">
                <p className="text-[10px] text-amber-700">
                  ⚠️ Questo contenuto è generato automaticamente da AI e NON costituisce diagnosi medica. 
                  Verificare sempre con valutazione clinica diretta.
                </p>
              </div>
            </div>

            {/* Secondary Clinical Notes */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
              <h4 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Note Tecniche
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Punteggio Benessere Attuale</p>
                  <p className="font-semibold text-slate-900">{data.patient.wellnessScore}/100</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Media Ansia Periodo</p>
                  <p className="font-semibold text-slate-900">{data.metrics.avgAnxiety || '—'}/10</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Events & Themes */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Eventi & Temi
            </h3>
            
            {/* Events Timeline */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
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
                          {idx < data.recentEvents.length - 1 && (
                            <div className="w-px h-full bg-slate-200 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-3">
                          <p className="text-[10px] text-slate-400 mb-0.5">{item.date}</p>
                          <p className="text-xs text-slate-700">{item.event}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Nessun evento registrato
                  </p>
                )}
              </div>
            </div>

            {/* Themes Tags */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Temi Ricorrenti</span>
              </div>
              <div className="p-4">
                {data.topThemes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {data.topThemes.map((theme) => (
                      <span 
                        key={theme.tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs"
                      >
                        #{theme.tag}
                        <span className="text-slate-400 text-[10px]">({theme.count})</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Nessun tema rilevato
                  </p>
                )}
              </div>
            </div>

            {/* Life Areas Mini */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Aree di Vita</span>
              </div>
              <div className="p-4 space-y-2">
                {Object.entries(data.patient.lifeAreasScores).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-20 capitalize">{key}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-400 rounded-full"
                        style={{ width: `${(value as number) * 10}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-600 w-8 text-right">
                      {value as number}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="mt-8 p-4 bg-slate-100 rounded-lg border border-slate-200">
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-600 font-medium mb-1">
                Disclaimer Legale
              </p>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Questo report è generato automaticamente da sistemi di intelligenza artificiale e ha scopo puramente informativo. 
                Non costituisce diagnosi medica, parere clinico o trattamento. Le informazioni contenute devono essere sempre 
                verificate e integrate con una valutazione clinica professionale diretta. L'accesso ai dati è protetto e tracciato. 
                È vietata la condivisione non autorizzata di queste informazioni.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background-color: white !important; }
          .print\\:border-b-2 { border-bottom-width: 2px !important; }
        }
      `}</style>
    </div>
  );
};

export default DoctorView;