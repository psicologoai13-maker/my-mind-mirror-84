import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenLine, AudioLines, Plus, ChevronRight, Loader2, Sparkles } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { DiaryTheme, ThematicDiary } from '@/hooks/useThematicDiaries';

// Extended diary themes including suggested ones
const ALL_DIARY_THEMES = [
  { id: 'love', label: 'Amore', emoji: '❤️' },
  { id: 'work', label: 'Lavoro', emoji: '💼' },
  { id: 'relationships', label: 'Relazioni', emoji: '👥' },
  { id: 'self', label: 'Me Stesso', emoji: '✨' },
  { id: 'health', label: 'Salute', emoji: '💪' },
  { id: 'family', label: 'Famiglia', emoji: '👨‍👩‍👧' },
  { id: 'dreams', label: 'Sogni', emoji: '🌙' },
  { id: 'gratitude', label: 'Gratitudine', emoji: '🙏' },
];

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

  // Active diaries - default to first 4, stored in localStorage for persistence
  const [activeDiaryIds, setActiveDiaryIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('activeDiaryIds');
    return stored ? JSON.parse(stored) : ['love', 'work', 'relationships', 'self'];
  });

  const recentSessions = journalSessions?.slice(0, 5) || [];

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
    
    // Continue with pending action
    if (pendingAction === 'chat') {
      navigate('/chat');
    } else if (pendingAction === 'voice') {
      setShowVoiceModal(true);
    }
    setPendingAction(null);
  };

  const handleLocationDeny = () => {
    setShowLocationModal(false);
    
    // Continue with pending action anyway
    if (pendingAction === 'chat') {
      navigate('/chat');
    } else if (pendingAction === 'voice') {
      setShowVoiceModal(true);
    }
    setPendingAction(null);
  };

  const handleOpenDiary = (theme: string) => {
    // Check if theme is a valid DiaryTheme
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
    
    // If custom, store the custom label
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

  const getDiaryLabel = (id: string) => {
    const suggested = ALL_DIARY_THEMES.find(d => d.id === id);
    if (suggested) return { emoji: suggested.emoji, label: suggested.label };
    
    const customDiaries = JSON.parse(localStorage.getItem('customDiaries') || '{}');
    if (customDiaries[id]) {
      const parts = customDiaries[id].split(' ');
      return { emoji: parts[0], label: parts.slice(1).join(' ') };
    }
    
    return { emoji: '📝', label: id };
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
      <div className="p-4 pb-28 space-y-6">
        {/* Page Title */}
        <header>
          <h1 className="text-2xl font-semibold text-foreground">Aria</h1>
          <p className="text-sm text-muted-foreground mt-1">Il tuo spazio di riflessione</p>
        </header>

        {/* Session Type Selector - Two Premium Glass Boxes with Aria gradient */}
        <div className="grid grid-cols-2 gap-4">
          {/* Chat Box - Primary accent */}
          <button
            onClick={handleStartChat}
            className={cn(
              "group relative overflow-hidden flex flex-col items-center gap-3 p-5 rounded-3xl",
              "bg-glass backdrop-blur-xl border border-glass-border",
              "shadow-glass hover:shadow-glass-elevated",
              "transition-all duration-300",
              "hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent rounded-3xl" />
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent via-transparent to-white/20 pointer-events-none" />
            
            {/* Decorative elements */}
            <div className="absolute top-2 right-2 opacity-30 group-hover:opacity-50 transition-opacity">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-xl" />
            
            <div className={cn(
              "relative w-14 h-14 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br from-primary to-primary-glow",
              "shadow-glass-glow group-hover:scale-105 transition-transform duration-300"
            )}>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent to-white/25 pointer-events-none" />
              <PenLine className="w-7 h-7 text-white relative z-10" />
            </div>
            <span className="relative z-10 font-semibold text-foreground">Scrivi con Aria</span>
          </button>

          {/* Voice Box - Aria exclusive gradient */}
          <button
            onClick={handleStartVoice}
            className={cn(
              "group relative overflow-hidden flex flex-col items-center gap-3 p-5 rounded-3xl",
              "bg-glass backdrop-blur-xl border border-glass-border",
              "shadow-glass hover:shadow-aria-glow",
              "transition-all duration-300",
              "hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            {/* Aria gradient overlay */}
            <div className="absolute inset-0 bg-gradient-aria-subtle rounded-3xl opacity-60" />
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent via-transparent to-white/20 pointer-events-none" />
            
            {/* Decorative elements */}
            <div className="absolute top-2 right-2 opacity-30 group-hover:opacity-50 transition-opacity">
              <Sparkles className="w-4 h-4 text-aria-violet" />
            </div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-aria rounded-full blur-xl opacity-30" />
            
            <div className={cn(
              "relative w-14 h-14 rounded-2xl flex items-center justify-center",
              "bg-gradient-aria",
              "shadow-aria-glow group-hover:scale-105 transition-transform duration-300"
            )}>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent to-white/30 pointer-events-none" />
              <AudioLines className="w-7 h-7 text-white relative z-10" />
            </div>
            <span className="relative z-10 font-semibold text-foreground">Parla con Aria</span>
          </button>
        </div>

        {/* Thematic Diaries - Glass cards */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">I Tuoi Diari</h2>
            <button
              onClick={() => setShowDiaryModal(true)}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full",
                "bg-glass backdrop-blur-xl border border-glass-border",
                "text-primary hover:shadow-glass-glow transition-all"
              )}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {activeDiaryIds.map(diaryId => {
              const diary = diaries?.find(d => d.theme === diaryId);
              const { emoji, label } = getDiaryLabel(diaryId);
              
              return (
                <button
                  key={diaryId}
                  onClick={() => handleOpenDiary(diaryId)}
                  className={cn(
                    "relative overflow-hidden flex flex-col items-start p-4 rounded-2xl h-24 text-left",
                    "bg-glass backdrop-blur-xl border border-glass-border",
                    "shadow-glass hover:shadow-glass-elevated",
                    "transition-all duration-300",
                    "hover:scale-[1.02] active:scale-[0.98]"
                  )}
                >
                  {/* Inner light */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="relative z-10 w-10 h-10 rounded-xl bg-muted/50 backdrop-blur-sm flex items-center justify-center mb-2">
                    <span className="text-xl">{emoji}</span>
                  </div>
                  <span className="relative z-10 font-medium text-foreground text-sm">{label}</span>
                  {diary && (
                    <span className="relative z-10 text-xs text-muted-foreground mt-0.5">
                      {format(new Date(diary.last_updated_at), 'd MMM', { locale: it })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Session History - Glass cards */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Cronologia</h2>
            <button 
              onClick={() => navigate('/sessions')}
              className="text-sm text-primary font-medium flex items-center gap-1 hover:text-primary/80 transition-colors"
            >
              Vedi tutto
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {sessionsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-aria-violet" />
            </div>
          ) : recentSessions.length === 0 ? (
            <div className={cn(
              "relative overflow-hidden text-center py-8 rounded-2xl",
              "bg-glass backdrop-blur-xl border border-glass-border"
            )}>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
              <p className="relative z-10 text-muted-foreground text-sm">
                Nessuna sessione ancora. Inizia a parlare con Aria!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSessions.map(session => {
                // Extract emotion tags or key theme for preview
                const emotionTags = session.emotion_tags?.slice(0, 2) || [];
                const sessionLabel = session.type === 'voice' ? 'Vocale' : 'Chat';
                const dateLabel = format(new Date(session.start_time), "d MMM", { locale: it });
                const timeLabel = format(new Date(session.start_time), "HH:mm", { locale: it });
                const isVoice = session.type === 'voice';
                
                return (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={cn(
                      "relative overflow-hidden w-full flex items-center gap-3 p-3 rounded-xl text-left",
                      "bg-glass backdrop-blur-xl border border-glass-border",
                      "hover:shadow-glass-glow transition-all duration-300"
                    )}
                  >
                    {/* Inner light */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                    
                    <div 
                      className={cn(
                        "relative z-10 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                        isVoice ? "bg-gradient-aria" : "bg-gradient-to-br from-primary to-primary-glow"
                      )}
                    >
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent to-white/25 pointer-events-none" />
                      {isVoice ? (
                        <AudioLines className="w-5 h-5 text-white relative z-10" />
                      ) : (
                        <PenLine className="w-5 h-5 text-white relative z-10" />
                      )}
                    </div>
                    <div className="relative z-10 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm">
                          {sessionLabel} • {dateLabel}
                        </p>
                        {emotionTags.length > 0 && (
                          <div className="flex gap-1">
                            {emotionTags.map((tag, i) => (
                              <span 
                                key={i} 
                                className={cn(
                                  "text-xs px-1.5 py-0.5 rounded-full",
                                  isVoice 
                                    ? "bg-gradient-aria-subtle text-aria-violet" 
                                    : "bg-primary/10 text-primary"
                                )}
                              >
                                {tag.replace('#', '')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {timeLabel}
                        {session.duration && ` • ${Math.floor(session.duration / 60)} min`}
                      </p>
                    </div>
                    <ChevronRight className="relative z-10 w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                );
              })}
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
