import React, { useState, useMemo, useEffect } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import AdaptiveVitalsSection from '@/components/home/AdaptiveVitalsSection';
import LifeBalanceRadar from '@/components/home/LifeBalanceRadar';
import EmotionalMixBar from '@/components/home/EmotionalMixBar';
import GoalsWidget from '@/components/home/GoalsWidget';
import { Bell, Smile, Brain, Zap, Moon, X, Check, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useCheckins } from '@/hooks/useCheckins';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const motivationalPhrases = [
  "Ogni giorno è un nuovo inizio.",
  "Piccoli passi portano a grandi cambiamenti.",
  "Sei più forte di quanto pensi.",
  "Prenditi cura di te stesso oggi.",
  "Respira, sei nel posto giusto.",
];

const quickActions = [
  { key: 'mood', icon: Smile, label: 'Umore', color: 'text-primary', bgColor: 'bg-primary/10' },
  { key: 'anxiety', icon: Brain, label: 'Ansia', color: 'text-area-friendship', bgColor: 'bg-area-friendship/10' },
  { key: 'energy', icon: Zap, label: 'Energia', color: 'text-area-work', bgColor: 'bg-area-work/10' },
  { key: 'sleep', icon: Moon, label: 'Sonno', color: 'text-accent-foreground', bgColor: 'bg-accent/50' },
];

const moodEmojis = ['😔', '😕', '😐', '🙂', '😊'];

const Index: React.FC = () => {
  const { profile, isLoading } = useProfile();
  const { saveCheckin, todayCheckin } = useCheckins();
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);

  const userName = profile?.name?.split(' ')[0] || 'Utente';

  // Parse completed metrics from today's checkin notes
  const completedMetrics = useMemo(() => {
    const completed: Record<string, number> = {};
    
    if (todayCheckin) {
      // Mood is always recorded in mood_value
      completed.mood = todayCheckin.mood_value;
      
      // Other metrics stored in notes as JSON
      if (todayCheckin.notes) {
        try {
          const notes = JSON.parse(todayCheckin.notes);
          if (notes.anxiety) completed.anxiety = Math.ceil(notes.anxiety / 2); // 1-10 to 1-5
          if (notes.energy) completed.energy = Math.ceil(notes.energy / 2);
          if (notes.sleep) completed.sleep = Math.ceil(notes.sleep / 2);
        } catch (e) {
          // Notes not in JSON format
        }
      }
    }
    
    return completed;
  }, [todayCheckin]);

  const motivationalPhrase = useMemo(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return motivationalPhrases[dayOfYear % motivationalPhrases.length];
  }, []);

  const handleQuickAction = (key: string) => {
    if (activeAction === key) {
      setActiveAction(null);
      setSelectedValue(null);
    } else {
      setActiveAction(key);
      setSelectedValue(null);
    }
  };

  const handleSelectValue = async (value: number) => {
    setSelectedValue(value);
    const scaledValue = value + 1; // 1-5 scale
    
    try {
      // Get existing notes or create new ones
      let existingNotes: Record<string, number> = {};
      if (todayCheckin?.notes) {
        try {
          existingNotes = JSON.parse(todayCheckin.notes);
        } catch (e) {}
      }
      
      if (activeAction === 'mood') {
        // Save mood with existing notes
        await saveCheckin.mutateAsync({
          mood_value: scaledValue,
          mood_emoji: moodEmojis[value],
          notes: Object.keys(existingNotes).length > 0 ? JSON.stringify(existingNotes) : undefined,
        });
      } else if (activeAction) {
        // Update notes with new metric value (scaled to 1-10)
        const updatedNotes = {
          ...existingNotes,
          [activeAction]: scaledValue * 2, // 1-5 to 1-10
        };
        
        // Save with current mood or default
        await saveCheckin.mutateAsync({
          mood_value: todayCheckin?.mood_value ?? 3,
          mood_emoji: todayCheckin?.mood_emoji ?? '😐',
          notes: JSON.stringify(updatedNotes),
        });
      }
      
      // Invalidate all relevant queries for instant refresh
      queryClient.invalidateQueries({ queryKey: ['checkin-today'] });
      queryClient.invalidateQueries({ queryKey: ['checkins-weekly'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      
      toast.success('Check-in salvato!');
    } catch (error) {
      toast.error('Errore nel salvataggio');
    }
    
    // Close after brief delay
    setTimeout(() => {
      setActiveAction(null);
      setSelectedValue(null);
    }, 600);
  };

  const handleCloseExpanded = () => {
    setActiveAction(null);
    setSelectedValue(null);
  };

  return (
    <MobileLayout>
      {/* Premium Hero Header */}
      <header className="px-6 pt-8 pb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">
              {isLoading ? '...' : `Ciao ${userName}`}
            </h1>
            <p className="text-base text-muted-foreground mt-1">
              {motivationalPhrase}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative rounded-2xl w-12 h-12 bg-card shadow-premium hover:shadow-elevated transition-all"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full" />
          </Button>
        </div>

        {/* Quick Action Buttons - Premium Style with Completed State */}
        {!activeAction ? (
          <div className="flex justify-between gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              const isCompleted = action.key in completedMetrics;
              const completedValue = completedMetrics[action.key];
              
              return (
                <button
                  key={action.key}
                  onClick={() => handleQuickAction(action.key)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2.5 py-5 px-3 rounded-3xl transition-all duration-300",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    "animate-slide-up",
                    isCompleted 
                      ? "bg-emerald-50 border-2 border-emerald-200 shadow-sm" 
                      : "bg-card shadow-premium hover:shadow-elevated"
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center relative",
                    isCompleted ? "bg-emerald-100" : action.bgColor
                  )}>
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {completedValue}
                        </span>
                      </>
                    ) : (
                      <Icon className={cn("w-6 h-6", action.color)} />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    isCompleted ? "text-emerald-700" : "text-muted-foreground"
                  )}>
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          // Expanded Quick Check-in
          <div className="rounded-3xl bg-card shadow-premium p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                {(() => {
                  const action = quickActions.find(a => a.key === activeAction);
                  if (!action) return null;
                  const Icon = action.icon;
                  return (
                    <>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", action.bgColor)}>
                        <Icon className={cn("w-5 h-5", action.color)} />
                      </div>
                      <span className="font-medium text-foreground">Come va il tuo {action.label.toLowerCase()}?</span>
                    </>
                  );
                })()}
              </div>
              <button 
                onClick={handleCloseExpanded}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Emoji Selection */}
            <div className="flex justify-between gap-2">
              {moodEmojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectValue(index)}
                  className={cn(
                    "flex-1 h-14 rounded-2xl text-2xl flex items-center justify-center transition-all duration-300",
                    selectedValue === index 
                      ? "bg-primary/15 scale-105 shadow-glow ring-2 ring-primary/30" 
                      : "bg-muted hover:bg-muted/80 hover:scale-105"
                  )}
                >
                  {selectedValue === index ? (
                    <Check className="w-6 h-6 text-primary" />
                  ) : (
                    emoji
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-between mt-3 px-1">
              <span className="text-xs text-muted-foreground">Peggio</span>
              <span className="text-xs text-muted-foreground">Meglio</span>
            </div>
          </div>
        )}
      </header>

      {/* Content Blocks */}
      <div className="px-6 pb-8 space-y-5">
        {/* Block 1: Focus Cards - Bento Grid */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <AdaptiveVitalsSection />
        </div>

        {/* Block 2: Goals Widget */}
        <div className="animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <GoalsWidget />
        </div>

        {/* Block 3: Life Radar & Emotional Mix */}
        <div className="grid grid-cols-1 gap-5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <LifeBalanceRadar />
          <EmotionalMixBar />
        </div>
      </div>
    </MobileLayout>
  );
};

export default Index;