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
import { useTimeWeightedMetrics } from '@/hooks/useTimeWeightedMetrics';
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
  // 🎯 TIME-WEIGHTED AVERAGE: Use unified data source
  const { vitals, lifeAreas, hasData, daysWithData } = useTimeWeightedMetrics(30, 7);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGoalsLocal, setSelectedGoalsLocal] = useState<string[]>([]);

  // Get selected goals from profile
  const selectedGoals = (profile?.selected_goals as string[]) || [];
  const activeGoalConfigs = selectedGoals
    .map(id => goalConfigs.find(g => g.id === id))
    .filter((g): g is GoalConfig => g !== undefined);

  const handleToggleGoal = (goalId: string) => {
    setSelectedGoalsLocal(prev => 
      prev.includes(goalId) 
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  const handleSaveGoals = async () => {
    if (selectedGoalsLocal.length === 0) {
      toast.error('Seleziona almeno un obiettivo');
      return;
    }
    try {
      await updateProfile.mutateAsync({ selected_goals: selectedGoalsLocal });
      setIsDialogOpen(false);
      toast.success('Obiettivi salvati!');
    } catch (error) {
      toast.error('Errore nel salvataggio');
    }
  };

  const openDialog = () => {
    setSelectedGoalsLocal(selectedGoals);
    setIsDialogOpen(true);
  };

  // Calculate progress using unified time-weighted metrics
  const calculateProgress = (goalConfig: GoalConfig): { average: number; progress: number; isOnTrack: boolean } => {
    if (!hasData) {
      return { average: 0, progress: 0, isOnTrack: false };
    }

    let value: number | null = null;

    switch (goalConfig.metric) {
      case 'anxiety':
        value = vitals.anxiety;
        break;
      case 'sleep':
        value = vitals.sleep;
        break;
      case 'mood':
        value = vitals.mood;
        break;
      case 'energy':
        value = vitals.energy;
        break;
      case 'love':
        value = lifeAreas.love;
        break;
      default:
        break;
    }

    if (value === null || value === 0) {
      return { average: 0, progress: 0, isOnTrack: false };
    }

    const average = value;
    
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

  // Goal Selection Dialog with multi-select
  const GoalSelectionDialog = (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-w-sm mx-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Scegli i tuoi obiettivi</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Puoi selezionarne più di uno
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 mt-4">
          {goalConfigs.map((goal) => {
            const GoalIcon = goal.icon;
            const isSelected = selectedGoalsLocal.includes(goal.id);
            return (
              <button
                key={goal.id}
                onClick={() => handleToggleGoal(goal.id)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl text-left transition-all border-2",
                  isSelected
                    ? "bg-primary/10 border-primary"
                    : "bg-muted/50 border-transparent hover:bg-muted hover:scale-[1.02] active:scale-[0.98]"
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
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <Button 
          onClick={handleSaveGoals}
          className="w-full mt-4 rounded-2xl h-12"
          disabled={selectedGoalsLocal.length === 0}
        >
          Salva ({selectedGoalsLocal.length} selezionati)
        </Button>
      </DialogContent>
    </Dialog>
  );

  // Empty State - No goal selected
  if (activeGoalConfigs.length === 0) {
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
            onClick={openDialog}
            className="w-full rounded-2xl gap-2"
          >
            <Settings2 className="w-4 h-4" />
            Imposta Obiettivi
          </Button>
        </div>
      </>
    );
  }

  // Single goal - show regular card
  if (activeGoalConfigs.length === 1) {
    const goalConfig = activeGoalConfigs[0];
    const Icon = goalConfig.icon;
    const { average, progress, isOnTrack } = calculateProgress(goalConfig);

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
            <button 
              onClick={openDialog}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <Settings2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Status Badge */}
          {average > 0 && (
            <div className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 mb-3",
              isOnTrack 
                ? "bg-emerald-100 text-emerald-700" 
                : "bg-amber-100 text-amber-700"
            )}>
              {isOnTrack ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  In linea con l'obiettivo
                </>
              ) : (
                <>
                  <TrendingUp className="w-3.5 h-3.5" />
                  Continua così
                </>
              )}
            </div>
          )}

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
  }

  // Multiple goals - show horizontal carousel
  return (
    <>
      {GoalSelectionDialog}
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-end px-1">
          <button 
            onClick={openDialog}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <Settings2 className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Horizontal Scroll Carousel */}
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-6 px-6">
          {activeGoalConfigs.map((goalConfig) => {
            const Icon = goalConfig.icon;
            const { average, progress, isOnTrack } = calculateProgress(goalConfig);

            return (
              <div 
                key={goalConfig.id}
                className="bg-card rounded-3xl p-5 shadow-premium min-w-[280px] w-[85%] max-w-[320px] flex-shrink-0 snap-start"
              >
                {/* Card Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    goalConfig.bgColor
                  )}>
                    <Icon className={cn("w-5 h-5", goalConfig.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">{goalConfig.label}</h4>
                    <p className="text-xs text-muted-foreground">
                      {goalConfig.targetCondition === 'below' 
                        ? `< ${goalConfig.targetValue}/10`
                        : `> ${goalConfig.targetValue}/10`
                      }
                    </p>
                  </div>
                  {average > 0 && (
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      isOnTrack ? "bg-emerald-100" : "bg-amber-100"
                    )}>
                      {isOnTrack ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                  )}
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium text-foreground">{progress}%</span>
                  </div>
                  <Progress 
                    value={progress} 
                    className="h-2.5 bg-muted"
                  />
                  {average > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Media: <span className="font-medium text-foreground">{average}/10</span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Registra dati per vedere i progressi
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default GoalsWidget;