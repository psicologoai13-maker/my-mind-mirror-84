import React from 'react';
import { cn } from '@/lib/utils';
import { HabitWithStreak, HABIT_TYPES, getHabitMeta } from '@/hooks/useHabits';
import { Check, Clock, X, AlertCircle } from 'lucide-react';

interface CompactHabitGridProps {
  habits: HabitWithStreak[];
  onOpenBatchModal: () => void;
}

type HabitStatus = 'completed' | 'pending' | 'failed' | 'not_logged';

const getHabitStatus = (habit: HabitWithStreak): HabitStatus => {
  const habitMeta = getHabitMeta(habit.habit_type) || HABIT_TYPES[habit.habit_type as keyof typeof HABIT_TYPES];
  const isAbstain = habit.streak_type === 'abstain';
  const target = habit.daily_target || habitMeta?.defaultTarget || 1;
  
  if (isAbstain) {
    // Abstain: logged 0 = success, logged >0 = failed, not logged = pending
    if (habit.lastEntry !== null) {
      return habit.todayValue === 0 ? 'completed' : 'failed';
    }
    return 'not_logged';
  }
  
  // Regular habits
  if (habit.todayValue >= target) return 'completed';
  if (habit.todayValue > 0) return 'pending'; // In progress
  return 'not_logged';
};

const StatusIcon: React.FC<{ status: HabitStatus }> = ({ status }) => {
  switch (status) {
    case 'completed':
      return <Check className="w-3.5 h-3.5 text-emerald-500" />;
    case 'pending':
      return <Clock className="w-3.5 h-3.5 text-amber-500" />;
    case 'failed':
      return <X className="w-3.5 h-3.5 text-red-500" />;
    default:
      return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/50" />;
  }
};

const CompactHabitGrid: React.FC<CompactHabitGridProps> = ({ habits, onOpenBatchModal }) => {
  const completedCount = habits.filter(h => getHabitStatus(h) === 'completed').length;
  const failedCount = habits.filter(h => getHabitStatus(h) === 'failed').length;
  
  return (
    <button
      onClick={onOpenBatchModal}
      className={cn(
        "w-full text-left",
        "relative overflow-hidden rounded-2xl p-4",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-soft hover:shadow-glass transition-all duration-300",
        "group cursor-pointer"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <span className="font-medium text-foreground text-sm">Le Tue Habits</span>
        </div>
        <div className={cn(
          "px-2.5 py-1 rounded-full text-xs font-medium",
          completedCount === habits.length && habits.length > 0
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-muted text-muted-foreground"
        )}>
          {completedCount}/{habits.length}
        </div>
      </div>
      
      {/* Compact Grid */}
      <div className="grid grid-cols-2 gap-2">
        {habits.slice(0, 6).map((habit) => {
          const habitMeta = getHabitMeta(habit.habit_type) || HABIT_TYPES[habit.habit_type as keyof typeof HABIT_TYPES];
          const status = getHabitStatus(habit);
          const target = habit.daily_target || habitMeta?.defaultTarget || 1;
          
          return (
            <div
              key={habit.habit_type}
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-xl",
                "bg-card/50 border border-transparent",
                status === 'completed' && "bg-emerald-500/5 border-emerald-500/20",
                status === 'failed' && "bg-red-500/5 border-red-500/20",
                status === 'pending' && "bg-amber-500/5 border-amber-500/20"
              )}
            >
              <StatusIcon status={status} />
              <span className="text-base">{habitMeta?.icon || '📌'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {habitMeta?.label || habit.habit_type}
                </p>
                {status === 'pending' && habit.streak_type !== 'abstain' && (
                  <p className="text-[10px] text-muted-foreground">
                    {habit.todayValue}/{target}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Show more indicator */}
      {habits.length > 6 && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          +{habits.length - 6} altre habits
        </p>
      )}
      
      {/* Hover hint */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <p className="text-[10px] text-muted-foreground text-center mt-3 opacity-50 group-hover:opacity-100 transition-opacity">
        Tocca per aggiornare tutte
      </p>
    </button>
  );
};

export default CompactHabitGrid;
