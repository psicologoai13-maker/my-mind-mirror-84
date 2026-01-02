import React, { useState } from 'react';
import { Target, Moon, Heart, Zap, Brain, Check, TrendingUp, Settings2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useProfile } from '@/hooks/useProfile';
import { useSessions } from '@/hooks/useSessions';
import { useCheckins } from '@/hooks/useCheckins';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GoalConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  metric: string;
  targetCondition: 'below' | 'above';
  targetValue: number;
}

const goalConfigs: GoalConfig[] = [
  {
    id: 'reduce_anxiety',
    label: 'Ridurre l\'Ansia',
    icon: Brain,
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
    metric: 'anxiety',
    targetCondition: 'below',
    targetValue: 5,
  },
  {
    id: 'improve_sleep',
    label: 'Dormire Meglio',
    icon: Moon,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    metric: 'sleep',
    targetCondition: 'above',
    targetValue: 7,
  },
  {
    id: 'find_love',
    label: 'Migliorare Relazioni',
    icon: Heart,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
    metric: 'love',
    targetCondition: 'above',
    targetValue: 6,
  },
  {
    id: 'boost_energy',
    label: 'Aumentare Energia',
    icon: Zap,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    metric: 'energy',
    targetCondition: 'above',
    targetValue: 7,
  },
  {
    id: 'emotional_stability',
    label: 'Stabilità Emotiva',
    icon: Target,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    metric: 'mood',
    targetCondition: 'above',
    targetValue: 6,
  },
];

const GoalsWidget: React.FC = () => {
  const { profile, updateProfile } = useProfile();
  const { sessions } = useSessions();
  const { weeklyCheckins } = useCheckins();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Get selected goals from profile
  const selectedGoals = (profile?.selected_goals as string[]) || [];
  const primaryGoalId = selectedGoals[0];
  const goalConfig = primaryGoalId ? goalConfigs.find(g => g.id === primaryGoalId) : null;

  const handleSelectGoal = async (goalId: string) => {
    try {
      await updateProfile.mutateAsync({ selected_goals: [goalId] });
      setIsDialogOpen(false);
      toast.success('Obiettivo impostato!');
    } catch (error) {
      toast.error('Errore nel salvataggio');
    }
  };

  // Calculate weekly average based on metric
  const calculateProgress = (): { average: number; progress: number; isOnTrack: boolean } => {
    if (!goalConfig) return { average: 0, progress: 0, isOnTrack: false };
    
    let values: number[] = [];
    const lastWeekSessions = sessions?.filter(s => {
      const sessionDate = new Date(s.start_time);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return sessionDate >= weekAgo && s.status === 'completed';
    }) || [];

    switch (goalConfig.metric) {
      case 'anxiety':
        values = lastWeekSessions
          .map(s => s.anxiety_score_detected)
          .filter((v): v is number => v !== null && v !== undefined);
        break;
      case 'sleep':
        values = lastWeekSessions
          .map(s => (s as any).sleep_quality)
          .filter((v): v is number => v !== null && v !== undefined);
        break;
      case 'mood':
        values = weeklyCheckins
          ?.map(c => c.mood_value * 2)
          .filter((v): v is number => v !== null && v !== undefined) || [];
        const sessionMoods = lastWeekSessions
          .map(s => s.mood_score_detected)
          .filter((v): v is number => v !== null && v !== undefined);
        values = [...values, ...sessionMoods];
        break;
      case 'energy':
        values = lastWeekSessions
          .map(s => {
            const lifeScores = s.life_balance_scores as unknown as Record<string, number> | null;
            return lifeScores?.energy;
          })
          .filter((v): v is number => v !== null && v !== undefined);
        break;
      case 'love':
        values = lastWeekSessions
          .map(s => {
            const lifeScores = s.life_balance_scores as unknown as Record<string, number> | null;
            return lifeScores?.love;
          })
          .filter((v): v is number => v !== null && v !== undefined);
        break;
      default:
        break;
    }

    if (values.length === 0) {
      return { average: 0, progress: 0, isOnTrack: false };
    }

    const average = values.reduce((a, b) => a + b, 0) / values.length;
    
    let progress: number;
    let isOnTrack: boolean;

    if (goalConfig.targetCondition === 'below') {
      isOnTrack = average <= goalConfig.targetValue;
      progress = Math.max(0, Math.min(100, ((10 - average) / (10 - goalConfig.targetValue)) * 100));
    } else {
      isOnTrack = average >= goalConfig.targetValue;
      progress = Math.max(0, Math.min(100, (average / goalConfig.targetValue) * 100));
    }

    return { average: Math.round(average * 10) / 10, progress: Math.round(progress), isOnTrack };
  };

  const { average, progress, isOnTrack } = calculateProgress();

  // Goal Selection Dialog
  const GoalSelectionDialog = (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-w-sm mx-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Scegli il tuo obiettivo</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Su cosa vorresti concentrarti?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 mt-4">
          {goalConfigs.map((goal) => {
            const GoalIcon = goal.icon;
            return (
              <button
                key={goal.id}
                onClick={() => handleSelectGoal(goal.id)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl text-left transition-all",
                  "bg-muted/50 hover:bg-muted hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", goal.bgColor)}>
                  <GoalIcon className={cn("w-6 h-6", goal.color)} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{goal.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {goal.targetCondition === 'below' 
                      ? `Obiettivo: < ${goal.targetValue}/10`
                      : `Obiettivo: > ${goal.targetValue}/10`
                    }
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );

  // Empty State - No goal selected
  if (!goalConfig) {
    return (
      <>
        {GoalSelectionDialog}
        <div className="bg-card rounded-3xl p-6 shadow-premium">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-muted">
              <Target className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium">Traguardi</p>
              <h3 className="text-base font-semibold text-foreground">Nessun obiettivo impostato</h3>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Scegli un focus per permettermi di aiutarti meglio.
          </p>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="w-full rounded-2xl gap-2"
          >
            <Settings2 className="w-4 h-4" />
            Imposta Obiettivo
          </Button>
        </div>
      </>
    );
  }

  const Icon = goalConfig.icon;

  return (
    <>
      {GoalSelectionDialog}
      <div className="bg-card rounded-3xl p-6 shadow-premium">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "w-11 h-11 rounded-2xl flex items-center justify-center",
            goalConfig.bgColor
          )}>
            <Icon className={cn("w-5 h-5", goalConfig.color)} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium">Il tuo obiettivo</p>
            <h3 className="text-base font-semibold text-foreground">{goalConfig.label}</h3>
          </div>
          {average > 0 && (
            <div className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5",
              isOnTrack 
                ? "bg-emerald-100 text-emerald-700" 
                : "bg-amber-100 text-amber-700"
            )}>
              {isOnTrack ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  In linea
                </>
              ) : (
                <>
                  <TrendingUp className="w-3.5 h-3.5" />
                  Continua così
                </>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso settimanale</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <Progress 
            value={progress} 
            className="h-3 bg-muted"
          />
          {average > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Media ultimi 7 giorni: <span className="font-medium text-foreground">{average}/10</span>
              {goalConfig.targetCondition === 'below' 
                ? ` (obiettivo: < ${goalConfig.targetValue})`
                : ` (obiettivo: > ${goalConfig.targetValue})`
              }
            </p>
          )}
          {average === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Inizia a registrare i tuoi dati per vedere i progressi 💪
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default GoalsWidget;