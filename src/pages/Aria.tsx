import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Loader2, PenLine, AudioLines, X } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import { ZenVoiceModal } from '@/components/voice/ZenVoiceModal';
import { useThematicDiaries } from '@/hooks/useThematicDiaries';
import { useSessions } from '@/hooks/useSessions';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useProfile } from '@/hooks/useProfile';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import DiaryManagementModal from '@/components/diary/DiaryManagementModal';
import ThematicChatInterface from '@/components/diary/ThematicChatInterface';
import SessionDetailModal from '@/components/sessions/SessionDetailModal';
import LocationPermissionModal from '@/components/location/LocationPermissionModal';
import AriaHeroSection from '@/components/aria/AriaHeroSection';
import QuickInsightCard from '@/components/aria/QuickInsightCard';
import DiaryChipsScroll from '@/components/aria/DiaryChipsScroll';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { DiaryTheme } from '@/hooks/useThematicDiaries';

const Aria: React.FC = () => {
  const navigate = useNavigate();
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingAction, setPendingAction] = useState<'chat' | 'voice' | null>(null);
  const [selectedDiaryTheme, setSelectedDiaryTheme] = useState<DiaryTheme | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const { diaries } = useThematicDiaries();
  const { journalSessions, isLoading: sessionsLoading } = useSessions();
  const { permission, requestLocation, isLoading: locationLoading } = useUserLocation();
  const { profile } = useProfile();

  // Active diaries - stored in localStorage for persistence
  const [activeDiaryIds, setActiveDiaryIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('activeDiaryIds');
    return stored ? JSON.parse(stored) : ['love', 'work', 'relationships', 'self'];
  });

  const recentSessions = journalSessions?.slice(0, 10) || [];
  const lastSession = journalSessions?.[0] || null;
  const sessionCount = journalSessions?.length || 0;

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
      <div className="pb-24 space-y-4 relative">
        {/* History Icon - Top Right */}
        {sessionCount > 0 && (
          <Sheet open={showHistory} onOpenChange={setShowHistory}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "absolute top-5 right-5 z-20",
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  "bg-glass backdrop-blur-xl border border-glass-border",
                  "shadow-glass hover:shadow-glass-glow transition-all",
                  "text-muted-foreground hover:text-foreground"
                )}
              >
                <History className="w-5 h-5" />
                {/* Notification dot */}
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary text-[9px] text-white font-bold flex items-center justify-center">
                  {sessionCount > 9 ? '9+' : sessionCount}
                </span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <span className="text-lg">📜</span>
                  Cronologia sessioni
                </SheetTitle>
              </SheetHeader>
              
              {sessionsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-[calc(70vh-100px)]">
                  {recentSessions.map((session, index) => {
                    const isVoice = session.type === 'voice';
                    const dateLabel = format(new Date(session.start_time), "d MMM", { locale: it });
                    const timeLabel = format(new Date(session.start_time), "HH:mm", { locale: it });
                    const durationMin = session.duration ? Math.floor(session.duration / 60) : null;
                    const emotionTag = session.emotion_tags?.[0];

                    return (
                      <motion.button
                        key={session.id}
                        onClick={() => {
                          setSelectedSessionId(session.id);
                          setShowHistory(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left",
                          "bg-muted/50 hover:bg-muted transition-colors"
                        )}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <div 
                          className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                            isVoice ? "bg-gradient-aria" : "bg-gradient-to-br from-primary to-primary-glow"
                          )}
                        >
                          {isVoice ? (
                            <AudioLines className="w-4 h-4 text-white" />
                          ) : (
                            <PenLine className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">
                              {isVoice ? 'Vocale' : 'Chat'}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{dateLabel}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{timeLabel}</span>
                            {durationMin && (
                              <>
                                <span>•</span>
                                <span>{durationMin} min</span>
                              </>
                            )}
                            {emotionTag && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-medium">
                                {emotionTag.replace('#', '')}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </SheetContent>
          </Sheet>
        )}

        {/* Hero Section - Compact */}
        <AriaHeroSection
          userName={profile?.name || undefined}
          onStartChat={handleStartChat}
          onStartVoice={handleStartVoice}
        />

        {/* Quick Insight - Inline */}
        <QuickInsightCard
          lastSession={lastSession}
          onContinue={handleStartChat}
          onStartNew={handleStartChat}
        />

        {/* Diary Grid - Bigger Cards */}
        <DiaryChipsScroll
          activeDiaryIds={activeDiaryIds}
          diaries={diaries}
          onOpenDiary={handleOpenDiary}
          onAddDiary={() => setShowDiaryModal(true)}
        />
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
