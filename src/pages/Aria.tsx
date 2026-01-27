import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenLine, AudioLines, Plus, ChevronRight, Loader2, Sparkles, MessageCircle, Mic } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import { ZenVoiceModal } from '@/components/voice/ZenVoiceModal';
import { useThematicDiaries } from '@/hooks/useThematicDiaries';
import { useSessions } from '@/hooks/useSessions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import DiaryManagementModal from '@/components/diary/DiaryManagementModal';
import ThematicChatInterface from '@/components/diary/ThematicChatInterface';
import SessionDetailModal from '@/components/sessions/SessionDetailModal';
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
  const [selectedDiaryTheme, setSelectedDiaryTheme] = useState<DiaryTheme | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const { diaries, isLoading: diariesLoading } = useThematicDiaries();
  const { journalSessions, isLoading: sessionsLoading } = useSessions();

  // Active diaries - default to first 4, stored in localStorage for persistence
  const [activeDiaryIds, setActiveDiaryIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('activeDiaryIds');
    return stored ? JSON.parse(stored) : ['love', 'work', 'relationships', 'self'];
  });

  const recentSessions = journalSessions?.slice(0, 5) || [];

  const handleStartChat = () => {
    navigate('/chat');
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
          <p className="text-muted-foreground text-sm mt-1">La tua compagna di benessere mentale</p>
        </header>

        {/* Session Type Selector - Two Premium Boxes */}
        <div className="grid grid-cols-2 gap-4">
          {/* Chat Box */}
          <button
            onClick={handleStartChat}
            className="group relative overflow-hidden flex flex-col items-center gap-3 p-5 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200/60 hover:border-emerald-300 hover:shadow-lg transition-all duration-300"
          >
            {/* Decorative elements */}
            <div className="absolute top-2 right-2 opacity-20 group-hover:opacity-40 transition-opacity">
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-emerald-200/30 to-transparent rounded-full blur-xl" />
            
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200/50 group-hover:scale-105 transition-transform duration-300">
              <PenLine className="w-7 h-7 text-white" />
            </div>
            <span className="font-semibold text-foreground">Scrivi con Aria</span>
          </button>

          {/* Voice Box */}
          <button
            onClick={() => setShowVoiceModal(true)}
            className="group relative overflow-hidden flex flex-col items-center gap-3 p-5 rounded-3xl bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 border border-violet-200/60 hover:border-violet-300 hover:shadow-lg transition-all duration-300"
          >
            {/* Decorative elements */}
            <div className="absolute top-2 right-2 opacity-20 group-hover:opacity-40 transition-opacity">
              <Sparkles className="w-4 h-4 text-violet-500" />
            </div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-violet-200/30 to-transparent rounded-full blur-xl" />
            
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-200/50 group-hover:scale-105 transition-transform duration-300">
              <AudioLines className="w-7 h-7 text-white" />
            </div>
            <span className="font-semibold text-foreground">Parla con Aria</span>
          </button>
        </div>

        {/* Thematic Diaries */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">I Tuoi Diari</h2>
            <button
              onClick={() => setShowDiaryModal(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
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
                  className="flex flex-col items-start p-4 rounded-2xl bg-card border border-border shadow-card hover:shadow-md transition-all text-left h-24"
                >
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-2">
                    <span className="text-xl">{emoji}</span>
                  </div>
                  <span className="font-medium text-foreground text-sm">{label}</span>
                  {diary && (
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(diary.last_updated_at), 'd MMM', { locale: it })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Session History */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Cronologia</h2>
            <button 
              onClick={() => navigate('/sessions')}
              className="text-sm text-primary font-medium flex items-center gap-1"
            >
              Vedi tutto
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {sessionsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-2xl">
              <p className="text-muted-foreground text-sm">
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
                
                return (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                      style={{
                        background: session.type === 'voice' 
                          ? 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' 
                          : 'linear-gradient(135deg, #34d399 0%, #14b8a6 100%)'
                      }}
                    >
                      {session.type === 'voice' ? (
                        <Mic className="w-5 h-5 text-white" />
                      ) : (
                        <MessageCircle className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm">
                          {sessionLabel} • {dateLabel}
                        </p>
                        {emotionTags.length > 0 && (
                          <div className="flex gap-1">
                            {emotionTags.map((tag, i) => (
                              <span key={i} className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
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
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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
    </MobileLayout>
  );
};

export default Aria;
