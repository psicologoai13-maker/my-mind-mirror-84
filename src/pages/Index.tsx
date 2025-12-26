import React, { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import QuickCheckin from '@/components/home/QuickCheckin';
import VitalParametersSection from '@/components/home/VitalParametersSection';
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
      {/* Header - Minimal & Clean */}
      <header className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">
              {isLoading ? '...' : userName}
            </h1>
            <p className="text-xs text-muted-foreground">
              {totalSessions > 0 ? `${totalSessions} sessioni` : 'Inizia il tuo percorso'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
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

        {/* Block 2: Vital Parameters - 2x2 Grid */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <VitalParametersSection />
        </div>
      </div>
    </MobileLayout>
  );
};

export default Index;