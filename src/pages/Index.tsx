import React, { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import QuickCheckin from '@/components/home/QuickCheckin';
import AdaptiveVitalsSection from '@/components/home/AdaptiveVitalsSection';
import LifeBalanceRadar from '@/components/home/LifeBalanceRadar';
import EmotionalMixBar from '@/components/home/EmotionalMixBar';
import { Bell, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useSessions } from '@/hooks/useSessions';

const Index: React.FC = () => {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const { profile, isLoading } = useProfile();
  const { journalSessions } = useSessions();

  const userName = profile?.name?.split(' ')[0] || 'Utente';
  const totalSessions = journalSessions?.length || 0;

  return (
    <MobileLayout>
      {/* Header - Clean & Minimal */}
      <header className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-foreground">
              {isLoading ? '...' : userName}
            </h1>
            <p className="text-xs text-muted-foreground">
              {totalSessions > 0 ? `${totalSessions} sessioni` : 'Inizia il tuo percorso'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="relative rounded-xl">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
        </Button>
      </header>

      {/* Mental Cockpit - Vertical Blocks */}
      <div className="px-5 pt-4 pb-8 space-y-5">
        {/* Block 1: Hero - Quick Checkin with Sliders */}
        <div className="animate-slide-up">
          <QuickCheckin 
            selectedMood={selectedMood} 
            onMoodSelect={setSelectedMood} 
          />
        </div>

        {/* Block 2: Adaptive Vital Parameters - Dynamic 2x2 Grid */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <AdaptiveVitalsSection />
        </div>

        {/* Block 3: Bento Grid - Life Balance & Emotional Mix */}
        <div className="grid grid-cols-1 gap-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <LifeBalanceRadar />
          <EmotionalMixBar />
        </div>
      </div>
    </MobileLayout>
  );
};

export default Index;