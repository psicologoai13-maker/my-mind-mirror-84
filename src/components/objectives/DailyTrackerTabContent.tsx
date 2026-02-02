import React, { useState } from 'react';
import { useHabits, HABIT_TYPES } from '@/hooks/useHabits';
import HabitCard from '@/components/habits/HabitCard';
import HabitQuizModal from '@/components/habits/HabitQuizModal';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, MoreVertical, Trash2, Settings2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const DailyTrackerTabContent: React.FC = () => {
  const { habits, isLoading, removeHabit, logHabit } = useHabits();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loggingHabit, setLoggingHabit] = useState<string | null>(null);

  const handleLogHabit = async (habitType: string, value: number) => {
    setLoggingHabit(habitType);
    try {
      await logHabit.mutateAsync({ habitType, value });
      
      // Check for streak milestones
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

  const handleRemoveHabit = async (habitType: string) => {
    try {
      await removeHabit.mutateAsync(habitType);
      toast.success('Habit rimossa');
    } catch (error) {
      toast.error('Errore nella rimozione');
    }
  };

  // Calculate stats
  const completedToday = habits.filter(h => {
    const target = h.daily_target || HABIT_TYPES[h.habit_type as keyof typeof HABIT_TYPES]?.defaultTarget || 1;
    return h.streak_type === 'abstain' ? h.todayValue === 0 && h.lastEntry : h.todayValue >= target;
  }).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats - Glass card */}
      {habits.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl p-4 bg-glass backdrop-blur-xl border border-primary/20 shadow-glass">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completate oggi</p>
              <p className="text-2xl font-bold text-foreground">
                {completedToday}/{habits.length}
              </p>
            </div>
            <div className="text-4xl">
              {completedToday === habits.length && habits.length > 0 ? '🎉' : '📊'}
            </div>
          </div>
        </div>
      )}

      {/* Habits Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Le Tue Habits</h2>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full h-9 gap-2 bg-glass backdrop-blur-sm border-glass-border hover:bg-glass-hover"
            onClick={() => setIsModalOpen(true)}
          >
            <Sparkles className="w-4 h-4 text-primary" />
            Aggiungi
          </Button>
        </div>

        {habits.length === 0 ? (
          <div className="relative overflow-hidden p-8 rounded-3xl bg-glass backdrop-blur-xl border border-glass-border text-center shadow-soft">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">
              <span className="text-4xl mb-3 block">🌟</span>
              <h3 className="font-semibold text-foreground mb-1">Nessuna habit attiva</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Parla con Aria per creare le tue abitudini personalizzate
              </p>
              <Button onClick={() => setIsModalOpen(true)} className="rounded-xl gap-2">
                <Sparkles className="w-4 h-4" />
                Crea con Aria
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {habits.map((habit) => {
              const habitMeta = HABIT_TYPES[habit.habit_type as keyof typeof HABIT_TYPES];
              
              return (
                <div key={habit.habit_type} className="relative group">
                  <HabitCard
                    habit={habit}
                    onLog={(value) => handleLogHabit(habit.habit_type, value)}
                    isLogging={loggingHabit === habit.habit_type}
                  />
                  
                  {/* Options menu overlay */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-glass backdrop-blur-sm border border-glass-border"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-glass backdrop-blur-xl border-glass-border">
                        <DropdownMenuItem className="gap-2">
                          <Settings2 className="w-4 h-4" />
                          Modifica target
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-2 text-destructive"
                          onClick={() => handleRemoveHabit(habit.habit_type)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Rimuovi
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
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

export default DailyTrackerTabContent;
