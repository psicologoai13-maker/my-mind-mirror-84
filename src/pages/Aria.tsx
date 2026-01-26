import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Mic, Heart, Briefcase, Users, Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card } from '@/components/ui/card';
import { ZenVoiceModal } from '@/components/voice/ZenVoiceModal';
import { useThematicDiaries } from '@/hooks/useThematicDiaries';
import { useSessions } from '@/hooks/useSessions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const DIARY_THEMES = [
  { id: 'love', label: 'Amore', emoji: '❤️', icon: Heart, color: 'text-rose-500' },
  { id: 'work', label: 'Lavoro', emoji: '💼', icon: Briefcase, color: 'text-amber-600' },
  { id: 'relationships', label: 'Relazioni', emoji: '👥', icon: Users, color: 'text-blue-500' },
  { id: 'self', label: 'Me Stesso', emoji: '✨', icon: Sparkles, color: 'text-purple-500' },
];

const Aria: React.FC = () => {
  const navigate = useNavigate();
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const { diaries, isLoading: diariesLoading } = useThematicDiaries();
  const { sessions, isLoading: sessionsLoading } = useSessions();

  const recentSessions = sessions?.slice(0, 5) || [];

  const handleStartChat = () => {
    navigate('/chat');
  };

  const handleOpenDiary = (theme: string) => {
    navigate(`/sessions?diary=${theme}`);
  };

  return (
    <MobileLayout>
      <div className="p-4 pb-28 space-y-6">
        {/* Header */}
        <div className="text-center pt-2">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary/20 via-purple-100 to-primary/30 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Aria</h1>
          <p className="text-sm text-muted-foreground">La tua compagna di vita</p>
        </div>

        {/* Session Type Selector */}
        <Card className="p-4 bg-card border-border shadow-card">
          <h2 className="font-semibold text-foreground mb-3">Inizia Sessione</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleStartChat}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium text-foreground">Chat</span>
              <span className="text-xs text-muted-foreground">Scrivi con Aria</span>
            </button>

            <button
              onClick={() => setShowVoiceModal(true)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-purple-100/50 to-primary/5 border border-purple-200/50 hover:border-purple-300 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Mic className="w-6 h-6 text-purple-600" />
              </div>
              <span className="font-medium text-foreground">Voce</span>
              <span className="text-xs text-muted-foreground">Parla con Aria</span>
            </button>
          </div>
        </Card>

        {/* Thematic Diaries */}
        <section>
          <h2 className="font-semibold text-foreground mb-3">I Tuoi Quaderni</h2>
          <div className="grid grid-cols-2 gap-3">
            {DIARY_THEMES.map(theme => {
              const diary = diaries?.find(d => d.theme === theme.id);
              const Icon = theme.icon;
              
              return (
                <button
                  key={theme.id}
                  onClick={() => handleOpenDiary(theme.id)}
                  className="flex flex-col items-start p-4 rounded-2xl bg-card border border-border shadow-card hover:shadow-md transition-all text-left"
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2", 
                    theme.id === 'love' && "bg-rose-100",
                    theme.id === 'work' && "bg-amber-100",
                    theme.id === 'relationships' && "bg-blue-100",
                    theme.id === 'self' && "bg-purple-100"
                  )}>
                    <span className="text-xl">{theme.emoji}</span>
                  </div>
                  <span className="font-medium text-foreground">{theme.label}</span>
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
    </MobileLayout>
  );
};

export default Aria;
