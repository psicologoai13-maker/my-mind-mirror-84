import React, { useState } from 'react';
import { useHabits, HABIT_TYPES, HABIT_CATEGORIES, HabitCategory } from '@/hooks/useHabits';
import HabitCard from '@/components/habits/HabitCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2, Sparkles } from 'lucide-react';
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

  const handleToggleHabit = async (habitType: string, isActive: boolean) => {
    try {
      if (isActive) {
        await addHabit.mutateAsync(habitType);
        toast.success('Habit aggiunta');
      } else {
        await removeHabit.mutateAsync(habitType);
        toast.success('Habit rimossa');
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
      {/* Quick Stats */}
      {habits.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/10">
          <div className="flex items-center justify-between">
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
            <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
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

              <div className="mt-2 space-y-2 overflow-y-auto max-h-[calc(85vh-140px)] pb-8">
                {filteredHabits.map(([key, meta]) => (
                  <div 
                    key={key} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl transition-colors",
                      activeHabitTypes.has(key) 
                        ? "bg-primary/10 border border-primary/20" 
                        : "bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{meta.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{meta.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {meta.streakType === 'abstain' ? 'Obiettivo: 0' : `Obiettivo: ${meta.defaultTarget}`} {meta.unit}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={activeHabitTypes.has(key)}
                      onCheckedChange={(checked) => handleToggleHabit(key, checked)}
                    />
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {habits.length === 0 ? (
          <div className="p-8 rounded-3xl bg-card border border-border/50 text-center">
            <span className="text-4xl mb-3 block">📊</span>
            <h3 className="font-semibold text-foreground mb-1">Nessuna habit attiva</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Aggiungi le abitudini che vuoi tracciare
            </p>
            <Button onClick={() => setIsManageOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Habit
            </Button>
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
