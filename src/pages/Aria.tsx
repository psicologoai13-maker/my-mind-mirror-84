import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Mic, Plus, ChevronRight, Loader2 } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card } from '@/components/ui/card';
import { ZenVoiceModal } from '@/components/voice/ZenVoiceModal';
import { useThematicDiaries, DIARY_THEMES } from '@/hooks/useThematicDiaries';
import { useSessions } from '@/hooks/useSessions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import DiaryManagementModal from '@/components/diary/DiaryManagementModal';

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
  const { diaries, isLoading: diariesLoading } = useThematicDiaries();
  const { sessions, isLoading: sessionsLoading } = useSessions();

  // Active diaries - default to first 4, stored in localStorage for persistence
  const [activeDiaryIds, setActiveDiaryIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('activeDiaryIds');
    return stored ? JSON.parse(stored) : ['love', 'work', 'relationships', 'self'];
  });

  const recentSessions = sessions?.slice(0, 5) || [];

  const handleStartChat = () => {
    navigate('/chat');
  };

  const handleOpenDiary = (theme: string) => {
    navigate(`/sessions?diary=${theme}`);
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

  return (
    <MobileLayout>
      <div className="p-4 pb-28 space-y-6">
        {/* Session Type Selector - Two Boxes */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleStartChat}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <span className="font-medium text-foreground text-sm">Scrivi con Aria</span>
          </button>

          <button
            onClick={() => setShowVoiceModal(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-purple-100/50 to-primary/5 border border-purple-200/50 hover:border-purple-300 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Mic className="w-6 h-6 text-purple-600" />
            </div>
            <span className="font-medium text-foreground text-sm">Parla con Aria</span>
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
              {recentSessions.map(session => (
                <div
                  key={session.id}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    {session.type === 'voice' ? (
                      <Mic className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <MessageCircle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {session.ai_summary || `Sessione ${session.type === 'voice' ? 'vocale' : 'chat'}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(session.start_time), "d MMM, HH:mm", { locale: it })}
                      {session.duration && ` • ${session.duration} min`}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
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
    </MobileLayout>
  );
};

export default Aria;
