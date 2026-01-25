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
import { Calendar, Clock, Trash2, Brain, Lightbulb, Hash, Heart, Briefcase, Users, TrendingUp, Activity, Moon, Zap, AlertTriangle } from 'lucide-react';
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

  // Get vitals from session
  const vitals = {
    mood: session.mood_score_detected,
    anxiety: session.anxiety_score_detected,
    energy: (session.life_balance_scores as any)?.energy ?? null,
    sleep: session.sleep_quality,
  };

  // Get life areas from life_balance_scores
  const lifeAreas = {
    love: (session.life_balance_scores as any)?.love ?? null,
    work: (session.life_balance_scores as any)?.work ?? null,
    health: (session.life_balance_scores as any)?.health ?? null,
    social: (session.life_balance_scores as any)?.friendship ?? null,
    growth: (session.life_balance_scores as any)?.growth ?? null,
  };

  // Get deep psychology from session
  const deepPsychology = session.deep_psychology as unknown as Record<string, number | null> | null;

  // Calculate emotion percentages from 0-10 scores
  const emotionBreakdown = session.emotion_breakdown as Record<string, number> | null;
  const totalEmotions = emotionBreakdown 
    ? Object.values(emotionBreakdown).reduce((sum, val) => sum + (val || 0), 0)
    : 0;

  const emotionPercentages = emotionBreakdown && totalEmotions > 0
    ? Object.entries(emotionBreakdown).map(([emotion, value]) => ({
        emotion,
        value: value || 0,
        percentage: Math.round(((value || 0) / totalEmotions) * 100)
      })).filter(e => e.value > 0)
    : [];

  // Labels for emotions
  const emotionLabels: Record<string, string> = {
    joy: 'Joy',
    sadness: 'Sadness',
    anger: 'Anger',
    fear: 'Fear',
    apathy: 'Apathy',
  };

  // Labels for life areas
  const lifeAreaConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    love: { label: 'Amore', icon: <Heart className="w-4 h-4" />, color: 'text-pink-500' },
    work: { label: 'Lavoro', icon: <Briefcase className="w-4 h-4" />, color: 'text-blue-500' },
    health: { label: 'Salute', icon: <Activity className="w-4 h-4" />, color: 'text-green-500' },
    social: { label: 'Socialità', icon: <Users className="w-4 h-4" />, color: 'text-purple-500' },
    growth: { label: 'Crescita', icon: <TrendingUp className="w-4 h-4" />, color: 'text-amber-500' },
  };

  // Labels for deep psychology metrics
  const psychologyLabels: Record<string, string> = {
    rumination: 'Ruminazione',
    self_efficacy: 'Autoefficacia',
    mental_clarity: 'Chiarezza Mentale',
    burnout_level: 'Burnout',
    coping_ability: 'Resilienza',
    loneliness_perceived: 'Solitudine',
    somatic_tension: 'Tensione Somatica',
    appetite_changes: 'Appetito',
    sunlight_exposure: 'Luce Solare',
    guilt: 'Senso di Colpa',
    gratitude: 'Gratitudine',
    irritability: 'Irritabilità',
  };

  // Check if any life area has data
  const hasLifeAreas = Object.values(lifeAreas).some(v => v !== null);
  
  // Check if any deep psychology has data
  const hasDeepPsychology = deepPsychology && Object.values(deepPsychology).some(v => v !== null);

  // Check if any additional vitals beyond mood/anxiety
  const hasAdditionalVitals = vitals.energy !== null || vitals.sleep !== null;

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
                <span>Emozioni Rilevate</span>
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

          {/* Emotion Breakdown - Converted to percentages */}
          {emotionPercentages.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                Distribuzione Emotiva
              </div>
              <div className="space-y-2">
                {emotionPercentages
                  .sort((a, b) => b.percentage - a.percentage)
                  .map(({ emotion, percentage }) => (
                    <div key={emotion} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20 capitalize">
                        {emotionLabels[emotion] || emotion}
                      </span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{percentage}%</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* If no emotions detected, show message */}
          {emotionPercentages.length === 0 && emotionBreakdown && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                Distribuzione Emotiva
              </div>
              <p className="text-sm text-muted-foreground italic">
                Nessuna emozione forte rilevata in questa sessione.
              </p>
            </div>
          )}

          {/* All Vitals Section - Mood, Anxiety, Energy, Sleep */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Parametri Vitali</div>
            <div className="grid grid-cols-2 gap-3">
              {vitals.mood !== null && (
                <div className="bg-mood-good/10 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-mood-good">{vitals.mood}</div>
                  <div className="text-xs text-muted-foreground">Umore</div>
                </div>
              )}
              {vitals.anxiety !== null && (
                <div className="bg-mood-low/10 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-mood-low">{vitals.anxiety}</div>
                  <div className="text-xs text-muted-foreground">Ansia</div>
                </div>
              )}
              {vitals.energy !== null && (
                <div className="bg-amber-500/10 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-2xl font-bold text-amber-500">{vitals.energy}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Energia</div>
                </div>
              )}
              {vitals.sleep !== null && (
                <div className="bg-indigo-500/10 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <span className="text-2xl font-bold text-indigo-500">{vitals.sleep}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Sonno</div>
                </div>
              )}
            </div>
          </div>

          {/* Life Areas Section */}
          {hasLifeAreas && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Aree della Vita</div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(lifeAreas)
                  .filter(([, value]) => value !== null)
                  .map(([key, value]) => {
                    const config = lifeAreaConfig[key];
                    return (
                      <div key={key} className="bg-muted/50 rounded-xl p-2 text-center">
                        <div className={cn("flex items-center justify-center gap-1", config?.color)}>
                          {config?.icon}
                          <span className="text-lg font-bold">{value}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{config?.label || key}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Deep Psychology Section */}
          {hasDeepPsychology && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Brain className="w-4 h-4 text-purple-500" />
                <span>Psicologia Profonda</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(deepPsychology!)
                  .filter(([, value]) => value !== null)
                  .map(([key, value]) => {
                    // Determine if this is a "negative" metric (higher = worse)
                    const isNegative = ['rumination', 'burnout_level', 'loneliness_perceived', 'somatic_tension', 'guilt', 'irritability', 'appetite_changes'].includes(key);
                    const colorClass = isNegative
                      ? (value! >= 7 ? 'text-destructive' : value! >= 4 ? 'text-amber-500' : 'text-mood-good')
                      : (value! >= 7 ? 'text-mood-good' : value! >= 4 ? 'text-amber-500' : 'text-muted-foreground');
                    
                    return (
                      <div key={key} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                        <span className="text-xs text-muted-foreground truncate">
                          {psychologyLabels[key] || key}
                        </span>
                        <span className={cn("text-sm font-bold", colorClass)}>{value}/10</span>
                      </div>
                    );
                  })}
              </div>
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
