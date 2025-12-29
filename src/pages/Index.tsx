import React, { useState, useMemo } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import AdaptiveVitalsSection from '@/components/home/AdaptiveVitalsSection';
import LifeBalanceRadar from '@/components/home/LifeBalanceRadar';
import EmotionalMixBar from '@/components/home/EmotionalMixBar';
import { Bell, Smile, Brain, Zap, Moon } from 'lucide-react';
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
  { key: 'mood', icon: Smile, label: 'Umore', color: 'text-emerald-500' },
  { key: 'anxiety', icon: Brain, label: 'Ansia', color: 'text-blue-500' },
  { key: 'energy', icon: Zap, label: 'Energia', color: 'text-amber-500' },
  { key: 'sleep', icon: Moon, label: 'Sonno', color: 'text-indigo-500' },
];

const Index: React.FC = () => {
  const { profile, isLoading } = useProfile();
  const { todayCheckin, saveCheckin } = useCheckins();
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
    // For now just visual feedback - full flow can be implemented later
    setTimeout(() => setActiveAction(null), 1500);
  };

  return (
    <MobileLayout>
      {/* Compact Hero Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isLoading ? '...' : `Ciao ${userName}`}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {motivationalPhrase}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="relative rounded-xl -mt-1">
            <Bell className="w-5 h-5 text-gray-400" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
          </Button>
        </div>

        {/* Quick Action Buttons - Horizontal Row */}
        <div className="flex justify-between gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const isActive = activeAction === action.key;
            return (
              <button
                key={action.key}
                onClick={() => handleQuickAction(action.key)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all duration-200",
                  "bg-white border border-gray-100 shadow-sm",
                  "hover:shadow-md active:scale-95",
                  isActive && "ring-2 ring-primary/20 bg-primary/5"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  "bg-gray-50"
                )}>
                  <Icon className={cn("w-5 h-5", action.color)} />
                </div>
                <span className="text-[10px] font-medium text-gray-600">{action.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Content Blocks */}
      <div className="px-5 pb-8 space-y-4">
        {/* Block 1: Focus Cards - Lighter Bento Grid */}
        <div className="animate-slide-up">
          <AdaptiveVitalsSection />
        </div>

        {/* Block 2: Life Radar & Emotional Mix */}
        <div className="grid grid-cols-1 gap-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <LifeBalanceRadar />
          <EmotionalMixBar />
        </div>
      </div>
    </MobileLayout>
  );
};

export default Index;