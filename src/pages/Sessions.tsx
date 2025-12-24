import React, { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Plus, Check, X, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessions } from '@/hooks/useSessions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { VoiceSessionModal } from '@/components/voice/VoiceSessionModal';

const sessionTypeColors = {
  weekly: 'bg-primary-light text-primary',
  daily: 'bg-secondary text-secondary-foreground',
  custom: 'bg-accent text-accent-foreground',
};

const Sessions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const { upcomingSessions, completedSessions, createSession, updateSession, isLoading } = useSessions();
  const navigate = useNavigate();

  const handleStartSession = () => {
    navigate('/chat');
  };

  const handleScheduleSession = async (timeOfDay: string) => {
    const now = new Date();
    let startTime = new Date();
    
    if (timeOfDay === 'morning') {
      startTime.setHours(9, 0, 0, 0);
      if (now.getHours() >= 9) startTime.setDate(startTime.getDate() + 1);
    } else if (timeOfDay === 'afternoon') {
      startTime.setHours(15, 0, 0, 0);
      if (now.getHours() >= 15) startTime.setDate(startTime.getDate() + 1);
    } else {
      startTime.setHours(20, 0, 0, 0);
      if (now.getHours() >= 20) startTime.setDate(startTime.getDate() + 1);
    }
    
    try {
      await createSession.mutateAsync({
        start_time: startTime.toISOString(),
        type: 'chat',
        status: 'scheduled',
      });
      toast.success('Sessione programmata!');
    } catch (error) {
      toast.error('Errore nella programmazione');
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    try {
      await updateSession.mutateAsync({ id: sessionId, status: 'cancelled' });
      toast.success('Sessione cancellata');
    } catch (error) {
      toast.error('Errore nella cancellazione');
    }
  };

  const formatSessionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Oggi';
    if (date.toDateString() === tomorrow.toDateString()) return 'Domani';
    return format(date, 'EEE d', { locale: it });
  };

  const currentSessions = activeTab === 'upcoming' ? upcomingSessions : completedSessions;

  return (
    <MobileLayout>
      <VoiceSessionModal 
        open={voiceModalOpen} 
        onOpenChange={setVoiceModalOpen} 
      />
      
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Le tue sessioni</h1>
            <p className="text-muted-foreground text-sm mt-1">Gestisci i tuoi appuntamenti</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setVoiceModalOpen(true)}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
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
        {/* Tabs */}
        <div className="flex gap-2 bg-muted p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
              activeTab === 'upcoming' 
                ? "bg-card text-foreground shadow-soft" 
                : "text-muted-foreground"
            )}
          >
            In programma ({upcomingSessions.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
              activeTab === 'past' 
                ? "bg-card text-foreground shadow-soft" 
                : "text-muted-foreground"
            )}
          >
            Passate ({completedSessions.length})
          </button>
        </div>

        {/* Quick Schedule */}
        <div className="bg-gradient-warm rounded-3xl p-6 border border-border/50 animate-slide-up">
          <h3 className="font-display font-semibold text-foreground mb-4">
            Programma veloce
          </h3>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 flex-col h-auto py-3"
              onClick={() => handleScheduleSession('morning')}
              disabled={createSession.isPending}
            >
              <span className="text-lg mb-1">🌅</span>
              <span className="text-xs">Mattina</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 flex-col h-auto py-3"
              onClick={() => handleScheduleSession('afternoon')}
              disabled={createSession.isPending}
            >
              <span className="text-lg mb-1">☀️</span>
              <span className="text-xs">Pomeriggio</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 flex-col h-auto py-3"
              onClick={() => handleScheduleSession('evening')}
              disabled={createSession.isPending}
            >
              <span className="text-lg mb-1">🌙</span>
              <span className="text-xs">Sera</span>
            </Button>
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-lg text-foreground">
            {activeTab === 'upcoming' ? 'Prossime sessioni' : 'Sessioni completate'}
          </h3>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-2xl p-4 shadow-soft animate-pulse h-32" />
              ))}
            </div>
          ) : currentSessions.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 shadow-soft text-center">
              <span className="text-4xl mb-3 block">
                {activeTab === 'upcoming' ? '📅' : '📝'}
              </span>
              <p className="text-muted-foreground">
                {activeTab === 'upcoming' 
                  ? 'Nessuna sessione programmata'
                  : 'Nessuna sessione completata ancora'
                }
              </p>
              {activeTab === 'upcoming' && (
                <Button variant="default" className="mt-4" onClick={handleStartSession}>
                  Inizia ora
                </Button>
              )}
            </div>
          ) : (
            currentSessions.map((session, index) => (
              <div
                key={session.id}
                className={cn(
                  "bg-card rounded-2xl p-4 shadow-soft animate-slide-up",
                  session.status === 'completed' && "opacity-70"
                )}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        session.type === 'voice' ? sessionTypeColors.custom : sessionTypeColors.weekly
                      )}>
                        {session.type === 'voice' ? 'Vocale' : 'Chat'}
                      </span>
                      {session.status === 'completed' && (
                        <span className="flex items-center gap-1 text-xs text-mood-excellent">
                          <Check className="w-3 h-3" />
                          Completata
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-foreground">
                      Sessione {session.type === 'voice' ? 'vocale' : 'chat'}
                    </h4>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatSessionDate(session.start_time)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {format(new Date(session.start_time), 'HH:mm')}
                          {session.duration && ` • ${Math.round(session.duration / 60)} min`}
                        </span>
                      </div>
                    </div>
                    {session.ai_summary && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {session.ai_summary}
                      </p>
                    )}
                    {session.emotion_tags && session.emotion_tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {session.emotion_tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {session.status === 'scheduled' && (
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="text-muted-foreground"
                      onClick={() => handleCancelSession(session.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {session.status === 'scheduled' && (
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleCancelSession(session.id)}
                    >
                      Cancella
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex-1"
                      onClick={handleStartSession}
                    >
                      Inizia ora
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Weekly Schedule Summary */}
        <div className="bg-card rounded-3xl p-6 shadow-card animate-slide-up stagger-3">
          <h3 className="font-display font-semibold text-lg mb-4 text-foreground">
            Il tuo programma settimanale
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, index) => {
              const sessionsOnDay = upcomingSessions.filter(s => {
                const d = new Date(s.start_time);
                return d.getDay() === (index === 6 ? 0 : index + 1);
              }).length;
              
              return (
                <div key={index} className="text-center">
                  <span className="text-xs text-muted-foreground">{day}</span>
                  <div className={cn(
                    "mt-2 w-full aspect-square rounded-xl flex items-center justify-center text-sm font-medium",
                    sessionsOnDay > 0
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {sessionsOnDay > 0 ? sessionsOnDay : '-'}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            {upcomingSessions.length} session{upcomingSessions.length !== 1 ? 'i' : 'e'} programmat{upcomingSessions.length !== 1 ? 'e' : 'a'} questa settimana
          </p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Sessions;
