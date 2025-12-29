import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Session } from '@/hooks/useSessions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, Clock, Trash2, Brain, Lightbulb, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionDetailModalProps {
  session: Session | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (sessionId: string) => void;
  isDeleting?: boolean;
}

const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  session,
  open,
  onOpenChange,
  onDelete,
  isDeleting,
}) => {
  if (!session) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 1) return 'meno di 1 min';
    return `${mins} min`;
  };

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      gioia: 'bg-mood-excellent/20 text-mood-excellent',
      felicità: 'bg-mood-excellent/20 text-mood-excellent',
      serenità: 'bg-mood-good/20 text-mood-good',
      calma: 'bg-mood-good/20 text-mood-good',
      ansia: 'bg-mood-low/20 text-mood-low',
      stress: 'bg-mood-low/20 text-mood-low',
      tristezza: 'bg-mood-poor/20 text-mood-poor',
      rabbia: 'bg-destructive/20 text-destructive',
      paura: 'bg-mood-poor/20 text-mood-poor',
      speranza: 'bg-primary/20 text-primary',
      gratitudine: 'bg-mood-excellent/20 text-mood-excellent',
    };
    return colors[emotion.toLowerCase()] || 'bg-muted text-muted-foreground';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Dettaglio Sessione
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Date & Duration */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(session.start_time), "d MMMM yyyy", { locale: it })}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                {format(new Date(session.start_time), 'HH:mm')}
                {session.duration && ` • ${formatDuration(session.duration)}`}
              </span>
            </div>
          </div>

          {/* AI Summary */}
          {session.ai_summary && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Brain className="w-4 h-4 text-primary" />
                <span>Riassunto AI</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted/50 rounded-xl p-4">
                {session.ai_summary}
              </p>
            </div>
          )}

          {/* Insights */}
          {session.insights && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Insight Chiave</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed bg-amber-50 rounded-xl p-4 border border-amber-100">
                {session.insights}
              </p>
            </div>
          )}

          {/* Key Events */}
          {session.key_events && session.key_events.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span>📌</span>
                <span>Momenti Chiave</span>
              </div>
              <ul className="space-y-2">
                {session.key_events.map((event, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{event}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Emotion Tags */}
          {session.emotion_tags && session.emotion_tags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Hash className="w-4 h-4 text-primary" />
                <span>Emozioni Rilevate</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {session.emotion_tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full font-medium",
                      getEmotionColor(tag)
                    )}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Emotion Breakdown */}
          {session.emotion_breakdown && Object.keys(session.emotion_breakdown).length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                Distribuzione Emotiva
              </div>
              <div className="space-y-2">
                {Object.entries(session.emotion_breakdown)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([emotion, value]) => (
                    <div key={emotion} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20 capitalize">{emotion}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8">{value}%</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Mood & Anxiety Scores */}
          {(session.mood_score_detected || session.anxiety_score_detected) && (
            <div className="flex gap-4">
              {session.mood_score_detected !== null && (
                <div className="flex-1 bg-mood-good/10 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-mood-good">{session.mood_score_detected}</div>
                  <div className="text-xs text-muted-foreground">Umore</div>
                </div>
              )}
              {session.anxiety_score_detected !== null && (
                <div className="flex-1 bg-mood-low/10 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-mood-low">{session.anxiety_score_detected}</div>
                  <div className="text-xs text-muted-foreground">Ansia</div>
                </div>
              )}
            </div>
          )}

          {/* Delete Button */}
          <div className="pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(session.id)}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? 'Eliminazione...' : 'Elimina sessione'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDetailModal;
