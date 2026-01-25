import React, { useMemo } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import AdaptiveVitalsSection from '@/components/home/AdaptiveVitalsSection';
import LifeBalanceRadar from '@/components/home/LifeBalanceRadar';
import FlashInsights from '@/components/home/FlashInsights';
import GoalsWidget from '@/components/home/GoalsWidget';
import SmartCheckinSection from '@/components/home/SmartCheckinSection';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';

const motivationalPhrases = [
  "Ogni giorno è un nuovo inizio.",
  "Piccoli passi portano a grandi cambiamenti.",
  "Sei più forte di quanto pensi.",
  "Prenditi cura di te stesso oggi.",
  "Respira, sei nel posto giusto.",
];

const Index: React.FC = () => {
  const { profile, isLoading } = useProfile();
  const userName = profile?.name?.split(' ')[0] || 'Utente';

  const motivationalPhrase = useMemo(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return motivationalPhrases[dayOfYear % motivationalPhrases.length];
  }, []);

  return (
    <MobileLayout>
      {/* Premium Hero Header */}
      <header className="px-6 pt-8 pb-4">
        <div className="flex items-start justify-between mb-5">
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

        {/* Smart Personalized Check-in */}
        <SmartCheckinSection />
      </header>

      {/* Content Blocks */}
      <div className="px-6 pb-8 space-y-5">
        {/* Block 1: Focus Cards - Bento Grid */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <AdaptiveVitalsSection />
        </div>

        {/* Block 2: Goals Widget */}
        <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <GoalsWidget />
        </div>

        {/* Block 3: Flash Insights */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <FlashInsights />
        </div>

        {/* Block 4: Life Radar */}
        <div className="animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <LifeBalanceRadar />
        </div>
      </div>
    </MobileLayout>
  );
};

export default Index;
