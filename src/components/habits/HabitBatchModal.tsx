import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HabitWithStreak, HABIT_TYPES, getHabitMeta } from '@/hooks/useHabits';
import { cn } from '@/lib/utils';
import { Check, Minus, Plus, Save, Loader2 } from 'lucide-react';

interface HabitBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  habits: HabitWithStreak[];
  onSaveAll: (updates: { habitType: string; value: number }[]) => Promise<void>;
}

interface HabitUpdate {
  habitType: string;
  value: number;
  originalValue: number;
}

const HabitBatchModal: React.FC<HabitBatchModalProps> = ({
  isOpen,
  onClose,
  habits,
  onSaveAll,
}) => {
  const [updates, setUpdates] = useState<Record<string, HabitUpdate>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize updates from current habits
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, HabitUpdate> = {};
      habits.forEach(h => {
        initial[h.habit_type] = {
          habitType: h.habit_type,
          value: h.todayValue,
          originalValue: h.todayValue,
        };
      });
      setUpdates(initial);
    }
  }, [isOpen, habits]);
  
  const updateValue = (habitType: string, newValue: number) => {
    setUpdates(prev => ({
      ...prev,
      [habitType]: {
        ...prev[habitType],
        value: Math.max(0, newValue),
      },
    }));
  };
  
  const hasChanges = Object.values(updates).some(u => u.value !== u.originalValue);
  const changedCount = Object.values(updates).filter(u => u.value !== u.originalValue).length;
  
  const handleSave = async () => {
    const changedUpdates = Object.values(updates)
      .filter(u => u.value !== u.originalValue)
      .map(u => ({ habitType: u.habitType, value: u.value }));
    
    if (changedUpdates.length === 0) {
      onClose();
      return;
    }
    
    setIsSaving(true);
    try {
      await onSaveAll(changedUpdates);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };
  
  const renderInput = (habit: HabitWithStreak) => {
    const habitMeta = getHabitMeta(habit.habit_type) || HABIT_TYPES[habit.habit_type as keyof typeof HABIT_TYPES];
    const update = updates[habit.habit_type];
    if (!update) return null;
    
    const isAbstain = habit.streak_type === 'abstain';
    const target = habit.daily_target || habitMeta?.defaultTarget || 1;
    const inputMethod = habitMeta?.inputMethod || 'counter';
    
    // Toggle for simple yes/no
    if (inputMethod === 'toggle') {
      return (
        <Switch
          checked={update.value > 0}
          onCheckedChange={(checked) => updateValue(habit.habit_type, checked ? 1 : 0)}
          className="data-[state=checked]:bg-emerald-500"
        />
      );
    }
    
    // Abstain habits
    if (isAbstain) {
      return (
        <div className="flex items-center gap-2">
          <Button
            variant={update.value === 0 ? "default" : "outline"}
            size="sm"
            onClick={() => updateValue(habit.habit_type, 0)}
            className={cn(
              "h-8 rounded-lg text-xs",
              update.value === 0 && "bg-emerald-500 hover:bg-emerald-600"
            )}
          >
            OK ✓
          </Button>
          <Button
            variant={update.value > 0 ? "destructive" : "outline"}
            size="sm"
            onClick={() => updateValue(habit.habit_type, update.value > 0 ? update.value : 1)}
            className="h-8 rounded-lg text-xs"
          >
            Ceduto
          </Button>
          {update.value > 0 && (
            <Input
              type="number"
              value={update.value}
              onChange={(e) => updateValue(habit.habit_type, parseInt(e.target.value) || 1)}
              className="w-16 h-8 text-center text-xs"
              min={1}
            />
          )}
        </div>
      );
    }
    
    // Counter for +/- habits
    if (inputMethod === 'counter') {
      return (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => updateValue(habit.habit_type, update.value - 1)}
            disabled={update.value <= 0}
          >
            <Minus className="w-3.5 h-3.5" />
          </Button>
          <div className={cn(
            "min-w-[60px] h-8 flex items-center justify-center rounded-lg text-sm font-medium",
            update.value >= target 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-muted"
          )}>
            {update.value}/{target}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => updateValue(habit.habit_type, update.value + 1)}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      );
    }
    
    // Numeric input
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={update.value || ''}
          onChange={(e) => updateValue(habit.habit_type, parseFloat(e.target.value) || 0)}
          className="w-20 h-8 text-center text-sm"
          step={habitMeta?.step || 1}
          min={habitMeta?.min ?? 0}
          max={habitMeta?.max}
        />
        <span className="text-xs text-muted-foreground">
          {habit.unit || habitMeta?.unit}
        </span>
      </div>
    );
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            Aggiorna Habits
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100%-140px)] -mx-6 px-6">
          <div className="space-y-2">
            {habits.map((habit) => {
              const habitMeta = getHabitMeta(habit.habit_type) || HABIT_TYPES[habit.habit_type as keyof typeof HABIT_TYPES];
              const update = updates[habit.habit_type];
              const isChanged = update && update.value !== update.originalValue;
              
              return (
                <div
                  key={habit.habit_type}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl",
                    "bg-card/50 border border-transparent transition-all",
                    isChanged && "border-primary/30 bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xl">{habitMeta?.icon || '📌'}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {habitMeta?.label || habit.habit_type}
                      </p>
                      {habitMeta?.question && (
                        <p className="text-xs text-muted-foreground truncate">
                          {habitMeta.question}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="shrink-0">
                    {renderInput(habit)}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        {/* Fixed footer with save button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 rounded-xl text-base font-medium gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {hasChanges ? `Salva ${changedCount} modifiche` : 'Chiudi'}
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HabitBatchModal;
