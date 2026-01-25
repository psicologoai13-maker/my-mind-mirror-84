import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Check, ClipboardList, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersonalizedCheckins } from '@/hooks/usePersonalizedCheckins';
import { differenceInSeconds, addHours } from 'date-fns';
import { Button } from '@/components/ui/button';

interface CheckinSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkinStartedAt: string | null;
}

const CheckinSummaryModal: React.FC<CheckinSummaryModalProps> = ({
  open,
  onOpenChange,
  checkinStartedAt,
}) => {
  const { completedToday, dailyCheckins } = usePersonalizedCheckins();

  // Calculate countdown to next check-in (24h from start)
  const countdown = useMemo(() => {
    if (!checkinStartedAt) return null;
    
    const startTime = new Date(checkinStartedAt);
    const nextCheckinTime = addHours(startTime, 24);
    const now = new Date();
    const diffSeconds = differenceInSeconds(nextCheckinTime, now);
    
    if (diffSeconds <= 0) return null;
    
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    
    return { hours, minutes, nextCheckinTime };
  }, [checkinStartedAt]);

  // Build list of completed items with their values
  const completedItems = useMemo(() => {
    return Object.entries(completedToday).map(([key, value]) => {
      const label = getKeyLabel(key);
      const displayValue = getDisplayValue(key, value);
      return { key, label, value, displayValue };
    });
  }, [completedToday]);

  const pendingCount = dailyCheckins.length;
  const completedCount = completedItems.length;
  const hasStarted = completedCount > 0 || checkinStartedAt;
  const isAllDone = pendingCount === 0 && completedCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Riepilogo Check-in</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Case 1: No check-ins done yet - Prompt to start */}
          {!hasStarted && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">Nessun check-in oggi</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Inizia il tuo check-in giornaliero per monitorare il tuo benessere
                </p>
              </div>
              <Button 
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Inizia Check-in
              </Button>
            </div>
          )}

          {/* Case 2: Some or all check-ins done - Show list */}
          {hasStarted && (
            <>
              {/* Countdown section */}
              {countdown && (
                <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Prossimo check-in tra</p>
                      <p className="font-semibold text-lg text-foreground">
                        {countdown.hours}h {countdown.minutes}m
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status summary */}
              <div className="flex items-center justify-between px-2">
                <span className="text-sm text-muted-foreground">
                  {completedCount} parametri registrati
                </span>
                {isAllDone && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                    ✓ Completato
                  </span>
                )}
                {!isAllDone && pendingCount > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                    {pendingCount} rimanenti
                  </span>
                )}
              </div>

              {/* Completed items list */}
              {completedItems.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-2">Parametri registrati oggi</p>
                  <div className="space-y-1.5">
                    {completedItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-xl"
                      >
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{item.displayValue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Nessun parametro registrato ancora
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rispondi alle domande nella dashboard per registrare i tuoi dati
                  </p>
                </div>
              )}

              {/* Pending items hint */}
              {pendingCount > 0 && (
                <div className="px-2">
                  <Button 
                    variant="outline" 
                    className="w-full rounded-xl"
                    onClick={() => onOpenChange(false)}
                  >
                    Continua Check-in ({pendingCount} rimanenti)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper functions
function getKeyLabel(key: string): string {
  const labels: Record<string, string> = {
    mood: 'Umore',
    anxiety: 'Ansia',
    energy: 'Energia',
    sleep: 'Sonno',
    love: 'Amore',
    work: 'Lavoro',
    social: 'Socialità',
    growth: 'Crescita',
    health: 'Salute',
    sadness: 'Tristezza',
    anger: 'Rabbia',
    fear: 'Paura',
    joy: 'Gioia',
    apathy: 'Apatia',
    rumination: 'Pensieri',
    burnout_level: 'Burnout',
    loneliness_perceived: 'Solitudine',
    gratitude: 'Gratitudine',
    mental_clarity: 'Chiarezza',
    somatic_tension: 'Tensione',
    coping_ability: 'Resilienza',
    sunlight_exposure: 'Luce solare',
    irritability: 'Irritabilità',
    guilt: 'Senso di colpa',
    self_efficacy: 'Autoefficacia',
    appetite_changes: 'Appetito',
  };
  return labels[key] || key;
}

function getDisplayValue(key: string, value: number): string {
  const emojis = ['😔', '😕', '😐', '🙂', '😊'];
  if (['mood', 'sleep', 'love', 'work', 'social', 'health'].includes(key)) {
    return emojis[Math.min(4, Math.max(0, value - 1))];
  }
  return `${value}/5`;
}

export default CheckinSummaryModal;
