import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Shield, 
  UserPlus, 
  Users, 
  Activity, 
  Calendar,
  ChevronRight,
  Search,
  X,
  Loader2,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PatientData {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_email: string;
  access_granted_at: string;
  last_checkin: string | null;
  sessions_count: number;
  risk_status: 'stable' | 'attention' | 'critical';
  avg_mood: number | null;
  avg_anxiety: number | null;
}

const riskStatusConfig = {
  stable: { label: 'Stabile', color: 'bg-emerald-100 text-emerald-700', icon: '🟢' },
  attention: { label: 'Attenzione', color: 'bg-amber-100 text-amber-700', icon: '🟡' },
  critical: { label: 'Critico', color: 'bg-red-100 text-red-700', icon: '🔴' },
};

const DoctorDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [addPatientCode, setAddPatientCode] = useState('');
  const [addingPatient, setAddingPatient] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, [user]);

  const fetchPatients = async () => {
    if (!user) return;

    try {
      // Get all patient connections for this doctor
      const { data: connections, error: connError } = await supabase
        .from('doctor_patient_access')
        .select('*')
        .eq('doctor_id', user.id)
        .eq('is_active', true);

      if (connError) throw connError;

      if (!connections || connections.length === 0) {
        setPatients([]);
        setLoading(false);
        return;
      }

      // Get patient profiles and their data
      const patientIds = connections.map(c => c.patient_id);
      
      const { data: profiles, error: profError } = await supabase
        .from('user_profiles')
        .select('user_id, name, email')
        .in('user_id', patientIds);

      if (profError) throw profError;

      // Get sessions data for each patient
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const patientsData: PatientData[] = await Promise.all(
        connections.map(async (conn) => {
          const profile = profiles?.find(p => p.user_id === conn.patient_id);
          
          // Get sessions
          const { data: sessions } = await supabase
            .from('sessions')
            .select('mood_score_detected, anxiety_score_detected, crisis_alert, start_time')
            .eq('user_id', conn.patient_id)
            .eq('status', 'completed')
            .gte('start_time', thirtyDaysAgo.toISOString())
            .order('start_time', { ascending: false });

          // Get last checkin
          const { data: checkins } = await supabase
            .from('daily_checkins')
            .select('created_at')
            .eq('user_id', conn.patient_id)
            .order('created_at', { ascending: false })
            .limit(1);

          const sessionsData = sessions || [];
          const moodScores = sessionsData.filter(s => s.mood_score_detected).map(s => s.mood_score_detected as number);
          const anxietyScores = sessionsData.filter(s => s.anxiety_score_detected).map(s => s.anxiety_score_detected as number);
          
          const avgMood = moodScores.length > 0 
            ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length 
            : null;
          const avgAnxiety = anxietyScores.length > 0 
            ? anxietyScores.reduce((a, b) => a + b, 0) / anxietyScores.length 
            : null;

          // Calculate risk status
          let riskStatus: 'stable' | 'attention' | 'critical' = 'stable';
          const hasCrisis = sessionsData.some(s => s.crisis_alert);
          const maxAnxiety = anxietyScores.length > 0 ? Math.max(...anxietyScores) : 0;
          
          if (hasCrisis || maxAnxiety >= 9) {
            riskStatus = 'critical';
          } else if ((avgAnxiety && avgAnxiety >= 6) || (avgMood && avgMood <= 4)) {
            riskStatus = 'attention';
          }

          return {
            id: conn.id,
            patient_id: conn.patient_id,
            patient_name: profile?.name || 'Paziente',
            patient_email: profile?.email || '',
            access_granted_at: conn.access_granted_at,
            last_checkin: checkins?.[0]?.created_at || null,
            sessions_count: sessionsData.length,
            risk_status: riskStatus,
            avg_mood: avgMood,
            avg_anxiety: avgAnxiety,
          };
        })
      );

      setPatients(patientsData);
    } catch (err) {
      console.error('Error fetching patients:', err);
      toast.error('Errore nel caricamento pazienti');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = async () => {
    if (!addPatientCode.trim()) {
      toast.error('Inserisci un codice paziente');
      return;
    }

    setAddingPatient(true);

    try {
      // Find patient by connection code using the RPC function
      const { data: patient, error: findError } = await supabase.rpc(
        'find_patient_by_code', 
        { _code: addPatientCode.toUpperCase() }
      );

      if (findError) throw findError;

      if (!patient || patient.length === 0) {
        toast.error('Codice paziente non trovato');
        setAddingPatient(false);
        return;
      }

      const patientData = patient[0];

      // Check if already connected
      const { data: existing } = await supabase
        .from('doctor_patient_access')
        .select('id')
        .eq('doctor_id', user?.id)
        .eq('patient_id', patientData.user_id)
        .maybeSingle();

      if (existing) {
        toast.error('Paziente già collegato');
        setAddingPatient(false);
        return;
      }

      // Create connection
      const { error: insertError } = await supabase
        .from('doctor_patient_access')
        .insert({
          doctor_id: user?.id,
          patient_id: patientData.user_id,
        });

      if (insertError) throw insertError;

      toast.success(`Paziente "${patientData.name || 'Anonimo'}" aggiunto!`);
      setAddPatientCode('');
      setDialogOpen(false);
      fetchPatients();
    } catch (err) {
      console.error('Error adding patient:', err);
      toast.error('Errore nell\'aggiunta del paziente');
    } finally {
      setAddingPatient(false);
    }
  };

  const handleViewPatient = (patientId: string) => {
    // Navigate to patient view with doctor context
    navigate(`/doctor-view-patient/${patientId}`);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const filteredPatients = patients.filter(p => 
    p.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.patient_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Portale Medico</h1>
              <p className="text-xs text-slate-500">Gestione Pazienti</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Esci
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{patients.length}</p>
                <p className="text-xs text-slate-500">Pazienti Totali</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <span className="text-lg">🟢</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {patients.filter(p => p.risk_status === 'stable').length}
                </p>
                <p className="text-xs text-slate-500">Stabili</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <span className="text-lg">🟡</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {patients.filter(p => p.risk_status === 'attention').length}
                </p>
                <p className="text-xs text-slate-500">In Attenzione</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <span className="text-lg">🔴</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {patients.filter(p => p.risk_status === 'critical').length}
                </p>
                <p className="text-xs text-slate-500">Critici</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cerca paziente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800">
                <UserPlus className="w-4 h-4 mr-2" />
                Aggiungi Paziente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aggiungi Paziente</DialogTitle>
                <DialogDescription>
                  Inserisci il codice di connessione fornito dal paziente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Es: A1B2C3D4"
                  value={addPatientCode}
                  onChange={(e) => setAddPatientCode(e.target.value.toUpperCase())}
                  className="text-center text-xl tracking-widest font-mono"
                  maxLength={8}
                />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setDialogOpen(false)}
                  >
                    Annulla
                  </Button>
                  <Button 
                    className="flex-1 bg-slate-900 hover:bg-slate-800"
                    onClick={handleAddPatient}
                    disabled={addingPatient || !addPatientCode.trim()}
                  >
                    {addingPatient ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Collega'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Patients Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">
                {patients.length === 0 ? 'Nessun paziente' : 'Nessun risultato'}
              </h3>
              <p className="text-sm text-slate-500">
                {patients.length === 0 
                  ? 'Aggiungi il tuo primo paziente con il codice di connessione'
                  : 'Prova a modificare i criteri di ricerca'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Paziente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Ultimo Check-in
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Sessioni (30gg)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Stato
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Azione
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map((patient) => {
                    const riskConfig = riskStatusConfig[patient.risk_status];
                    return (
                      <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium">
                              {patient.patient_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{patient.patient_name}</p>
                              <p className="text-xs text-slate-500">
                                Collegato il {format(new Date(patient.access_granted_at), 'dd MMM yyyy', { locale: it })}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {patient.last_checkin 
                              ? format(new Date(patient.last_checkin), 'dd/MM/yy HH:mm', { locale: it })
                              : '—'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Activity className="w-4 h-4 text-slate-400" />
                            {patient.sessions_count}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${riskConfig.color}`}>
                            <span>{riskConfig.icon}</span>
                            {riskConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewPatient(patient.patient_id)}
                            className="text-slate-600 hover:text-slate-900"
                          >
                            Vedi Report
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Portale Medico Serenity • I dati sono protetti e accessibili solo ai medici autorizzati
          </p>
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;