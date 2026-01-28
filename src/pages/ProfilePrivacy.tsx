import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, 
  Shield, 
  MapPin, 
  Download, 
  Trash2, 
  FileText, 
  Lock,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const ProfilePrivacy: React.FC = () => {
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfile();
  const { user, signOut } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dataInfoOpen, setDataInfoOpen] = useState(false);

  const locationEnabled = profile?.location_permission_granted || false;

  const handleLocationToggle = async (enabled: boolean) => {
    try {
      await updateProfile.mutateAsync({ location_permission_granted: enabled });
      toast.success(enabled ? 'Posizione attivata' : 'Posizione disattivata');
    } catch (error) {
      toast.error('Errore nel salvataggio');
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    setIsExporting(true);

    try {
      // Fetch all user data
      const [
        profileRes,
        checkinsRes,
        sessionsRes,
        emotionsRes,
        lifeAreasRes,
        habitsRes,
        objectivesRes
      ] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('daily_checkins').select('*').eq('user_id', user.id),
        supabase.from('sessions').select('*').eq('user_id', user.id),
        supabase.from('daily_emotions').select('*').eq('user_id', user.id),
        supabase.from('daily_life_areas').select('*').eq('user_id', user.id),
        supabase.from('daily_habits').select('*').eq('user_id', user.id),
        supabase.from('user_objectives').select('*').eq('user_id', user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data,
        checkins: checkinsRes.data,
        sessions: sessionsRes.data,
        emotions: emotionsRes.data,
        life_areas: lifeAreasRes.data,
        habits: habitsRes.data,
        objectives: objectivesRes.data,
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aria-dati-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Dati esportati con successo!');
    } catch (error) {
      toast.error('Errore nell\'esportazione');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!user) return;
    setIsDeleting(true);

    try {
      // Delete all user data from tables (profile is kept but reset)
      await Promise.all([
        supabase.from('daily_checkins').delete().eq('user_id', user.id),
        supabase.from('sessions').delete().eq('user_id', user.id),
        supabase.from('daily_emotions').delete().eq('user_id', user.id),
        supabase.from('daily_life_areas').delete().eq('user_id', user.id),
        supabase.from('daily_habits').delete().eq('user_id', user.id),
        supabase.from('daily_psychology').delete().eq('user_id', user.id),
        supabase.from('user_objectives').delete().eq('user_id', user.id),
        supabase.from('user_achievements').delete().eq('user_id', user.id),
        supabase.from('thematic_diaries').delete().eq('user_id', user.id),
        supabase.from('body_metrics').delete().eq('user_id', user.id),
      ]);

      // Reset profile
      await updateProfile.mutateAsync({
        wellness_score: 0,
        life_areas_scores: { love: 0, work: 0, wellness: 0, friendship: 0 },
        long_term_memory: [],
        ai_dashboard_cache: null,
        ai_analysis_cache: null,
        ai_insights_cache: null,
      });

      toast.success('Tutti i dati sono stati eliminati');
      await signOut();
      navigate('/auth');
    } catch (error) {
      toast.error('Errore nell\'eliminazione');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MobileLayout hideNav>
      <header className="px-6 pt-8 pb-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/profile')}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-xl font-bold text-foreground">Privacy Aria</h1>
        </div>
      </header>

      <div className="px-6 space-y-5 pb-8">
        {/* Privacy Info Card */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-900">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                I tuoi dati sono protetti
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                Solo tu hai accesso ai tuoi dati. Aria non condivide nulla con terze parti.
              </p>
            </div>
          </div>
        </div>

        {/* Location Toggle */}
        <div className="bg-card rounded-2xl p-4 border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">Condividi posizione</p>
                <p className="text-xs text-muted-foreground">
                  Aria contestualizza meteo e orari
                </p>
              </div>
            </div>
            <Switch 
              checked={locationEnabled}
              onCheckedChange={handleLocationToggle}
            />
          </div>
        </div>

        {/* Data Info Accordion */}
        <Collapsible open={dataInfoOpen} onOpenChange={setDataInfoOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full bg-card rounded-2xl p-4 border border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Cosa raccoglie Aria</p>
                  <p className="text-xs text-muted-foreground">
                    Informazioni sui dati analizzati
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${dataInfoOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="bg-muted/30 rounded-2xl p-4 space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <p><strong>Check-in giornalieri:</strong> umore, note personali</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <p><strong>Sessioni con Aria:</strong> trascrizioni, emozioni rilevate</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <p><strong>Obiettivi e abitudini:</strong> progressi tracciati</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <p><strong>Metriche fisiche:</strong> peso, sonno (se inseriti)</p>
              </div>
              <p className="text-muted-foreground pt-2 border-t border-border/50">
                Tutti i dati sono criptati e accessibili solo a te.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Export Data */}
        <Button
          variant="outline"
          className="w-full rounded-2xl h-14 justify-start gap-3"
          onClick={handleExportData}
          disabled={isExporting}
        >
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Download className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="text-left">
            <p className="font-medium">{isExporting ? 'Esportando...' : 'Esporta i tuoi dati'}</p>
            <p className="text-xs text-muted-foreground">Scarica tutto in formato JSON</p>
          </div>
        </Button>

        {/* Danger Zone */}
        <div className="pt-4">
          <p className="text-xs font-medium text-destructive mb-3 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" />
            Zona Pericolosa
          </p>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full rounded-2xl h-14 justify-start gap-3 border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              >
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Elimina tutti i dati</p>
                  <p className="text-xs text-muted-foreground">Azione irreversibile</p>
                </div>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Questa azione eliminerà permanentemente tutti i tuoi dati: check-in, sessioni, obiettivi, abitudini e tutto il resto. Non sarà possibile recuperarli.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Eliminando...' : 'Elimina tutto'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Legal Links */}
        <div className="pt-4 space-y-2">
          <button className="w-full text-left p-3 rounded-xl hover:bg-muted/50 flex items-center gap-3">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Termini di Servizio</span>
          </button>
          <button className="w-full text-left p-3 rounded-xl hover:bg-muted/50 flex items-center gap-3">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Privacy Policy</span>
          </button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default ProfilePrivacy;
