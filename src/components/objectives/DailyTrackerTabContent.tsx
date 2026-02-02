import React, { useState } from 'react';
import { useHabits, HABIT_TYPES } from '@/hooks/useHabits';
import CompactHabitGrid from '@/components/habits/CompactHabitGrid';
import HabitBatchModal from '@/components/habits/HabitBatchModal';
import HabitQuizModal from '@/components/habits/HabitQuizModal';
import HabitReminderSettings from '@/components/habits/HabitReminderSettings';
import { Button } from '@/components/ui/button';
import { Sparkles, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const DailyTrackerTabContent: React.FC = () => {
  const { habits, isLoading, logHabit } = useHabits();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);

  // Batch save handler
  const handleBatchSave = async (updates: { habitType: string; value: number }[]) => {
    const promises = updates.map(({ habitType, value }) =>
      logHabit.mutateAsync({ habitType, value })
    );
    
    try {
      await Promise.all(promises);
      toast.success(`✅ ${updates.length} habits aggiornate!`);
    } catch (error) {
      toast.error('Errore nel salvare alcune habits');
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
          <div className="flex items-center gap-2">
            {habits.length > 0 && (
              <Button 
                variant="outline" 
                size="icon"
                className="rounded-full h-9 w-9 bg-glass backdrop-blur-sm border-glass-border hover:bg-glass-hover"
                onClick={() => setIsReminderOpen(true)}
              >
                <Bell className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
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
          <CompactHabitGrid 
            habits={habits} 
            onOpenBatchModal={() => setIsBatchModalOpen(true)} 
          />
        )}
      </div>

      {/* Batch Update Modal */}
      <HabitBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        habits={habits}
        onSaveAll={handleBatchSave}
      />

      {/* AI Habit Creation Modal */}
      <HabitQuizModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onHabitCreated={() => {
          setIsModalOpen(false);
          toast.success('Nuova habit creata!');
        }}
      />

      {/* Reminder Settings */}
      <HabitReminderSettings
        open={isReminderOpen}
        onOpenChange={setIsReminderOpen}
        habits={habits}
      />
    </div>
  );
};

export default DailyTrackerTabContent;
