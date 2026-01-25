import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Clock, Check, ClipboardList, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersonalizedCheckins } from '@/hooks/usePersonalizedCheckins';
import { useCheckinTimer } from '@/hooks/useCheckinTimer';
import { Button } from '@/components/ui/button';

interface CheckinSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CheckinSummaryModal: React.FC<CheckinSummaryModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { completedToday, dailyCheckins } = usePersonalizedCheckins();
  const { getTimeUntilMidnight } = useCheckinTimer();

  // Calculate countdown to midnight Rome
  const countdown = useMemo(() => {
    return getTimeUntilMidnight();
  }, [getTimeUntilMidnight]);

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
  const hasAnyData = completedCount > 0;
  const isAllDone = pendingCount === 0 && completedCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Riepilogo Check-in</DialogTitle>
          <DialogDescription className="text-center text-sm">
            Il tuo progresso di oggi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Case 1: No check-ins done yet - Prompt to start */}
          {!hasAnyData && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">Nessun check-in oggi</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Rispondi alle domande nella home per registrare il tuo stato
                </p>
              </div>
              <Button 
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Vai al Check-in
              </Button>
            </div>
          )}

          {/* Case 2: Some or all check-ins done - Show list */}
          {hasAnyData && (
            <>
              {/* Countdown to midnight section */}
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nuovi check-in tra</p>
                    <p className="font-semibold text-lg text-foreground">
                      {countdown.hours}h {countdown.minutes}m
                    </p>
                  </div>
                </div>
              </div>

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
