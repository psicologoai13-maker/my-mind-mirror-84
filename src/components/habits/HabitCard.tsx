import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Flame, Plus, Minus, Check, Play, Pause, RotateCcw } from 'lucide-react';
import { HabitWithStreak, HABIT_TYPES, InputMethod } from '@/hooks/useHabits';

interface HabitCardProps {
  habit: HabitWithStreak;
  onLog: (value: number) => void;
  isLogging?: boolean;
}

// ============================================
// TOGGLE INPUT COMPONENT
// For yes/no habits (vitamine, diario, etc.)
// ============================================
const ToggleInput: React.FC<{
  habit: HabitWithStreak;
  habitMeta: typeof HABIT_TYPES[string];
  onLog: (value: number) => void;
  isLogging?: boolean;
}> = ({ habit, habitMeta, onLog, isLogging }) => {
  const isCompleted = habit.todayValue > 0;
  
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground flex-1">
        {habitMeta?.question || `${habitMeta?.label}?`}
      </span>
      <Switch
        checked={isCompleted}
        onCheckedChange={(checked) => onLog(checked ? 1 : 0)}
        disabled={isLogging}
        className="data-[state=checked]:bg-emerald-500"
      />
    </div>
  );
};

// ============================================
// NUMERIC INPUT COMPONENT
// For direct value entry (peso, ore sonno, etc.)
// ============================================
const NumericInput: React.FC<{
  habit: HabitWithStreak;
  habitMeta: typeof HABIT_TYPES[string];
  onLog: (value: number) => void;
  isLogging?: boolean;
}> = ({ habit, habitMeta, onLog, isLogging }) => {
  const [value, setValue] = useState<string>(habit.todayValue > 0 ? habit.todayValue.toString() : '');
  const [isEditing, setIsEditing] = useState(false);
  
  const step = habitMeta?.step || 1;
  const min = habitMeta?.min ?? 0;
  const max = habitMeta?.max ?? 999;
  
  const handleSubmit = () => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.max(min, Math.min(max, numValue));
    onLog(clampedValue);
    setIsEditing(false);
  };

  if (!isEditing && habit.todayValue > 0) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium transition-colors hover:bg-emerald-500/20"
      >
        <Check className="w-4 h-4" />
        {habit.todayValue} {habit.unit || habitMeta?.unit}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          step={step}
          min={min}
          max={max}
          className="h-10 text-center rounded-xl bg-card/50 pr-12"
          autoFocus={isEditing}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {habit.unit || habitMeta?.unit}
        </span>
      </div>
      <Button 
        size="sm" 
        onClick={handleSubmit}
        disabled={isLogging || !value}
        className="h-10 px-4 rounded-xl"
      >
        <Check className="w-4 h-4" />
      </Button>
    </div>
  );
};

// ============================================
// COUNTER INPUT COMPONENT
// For +/- with target (acqua, gratitudine, etc.)
// ============================================
const CounterInput: React.FC<{
  habit: HabitWithStreak;
  habitMeta: typeof HABIT_TYPES[string];
  onLog: (value: number) => void;
  isLogging?: boolean;
}> = ({ habit, habitMeta, onLog, isLogging }) => {
  const target = habit.daily_target || habitMeta?.defaultTarget || 1;
  const step = habitMeta?.step || 1;
  const isComplete = habit.todayValue >= target;
  
  const handleChange = (delta: number) => {
    const newValue = Math.max(0, habit.todayValue + delta);
    onLog(newValue);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-xl bg-card/50 border-glass-border"
        onClick={() => handleChange(-step)}
        disabled={isLogging || habit.todayValue <= 0}
      >
        <Minus className="w-4 h-4" />
      </Button>
      <div className={cn(
        "flex-1 h-10 flex items-center justify-center rounded-xl font-medium text-sm",
        isComplete 
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
          : "bg-card/50"
      )}>
        {habit.todayValue} / {target} {habit.unit || habitMeta?.unit}
      </div>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-xl bg-card/50 border-glass-border"
        onClick={() => handleChange(step)}
        disabled={isLogging}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
};

// ============================================
// ABSTAIN INPUT COMPONENT
// For "goal is 0" habits (sigarette, alcol, etc.)
// ============================================
const AbstainInput: React.FC<{
  habit: HabitWithStreak;
  habitMeta: typeof HABIT_TYPES[string];
  onLog: (value: number) => void;
  isLogging?: boolean;
}> = ({ habit, habitMeta, onLog, isLogging }) => {
  const [showSlip, setShowSlip] = useState(false);
  const [slipValue, setSlipValue] = useState('1');
  const isClean = habit.todayValue === 0 && habit.lastEntry !== null;
  
  if (showSlip) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={slipValue}
          onChange={(e) => setSlipValue(e.target.value)}
          min={1}
          className="h-10 text-center rounded-xl bg-card/50 flex-1"
          placeholder="Quante?"
        />
        <Button 
          size="sm"
          variant="destructive"
          onClick={() => {
            onLog(parseInt(slipValue) || 1);
            setShowSlip(false);
          }}
          disabled={isLogging}
          className="h-10 rounded-xl"
        >
          Registra
        </Button>
        <Button 
          size="sm"
          variant="ghost"
          onClick={() => setShowSlip(false)}
          className="h-10 rounded-xl"
        >
          ✕
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isClean ? "default" : "outline"}
        size="sm"
        className={cn(
          "flex-1 h-10 rounded-xl font-medium",
          isClean && "bg-gradient-to-r from-emerald-500 to-emerald-400"
        )}
        onClick={() => onLog(0)}
        disabled={isLogging}
      >
        {isClean ? (
          <>
            <Check className="w-4 h-4 mr-1.5" />
            Oggi OK! 🎉
          </>
        ) : (
          habitMeta?.question || 'Segna OK'
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowSlip(true)}
        className="text-muted-foreground h-10 rounded-xl text-xs"
      >
        Ho ceduto
      </Button>
    </div>
  );
};

// ============================================
// TIMER INPUT COMPONENT
// For timed activities (meditazione, esercizio, etc.)
// ============================================
const TimerInput: React.FC<{
  habit: HabitWithStreak;
  habitMeta: typeof HABIT_TYPES[string];
  onLog: (value: number) => void;
  isLogging?: boolean;
}> = ({ habit, habitMeta, onLog, isLogging }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(habit.todayValue * 60); // Convert to seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const target = habit.daily_target || habitMeta?.defaultTarget || 10;
  
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStop = () => {
    setIsRunning(false);
    const minutes = Math.round(elapsed / 60);
    if (minutes > 0) {
      onLog(minutes);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsed(0);
    onLog(0);
  };

  const progress = Math.min(100, (elapsed / 60 / target) * 100);
  const isComplete = elapsed / 60 >= target;

  if (habit.todayValue > 0 && !isRunning && elapsed === habit.todayValue * 60) {
    return (
      <div className="space-y-2">
        <div className={cn(
          "flex items-center justify-center gap-2 w-full py-2 rounded-xl font-medium",
          isComplete 
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-card/50"
        )}>
          {isComplete && <Check className="w-4 h-4" />}
          {habit.todayValue} / {target} min
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsRunning(true)}
          className="w-full h-8 rounded-xl text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Aggiungi altro
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-2xl font-mono font-bold",
          isComplete ? "text-emerald-500" : "text-foreground"
        )}>
          {formatTime(elapsed)}
        </span>
        <span className="text-xs text-muted-foreground">
          / {target} min
        </span>
      </div>
      <Progress value={progress} className="h-1.5" />
      <div className="flex items-center gap-2">
        {isRunning ? (
          <Button
            variant="default"
            size="sm"
            onClick={handleStop}
            disabled={isLogging}
            className="flex-1 h-10 rounded-xl bg-orange-500 hover:bg-orange-600"
          >
            <Pause className="w-4 h-4 mr-1.5" />
            Stop
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsRunning(true)}
            disabled={isLogging}
            className="flex-1 h-10 rounded-xl"
          >
            <Play className="w-4 h-4 mr-1.5" />
            Inizia
          </Button>
        )}
        {elapsed > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="h-10 w-10 rounded-xl"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

// ============================================
// AUTO SYNC INPUT COMPONENT (Fallback to numeric)
// For external data sources (passi, battito, etc.)
// ============================================
const AutoSyncInput: React.FC<{
  habit: HabitWithStreak;
  habitMeta: typeof HABIT_TYPES[string];
  onLog: (value: number) => void;
  isLogging?: boolean;
}> = ({ habit, habitMeta, onLog, isLogging }) => {
  // For Phase A (web), auto_sync falls back to numeric input
  // In Phase B (native), this will integrate with HealthKit/Google Fit
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-2 py-1.5">
        <span>📲</span>
        <span>Sync automatico disponibile con app nativa</span>
      </div>
      <NumericInput 
        habit={habit} 
        habitMeta={habitMeta} 
        onLog={onLog} 
        isLogging={isLogging} 
      />
    </div>
  );
};

// ============================================
// MAIN HABIT CARD COMPONENT
// ============================================
const HabitCard: React.FC<HabitCardProps> = ({ habit, onLog, isLogging }) => {
  const habitMeta = HABIT_TYPES[habit.habit_type as keyof typeof HABIT_TYPES];
  const inputMethod: InputMethod = habitMeta?.inputMethod || 'counter';
  const target = habit.daily_target || habitMeta?.defaultTarget || 1;
  const isAbstain = habit.streak_type === 'abstain';
  
  // Progress calculation
  const progress = isAbstain
    ? (habit.todayValue === 0 && habit.lastEntry ? 100 : 0)
    : Math.min(100, (habit.todayValue / target) * 100);
  
  const isComplete = isAbstain 
    ? (habit.todayValue === 0 && habit.lastEntry !== null) 
    : habit.todayValue >= target;

  // Render input based on inputMethod
  const renderInput = () => {
    switch (inputMethod) {
      case 'toggle':
        return <ToggleInput habit={habit} habitMeta={habitMeta} onLog={onLog} isLogging={isLogging} />;
      case 'numeric':
        return <NumericInput habit={habit} habitMeta={habitMeta} onLog={onLog} isLogging={isLogging} />;
      case 'counter':
        return <CounterInput habit={habit} habitMeta={habitMeta} onLog={onLog} isLogging={isLogging} />;
      case 'abstain':
        return <AbstainInput habit={habit} habitMeta={habitMeta} onLog={onLog} isLogging={isLogging} />;
      case 'timer':
        return <TimerInput habit={habit} habitMeta={habitMeta} onLog={onLog} isLogging={isLogging} />;
      case 'auto_sync':
        return <AutoSyncInput habit={habit} habitMeta={habitMeta} onLog={onLog} isLogging={isLogging} />;
      default:
        return <CounterInput habit={habit} habitMeta={habitMeta} onLog={onLog} isLogging={isLogging} />;
    }
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
              {inputMethod !== 'toggle' && inputMethod !== 'abstain' && (
                <p className="text-xs text-muted-foreground">
                  {habitMeta?.description?.slice(0, 30)}...
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

        {/* Progress bar for non-toggle/abstain */}
        {inputMethod !== 'toggle' && inputMethod !== 'abstain' && inputMethod !== 'timer' && (
          <div className="mb-3">
            <Progress 
              value={progress} 
              className={cn(
                "h-2 rounded-full",
                isComplete && "[&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-emerald-400"
              )}
            />
          </div>
        )}

        {/* Input Section */}
        <div className="mt-2">
          {renderInput()}
        </div>

        {/* Completion indicator for toggle */}
        {inputMethod === 'toggle' && isComplete && (
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
