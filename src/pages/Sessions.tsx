import React, { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Plus, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  type: 'weekly' | 'daily' | 'custom';
  completed?: boolean;
}

const upcomingSessions: Session[] = [
  { id: '1', title: 'Sessione settimanale', date: 'Domani', time: '15:00', duration: '30 min', type: 'weekly' },
  { id: '2', title: 'Check-in giornaliero', date: 'Gio 28', time: '09:00', duration: '10 min', type: 'daily' },
  { id: '3', title: 'Sessione approfondimento', date: 'Ven 29', time: '18:00', duration: '45 min', type: 'custom' },
];

const pastSessions: Session[] = [
  { id: '4', title: 'Sessione settimanale', date: 'Lun 23', time: '15:00', duration: '30 min', type: 'weekly', completed: true },
  { id: '5', title: 'Check-in giornaliero', date: 'Mar 24', time: '09:00', duration: '10 min', type: 'daily', completed: true },
  { id: '6', title: 'Sessione emergenza', date: 'Mer 25', time: '20:00', duration: '25 min', type: 'custom', completed: true },
];

const sessionTypeColors = {
  weekly: 'bg-primary-light text-primary',
  daily: 'bg-secondary text-secondary-foreground',
  custom: 'bg-accent text-accent-foreground',
};

const Sessions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  return (
    <MobileLayout>
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Le tue sessioni</h1>
            <p className="text-muted-foreground text-sm mt-1">Gestisci i tuoi appuntamenti</p>
          </div>
          <Button variant="hero" size="icon">
            <Plus className="w-5 h-5" />
          </Button>
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
            In programma
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
            Passate
          </button>
        </div>

        {/* Quick Schedule */}
        <div className="bg-gradient-warm rounded-3xl p-6 border border-border/50 animate-slide-up">
          <h3 className="font-display font-semibold text-foreground mb-4">
            Programma veloce
          </h3>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 flex-col h-auto py-3">
              <span className="text-lg mb-1">🌅</span>
              <span className="text-xs">Mattina</span>
            </Button>
            <Button variant="outline" className="flex-1 flex-col h-auto py-3">
              <span className="text-lg mb-1">☀️</span>
              <span className="text-xs">Pomeriggio</span>
            </Button>
            <Button variant="outline" className="flex-1 flex-col h-auto py-3">
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
          
          {(activeTab === 'upcoming' ? upcomingSessions : pastSessions).map((session, index) => (
            <div
              key={session.id}
              className={cn(
                "bg-card rounded-2xl p-4 shadow-soft animate-slide-up",
                session.completed && "opacity-70"
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      sessionTypeColors[session.type]
                    )}>
                      {session.type === 'weekly' ? 'Settimanale' : session.type === 'daily' ? 'Giornaliero' : 'Personalizzato'}
                    </span>
                    {session.completed && (
                      <span className="flex items-center gap-1 text-xs text-mood-excellent">
                        <Check className="w-3 h-3" />
                        Completata
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-foreground">{session.title}</h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{session.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{session.time} • {session.duration}</span>
                    </div>
                  </div>
                </div>
                {!session.completed && (
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {!session.completed && (
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    Riprogramma
                  </Button>
                  <Button variant="default" size="sm" className="flex-1">
                    Inizia ora
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Weekly Schedule */}
        <div className="bg-card rounded-3xl p-6 shadow-card animate-slide-up stagger-3">
          <h3 className="font-display font-semibold text-lg mb-4 text-foreground">
            Il tuo programma settimanale
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, index) => (
              <div key={index} className="text-center">
                <span className="text-xs text-muted-foreground">{day}</span>
                <div className={cn(
                  "mt-2 w-full aspect-square rounded-xl flex items-center justify-center text-sm font-medium",
                  index === 0 || index === 3 
                    ? "bg-primary text-primary-foreground" 
                    : index === 1 || index === 4
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                )}>
                  {index === 0 || index === 3 ? '1' : index === 1 || index === 4 ? '1' : '-'}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            4 sessioni programmate questa settimana
          </p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Sessions;
