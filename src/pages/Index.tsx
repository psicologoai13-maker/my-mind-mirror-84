import React, { useState, useMemo } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import AdaptiveVitalsSection from '@/components/home/AdaptiveVitalsSection';
import LifeBalanceRadar from '@/components/home/LifeBalanceRadar';
import EmotionalMixBar from '@/components/home/EmotionalMixBar';
import { Bell, Smile, Brain, Zap, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
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
  { key: 'mood', icon: Smile, label: 'Umore', color: 'text-primary' },
  { key: 'anxiety', icon: Brain, label: 'Ansia', color: 'text-area-friendship' },
  { key: 'energy', icon: Zap, label: 'Energia', color: 'text-area-work' },
  { key: 'sleep', icon: Moon, label: 'Sonno', color: 'text-accent-foreground' },
];

const Index: React.FC = () => {
  const { profile, isLoading } = useProfile();
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const userName = profile?.name?.split(' ')[0] || 'Utente';

  const motivationalPhrase = useMemo(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return motivationalPhrases[dayOfYear % motivationalPhrases.length];
  }, []);

  const handleQuickAction = (key: string) => {
    setActiveAction(key);
    toast.info(`Check-in ${key} avviato`, { duration: 1500 });
    setTimeout(() => setActiveAction(null), 1500);
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
            className="relative rounded-2xl w-11 h-11 bg-card shadow-soft hover:shadow-premium transition-all"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full" />
          </Button>
        </div>

        {/* Quick Action Buttons - Premium Style */}
        <div className="flex justify-between gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            const isActive = activeAction === action.key;
            return (
              <button
                key={action.key}
                onClick={() => handleQuickAction(action.key)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-3xl transition-all duration-300",
                  "bg-card shadow-premium hover:shadow-elevated hover:scale-[1.02]",
                  "animate-slide-up",
                  isActive && "ring-2 ring-primary/30 bg-primary-light"
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  "bg-muted/50"
                )}>
                  <Icon className={cn("w-6 h-6", action.color)} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{action.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Content Blocks */}
      <div className="px-6 pb-8 space-y-4">
        {/* Block 1: Focus Cards - Bento Grid */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <AdaptiveVitalsSection />
        </div>

        {/* Block 2: Life Radar & Emotional Mix */}
        <div className="grid grid-cols-1 gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <LifeBalanceRadar />
          <EmotionalMixBar />
        </div>
      </div>
    </MobileLayout>
  );
};

export default Index;