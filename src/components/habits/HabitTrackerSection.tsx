import React, { useState } from 'react';
import { useHabits, HABIT_TYPES, HABIT_CATEGORIES, HabitCategory } from '@/hooks/useHabits';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Check, Sparkles, ChevronRight } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const HabitTrackerSection: React.FC = () => {
  const navigate = useNavigate();
  const { habits, habitConfigs, isLoading, addHabit, removeHabit, logHabit } = useHabits();
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [loggingHabit, setLoggingHabit] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory | 'all'>('all');

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

  // Filter out completed habits - only show incomplete ones
  const incompleteHabits = habits.filter(habit => {
    const habitMeta = HABIT_TYPES[habit.habit_type as keyof typeof HABIT_TYPES];
    const target = habit.daily_target || habitMeta?.defaultTarget || 1;
    const isAbstain = habit.streak_type === 'abstain';
    const isComplete = isAbstain ? habit.todayValue === 0 : habit.todayValue >= target;
    return !isComplete;
  });

  // Filter habits for sheet by category
  const filteredHabits = Object.entries(HABIT_TYPES).filter(([key, meta]) => {
    if (selectedCategory === 'all') return true;
    return meta.category === selectedCategory;
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
            ? (habit.todayValue === 0 ? 100 : 0)
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
        <Sheet open={isManageOpen} onOpenChange={setIsManageOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-muted-foreground h-7 px-2"
            >
              <Plus className="w-3 h-3 mr-1" />
              Gestisci habits
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
    </div>
  );
};

export default HabitTrackerSection;
