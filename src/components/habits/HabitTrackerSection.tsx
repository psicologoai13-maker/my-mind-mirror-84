import React, { useState } from 'react';
import { useHabits, HABIT_TYPES } from '@/hooks/useHabits';
import HabitCard from './HabitCard';
import { Button } from '@/components/ui/button';
import { Plus, Settings, ChevronRight } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const HabitTrackerSection: React.FC = () => {
  const navigate = useNavigate();
  const { habits, habitConfigs, isLoading, addHabit, removeHabit, logHabit } = useHabits();
  const [isManageOpen, setIsManageOpen] = useState(false);
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

  // Get active habit types
  const activeHabitTypes = new Set(habitConfigs?.map(c => c.habit_type) || []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Show empty state if no habits configured
  if (habits.length === 0) {
    return (
      <div className="p-6 rounded-3xl bg-card border border-border/50 text-center">
        <span className="text-4xl mb-3 block">📊</span>
        <h3 className="font-semibold text-foreground mb-1">Traccia le tue abitudini</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Monitora acqua, esercizio, meditazione e altro
        </p>
        <Sheet open={isManageOpen} onOpenChange={setIsManageOpen}>
          <SheetTrigger asChild>
            <Button variant="default" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Habit
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>Gestisci Habits</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(80vh-100px)] pb-8">
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
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Le Tue Habits</h2>
        <div className="flex items-center gap-2">
          <Sheet open={isManageOpen} onOpenChange={setIsManageOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>Gestisci Habits</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(80vh-100px)] pb-8">
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
      </div>

      {/* Habit Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {habits.slice(0, 4).map((habit) => (
          <HabitCard
            key={habit.habit_type}
            habit={habit}
            onLog={(value) => handleLogHabit(habit.habit_type, value)}
            isLogging={loggingHabit === habit.habit_type}
          />
        ))}
      </div>

      {/* See All Button */}
      {habits.length > 4 && (
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => navigate('/habits')}
        >
          Vedi tutte ({habits.length})
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
};

export default HabitTrackerSection;
