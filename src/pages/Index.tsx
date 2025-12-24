import React, { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import MoodSelector from '@/components/home/MoodSelector';
import LifeAreasGrid from '@/components/home/LifeAreasGrid';
import QuickActions from '@/components/home/QuickActions';
import WeeklyMoodChart from '@/components/home/WeeklyMoodChart';
import UpcomingSession from '@/components/home/UpcomingSession';
import { Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useCheckins } from '@/hooks/useCheckins';

const Index: React.FC = () => {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const { profile, isLoading } = useProfile();
  const { todayCheckin } = useCheckins();

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  const userName = profile?.name?.split(' ')[0] || 'Utente';

  return (
    <MobileLayout>
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{getGreeting()},</p>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {isLoading ? '...' : `${userName} 👋`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-area-love rounded-full" />
          </Button>
          <Button variant="ghost" size="icon-sm">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-5 space-y-6 pb-8">
        {/* Mood Selector */}
        <MoodSelector selectedMood={selectedMood} onMoodSelect={setSelectedMood} />

        {/* Upcoming Session */}
        <UpcomingSession />

        {/* Weekly Mood Chart */}
        <WeeklyMoodChart />

        {/* Life Areas */}
        <LifeAreasGrid />

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </MobileLayout>
  );
};

export default Index;
