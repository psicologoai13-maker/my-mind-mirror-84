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
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              <h1 className="font-display text-2xl font-bold text-foreground">Il tuo Diario</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-1">Scrivi, rifletti, cresci</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setVoiceModalOpen(true)}
              className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Mic className="w-5 h-5" />
            </Button>
            <Button variant="hero" size="icon" onClick={handleStartSession}>
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="px-5 space-y-6 pb-8">
        {/* Thematic Notebooks Section */}
        <section className="animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-lg text-foreground">
              I Tuoi Quaderni
            </h2>
            <span className="text-xs text-muted-foreground">
              Persistenti ∞
            </span>
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
          <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card animate-slide-up stagger-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary uppercase tracking-wide">Prossima Sessione</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">
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
                      ? "bg-muted text-muted-foreground" 
                      : "bg-primary/10 text-primary"
                  )}>
                    {nextSession.type === 'voice' ? 'Vocale' : 'Chat'}
                  </span>
                </div>
              </div>
              <Button variant="default" size="sm" onClick={handleStartSession}>
                Inizia ora
              </Button>
            </div>
          </div>
        )}

        {/* Journal Timeline */}
        <section className="space-y-4 animate-slide-up stagger-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg text-foreground">
              Cronologia Sessioni
            </h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {journalSessions.length} {journalSessions.length === 1 ? 'voce' : 'voci'}
            </span>
          </div>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-2xl p-4 shadow-soft animate-pulse h-28" />
              ))}
            </div>
          ) : journalSessions.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Nessuna sessione</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Le tue sessioni vocali e chat appariranno qui
              </p>
              <Button variant="default" onClick={handleStartSession}>
                <Plus className="w-4 h-4 mr-2" />
                Nuova sessione
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {journalSessions.slice(0, 5).map((session, index) => (
                <JournalEntryCard
                  key={session.id}
                  session={session}
                  onClick={() => handleSessionClick(session)}
                  index={index}
                />
              ))}
              {journalSessions.length > 5 && (
                <p className="text-center text-xs text-muted-foreground py-2">
                  +{journalSessions.length - 5} altre sessioni
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </MobileLayout>
  );
};

export default Sessions;
