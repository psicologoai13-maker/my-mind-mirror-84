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
import { Calendar, Clock, Trash2, Brain, Lightbulb, Hash, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  CLINICAL_DOMAINS, 
  ALL_CLINICAL_METRICS, 
  getMetricsByDomain, 
  getSemanticColor,
  DomainId 
} from '@/lib/clinicalDomains';

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

  // Collect all session data into a unified metrics object
  const collectSessionMetrics = (): Record<string, number | null> => {
    const metrics: Record<string, number | null> = {};
    
    // Vitals
    metrics.mood = session.mood_score_detected ?? null;
    metrics.anxiety = session.anxiety_score_detected ?? null;
    metrics.sleep = session.sleep_quality ?? null;
    
    // Life balance scores
    const lifeBalance = session.life_balance_scores as unknown as Record<string, number | null> | null;
    if (lifeBalance) {
      metrics.energy = lifeBalance.energy ?? null;
      metrics.love = lifeBalance.love ?? null;
      metrics.work = lifeBalance.work ?? null;
      metrics.health = lifeBalance.health ?? null;
      metrics.social = lifeBalance.friendship ?? lifeBalance.social ?? null;
      metrics.growth = lifeBalance.growth ?? null;
    }
    
    // Emotion breakdown
    const emotions = session.emotion_breakdown as unknown as Record<string, number> | null;
    if (emotions) {
      Object.entries(emotions).forEach(([key, value]) => {
        if (value && value > 0) metrics[key] = value;
      });
    }
    
    // Deep psychology
    const psychology = session.deep_psychology as unknown as Record<string, number | null> | null;
    if (psychology) {
      Object.entries(psychology).forEach(([key, value]) => {
        if (value !== null && value !== undefined) metrics[key] = value;
      });
    }
    
    return metrics;
  };

  const sessionMetrics = collectSessionMetrics();

  // Get metrics for a specific domain that have data
  const getMetricsForDomain = (domainId: DomainId) => {
    const domainMetrics = getMetricsByDomain(domainId);
    return domainMetrics.filter(m => {
      const value = sessionMetrics[m.key];
      return value !== null && value !== undefined && value > 0;
    });
  };

  // Check if any safety metrics are elevated
  const hasSafetyAlerts = () => {
    const safetyMetrics = getMetricsForDomain('safety');
    return safetyMetrics.some(m => {
      const value = sessionMetrics[m.key];
      return value !== null && value >= 5;
    });
  };

  // Domain order for display
  const domainOrder: DomainId[] = ['emotional', 'activation', 'cognitive', 'behavioral', 'somatic', 'resources', 'functioning', 'safety'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Dettaglio Sessione
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
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

          {/* Safety Alert Banner */}
          {hasSafetyAlerts() && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">
                Indicatori critici rilevati in questa sessione
              </span>
            </div>
          )}

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
              <p className="text-sm text-muted-foreground leading-relaxed bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-800">
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
                <span>Tag Emotivi</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {session.emotion_tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full font-medium",
                      getEmotionColor(tag.replace('#', ''))
                    )}
                  >
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Clinical Domains - Extracted Metrics */}
          {domainOrder.map(domainId => {
            const domainMetrics = getMetricsForDomain(domainId);
            if (domainMetrics.length === 0) return null;

            const domain = CLINICAL_DOMAINS.find(d => d.id === domainId);
            if (!domain) return null;

            const isSafetyDomain = domainId === 'safety';

            return (
              <div key={domainId} className="space-y-2">
                <div className={cn(
                  "flex items-center gap-2 text-sm font-medium",
                  isSafetyDomain ? "text-destructive" : "text-foreground"
                )}>
                  <span>{domain.icon}</span>
                  <span>{domain.label}</span>
                </div>
                <div className={cn(
                  "grid gap-2",
                  domainMetrics.length <= 2 ? "grid-cols-2" : "grid-cols-3"
                )}>
                  {domainMetrics.map(metric => {
                    const value = sessionMetrics[metric.key];
                    const colorClass = getSemanticColor(value, metric.isNegative);
                    
                    return (
                      <div 
                        key={metric.key} 
                        className={cn(
                          "rounded-xl p-2.5 text-center",
                          isSafetyDomain && value && value >= 5 
                            ? "bg-destructive/10 border border-destructive/30" 
                            : "bg-muted/50"
                        )}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-sm">{metric.icon}</span>
                          <span className={cn("text-lg font-bold", colorClass)}>{value}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {metric.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Empty state if no metrics extracted */}
          {Object.values(sessionMetrics).every(v => v === null || v === 0) && !session.ai_summary && (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm text-muted-foreground">
                Nessuna metrica estratta da questa sessione
              </p>
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
