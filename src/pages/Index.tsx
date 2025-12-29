import React, { useState, useMemo } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import AdaptiveVitalsSection from '@/components/home/AdaptiveVitalsSection';
import LifeBalanceRadar from '@/components/home/LifeBalanceRadar';
import EmotionalMixBar from '@/components/home/EmotionalMixBar';
import { Bell, Smile, Brain, Zap, Moon, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useCheckins } from '@/hooks/useCheckins';
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
  const { saveCheckin } = useCheckins();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);

  const userName = profile?.name?.split(' ')[0] || 'Utente';

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
    
    // For mood, save the checkin
    if (activeAction === 'mood') {
      try {
        await saveCheckin.mutateAsync({
          mood_value: value + 1, // 1-5 scale
          mood_emoji: moodEmojis[value],
        });
        toast.success('Check-in salvato!');
      } catch (error) {
        toast.error('Errore nel salvataggio');
      }
    } else {
      toast.success(`${activeAction} registrato: ${value + 1}/5`);
    }
    
    // Close after brief delay
    setTimeout(() => {
      setActiveAction(null);
      setSelectedValue(null);
    }, 800);
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

        {/* Quick Action Buttons - Premium Style */}
        {!activeAction ? (
          <div className="flex justify-between gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  onClick={() => handleQuickAction(action.key)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2.5 py-5 px-3 rounded-3xl transition-all duration-300",
                    "bg-card shadow-premium hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98]",
                    "animate-slide-up"
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    action.bgColor
                  )}>
                    <Icon className={cn("w-6 h-6", action.color)} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{action.label}</span>
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

        {/* Block 2: Life Radar & Emotional Mix */}
        <div className="grid grid-cols-1 gap-5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <LifeBalanceRadar />
          <EmotionalMixBar />
        </div>
      </div>
    </MobileLayout>
  );
};

export default Index;