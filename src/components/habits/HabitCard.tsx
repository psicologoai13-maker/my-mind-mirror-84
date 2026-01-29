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
      "relative overflow-hidden p-4 rounded-3xl",
      "bg-glass backdrop-blur-xl border border-glass-border",
      "shadow-glass hover:shadow-glass-elevated",
      "transition-all duration-300 ease-out",
      "hover:-translate-y-0.5",
      isComplete && "border-emerald-300/50 dark:border-emerald-700/50"
    )}>
      {/* Gradient overlay for complete state */}
      {isComplete && (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/5 pointer-events-none" />
      )}
      
      {/* Inner light reflection */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{habitMeta?.icon || '📊'}</span>
            <div>
              <h3 className="font-semibold text-foreground text-sm">
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
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
              "bg-glass backdrop-blur-sm border border-glass-border",
              habit.streak >= 7 
                ? "text-orange-600 dark:text-orange-400" 
                : "text-muted-foreground"
            )}>
              <Flame className={cn(
                "w-3.5 h-3.5",
                habit.streak >= 7 && "text-orange-500 animate-pulse-soft"
              )} />
              <span>{habit.streak}</span>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className={cn(
              "text-3xl font-bold tracking-tight",
              isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
            )}>
              {habit.todayValue}
              <span className="text-sm font-medium text-muted-foreground ml-1">
                {habit.unit || habitMeta?.unit}
              </span>
            </span>
            {!isAbstain && (
              <span className="text-xs text-muted-foreground font-medium">
                / {target} {habit.unit || habitMeta?.unit}
              </span>
            )}
          </div>
          <Progress 
            value={progress} 
            className={cn(
              "h-2.5 rounded-full",
              isComplete && "[&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-emerald-400"
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
              className="h-10 text-center rounded-xl bg-card/50"
              autoFocus
            />
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={isLogging}
              className="h-10 rounded-xl"
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
                  className={cn(
                    "flex-1 h-10 rounded-xl font-medium",
                    habit.todayValue === 0 && "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  )}
                  onClick={() => onLog(0)}
                  disabled={isLogging}
                >
                  {habit.todayValue === 0 ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5" />
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
                  className="text-muted-foreground h-10 rounded-xl"
                >
                  Registra
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-card/50 border-glass-border"
                  onClick={() => handleQuickAdd(-1)}
                  disabled={isLogging || habit.todayValue <= 0}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 h-10 rounded-xl font-medium"
                  onClick={() => setIsEditing(true)}
                >
                  {habit.todayValue} {habit.unit || habitMeta?.unit}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-card/50 border-glass-border"
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
          <div className="mt-3 text-center">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              ✓ Completato oggi
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default HabitCard;
