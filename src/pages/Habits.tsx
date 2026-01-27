import React, { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { useHabits, HABIT_TYPES } from '@/hooks/useHabits';
import HabitCard from '@/components/habits/HabitCard';
import WeightCard from '@/components/body/WeightCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trophy, TrendingUp } from 'lucide-react';
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

const Habits: React.FC = () => {
  const { habits, habitConfigs, isLoading, addHabit, removeHabit, logHabit } = useHabits();
  const { recentAchievements, totalUnlocked, totalAchievements } = useAchievements();
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [loggingHabit, setLoggingHabit] = useState<string | null>(null);

  const handleLogHabit = async (habitType: string, value: number) => {
    setLoggingHabit(habitType);
    try {
      await logHabit.mutateAsync({ habitType, value });
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
      } else {
        await removeHabit.mutateAsync(habitType);
      }
    } catch (error) {
      toast.error('Errore');
    }
  };

  const activeHabitTypes = new Set(habitConfigs?.map(c => c.habit_type) || []);

  // Calculate total streaks
  const totalStreakDays = habits.reduce((sum, h) => sum + h.streak, 0);
  const completedToday = habits.filter(h => {
    const target = h.daily_target || HABIT_TYPES[h.habit_type as keyof typeof HABIT_TYPES]?.defaultTarget || 1;
    return h.streak_type === 'abstain' ? h.todayValue === 0 : h.todayValue >= target;
  }).length;

  return (
    <MobileLayout>
      <div className="px-6 pt-8 pb-8">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Habits & Corpo
          </h1>
          <p className="text-sm text-muted-foreground">
            Traccia le tue abitudini e metriche fisiche
          </p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
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

        {/* Weight Card */}
        <div className="mb-6">
          <WeightCard />
        </div>

        {/* Habits Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Le Tue Habits</h2>
            <Sheet open={isManageOpen} onOpenChange={setIsManageOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Gestisci
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle>Gestisci Habits</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4 pb-8 overflow-y-auto">
                  {Object.entries(HABIT_TYPES).map(([key, meta]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
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

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-36 rounded-2xl" />
            </div>
          ) : habits.length === 0 ? (
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
            <div className="flex gap-3 overflow-x-auto pb-2">
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
    </MobileLayout>
  );
};

export default Habits;
