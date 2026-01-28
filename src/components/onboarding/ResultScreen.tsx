import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Brain, Moon, Heart, Zap, BookOpen, Target, Briefcase, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingAnswers {
  primaryGoals?: string[];
  mood?: number;
  lifeSituation?: string;
  selectedHabits?: string[];
}

interface ResultScreenProps {
  answers: OnboardingAnswers;
  onComplete: () => void;
}

const goalLabels: Record<string, { title: string; icon: React.ReactNode; color: string }> = {
  reduce_anxiety: { 
    title: 'Gestione Ansia', 
    icon: <Brain className="w-5 h-5" />,
    color: 'text-violet-500 bg-violet-500/10',
  },
  improve_sleep: { 
    title: 'Qualità del Sonno', 
    icon: <Moon className="w-5 h-5" />,
    color: 'text-indigo-500 bg-indigo-500/10',
  },
  find_love: { 
    title: 'Relazioni', 
    icon: <Heart className="w-5 h-5" />,
    color: 'text-rose-500 bg-rose-500/10',
  },
  boost_energy: { 
    title: 'Energia & Vitalità', 
    icon: <Zap className="w-5 h-5" />,
    color: 'text-amber-500 bg-amber-500/10',
  },
  express_feelings: { 
    title: 'Espressione Emotiva', 
    icon: <BookOpen className="w-5 h-5" />,
    color: 'text-emerald-500 bg-emerald-500/10',
  },
  personal_growth: { 
    title: 'Crescita Personale', 
    icon: <Target className="w-5 h-5" />,
    color: 'text-teal-500 bg-teal-500/10',
  },
  work_stress: { 
    title: 'Stress Lavoro', 
    icon: <Briefcase className="w-5 h-5" />,
    color: 'text-orange-500 bg-orange-500/10',
  },
  self_esteem: { 
    title: 'Autostima', 
    icon: <Star className="w-5 h-5" />,
    color: 'text-pink-500 bg-pink-500/10',
  },
};

const ResultScreen: React.FC<ResultScreenProps> = ({ answers, onComplete }) => {
  const moodLevel = answers.mood ?? 2;

  // Build focus areas from primary goals
  const focusAreas = (answers.primaryGoals || [])
    .map(goalId => goalLabels[goalId])
    .filter(Boolean);

  // Limit to 4 focus areas
  const displayAreas = focusAreas.slice(0, 4);

  // Count habits selected
  const habitsCount = answers.selectedHabits?.length || 0;

  return (
    <div className="min-h-dvh bg-background flex flex-col px-6 py-8">
      {/* Confetti-like decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-bounce"
            style={{
              left: `${15 + i * 15}%`,
              top: `${10 + (i % 3) * 5}%`,
              backgroundColor: ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444'][i],
              animationDelay: `${i * 0.2}s`,
              animationDuration: '2s',
            }}
          />
        ))}
      </div>

      {/* Header with Icon */}
      <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
        {/* Celebration Icon */}
        <div className="relative mb-6 animate-scale-in">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>
          {/* Sparkle effects */}
          <div className="absolute -top-2 -right-2 text-2xl animate-bounce" style={{ animationDelay: '0.3s' }}>✨</div>
          <div className="absolute -bottom-1 -left-2 text-xl animate-bounce" style={{ animationDelay: '0.6s' }}>🎉</div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2 animate-slide-up">
          Sei pronto/a!
        </h1>
        <p className="text-base text-muted-foreground mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          La tua dashboard è stata personalizzata
        </p>

        {/* Focus Areas - Premium Cards */}
        {displayAreas.length > 0 && (
          <div className="w-full max-w-sm space-y-3 mb-8">
            <p className="text-sm text-muted-foreground mb-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Obiettivi principali:
            </p>
            {displayAreas.map((area, index) => (
              <div
                key={index}
                className={cn(
                  "p-4 rounded-2xl bg-card shadow-soft flex items-center gap-4",
                  "animate-slide-up border-l-4",
                )}
                style={{ 
                  animationDelay: `${0.2 + index * 0.1}s`,
                  borderLeftColor: area.color.includes('violet') ? '#8B5CF6' : 
                                   area.color.includes('indigo') ? '#6366F1' :
                                   area.color.includes('rose') ? '#F43F5E' :
                                   area.color.includes('amber') ? '#F59E0B' :
                                   area.color.includes('emerald') ? '#10B981' :
                                   area.color.includes('teal') ? '#14B8A6' :
                                   area.color.includes('orange') ? '#F97316' :
                                   '#EC4899',
                }}
              >
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center",
                  area.color
                )}>
                  {area.icon}
                </div>
                <span className="font-medium text-foreground">{area.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stats Row */}
        <div 
          className="w-full max-w-sm grid grid-cols-2 gap-3 mb-8 animate-slide-up"
          style={{ animationDelay: '0.5s' }}
        >
          {habitsCount > 0 && (
            <div className="p-4 rounded-2xl bg-card/50 text-center">
              <p className="text-2xl font-bold text-primary">{habitsCount}</p>
              <p className="text-xs text-muted-foreground">Abitudini attive</p>
            </div>
          )}
          <div className="p-4 rounded-2xl bg-card/50 text-center">
            <p className="text-2xl font-bold text-primary">{displayAreas.length}</p>
            <p className="text-xs text-muted-foreground">Obiettivi</p>
          </div>
        </div>

        {/* Encouragement based on mood */}
        <div 
          className="w-full max-w-sm p-4 rounded-2xl bg-muted/30 text-center animate-slide-up"
          style={{ animationDelay: '0.6s' }}
        >
          {moodLevel <= 1 ? (
            <p className="text-sm text-muted-foreground">
              Sono qui per supportarti 💙 Un passo alla volta.
            </p>
          ) : moodLevel >= 4 ? (
            <p className="text-sm text-muted-foreground">
              Fantastico mood! Manteniamolo così 🌟
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Inizia questo percorso con me, insieme ce la faremo! ✨
            </p>
          )}
        </div>
      </div>

      {/* CTA Button */}
      <div className="pt-6 animate-slide-up relative z-10" style={{ animationDelay: '0.7s' }}>
        <Button 
          onClick={onComplete}
          size="lg"
          className="w-full h-14 rounded-full text-base font-medium shadow-premium hover:shadow-elevated transition-all duration-300"
        >
          Inizia il tuo percorso
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ResultScreen;
