import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, ChevronRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { usePersonalizedCheckins, CheckinItem, responseTypeConfig } from '@/hooks/usePersonalizedCheckins';
import { useCheckins } from '@/hooks/useCheckins';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useDailyLifeAreas } from '@/hooks/useDailyLifeAreas';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

const moodEmojis = ['😔', '😕', '😐', '🙂', '😊'];

const SmartCheckinSection: React.FC = () => {
  const queryClient = useQueryClient();
  const { dailyCheckins, completedToday, completedCount, refetchTodayData } = usePersonalizedCheckins();
  const { saveCheckin, todayCheckin } = useCheckins();
  const { invalidateMetrics } = useDailyMetrics();
  const { invalidateLifeAreas } = useDailyLifeAreas();
  const { profile } = useProfile();
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const [activeItem, setActiveItem] = useState<CheckinItem | null>(null);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locallyCompleted, setLocallyCompleted] = useState<Record<string, number>>({});

  // Merge server completed with locally completed
  const allCompleted = { ...completedToday, ...locallyCompleted };

  const handleItemClick = (item: CheckinItem) => {
    // Don't allow clicking if already completed
    if (item.key in allCompleted) return;
    
    if (activeItem?.key === item.key) {
      setActiveItem(null);
      setSelectedValue(null);
    } else {
      setActiveItem(item);
      setSelectedValue(null);
    }
  };

  const handleSelectValue = async (value: number) => {
    if (!activeItem || isSubmitting) return;
    
    setSelectedValue(value);
    setIsSubmitting(true);
    
    // All scales now go left=negative, right=positive (no reversal needed)
    const scaledValue = value + 1; // 1-5 scale
    const scaledTo10 = scaledValue * 2; // 2-10 scale

    try {
      if (activeItem.type === 'life_area') {
        // Save to daily_life_areas
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
        // Save to daily_psychology
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
        // Save to daily_emotions
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
        // Handle vitals (existing logic via daily_checkins)
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

      // Mark as locally completed immediately
      setLocallyCompleted(prev => ({ ...prev, [activeItem.key]: scaledValue }));
      
      // Invalidate all queries
      invalidateMetrics();
      queryClient.invalidateQueries({ queryKey: ['today-all-sources'] });
      refetchTodayData();
      
      toast.success(`${activeItem.label} registrato!`);
      
      // Close and reset
      setActiveItem(null);
      setSelectedValue(null);
      setIsSubmitting(false);
      
    } catch (error) {
      console.error('Error saving check-in:', error);
      toast.error('Errore nel salvataggio');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setActiveItem(null);
    setSelectedValue(null);
  };

  // Get response options based on type
  const getResponseOptions = (item: CheckinItem) => {
    const config = responseTypeConfig[item.responseType];
    return config.options;
  };

  const getResponseLabels = (item: CheckinItem) => {
    const config = responseTypeConfig[item.responseType];
    return config.labels;
  };

  // Filter out already completed items
  const visibleCheckins = dailyCheckins.filter(item => !(item.key in allCompleted));

  // If no items to show (all completed)
  if (visibleCheckins.length === 0 && completedCount > 0) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-3xl p-6 border border-emerald-100 dark:border-emerald-900/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">Check-in completato!</h3>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Hai registrato {completedCount + Object.keys(locallyCompleted).length} parametri oggi</p>
          </div>
        </div>
      </div>
    );
  }

  // If no checkins available at all
  if (visibleCheckins.length === 0 && completedCount === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header with personalization indicator */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Check-in personalizzato</span>
        </div>
        {(completedCount + Object.keys(locallyCompleted).length) > 0 && (
          <span className="text-xs text-emerald-600 font-medium">
            {completedCount + Object.keys(locallyCompleted).length} completati
          </span>
        )}
      </div>

      {/* Active check-in expanded view */}
      {activeItem && (
        <div className="bg-card rounded-3xl shadow-elevated p-5 animate-scale-in border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center", activeItem.bgColor)}>
                <activeItem.icon className={cn("w-5 h-5", activeItem.color)} />
              </div>
              <div>
                <span className="font-semibold text-foreground">{activeItem.question}</span>
                {activeItem.reason && (
                  <p className="text-xs text-muted-foreground mt-0.5">{activeItem.reason}</p>
                )}
              </div>
            </div>
            <button 
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Response Selection based on type */}
          <div className="grid grid-cols-5 gap-2">
            {getResponseOptions(activeItem).map((option, index) => {
              const isEmoji = activeItem.responseType === 'emoji';
              const labels = getResponseLabels(activeItem);
              
              return (
                <button
                  key={index}
                  onClick={() => handleSelectValue(index)}
                  disabled={isSubmitting}
                  className={cn(
                    "h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-300",
                    "hover:scale-105 active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    selectedValue === index 
                      ? "bg-primary text-primary-foreground shadow-glow scale-105 ring-2 ring-primary/30" 
                      : "bg-muted/60 hover:bg-muted"
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

          {/* Labels - always left=negative, right=positive */}
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
        </div>
      )}

      {/* Check-in Items Grid */}
      {!activeItem && (
        <div className="grid grid-cols-2 gap-3">
          {visibleCheckins.map((item, index) => {
            return (
              <button
                key={item.key}
                onClick={() => handleItemClick(item)}
                className={cn(
                  "relative flex items-center gap-3 p-4 rounded-2xl transition-all duration-300",
                  "bg-card shadow-premium hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98] border border-transparent",
                  "animate-slide-up"
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Icon */}
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
                  item.bgColor
                )}>
                  <item.icon className={cn("w-5 h-5", item.color)} />
                </div>

                {/* Text */}
                <div className="flex-1 text-left min-w-0">
                  <span className="font-medium text-sm block truncate text-foreground">
                    {item.label}
                  </span>
                  {item.reason && (
                    <span className="text-xs text-muted-foreground truncate block">
                      {item.reason}
                    </span>
                  )}
                </div>

                {/* Arrow indicator */}
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SmartCheckinSection;
