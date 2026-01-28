import React, { useState } from 'react';
import { useHabits, HABIT_TYPES, HABIT_CATEGORIES, HabitCategory } from '@/hooks/useHabits';
import HabitCard from '@/components/habits/HabitCard';
import WeightCard from '@/components/body/WeightCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, TrendingUp, Trophy, Loader2, Settings } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { useAchievements } from '@/hooks/useAchievements';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const DailyTrackerTabContent: React.FC = () => {
  const { habits, habitConfigs, isLoading, addHabit, removeHabit, logHabit } = useHabits();
  const { recentAchievements, totalUnlocked } = useAchievements();
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
  const totalStreakDays = habits.reduce((sum, h) => sum + h.streak, 0);
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
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border/50 text-center">
          <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{totalStreakDays}</p>
          <p className="text-xs text-muted-foreground">Streak totali</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border/50 text-center">
          <span className="text-2xl mb-1 block">✓</span>
          <p className="text-2xl font-bold text-foreground">{completedToday}/{habits.length}</p>
          <p className="text-xs text-muted-foreground">Oggi</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border/50 text-center">
          <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{totalUnlocked}</p>
          <p className="text-xs text-muted-foreground">Badge</p>
        </div>
      </div>

      {/* Weight Tracker */}
      <WeightCard />

      {/* Habits Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Le Tue Habits</h2>
          <Sheet open={isManageOpen} onOpenChange={setIsManageOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full">
                <Settings className="w-4 h-4 mr-1" />
                Gestisci
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>Gestisci Habits</SheetTitle>
              </SheetHeader>
              
              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto py-3 -mx-2 px-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full flex-shrink-0"
                  onClick={() => setSelectedCategory('all')}
                >
                  Tutte
                </Button>
                {Object.entries(HABIT_CATEGORIES).map(([key, { label, icon }]) => (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full flex-shrink-0"
                    onClick={() => setSelectedCategory(key as HabitCategory)}
                  >
                    {icon} {label}
                  </Button>
                ))}
              </div>

              <div className="mt-2 space-y-3 overflow-y-auto max-h-[calc(85vh-160px)] pb-8">
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
                        <p className="font-medium">{meta.label}</p>
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

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Badge Recenti</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {recentAchievements.map((achievement, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-20 p-3 rounded-2xl bg-card border border-border/50 text-center"
              >
                <span className="text-3xl block mb-1">{achievement.icon}</span>
                <p className="text-xs font-medium text-foreground truncate">
                  {achievement.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyTrackerTabContent;
