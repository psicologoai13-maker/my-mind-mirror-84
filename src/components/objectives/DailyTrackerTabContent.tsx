import React, { useState } from 'react';
import { useHabits, HABIT_TYPES, HABIT_CATEGORIES, HabitCategory } from '@/hooks/useHabits';
import HabitCard from '@/components/habits/HabitCard';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Sparkles, Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const DailyTrackerTabContent: React.FC = () => {
  const { habits, habitConfigs, isLoading, addHabit, removeHabit, logHabit } = useHabits();
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [loggingHabit, setLoggingHabit] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory | 'all'>('all');

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

  const handleToggleHabit = async (habitType: string) => {
    const isActive = activeHabitTypes.has(habitType);
    try {
      if (isActive) {
        await removeHabit.mutateAsync(habitType);
        toast.success('Habit rimossa');
      } else {
        await addHabit.mutateAsync(habitType);
        toast.success('Habit aggiunta');
      }
    } catch (error) {
      toast.error('Errore');
    }
  };

  const activeHabitTypes = new Set(habitConfigs?.map(c => c.habit_type) || []);

  // Calculate stats
  const completedToday = habits.filter(h => {
    const target = h.daily_target || HABIT_TYPES[h.habit_type as keyof typeof HABIT_TYPES]?.defaultTarget || 1;
    return h.streak_type === 'abstain' ? h.todayValue === 0 : h.todayValue >= target;
  }).length;

  // Filter habits for sheet by category
  const filteredHabits = Object.entries(HABIT_TYPES).filter(([key, meta]) => {
    if (selectedCategory === 'all') return true;
    return meta.category === selectedCategory;
  });

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
              {completedToday === habits.length ? '🎉' : '📊'}
            </div>
          </div>
        </div>
      )}

      {/* Habits Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Le Tue Habits</h2>
          <Sheet open={isManageOpen} onOpenChange={setIsManageOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full h-8">
                <Plus className="w-4 h-4 mr-1" />
                Aggiungi
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-[32px] bg-glass backdrop-blur-2xl border-t border-glass-border shadow-glass-elevated">
              <SheetHeader className="pb-2">
                <SheetTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Scegli le tue Habits
                </SheetTitle>
              </SheetHeader>
              
              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto py-3 -mx-2 px-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full flex-shrink-0 h-8 text-xs"
                  onClick={() => setSelectedCategory('all')}
                >
                  Tutte
                </Button>
                {Object.entries(HABIT_CATEGORIES).map(([key, { label, icon }]) => (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full flex-shrink-0 h-8 text-xs"
                    onClick={() => setSelectedCategory(key as HabitCategory)}
                  >
                    {icon} {label}
                  </Button>
                ))}
              </div>

              {/* Grid of habit boxes */}
              <div className="mt-2 grid grid-cols-3 gap-2 overflow-y-auto max-h-[calc(85vh-140px)] pb-8">
                {filteredHabits.map(([key, meta]) => {
                  const isActive = activeHabitTypes.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => handleToggleHabit(key)}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-3 rounded-2xl transition-all min-h-[80px]",
                        "bg-glass backdrop-blur-sm border",
                        isActive 
                          ? "border-primary bg-primary/10 shadow-glow" 
                          : "border-glass-border hover:border-muted-foreground/30 hover:bg-glass-hover"
                      )}
                    >
                      {isActive && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-soft">
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        </div>
                      )}
                      <span className="text-2xl mb-1">{meta.icon}</span>
                      <span className="text-[10px] font-medium text-center text-muted-foreground line-clamp-2">
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {habits.length === 0 ? (
          <div className="relative overflow-hidden p-8 rounded-3xl bg-glass backdrop-blur-xl border border-glass-border text-center shadow-soft">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">
              <span className="text-4xl mb-3 block">📊</span>
              <h3 className="font-semibold text-foreground mb-1">Nessuna habit attiva</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Aggiungi le abitudini che vuoi tracciare
              </p>
              <Button onClick={() => setIsManageOpen(true)} className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Habit
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {habits.map((habit) => (
              <HabitCard
                key={habit.habit_type}
                habit={habit}
                onLog={(value) => handleLogHabit(habit.habit_type, value)}
                isLogging={loggingHabit === habit.habit_type}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyTrackerTabContent;
