import React from 'react';
import { Target, Moon, Heart, Zap, Brain, Check, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useProfile } from '@/hooks/useProfile';
import { useSessions } from '@/hooks/useSessions';
import { useCheckins } from '@/hooks/useCheckins';
import { cn } from '@/lib/utils';

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
  const { profile } = useProfile();
  const { sessions } = useSessions();
  const { weeklyCheckins } = useCheckins();

  // Get selected goals from profile
  const selectedGoals = (profile?.selected_goals as string[]) || [];
  
  if (selectedGoals.length === 0) {
    return null;
  }

  // Get primary goal (first one)
  const primaryGoalId = selectedGoals[0];
  const goalConfig = goalConfigs.find(g => g.id === primaryGoalId);

  if (!goalConfig) {
    return null;
  }

  // Calculate weekly average based on metric
  const calculateProgress = (): { average: number; progress: number; isOnTrack: boolean } => {
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
        // Use checkins for mood
        values = weeklyCheckins
          ?.map(c => c.mood_value * 2) // Scale 1-5 to 2-10
          .filter((v): v is number => v !== null && v !== undefined) || [];
        // Also add session mood scores
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
      // For anxiety: lower is better
      isOnTrack = average <= goalConfig.targetValue;
      // Progress: if target is 5, and we're at 3, progress = 100%. At 7, progress = 30%
      progress = Math.max(0, Math.min(100, ((10 - average) / (10 - goalConfig.targetValue)) * 100));
    } else {
      // For sleep/energy/mood: higher is better
      isOnTrack = average >= goalConfig.targetValue;
      progress = Math.max(0, Math.min(100, (average / goalConfig.targetValue) * 100));
    }

    return { average: Math.round(average * 10) / 10, progress: Math.round(progress), isOnTrack };
  };

  const { average, progress, isOnTrack } = calculateProgress();
  const Icon = goalConfig.icon;

  return (
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
  );
};

export default GoalsWidget;