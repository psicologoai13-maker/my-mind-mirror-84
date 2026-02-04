import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import { ZenVoiceModal } from '@/components/voice/ZenVoiceModal';
import { useThematicDiaries } from '@/hooks/useThematicDiaries';
import { useSessions } from '@/hooks/useSessions';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useProfile } from '@/hooks/useProfile';
import DiaryManagementModal from '@/components/diary/DiaryManagementModal';
import ThematicChatInterface from '@/components/diary/ThematicChatInterface';
import SessionDetailModal from '@/components/sessions/SessionDetailModal';
import LocationPermissionModal from '@/components/location/LocationPermissionModal';
import AriaHeroSection from '@/components/aria/AriaHeroSection';
import QuickInsightCard from '@/components/aria/QuickInsightCard';
import DiaryChipsScroll from '@/components/aria/DiaryChipsScroll';
import CompactSessionItem from '@/components/aria/CompactSessionItem';
import { cn } from '@/lib/utils';
import type { DiaryTheme } from '@/hooks/useThematicDiaries';

const Aria: React.FC = () => {
  const navigate = useNavigate();
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'chat' | 'voice' | null>(null);
  const [selectedDiaryTheme, setSelectedDiaryTheme] = useState<DiaryTheme | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const { diaries, isLoading: diariesLoading } = useThematicDiaries();
  const { journalSessions, isLoading: sessionsLoading } = useSessions();
  const { permission, requestLocation, isLoading: locationLoading } = useUserLocation();
  const { profile } = useProfile();

  // Active diaries - stored in localStorage for persistence
  const [activeDiaryIds, setActiveDiaryIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('activeDiaryIds');
    return stored ? JSON.parse(stored) : ['love', 'work', 'relationships', 'self'];
  });

  const recentSessions = journalSessions?.slice(0, 5) || [];
  const lastSession = journalSessions?.[0] || null;

  // Calculate stats
  const sessionCount = journalSessions?.length || 0;
  const streakDays = 0; // TODO: Calculate from sessions

  // Check if we should show location permission modal
  const shouldAskLocation = permission === 'prompt' && profile?.location_permission_granted !== false;

  const handleStartChat = () => {
    if (shouldAskLocation) {
      setPendingAction('chat');
      setShowLocationModal(true);
    } else {
      navigate('/chat');
    }
  };

  const handleStartVoice = () => {
    if (shouldAskLocation) {
      setPendingAction('voice');
      setShowLocationModal(true);
    } else {
      setShowVoiceModal(true);
    }
  };

  const handleLocationAllow = async () => {
    await requestLocation();
    setShowLocationModal(false);
    
    if (pendingAction === 'chat') {
      navigate('/chat');
    } else if (pendingAction === 'voice') {
      setShowVoiceModal(true);
    }
    setPendingAction(null);
  };

  const handleLocationDeny = () => {
    setShowLocationModal(false);
    
    if (pendingAction === 'chat') {
      navigate('/chat');
    } else if (pendingAction === 'voice') {
      setShowVoiceModal(true);
    }
    setPendingAction(null);
  };

  const handleOpenDiary = (theme: string) => {
    const validThemes: DiaryTheme[] = ['love', 'work', 'relationships', 'self'];
    if (validThemes.includes(theme as DiaryTheme)) {
      setSelectedDiaryTheme(theme as DiaryTheme);
    }
  };

  const handleAddDiary = (themeId: string, isCustom: boolean, customLabel?: string) => {
    if (activeDiaryIds.length >= 6) return;
    
    const newIds = [...activeDiaryIds, themeId];
    setActiveDiaryIds(newIds);
    localStorage.setItem('activeDiaryIds', JSON.stringify(newIds));
    
    if (isCustom && customLabel) {
      const customDiaries = JSON.parse(localStorage.getItem('customDiaries') || '{}');
      customDiaries[themeId] = customLabel;
      localStorage.setItem('customDiaries', JSON.stringify(customDiaries));
    }
  };

  const handleRemoveDiary = (themeId: string) => {
    const newIds = activeDiaryIds.filter(id => id !== themeId);
    setActiveDiaryIds(newIds);
    localStorage.setItem('activeDiaryIds', JSON.stringify(newIds));
  };

  // If a diary theme is selected, show the thematic chat interface
  if (selectedDiaryTheme) {
    const selectedDiary = diaries?.find(d => d.theme === selectedDiaryTheme);
    return (
      <ThematicChatInterface
        theme={selectedDiaryTheme}
        diary={selectedDiary}
        onBack={() => setSelectedDiaryTheme(null)}
      />
    );
  }

  return (
    <MobileLayout>
      <div className="pb-28 space-y-4">
        {/* Hero Section with Aria Identity */}
        <AriaHeroSection
          userName={profile?.name || undefined}
          sessionCount={sessionCount}
          streakDays={streakDays}
          onStartChat={handleStartChat}
          onStartVoice={handleStartVoice}
        />

        {/* Quick Insight Card */}
        <QuickInsightCard
          lastSession={lastSession}
          onContinue={handleStartChat}
          onStartNew={handleStartChat}
        />

        {/* Diary Chips Horizontal Scroll */}
        <DiaryChipsScroll
          activeDiaryIds={activeDiaryIds}
          diaries={diaries}
          onOpenDiary={handleOpenDiary}
          onAddDiary={() => setShowDiaryModal(true)}
        />

        {/* Session History - Compact List */}
        <section className="px-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📜</span>
              <h2 className="font-display font-semibold text-sm text-foreground">Cronologia</h2>
            </div>
            {recentSessions.length > 0 && (
              <button 
                onClick={() => navigate('/sessions')}
                className="text-xs text-primary font-medium flex items-center gap-0.5 hover:text-primary/80 transition-colors"
              >
                Vedi tutto
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {sessionsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-aria-violet" />
            </div>
          ) : recentSessions.length === 0 ? (
            <div className={cn(
              "relative overflow-hidden text-center py-6 rounded-2xl",
              "bg-glass/50 backdrop-blur-sm border border-glass-border/50"
            )}>
              <p className="text-muted-foreground text-sm">
                Nessuna sessione ancora
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((session, index) => (
                <CompactSessionItem
                  key={session.id}
                  session={session}
                  index={index}
                  onClick={() => setSelectedSessionId(session.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <ZenVoiceModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
      />

      <DiaryManagementModal
        isOpen={showDiaryModal}
        onClose={() => setShowDiaryModal(false)}
        activeDiaries={activeDiaryIds}
        onAddDiary={handleAddDiary}
        onRemoveDiary={handleRemoveDiary}
      />

      <SessionDetailModal
        session={journalSessions?.find(s => s.id === selectedSessionId) || null}
        open={!!selectedSessionId}
        onOpenChange={(open) => !open && setSelectedSessionId(null)}
        onDelete={() => {}}
      />

      <LocationPermissionModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onAllow={handleLocationAllow}
        onDeny={handleLocationDeny}
        isLoading={locationLoading}
      />
    </MobileLayout>
  );
};

export default Aria;
