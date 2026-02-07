import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History } from 'lucide-react';
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
import DiaryChipsScroll from '@/components/aria/DiaryChipsScroll';
import FloatingParticles from '@/components/aria/FloatingParticles';
import CompactSessionItem from '@/components/aria/CompactSessionItem';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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

  const [activeDiaryIds, setActiveDiaryIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('activeDiaryIds');
    return stored ? JSON.parse(stored) : ['love', 'work', 'relationships', 'self'];
  });

  const recentSessions = journalSessions?.slice(0, 10) || [];
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
    <MobileLayout withMesh={false}>
      {/* Sanctuary Zen Background */}
      <div className="min-h-[calc(100vh-80px)] pb-20 flex flex-col relative overflow-hidden">
        {/* Deep Background Gradient */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            background: `
              radial-gradient(ellipse at 50% 30%, rgba(155,111,208,0.06) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 70%, rgba(99,102,241,0.04) 0%, transparent 40%),
              linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)
            `,
          }}
        />
        
        {/* Subtle Floating Particles */}
        <FloatingParticles />
        
        {/* Soft Vignette */}
        <div 
          className="absolute inset-0 pointer-events-none z-0" 
          style={{
            background: 'radial-gradient(ellipse at center, transparent 30%, hsl(var(--background)/0.6) 100%)',
          }}
        />
        
        {/* Corner History Icon - More Subtle */}
        {recentSessions.length > 0 && (
          <div className="absolute top-5 right-5 z-10">
            <Sheet>
              <SheetTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <History className="w-4 h-4 text-muted-foreground/30" />
                </motion.button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="text-left">Cronologia sessioni</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-2 overflow-y-auto max-h-[80vh]">
                  {recentSessions.map((session, index) => (
                    <CompactSessionItem
                      key={session.id}
                      session={session}
                      index={index}
                      onClick={() => setSelectedSessionId(session.id)}
                    />
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}

        {/* Main Content - Zen Centered */}
        <motion.div 
          className="flex-1 flex flex-col justify-center items-center px-6 relative z-[1]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {/* Hero Section - Glassmorphic Orb */}
          <AriaHeroSection
            onStartChat={handleStartChat}
            onStartVoice={handleStartVoice}
          />

          {/* Diary Icons - Minimal at Bottom */}
          <div className="mt-12">
            <DiaryChipsScroll
              activeDiaryIds={activeDiaryIds}
              diaries={diaries}
              onOpenDiary={handleOpenDiary}
              onAddDiary={() => setShowDiaryModal(true)}
            />
          </div>
        </motion.div>
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
