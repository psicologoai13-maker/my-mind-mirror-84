import React, { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Clock, Plus, Mic, BookOpen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessions, Session } from '@/hooks/useSessions';
import { useThematicDiaries, DiaryTheme, DIARY_THEMES } from '@/hooks/useThematicDiaries';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { VoiceSessionModal } from '@/components/voice/VoiceSessionModal';
import JournalEntryCard from '@/components/sessions/JournalEntryCard';
import SessionDetailModal from '@/components/sessions/SessionDetailModal';
import DiaryNotebookCard from '@/components/diary/DiaryNotebookCard';
import ThematicChatInterface from '@/components/diary/ThematicChatInterface';

const PAGE_SIZE = 8;

const SessionsList: React.FC<{
  sessions: Session[];
  onSessionClick: (s: Session) => void;
}> = ({ sessions, onSessionClick }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = sessions.slice(0, visibleCount);
  const remaining = sessions.length - visibleCount;

  return (
    <div className="space-y-2">
      {visible.map((session, index) => (
        <JournalEntryCard
          key={session.id}
          session={session}
          onClick={() => onSessionClick(session)}
          index={index}
        />
      ))}
      {remaining > 0 && (
        <button
          onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
          className="w-full text-center text-xs text-primary font-medium py-3 hover:bg-muted/50 rounded-xl transition-colors"
        >
          Mostra altre {Math.min(remaining, PAGE_SIZE)} di {remaining} sessioni
        </button>
      )}
    </div>
  );
};

const Sessions: React.FC = () => {
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState<DiaryTheme | null>(null);
  
  const { 
    upcomingSessions, 
    journalSessions, 
    deleteSession,
    isLoading 
  } = useSessions();
  
  const { diaries, getDiary, isLoading: isDiariesLoading } = useThematicDiaries();
  const navigate = useNavigate();

  const handleStartSession = () => {
    navigate('/chat');
  };

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
    setDetailModalOpen(true);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession.mutateAsync(sessionId);
      setDetailModalOpen(false);
      setSelectedSession(null);
      toast.success('Sessione eliminata');
    } catch (error) {
      toast.error('Errore nella eliminazione');
    }
  };

  const formatUpcomingDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Oggi';
    if (date.toDateString() === tomorrow.toDateString()) return 'Domani';
    return format(date, 'EEEE d MMMM', { locale: it });
  };

  // Get next upcoming session
  const nextSession = upcomingSessions.length > 0 
    ? upcomingSessions.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0]
    : null;

  // If a thematic diary is active, show the chat interface
  if (activeTheme) {
    return (
      <MobileLayout hideNav>
        <ThematicChatInterface
          theme={activeTheme}
          diary={getDiary(activeTheme)}
          onBack={() => setActiveTheme(null)}
        />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <VoiceSessionModal 
        open={voiceModalOpen} 
        onOpenChange={setVoiceModalOpen} 
      />
      
      <SessionDetailModal
        session={selectedSession}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onDelete={handleDeleteSession}
        isDeleting={deleteSession.isPending}
      />
      
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Diario</h1>
            <p className="text-muted-foreground text-sm mt-1">Scrivi, rifletti, cresci</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setVoiceModalOpen(true)}
              className="rounded-2xl bg-card shadow-soft"
            >
              <Mic className="w-5 h-5 text-primary" />
            </Button>
            <Button 
              variant="default" 
              size="icon" 
              onClick={handleStartSession}
              className="rounded-2xl shadow-soft"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="px-5 space-y-6 pb-8">
        {/* Thematic Notebooks Section */}
        <section className="animate-slide-up">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-xl">📔</span>
            <h2 className="font-display font-semibold text-sm text-foreground">
              I Tuoi Quaderni
            </h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {DIARY_THEMES.map((themeConfig) => (
              <DiaryNotebookCard
                key={themeConfig.theme}
                theme={themeConfig.theme}
                diary={getDiary(themeConfig.theme)}
                onClick={() => setActiveTheme(themeConfig.theme)}
              />
            ))}
          </div>
        </section>

        {/* Next Session Card */}
        {nextSession && (
          <div className={cn(
            "relative overflow-hidden rounded-3xl p-5",
            "bg-glass/30 backdrop-blur-xl border border-glass-border/60",
            "shadow-glass animate-slide-up"
          )}>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">⏰</span>
                <span className="text-xs font-medium text-primary uppercase tracking-wide">Prossima Sessione</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold text-foreground">
                    {formatUpcomingDate(nextSession.start_time)}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{format(new Date(nextSession.start_time), 'HH:mm')}</span>
                    </div>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      nextSession.type === 'voice' 
                        ? "bg-muted/50 text-muted-foreground" 
                        : "bg-primary/10 text-primary"
                    )}>
                      {nextSession.type === 'voice' ? 'Vocale' : 'Chat'}
                    </span>
                  </div>
                </div>
                <Button variant="default" size="sm" className="rounded-xl" onClick={handleStartSession}>
                  Inizia ora
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Journal Timeline */}
        <section className="space-y-3 animate-slide-up stagger-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📜</span>
            <h2 className="font-display font-semibold text-sm text-foreground">
              Cronologia
            </h2>
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground">
              {journalSessions.length} {journalSessions.length === 1 ? 'sessione' : 'sessioni'}
            </span>
          </div>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-2xl p-3 shadow-premium animate-pulse h-16" />
              ))}
            </div>
          ) : journalSessions.length === 0 ? (
            <div className={cn(
              "relative overflow-hidden rounded-3xl p-8 text-center",
              "bg-glass/30 backdrop-blur-xl border border-glass-border/60",
              "shadow-glass"
            )}>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="text-5xl mb-4">📖</div>
                <h3 className="font-display font-semibold text-foreground mb-2">Nessuna sessione</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Le tue sessioni appariranno qui
                </p>
                <Button variant="default" className="rounded-xl" onClick={handleStartSession}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuova sessione
                </Button>
              </div>
            </div>
          ) : (
            <SessionsList 
              sessions={journalSessions}
              onSessionClick={handleSessionClick}
            />
          )}
        </section>
      </div>
    </MobileLayout>
  );
};

export default Sessions;
