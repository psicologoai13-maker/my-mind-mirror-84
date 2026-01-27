import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Flame, Plus, Minus, Check } from 'lucide-react';
import { HabitWithStreak, HABIT_TYPES } from '@/hooks/useHabits';

interface HabitCardProps {
  habit: HabitWithStreak;
  onLog: (value: number) => void;
  isLogging?: boolean;
}

const HabitCard: React.FC<HabitCardProps> = ({ habit, onLog, isLogging }) => {
  const [inputValue, setInputValue] = useState<string>(habit.todayValue.toString());
  const [isEditing, setIsEditing] = useState(false);
  
  const habitMeta = HABIT_TYPES[habit.habit_type as keyof typeof HABIT_TYPES];
  const target = habit.daily_target || habitMeta?.defaultTarget || 1;
  const isAbstain = habit.streak_type === 'abstain';
  
  // Progress calculation
  const progress = isAbstain
    ? (habit.todayValue === 0 ? 100 : 0)
    : Math.min(100, (habit.todayValue / target) * 100);
  
  const isComplete = isAbstain ? habit.todayValue === 0 : habit.todayValue >= target;

  const handleQuickAdd = (delta: number) => {
    const newValue = Math.max(0, habit.todayValue + delta);
    onLog(newValue);
  };

  const handleSubmit = () => {
    const value = parseFloat(inputValue) || 0;
    onLog(value);
    setIsEditing(false);
  };

  return (
    <div className={cn(
      "p-4 rounded-2xl bg-card border border-border/50 shadow-sm transition-all",
      isComplete && "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{habitMeta?.icon || '📊'}</span>
          <div>
            <h3 className="font-medium text-foreground text-sm">
              {habitMeta?.label || habit.habit_type}
            </h3>
            {isAbstain && (
              <p className="text-xs text-muted-foreground">
                Obiettivo: 0 {habit.unit}
              </p>
            )}
          </div>
        </div>
        
        {/* Streak Badge */}
        {habit.streak > 0 && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            habit.streak >= 7 
              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" 
              : "bg-muted text-muted-foreground"
          )}>
            <Flame className={cn(
              "w-3 h-3",
              habit.streak >= 7 && "text-orange-500"
            )} />
            <span>{habit.streak}</span>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className={cn(
            "text-2xl font-bold",
            isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
          )}>
            {habit.todayValue}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              {habit.unit || habitMeta?.unit}
            </span>
          </span>
          {!isAbstain && (
            <span className="text-xs text-muted-foreground">
              / {target} {habit.unit || habitMeta?.unit}
            </span>
          )}
        </div>
        <Progress 
          value={progress} 
          className={cn(
            "h-2",
            isComplete && "[&>div]:bg-emerald-500"
          )}
        />
      </div>

      {/* Actions */}
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="h-9 text-center"
            autoFocus
          />
          <Button 
            size="sm" 
            onClick={handleSubmit}
            disabled={isLogging}
          >
            <Check className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {isAbstain ? (
            <>
              <Button
                variant={habit.todayValue === 0 ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => onLog(0)}
                disabled={isLogging}
              >
                {habit.todayValue === 0 ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Oggi OK!
                  </>
                ) : (
                  'Segna OK'
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-muted-foreground"
              >
                Registra
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => handleQuickAdd(-1)}
                disabled={isLogging || habit.todayValue <= 0}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                className="flex-1 h-9"
                onClick={() => setIsEditing(true)}
              >
                {habit.todayValue} {habit.unit || habitMeta?.unit}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => handleQuickAdd(1)}
                disabled={isLogging}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Completion indicator */}
      {isComplete && (
        <div className="mt-2 text-center">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Obiettivo raggiunto!
          </span>
        </div>
      )}
    </div>
  );
};

export default HabitCard;
