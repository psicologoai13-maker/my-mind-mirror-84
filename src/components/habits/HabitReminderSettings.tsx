import React, { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, Clock, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HabitWithStreak, HABIT_TYPES, getHabitMeta } from '@/hooks/useHabits';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface HabitReminderSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habits: HabitWithStreak[];
}

interface ReminderState {
  enabled: boolean;
  time: string;
}

const HabitReminderSettings: React.FC<HabitReminderSettingsProps> = ({ 
  open, 
  onOpenChange, 
  habits 
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize state from habits
  const [reminders, setReminders] = useState<Record<string, ReminderState>>(() => {
    const initial: Record<string, ReminderState> = {};
    habits.forEach(habit => {
      initial[habit.habit_type] = {
        enabled: habit.reminder_enabled ?? false,
        time: habit.reminder_time?.substring(0, 5) ?? '09:00'
      };
    });
    return initial;
  });

  // Update state when habits change
  React.useEffect(() => {
    const updated: Record<string, ReminderState> = {};
    habits.forEach(habit => {
      updated[habit.habit_type] = {
        enabled: reminders[habit.habit_type]?.enabled ?? habit.reminder_enabled ?? false,
        time: reminders[habit.habit_type]?.time ?? habit.reminder_time?.substring(0, 5) ?? '09:00'
      };
    });
    setReminders(updated);
  }, [habits]);

  const handleToggle = (habitType: string, enabled: boolean) => {
    setReminders(prev => ({
      ...prev,
      [habitType]: { ...prev[habitType], enabled }
    }));
  };

  const handleTimeChange = (habitType: string, time: string) => {
    setReminders(prev => ({
      ...prev,
      [habitType]: { ...prev[habitType], time }
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      // Update all habits with reminder settings
      const updates = Object.entries(reminders).map(([habitType, settings]) => {
        return supabase
          .from('user_habits_config')
          .update({
            reminder_enabled: settings.enabled,
            reminder_time: settings.time + ':00'
          })
          .eq('user_id', user.id)
          .eq('habit_type', habitType);
      });

      await Promise.all(updates);
      
      queryClient.invalidateQueries({ queryKey: ['habit-configs', user.id] });
      toast.success('Reminder salvati!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving reminders:', error);
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter habits that are "remindable" (toggle-based habits like vitamins, medication)
  const remindableHabits = habits.filter(habit => {
    const meta = getHabitMeta(habit.habit_type) || HABIT_TYPES[habit.habit_type as keyof typeof HABIT_TYPES];
    // Habits that make sense with reminders: toggle-based, medication, vitamins, etc.
    return meta && (
      meta.inputMethod === 'toggle' || 
      meta.category === 'health' ||
      habit.habit_type === 'vitamins' ||
      habit.habit_type === 'medication' ||
      habit.habit_type === 'meditation' ||
      habit.habit_type === 'journaling'
    );
  });

  const enabledCount = Object.values(reminders).filter(r => r.enabled).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-display flex items-center justify-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Reminder Abitudini
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3 pb-6 max-h-[50vh] overflow-y-auto">
          <p className="text-sm text-muted-foreground text-center mb-4">
            Attiva le notifiche per ricordarti di completare le tue abitudini
          </p>

          {remindableHabits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nessuna abitudine configurabile</p>
              <p className="text-xs mt-1">Aggiungi habits come vitamine o farmaci</p>
            </div>
          ) : (
            remindableHabits.map((habit) => {
              const meta = getHabitMeta(habit.habit_type) || HABIT_TYPES[habit.habit_type as keyof typeof HABIT_TYPES];
              const reminderState = reminders[habit.habit_type] || { enabled: false, time: '09:00' };

              return (
                <div 
                  key={habit.habit_type}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl transition-all",
                    reminderState.enabled 
                      ? "bg-primary/5 border border-primary/20" 
                      : "bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                      reminderState.enabled ? "bg-primary/10" : "bg-muted"
                    )}>
                      {meta?.icon || '📌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">
                        {meta?.label || habit.habit_type}
                      </p>
                      {reminderState.enabled && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <input
                            type="time"
                            value={reminderState.time}
                            onChange={(e) => handleTimeChange(habit.habit_type, e.target.value)}
                            className="text-xs text-muted-foreground bg-transparent border-none p-0 w-[70px] focus:outline-none focus:ring-0"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={reminderState.enabled}
                    onCheckedChange={(checked) => handleToggle(habit.habit_type, checked)}
                  />
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-3 pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            {enabledCount > 0 
              ? `${enabledCount} reminder attivi`
              : 'Nessun reminder attivo'
            }
          </p>
          <p className="text-xs text-muted-foreground text-center">
            💡 Le notifiche push saranno disponibili nella prossima versione PWA
          </p>
          
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-xl"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvataggio...' : 'Salva Impostazioni'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HabitReminderSettings;
