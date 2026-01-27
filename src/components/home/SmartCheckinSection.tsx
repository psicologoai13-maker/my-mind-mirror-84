import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Sparkles, Send } from 'lucide-react';
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
  showFocusTitle?: boolean;
}

const SmartCheckinSection: React.FC<SmartCheckinSectionProps> = ({ onStartCheckin, showFocusTitle = false }) => {
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
      setNumericValue('');
    } else {
      setActiveItem(item);
      setSelectedValue(null);
      setNumericValue('');
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
      setNumericValue('');
      setIsSubmitting(false);
      
    } catch (error) {
      console.error('Error saving check-in:', error);
      toast.error('Errore nel salvataggio');
      setIsSubmitting(false);
    }
  };

  // Handle numeric input submission (for objectives with units like Kg)
  const handleNumericSubmit = async () => {
    if (!activeItem || isSubmitting || !numericValue) return;
    
    const numValue = parseFloat(numericValue);
    if (isNaN(numValue) || numValue < 0) {
      toast.error('Inserisci un valore valido');
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Update the objective's current_value directly
      if (activeItem.objectiveId) {
        const { error } = await supabase
          .from('user_objectives')
          .update({ 
            current_value: numValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', activeItem.objectiveId);
        
        if (error) throw error;
        
        // Also save to daily checkin notes for tracking
        let existingNotes: Record<string, number> = {};
        if (todayCheckin?.notes) {
          try {
            existingNotes = JSON.parse(todayCheckin.notes);
          } catch (e) {}
        }
        
        const updatedNotes = {
          ...existingNotes,
          [activeItem.key]: numValue,
        };
        
        await saveCheckin.mutateAsync({
          mood_value: todayCheckin?.mood_value ?? 3,
          mood_emoji: todayCheckin?.mood_emoji ?? '😐',
          notes: JSON.stringify(updatedNotes),
        });
        
        queryClient.invalidateQueries({ queryKey: ['user-objectives'] });
      }

      setLocallyCompleted(prev => ({ ...prev, [activeItem.key]: numValue }));
      
      invalidateMetrics();
      queryClient.invalidateQueries({ queryKey: ['today-all-sources'] });
      refetchTodayData();
      
      toast.success(`${activeItem.label}: ${numValue} ${activeItem.unit || ''} registrato!`);
      
      setActiveItem(null);
      setSelectedValue(null);
      setNumericValue('');
      setIsSubmitting(false);
      
    } catch (error) {
      console.error('Error saving numeric check-in:', error);
      toast.error('Errore nel salvataggio');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setActiveItem(null);
    setSelectedValue(null);
    setNumericValue('');
  };

  const getResponseOptions = (item: CheckinItem) => {
    return responseTypeConfig[item.responseType].options;
  };

  const visibleCheckins = dailyCheckins.filter(item => !(item.key in allCompleted_));

  // Loading state - show skeleton, not text message
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

  // All completed state - return null, the header icon will show summary modal
  if (visibleCheckins.length === 0 && (completedCount > 0 || allCompleted)) {
    return null;
  }

  if (visibleCheckins.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Focus Title - shown when prop is true */}
      {showFocusTitle && (
        <div className="flex items-center gap-2 px-1 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            I Tuoi Focus
          </h3>
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
            AI
          </span>
        </div>
      )}
      
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Check-in personalizzato</span>
          {aiGenerated && (
            <span className="text-xs text-primary/60">✨</span>
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

          {/* Numeric input for objectives with units */}
          {activeItem.responseType === 'numeric' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={numericValue}
                  onChange={(e) => setNumericValue(e.target.value)}
                  placeholder={`Inserisci valore${activeItem.unit ? ` in ${activeItem.unit}` : ''}`}
                  className="flex-1 text-lg font-semibold text-center h-14 rounded-2xl"
                  disabled={isSubmitting}
                  autoFocus
                  step="0.1"
                  min="0"
                />
                {activeItem.unit && (
                  <span className="text-lg font-medium text-muted-foreground min-w-[40px]">
                    {activeItem.unit}
                  </span>
                )}
              </div>
              <button
                onClick={handleNumericSubmit}
                disabled={isSubmitting || !numericValue}
                className={cn(
                  "w-full h-12 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <span className="text-sm font-medium">Salvando...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="text-sm font-medium">Conferma</span>
                  </>
                )}
              </button>
            </div>
          ) : (
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
            </>
          )}
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
