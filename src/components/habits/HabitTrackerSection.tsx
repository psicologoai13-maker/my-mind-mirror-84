import React, { useState } from 'react';
import { useHabits, HABIT_TYPES } from '@/hooks/useHabits';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import HabitQuizModal from './HabitQuizModal';

const HabitTrackerSection: React.FC = () => {
  const navigate = useNavigate();
  const { habits, isLoading, logHabit } = useHabits();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loggingHabit, setLoggingHabit] = useState<string | null>(null);

  const handleLogHabit = async (habitType: string, value: number) => {
    setLoggingHabit(habitType);
    try {
      await logHabit.mutateAsync({ habitType, value });
      
      const habit = habits.find(h => h.habit_type === habitType);
      if (habit && habit.streak === 6 && value > 0) {
        toast.success('🔥 Stai per raggiungere 7 giorni consecutivi!');
      }
    } catch (error) {
      toast.error('Errore nel salvare');
    } finally {
      setLoggingHabit(null);
    }
  };

  // Filter out completed habits - only show incomplete ones
  const incompleteHabits = habits.filter(habit => {
    const habitMeta = HABIT_TYPES[habit.habit_type as keyof typeof HABIT_TYPES];
    const target = habit.daily_target || habitMeta?.defaultTarget || 1;
    const isAbstain = habit.streak_type === 'abstain';
    const isComplete = isAbstain ? habit.todayValue === 0 && habit.lastEntry : habit.todayValue >= target;
    return !isComplete;
  });

  // AI would prioritize these - for now show first 4 incomplete
  const prioritizedHabits = incompleteHabits.slice(0, 4);

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  // Don't show anything if no habits or all completed
  if (habits.length === 0 || prioritizedHabits.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Compact Habit Cards Grid - 4 columns */}
      <div className="grid grid-cols-4 gap-2">
        {prioritizedHabits.map((habit) => {
          const habitMeta = HABIT_TYPES[habit.habit_type as keyof typeof HABIT_TYPES];
          const target = habit.daily_target || habitMeta?.defaultTarget || 1;
          const isAbstain = habit.streak_type === 'abstain';
          const progress = isAbstain
            ? (habit.todayValue === 0 && habit.lastEntry ? 100 : 0)
            : Math.min(100, (habit.todayValue / target) * 100);

          return (
            <button
              key={habit.habit_type}
              onClick={() => {
                if (isAbstain) {
                  handleLogHabit(habit.habit_type, 0);
                } else {
                  handleLogHabit(habit.habit_type, habit.todayValue + 1);
                }
              }}
              disabled={loggingHabit === habit.habit_type}
              className={cn(
                "relative flex flex-col items-center justify-center p-3 rounded-xl bg-card border border-border/50",
                "transition-all active:scale-95 hover:border-primary/30",
                loggingHabit === habit.habit_type && "opacity-50"
              )}
            >
              <span className="text-xl mb-1">{habitMeta?.icon || '📊'}</span>
              <span className="text-[10px] text-muted-foreground text-center line-clamp-1">
                {habitMeta?.label || habit.habit_type}
              </span>
              {/* Mini progress indicator */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-xl overflow-hidden">
                <div 
                  className="h-full bg-primary/60 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Manage habits link */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs text-muted-foreground h-7 px-2 gap-1"
          onClick={() => setIsModalOpen(true)}
        >
          <Sparkles className="w-3 h-3 text-primary" />
          Aggiungi habit
        </Button>

        {incompleteHabits.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7"
            onClick={() => navigate('/objectives?tab=daily')}
          >
            +{incompleteHabits.length - 4} altre
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>

      {/* AI Habit Creation Modal */}
      <HabitQuizModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onHabitCreated={() => {
          setIsModalOpen(false);
          toast.success('Nuova habit creata!');
        }}
      />
    </div>
  );
};

export default HabitTrackerSection;
