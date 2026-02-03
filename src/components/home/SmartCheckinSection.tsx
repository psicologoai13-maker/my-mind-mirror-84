import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Sparkles, Plus, Minus, Play, Pause, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { usePersonalizedCheckins, CheckinItem, responseTypeConfig } from '@/hooks/usePersonalizedCheckins';
import { useCheckins } from '@/hooks/useCheckins';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useDailyLifeAreas } from '@/hooks/useDailyLifeAreas';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCheckinTimer } from '@/hooks/useCheckinTimer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getHabitMeta, RangeOption } from '@/hooks/useHabits';

// Get current date in Rome timezone
function getRomeDateString(): string {
  const now = new Date();
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

const moodEmojis = ['😔', '😕', '😐', '🙂', '😊'];

interface SmartCheckinSectionProps {
  onStartCheckin?: () => void;
}

const SmartCheckinSection: React.FC<SmartCheckinSectionProps> = ({ onStartCheckin }) => {
  const queryClient = useQueryClient();
  const { dailyCheckins, completedToday, completedCount, refetchTodayData, isLoading, aiGenerated, allCompleted } = usePersonalizedCheckins();
  const { saveCheckin, todayCheckin } = useCheckins();
  const { invalidateMetrics } = useDailyMetrics();
  const { invalidateLifeAreas } = useDailyLifeAreas();
  const { profile } = useProfile();
  const { startCheckinTimer } = useCheckinTimer();
  const today = getRomeDateString();
  
  const [activeItem, setActiveItem] = useState<CheckinItem | null>(null);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [numericValue, setNumericValue] = useState<string>('');
  const [counterValue, setCounterValue] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locallyCompleted, setLocallyCompleted] = useState<Record<string, number>>({});

  const allCompleted_ = { ...completedToday, ...locallyCompleted };

  const handleItemClick = (item: CheckinItem) => {
    // Filter out habits and objectives - these are now managed by Aria only
    if (item.type === 'habit' || item.type === 'objective') {
      // Habits and objectives are managed via Aria conversations
      return;
    }
    
    // Allow repeatable items to be clicked even if already answered
    if (!item.repeatable && item.key in allCompleted_) return;
    
    startCheckinTimer();
    onStartCheckin?.();
    
    if (activeItem?.key === item.key) {
      setActiveItem(null);
      resetInputState();
    } else {
      setActiveItem(item);
      resetInputState();
      // Initialize counter with 0 or existing value
      if (item.responseType === 'counter') {
        setCounterValue(0);
      }
    }
  };

  const resetInputState = () => {
    setSelectedValue(null);
    setNumericValue('');
    setCounterValue(0);
    setTimerRunning(false);
    setTimerSeconds(0);
  };

  // ============================================
  // SAVE HANDLERS FOR DIFFERENT INPUT TYPES
  // ============================================

  const saveHabitValue = async (habitType: string, value: number) => {
    const { error } = await supabase
      .from('daily_habits')
      .upsert({
        user_id: profile?.user_id,
        date: today,
        habit_type: habitType,
        value: value,
        target_value: activeItem?.target,
        unit: activeItem?.unit,
      }, { onConflict: 'user_id,date,habit_type' });
    
    if (error) throw error;
  };

  const saveObjectiveValue = async (objectiveId: string, value: number, isRepeatable?: boolean) => {
    if (isRepeatable) {
      // For repeatable objectives (spending, savings), ADD to current value
      const { data: currentObj, error: fetchError } = await supabase
        .from('user_objectives')
        .select('current_value, progress_history')
        .eq('id', objectiveId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const currentValue = currentObj?.current_value ?? 0;
      const newValue = currentValue + value;
      
      // Add to progress history
      const history = Array.isArray(currentObj?.progress_history) ? currentObj.progress_history : [];
      const newHistory = [...history, { 
        date: new Date().toISOString(), 
        value: value, // Log the increment, not total
        note: `+${value}` 
      }];
      
      const { error } = await supabase
        .from('user_objectives')
        .update({ 
          current_value: newValue,
          progress_history: newHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', objectiveId);
      
      if (error) throw error;
    } else {
      // For non-repeatable objectives, SET the value directly
      const { error } = await supabase
        .from('user_objectives')
        .update({ 
          current_value: value,
          updated_at: new Date().toISOString()
        })
        .eq('id', objectiveId);
      
      if (error) throw error;
    }
  };

  // Handle 5-option selections (emoji, yesno, intensity, slider)
  const handleSelectValue = async (value: number) => {
    if (!activeItem || isSubmitting) return;
    
    setSelectedValue(value);
    setIsSubmitting(true);
    
    const scaledValue = value + 1;
    const scaledTo10 = scaledValue * 2;

    try {
      if (activeItem.type === 'life_area') {
        const { error } = await supabase
          .from('daily_life_areas')
          .upsert({
            user_id: profile?.user_id,
            date: today,
            [activeItem.key]: scaledTo10,
            source: 'checkin'
          }, { onConflict: 'user_id,date,source' });
        
        if (error) throw error;
        invalidateLifeAreas();
        
      } else if (activeItem.type === 'psychology') {
        const { error } = await supabase
          .from('daily_psychology')
          .upsert({
            user_id: profile?.user_id,
            date: today,
            [activeItem.key]: scaledTo10,
            source: 'checkin'
          }, { onConflict: 'user_id,date,source' });
        
        if (error) throw error;
        
      } else if (activeItem.type === 'emotion') {
        const { error } = await supabase
          .from('daily_emotions')
          .upsert({
            user_id: profile?.user_id,
            date: today,
            [activeItem.key]: scaledTo10,
            source: 'checkin'
          }, { onConflict: 'user_id,date,source' });
        
        if (error) throw error;
        
      } else {
        // Standard vital - save to daily_checkins
        let existingNotes: Record<string, number> = {};
        if (todayCheckin?.notes) {
          try {
            existingNotes = JSON.parse(todayCheckin.notes);
          } catch (e) {}
        }
        
        if (activeItem.key === 'mood') {
          await saveCheckin.mutateAsync({
            mood_value: scaledValue,
            mood_emoji: moodEmojis[value],
            notes: Object.keys(existingNotes).length > 0 ? JSON.stringify(existingNotes) : undefined,
          });
        } else {
          const updatedNotes = {
            ...existingNotes,
            [activeItem.key]: scaledTo10,
          };
          
          await saveCheckin.mutateAsync({
            mood_value: todayCheckin?.mood_value ?? 3,
            mood_emoji: todayCheckin?.mood_emoji ?? '😐',
            notes: JSON.stringify(updatedNotes),
          });
        }
      }

      completeCheckin(activeItem.key, scaledValue);
      
    } catch (error) {
      console.error('Error saving check-in:', error);
      toast.error('Errore nel salvataggio');
      setIsSubmitting(false);
    }
  };

  // Handle TOGGLE input (Yes/No switch)
  const handleToggleSubmit = async (value: boolean) => {
    if (!activeItem || isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (activeItem.type === 'habit' && activeItem.habitType) {
        await saveHabitValue(activeItem.habitType, value ? 1 : 0);
      } else if (activeItem.type === 'objective' && activeItem.objectiveId) {
        await saveObjectiveValue(activeItem.objectiveId, value ? 1 : 0);
      }

      completeCheckin(activeItem.key, value ? 1 : 0);
      toast.success(value ? '✓ Completato!' : 'Registrato');
      
    } catch (error) {
      console.error('Error saving toggle:', error);
      toast.error('Errore nel salvataggio');
      setIsSubmitting(false);
    }
  };

  // Handle ABSTAIN input (Today OK / Gave In)
  const handleAbstainSubmit = async (succeeded: boolean) => {
    if (!activeItem || isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (activeItem.type === 'habit' && activeItem.habitType) {
        // 0 = succeeded (didn't do bad habit), 1 = failed (did the bad habit)
        await saveHabitValue(activeItem.habitType, succeeded ? 0 : 1);
      }

      completeCheckin(activeItem.key, succeeded ? 0 : 1);
      toast.success(succeeded ? '🎉 Ottimo lavoro!' : 'Nessun problema, riprova domani!');
      
    } catch (error) {
      console.error('Error saving abstain:', error);
      toast.error('Errore nel salvataggio');
      setIsSubmitting(false);
    }
  };

  // Handle COUNTER input (+/- buttons)
  const handleCounterSubmit = async () => {
    if (!activeItem || isSubmitting || counterValue < 0) return;
    setIsSubmitting(true);

    try {
      if (activeItem.type === 'habit' && activeItem.habitType) {
        await saveHabitValue(activeItem.habitType, counterValue);
      } else if (activeItem.type === 'objective' && activeItem.objectiveId) {
        await saveObjectiveValue(activeItem.objectiveId, counterValue, activeItem.repeatable);
      }

      // For repeatable items, don't mark as completed - just close the input
      if (activeItem.repeatable) {
        queryClient.invalidateQueries({ queryKey: ['objectives'] });
        queryClient.invalidateQueries({ queryKey: ['user-objectives'] });
        setActiveItem(null);
        resetInputState();
        setIsSubmitting(false);
        toast.success(`+${counterValue} ${activeItem.unit || ''} registrato!`);
      } else {
        completeCheckin(activeItem.key, counterValue);
        toast.success(`${activeItem.label}: ${counterValue} ${activeItem.unit || ''}`);
      }
      
    } catch (error) {
      console.error('Error saving counter:', error);
      toast.error('Errore nel salvataggio');
      setIsSubmitting(false);
    }
  };

  // Handle RANGE input (preset options like cigarettes)
  const handleRangeSubmit = async (value: number, optionLabel: string) => {
    if (!activeItem || isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (activeItem.type === 'habit' && activeItem.habitType) {
        await saveHabitValue(activeItem.habitType, value);
      }

      completeCheckin(activeItem.key, value);
      toast.success(value === 0 ? '🎉 Ottimo lavoro!' : `${activeItem.label}: ${optionLabel}`);
      
    } catch (error) {
      console.error('Error saving range:', error);
      toast.error('Errore nel salvataggio');
      setIsSubmitting(false);
    }
  };

  // Handle NUMERIC input
  const handleNumericSubmit = async () => {
    if (!activeItem || isSubmitting || !numericValue) return;
    
    const numValue = parseFloat(numericValue);
    if (isNaN(numValue) || numValue < 0) {
      toast.error('Inserisci un valore valido');
      return;
    }
    
    setIsSubmitting(true);

    try {
      if (activeItem.type === 'habit' && activeItem.habitType) {
        await saveHabitValue(activeItem.habitType, numValue);
      } else if (activeItem.type === 'objective' && activeItem.objectiveId) {
        await saveObjectiveValue(activeItem.objectiveId, numValue, activeItem.repeatable);
        queryClient.invalidateQueries({ queryKey: ['objectives'] });
        queryClient.invalidateQueries({ queryKey: ['user-objectives'] });
      }

      // For repeatable items, don't mark as completed - just close the input
      if (activeItem.repeatable) {
        setActiveItem(null);
        resetInputState();
        setIsSubmitting(false);
        toast.success(`+${numValue}${activeItem.unit || ''} registrato!`);
      } else {
        completeCheckin(activeItem.key, numValue);
        toast.success(`${activeItem.label}: ${numValue} ${activeItem.unit || ''}`);
      }
      
    } catch (error) {
      console.error('Error saving numeric:', error);
      toast.error('Errore nel salvataggio');
      setIsSubmitting(false);
    }
  };

  // Handle TIMER input (for now, save minutes)
  const handleTimerSubmit = async () => {
    if (!activeItem || isSubmitting) return;
    
    const minutes = Math.round(timerSeconds / 60);
    if (minutes === 0) {
      toast.error('Avvia il timer prima di salvare');
      return;
    }
    
    setIsSubmitting(true);
    setTimerRunning(false);

    try {
      if (activeItem.type === 'habit' && activeItem.habitType) {
        await saveHabitValue(activeItem.habitType, minutes);
      }

      completeCheckin(activeItem.key, minutes);
      toast.success(`${activeItem.label}: ${minutes} min`);
      
    } catch (error) {
      console.error('Error saving timer:', error);
      toast.error('Errore nel salvataggio');
      setIsSubmitting(false);
    }
  };

  // Common completion logic
  const completeCheckin = (key: string, value: number) => {
    setLocallyCompleted(prev => ({ ...prev, [key]: value }));
    invalidateMetrics();
    queryClient.invalidateQueries({ queryKey: ['today-all-sources'] });
    refetchTodayData();
    setActiveItem(null);
    resetInputState();
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setActiveItem(null);
    resetInputState();
    setTimerRunning(false);
  };

  const getResponseOptions = (item: CheckinItem) => {
    return responseTypeConfig[item.responseType]?.options || [];
  };

  // Timer effect
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Repeatable items stay visible even if they've been answered today
  const visibleCheckins = dailyCheckins.filter(item => 
    item.repeatable || !(item.key in allCompleted_)
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Sparkles className="w-4 h-4 text-primary/50" />
          <span className="text-xs font-medium text-muted-foreground/50">Check-in</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="h-20 rounded-xl bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // All completed - return null
  if (visibleCheckins.length === 0 && (completedCount > 0 || allCompleted)) {
    return null;
  }

  if (visibleCheckins.length === 0) {
    return null;
  }

  // ============================================
  // RENDER INPUT BASED ON RESPONSE TYPE
  // ============================================
  const renderActiveInput = () => {
    if (!activeItem) return null;

    const responseType = activeItem.responseType;

    // TOGGLE - Yes/No Switch
    if (responseType === 'toggle') {
      return (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground text-center">{activeItem.question}</p>
          <div className="flex items-center gap-6">
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleToggleSubmit(false)}
              disabled={isSubmitting}
              className="h-14 px-8 rounded-2xl border-2 hover:border-muted-foreground/50"
            >
              <XCircle className="w-5 h-5 mr-2 text-muted-foreground" />
              No
            </Button>
            <Button
              size="lg"
              onClick={() => handleToggleSubmit(true)}
              disabled={isSubmitting}
              className="h-14 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Sì
            </Button>
          </div>
        </div>
      );
    }

    // ABSTAIN - "Today OK" / "Gave In"
    if (responseType === 'abstain') {
      return (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground text-center">{activeItem.question}</p>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleAbstainSubmit(false)}
              disabled={isSubmitting}
              className="h-14 px-6 rounded-2xl border-2 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/50"
            >
              <XCircle className="w-5 h-5 mr-2 text-red-500" />
              Ho ceduto
            </Button>
            <Button
              size="lg"
              onClick={() => handleAbstainSubmit(true)}
              disabled={isSubmitting}
              className="h-14 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Oggi OK!
            </Button>
          </div>
        </div>
      );
    }

    // RANGE - Preset options (cigarettes: 0, 1-5, 6-10...)
    if (responseType === 'range') {
      const habitMeta = activeItem.habitType ? getHabitMeta(activeItem.habitType) : null;
      const rangeOptions: RangeOption[] = habitMeta?.rangeOptions || [];
      
      return (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground text-center">{activeItem.question}</p>
          <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
            {rangeOptions.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                size="lg"
                onClick={() => handleRangeSubmit(option.value, option.label)}
                disabled={isSubmitting}
                className={cn(
                  "h-14 rounded-2xl flex flex-col gap-0.5 border-2",
                  option.value === 0 && "border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                )}
              >
                {option.emoji && <span className="text-lg">{option.emoji}</span>}
                <span className="text-xs">{option.label}</span>
              </Button>
            ))}
          </div>
        </div>
      );
    }

    // COUNTER - +/- buttons
    if (responseType === 'counter') {
      const step = activeItem.step || 1;
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCounterValue(Math.max(0, counterValue - step))}
              disabled={isSubmitting || counterValue <= 0}
              className="h-14 w-14 rounded-2xl"
            >
              <Minus className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-2 min-w-[100px] justify-center">
              <span className="text-3xl font-bold">{counterValue}</span>
              {activeItem.unit && (
                <span className="text-lg text-muted-foreground">{activeItem.unit}</span>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCounterValue(counterValue + step)}
              disabled={isSubmitting}
              className="h-14 w-14 rounded-2xl"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>
          {activeItem.target && (
            <p className="text-xs text-muted-foreground">
              Obiettivo: {activeItem.target} {activeItem.unit}
            </p>
          )}
          <Button
            onClick={handleCounterSubmit}
            disabled={isSubmitting}
            className="h-12 px-8 rounded-2xl"
          >
            <Check className="w-5 h-5 mr-2" />
            Salva
          </Button>
        </div>
      );
    }

    // TIMER - Play/Pause + time display
    if (responseType === 'timer') {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl font-mono font-bold tabular-nums">
            {formatTime(timerSeconds)}
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant={timerRunning ? "outline" : "default"}
              size="lg"
              onClick={() => setTimerRunning(!timerRunning)}
              disabled={isSubmitting}
              className="h-14 w-14 rounded-full"
            >
              {timerRunning ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </Button>
            {timerSeconds > 0 && (
              <Button
                onClick={handleTimerSubmit}
                disabled={isSubmitting}
                className="h-14 px-6 rounded-2xl"
              >
                <Check className="w-5 h-5 mr-2" />
                Salva ({Math.round(timerSeconds / 60)} min)
              </Button>
            )}
          </div>
          {activeItem.target && (
            <p className="text-xs text-muted-foreground">
              Obiettivo: {activeItem.target} min
            </p>
          )}
        </div>
      );
    }

    // NUMERIC - Direct number input
    if (responseType === 'numeric') {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center gap-2 w-full max-w-xs">
            <div className="flex items-center gap-0 flex-1">
              <Input
                type="number"
                inputMode="decimal"
                value={numericValue}
                onChange={(e) => setNumericValue(e.target.value)}
                placeholder="0"
                className={cn(
                  "h-14 text-xl font-bold text-center bg-glass backdrop-blur-sm border-2 border-primary/20 focus:border-primary rounded-l-2xl",
                  activeItem.unit ? "rounded-r-none border-r-0 w-24" : "rounded-2xl w-full"
                )}
                disabled={isSubmitting}
                autoFocus
                step={activeItem.step || "0.1"}
                min="0"
              />
              {activeItem.unit && (
                <div className="h-14 px-4 flex items-center justify-center bg-glass backdrop-blur-sm border-2 border-primary/20 border-l-0 rounded-r-2xl">
                  <span className="text-base font-semibold text-muted-foreground">
                    {activeItem.unit}
                  </span>
                </div>
              )}
            </div>
            
            <button
              onClick={handleNumericSubmit}
              disabled={isSubmitting || !numericValue}
              className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0",
                "bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow hover:shadow-lg",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              )}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Check className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      );
    }

    // DEFAULT: 5-option grid (emoji, yesno, intensity, slider)
    return (
      <>
        <div className="grid grid-cols-5 gap-2">
          {getResponseOptions(activeItem).map((option, index) => {
            const isEmoji = activeItem.responseType === 'emoji';
            
            return (
              <button
                key={index}
                onClick={() => handleSelectValue(index)}
                disabled={isSubmitting}
                className={cn(
                  "h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-300",
                  "hover:scale-105 active:scale-95 backdrop-blur-sm",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  selectedValue === index 
                    ? "bg-primary text-primary-foreground shadow-glow scale-105 ring-2 ring-primary/30" 
                    : "bg-glass border border-glass-border hover:bg-glass-hover"
                )}
              >
                {selectedValue === index ? (
                  <Check className="w-5 h-5" />
                ) : isEmoji ? (
                  <span className="text-2xl">{option}</span>
                ) : (
                  <span className={cn(
                    "text-xs font-medium text-center px-1 leading-tight",
                    selectedValue === index ? "text-primary-foreground" : "text-foreground"
                  )}>
                    {option}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-between mt-3 px-1">
          <span className="text-xs text-muted-foreground">
            {activeItem.responseType === 'emoji' ? 'Peggio' : 
             activeItem.responseType === 'slider' ? 'Minimo' : 'Meno'}
          </span>
          <span className="text-xs text-muted-foreground">
            {activeItem.responseType === 'emoji' ? 'Meglio' : 
             activeItem.responseType === 'slider' ? 'Massimo' : 'Più'}
          </span>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-3" data-tutorial="checkin">
      {/* Check-in Title */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Check-in</h3>
        </div>
        {(completedCount + Object.keys(locallyCompleted).length) > 0 && (
          <span className="text-xs text-emerald-600 font-medium">
            {completedCount + Object.keys(locallyCompleted).length} completati
          </span>
        )}
      </div>

      {/* Active check-in - Glass card */}
      {activeItem && (
        <div className={cn(
          "relative overflow-hidden rounded-3xl p-5 animate-scale-in",
          "bg-glass backdrop-blur-2xl border border-glass-border",
          "shadow-glass-elevated"
        )}>
          {/* Inner glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none rounded-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-glass-border shadow-soft",
                  activeItem.bgColor
                )}>
                  <activeItem.icon className={cn("w-5 h-5", activeItem.color)} />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-foreground">{activeItem.label}</span>
                  {activeItem.question && (
                    <p className="text-xs text-muted-foreground mt-0.5">{activeItem.question}</p>
                  )}
                  {activeItem.reason && (
                    <p className="text-xs text-primary mt-0.5">✨ {activeItem.reason}</p>
                  )}
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-glass backdrop-blur-sm border border-glass-border flex items-center justify-center hover:bg-glass-hover transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>


            {renderActiveInput()}
          </div>
        </div>
      )}

      {/* Check-in grid - Glass cards */}
      {!activeItem && (
        <div className="grid grid-cols-4 gap-2">
          {visibleCheckins.slice(0, 8).map((item, index) => (
            <button
              key={item.key}
              onClick={() => handleItemClick(item)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all duration-300",
                "bg-glass backdrop-blur-sm hover:bg-glass-hover",
                "shadow-soft hover:shadow-glass hover:scale-[1.03] active:scale-[0.97]",
                "border border-glass-border",
                "animate-slide-up"
              )}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center backdrop-blur-sm border border-glass-border",
                item.bgColor
              )}>
                <item.icon className={cn("w-4 h-4", item.color)} />
              </div>
              <span className="font-medium text-[10px] text-center leading-tight text-foreground line-clamp-2">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartCheckinSection;
