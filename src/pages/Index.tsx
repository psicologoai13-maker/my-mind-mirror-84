import React, { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import QuickCheckin from '@/components/home/QuickCheckin';
import EmotionalPulseChart from '@/components/home/EmotionalPulseChart';
import FocusTopics from '@/components/home/FocusTopics';
import AIInsightCard from '@/components/home/AIInsightCard';
import LifeAreasGrid from '@/components/home/LifeAreasGrid';
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

      {/* Bento Grid Layout */}
      <div className="px-5 pt-4 pb-8 space-y-4">
        {/* Block 1: Hero - Quick Checkin */}
        <div className="animate-slide-up">
          <QuickCheckin 
            selectedMood={selectedMood} 
            onMoodSelect={setSelectedMood} 
          />
        </div>

        {/* Block 2 & 3: Side by side - Chart & Focus */}
        <div className="grid grid-cols-5 gap-4">
          {/* Left - Emotional Pulse (3 cols) */}
          <div className="col-span-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <EmotionalPulseChart />
          </div>
          
          {/* Right - Focus Topics (2 cols) */}
          <div className="col-span-2 animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <FocusTopics />
          </div>
        </div>

        {/* Block 4: Full Width - AI Insight */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <AIInsightCard />
        </div>

        {/* Block 5: Life Areas Grid */}
        <div className="animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <LifeAreasGrid />
        </div>
      </div>
    </MobileLayout>
  );
};

export default Index;
