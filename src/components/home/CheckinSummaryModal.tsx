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
  const { getTimeUntilReset } = useCheckinTimer();

  // Calculate countdown to 6 AM Rome (daily reset)
  const countdown = useMemo(() => {
    return getTimeUntilReset();
  }, [getTimeUntilReset]);

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
      <DialogContent className="max-w-sm mx-auto rounded-[32px] max-h-[80vh] overflow-y-auto bg-glass backdrop-blur-2xl border border-glass-border shadow-glass-elevated">
        <DialogHeader>
          <DialogTitle className="text-center font-display">Riepilogo Check-in</DialogTitle>
          <DialogDescription className="text-center text-sm">
            Il tuo progresso di oggi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Case 1: No check-ins done yet - Prompt to start */}
          {!hasAnyData && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-glass backdrop-blur-sm border border-primary/20 flex items-center justify-center shadow-soft">
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
                className="rounded-2xl shadow-soft"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Vai al Check-in
              </Button>
            </div>
          )}

          {/* Case 2: Some or all check-ins done - Show list */}
          {hasAnyData && (
            <>
              {/* Countdown to midnight section - Glass card */}
              <div className="bg-glass backdrop-blur-xl rounded-2xl p-4 border border-primary/20 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 backdrop-blur-sm flex items-center justify-center border border-primary/20">
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
                  <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20 font-medium">
                    ✓ Completato
                  </span>
                )}
                {!isAllDone && pendingCount > 0 && (
                  <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-full border border-amber-500/20 font-medium">
                    {pendingCount} rimanenti
                  </span>
                )}
              </div>

              {/* Completed items list - Glass cards */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground px-2">Parametri registrati oggi</p>
                <div className="space-y-1.5">
                  {completedItems.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between px-4 py-3 bg-glass backdrop-blur-sm rounded-2xl border border-glass-border"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
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
                    className="w-full rounded-2xl bg-glass backdrop-blur-sm border-glass-border hover:bg-glass-hover"
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
    // NOTE: 'growth' removed - it's AI-calculated based on objectives/habits progress
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
