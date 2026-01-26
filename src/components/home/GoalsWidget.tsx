import React, { useState } from 'react';
import { Target, Moon, Heart, Zap, Brain, Check, TrendingUp, Settings2, Award, AlertTriangle } from 'lucide-react';
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
import { useAIDashboard, GoalEvaluation } from '@/hooks/useAIDashboard';
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
  // 🎯 AI-DRIVEN: Use AI evaluation for goals
  const { layout } = useAIDashboard();
  const goalsEvaluation = layout.goals_evaluation || [];
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

  // Get AI evaluation for a specific goal
  const getGoalEvaluation = (goalId: string): GoalEvaluation | null => {
    return goalsEvaluation.find(e => e.goal_id === goalId) || null;
  };

  // Get status icon and color based on AI evaluation
  const getStatusDisplay = (evaluation: GoalEvaluation | null) => {
    if (!evaluation) {
      return { icon: TrendingUp, color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'In corso' };
    }
    
    switch (evaluation.status) {
      case 'achieved':
        return { icon: Award, color: 'text-emerald-600', bgColor: 'bg-emerald-100', label: 'Raggiunto!' };
      case 'struggling':
        return { icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-100', label: 'Da migliorare' };
      case 'in_progress':
      default:
        return { icon: TrendingUp, color: 'text-primary', bgColor: 'bg-primary/10', label: 'In corso' };
    }
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
    const evaluation = getGoalEvaluation(goalConfig.id);
    const statusDisplay = getStatusDisplay(evaluation);
    const StatusIcon = statusDisplay.icon;
    const progress = evaluation?.progress ?? 0;

    return (
      <>
        {GoalSelectionDialog}
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Target className="w-3.5 h-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">I tuoi obiettivi</h3>
            </div>
            <button 
              onClick={openDialog}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <Settings2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="bg-card rounded-3xl p-6 shadow-premium">
            {/* Card Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center",
                goalConfig.bgColor
              )}>
                <Icon className={cn("w-5 h-5", goalConfig.color)} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground">{goalConfig.label}</h3>
              </div>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                statusDisplay.bgColor
              )}>
                <StatusIcon className={cn("w-4 h-4", statusDisplay.color)} />
              </div>
            </div>

            {/* AI Feedback */}
            {evaluation?.ai_feedback && (
              <div className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 mb-3",
                statusDisplay.bgColor, statusDisplay.color
              )}>
                {evaluation.ai_feedback}
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium text-foreground">{progress}%</span>
              </div>
              <Progress 
                value={progress} 
                className="h-3 bg-muted"
              />
            </div>
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
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Target className="w-3.5 h-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">I tuoi obiettivi</h3>
          </div>
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
            const evaluation = getGoalEvaluation(goalConfig.id);
            const statusDisplay = getStatusDisplay(evaluation);
            const StatusIcon = statusDisplay.icon;
            const progress = evaluation?.progress ?? 0;

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
                    {evaluation?.ai_feedback && (
                      <p className="text-xs text-muted-foreground truncate">
                        {evaluation.ai_feedback}
                      </p>
                    )}
                  </div>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    statusDisplay.bgColor
                  )}>
                    <StatusIcon className={cn("w-4 h-4", statusDisplay.color)} />
                  </div>
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