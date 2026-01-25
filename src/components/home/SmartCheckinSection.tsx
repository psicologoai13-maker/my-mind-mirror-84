import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePersonalizedCheckins, CheckinItem, responseTypeConfig } from '@/hooks/usePersonalizedCheckins';
import { useCheckins } from '@/hooks/useCheckins';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useDailyLifeAreas } from '@/hooks/useDailyLifeAreas';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCheckinTimer } from '@/hooks/useCheckinTimer';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locallyCompleted, setLocallyCompleted] = useState<Record<string, number>>({});

  const allCompleted_ = { ...completedToday, ...locallyCompleted };

  const handleItemClick = (item: CheckinItem) => {
    if (item.key in allCompleted_) return;
    
    // Start 24h timer when user clicks on first check-in item
    startCheckinTimer();
    onStartCheckin?.();
    
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

      setLocallyCompleted(prev => ({ ...prev, [activeItem.key]: scaledValue }));
      
      invalidateMetrics();
      queryClient.invalidateQueries({ queryKey: ['today-all-sources'] });
      refetchTodayData();
      
      toast.success(`${activeItem.label} registrato!`);
      
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

  const getResponseOptions = (item: CheckinItem) => {
    return responseTypeConfig[item.responseType].options;
  };

  const visibleCheckins = dailyCheckins.filter(item => !(item.key in allCompleted_));

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Check-in personalizzato</span>
          </div>
        </div>
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">AI sta preparando le domande...</span>
        </div>
      </div>
    );
  }

  // All completed state - return null, the header icon will show summary modal
  if (visibleCheckins.length === 0 && (completedCount > 0 || allCompleted)) {
    return null;
  }

  if (visibleCheckins.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Check-in personalizzato</span>
          {aiGenerated && (
            <span className="text-xs text-primary/60">✨ AI</span>
          )}
        </div>
        {(completedCount + Object.keys(locallyCompleted).length) > 0 && (
          <span className="text-xs text-emerald-600 font-medium">
            {completedCount + Object.keys(locallyCompleted).length} completati
          </span>
        )}
      </div>

      {/* Active check-in */}
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
                  <p className="text-xs text-primary mt-0.5">✨ {activeItem.reason}</p>
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

      {/* Check-in grid - always show exactly 4 boxes in a row */}
      {!activeItem && (
        <div className="grid grid-cols-4 gap-2">
          {visibleCheckins.slice(0, 4).map((item, index) => (
            <button
              key={item.key}
              onClick={() => handleItemClick(item)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all duration-300",
                "bg-card shadow-sm hover:shadow-md hover:scale-[1.03] active:scale-[0.97] border border-border/30",
                "animate-slide-up"
              )}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center",
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
