import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Check, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersonalizedCheckins, responseTypeConfig, CheckinItem } from '@/hooks/usePersonalizedCheckins';
import { format, differenceInSeconds, addHours } from 'date-fns';
import { it } from 'date-fns/locale';

interface CheckinSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkinStartedAt: string | null;
  onEditItem?: (item: CheckinItem) => void;
}

const CheckinSummaryModal: React.FC<CheckinSummaryModalProps> = ({
  open,
  onOpenChange,
  checkinStartedAt,
  onEditItem,
}) => {
  const { completedToday, allCompleted, dailyCheckins } = usePersonalizedCheckins();

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
      // Map value back to label
      const label = getKeyLabel(key);
      const displayValue = getDisplayValue(key, value);
      return { key, label, value, displayValue };
    });
  }, [completedToday]);

  const pendingCount = dailyCheckins.length;
  const totalCount = completedItems.length + pendingCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center">Riepilogo Check-in</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
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
              {allCompleted ? 'Completato' : `${completedItems.length}/${totalCount} registrati`}
            </span>
            {allCompleted && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                ✓ Tutto fatto
              </span>
            )}
          </div>

          {/* Completed items list */}
          {completedItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-2">Parametri registrati</p>
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{item.displayValue}</span>
                      {onEditItem && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                          onClick={() => {
                            // Find the checkin item to edit
                            // This would reopen the checkin for that key
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending items */}
          {pendingCount > 0 && (
            <div className="px-2">
              <p className="text-xs text-muted-foreground">
                {pendingCount} parametri ancora da registrare
              </p>
            </div>
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
    rumination: 'Pensieri',
    burnout_level: 'Burnout',
    loneliness_perceived: 'Solitudine',
    gratitude: 'Gratitudine',
    mental_clarity: 'Chiarezza',
    somatic_tension: 'Tensione',
    coping_ability: 'Resilienza',
    sunlight_exposure: 'Luce solare',
  };
  return labels[key] || key;
}

function getDisplayValue(key: string, value: number): string {
  // Value is 1-5, convert to emoji or text
  const emojis = ['😔', '😕', '😐', '🙂', '😊'];
  if (['mood', 'sleep', 'love', 'work', 'social', 'health'].includes(key)) {
    return emojis[Math.min(4, Math.max(0, value - 1))];
  }
  return `${value}/5`;
}

export default CheckinSummaryModal;
