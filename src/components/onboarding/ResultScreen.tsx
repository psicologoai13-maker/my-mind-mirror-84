import React from 'react';
import { Button } from '@/components/ui/button';
import { Target, Sparkles, ArrowRight, Brain, Moon, Heart, Zap, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingAnswers {
  goal?: string;
  primaryGoals?: string[];
  mood?: number;
  sleepIssues?: string;
  mainChallenge?: string;
  lifeSituation?: string;
  supportType?: string;
  anxietyLevel?: number;
  selectedHabits?: string[];
}

interface ResultScreenProps {
  answers: OnboardingAnswers;
  onComplete: () => void;
}

const goalLabels: Record<string, { title: string; icon: string }> = {
  anxiety: { title: 'Ridurre l\'Ansia', icon: '🧘' },
  sleep: { title: 'Dormire Meglio', icon: '😴' },
  growth: { title: 'Crescita Personale', icon: '🌱' },
  mood: { title: 'Migliorare l\'Umore', icon: '☀️' },
};

const primaryGoalLabels: Record<string, { title: string; icon: React.ReactNode; color: string }> = {
  reduce_anxiety: { 
    title: 'Gestione Ansia', 
    icon: <Brain className="w-5 h-5" />,
    color: 'text-violet-500 bg-violet-50',
  },
  improve_sleep: { 
    title: 'Qualità del Sonno', 
    icon: <Moon className="w-5 h-5" />,
    color: 'text-indigo-500 bg-indigo-50',
  },
  find_love: { 
    title: 'Relazioni & Connessioni', 
    icon: <Heart className="w-5 h-5" />,
    color: 'text-rose-500 bg-rose-50',
  },
  boost_energy: { 
    title: 'Energia & Vitalità', 
    icon: <Zap className="w-5 h-5" />,
    color: 'text-amber-500 bg-amber-50',
  },
  express_feelings: { 
    title: 'Espressione Emotiva', 
    icon: <BookOpen className="w-5 h-5" />,
    color: 'text-emerald-500 bg-emerald-50',
  },
};

// Challenge labels for display
const challengeLabels: Record<string, { title: string; icon: React.ReactNode; color: string }> = {
  work_stress: { 
    title: 'Stress Lavorativo', 
    icon: <Zap className="w-5 h-5" />,
    color: 'text-orange-500 bg-orange-50',
  },
  relationships: { 
    title: 'Relazioni', 
    icon: <Heart className="w-5 h-5" />,
    color: 'text-rose-500 bg-rose-50',
  },
  self_esteem: { 
    title: 'Autostima', 
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-purple-500 bg-purple-50',
  },
  loneliness: { 
    title: 'Solitudine', 
    icon: <Heart className="w-5 h-5" />,
    color: 'text-blue-500 bg-blue-50',
  },
  general_anxiety: { 
    title: 'Ansia', 
    icon: <Brain className="w-5 h-5" />,
    color: 'text-violet-500 bg-violet-50',
  },
  life_transition: { 
    title: 'Cambiamenti di Vita', 
    icon: <BookOpen className="w-5 h-5" />,
    color: 'text-teal-500 bg-teal-50',
  },
};

const moodLabels = ['Molto difficile', 'Difficile', 'Nella media', 'Abbastanza bene', 'Molto bene'];

const ResultScreen: React.FC<ResultScreenProps> = ({ answers, onComplete }) => {
  const hasSleepIssues = answers.sleepIssues === 'yes' || answers.sleepIssues === 'sometimes';
  const moodLevel = answers.mood ?? 2;
  const anxietyLevel = answers.anxietyLevel ?? 2;

  // Build focus areas from primary goals
  const focusAreas = (answers.primaryGoals || [])
    .map(goalId => primaryGoalLabels[goalId])
    .filter(Boolean);

  // Add main challenge if present
  if (answers.mainChallenge && challengeLabels[answers.mainChallenge]) {
    const challenge = challengeLabels[answers.mainChallenge];
    if (!focusAreas.some(a => a.title === challenge.title)) {
      focusAreas.push(challenge);
    }
  }

  // Add sleep if user has sleep issues and didn't select it
  if (hasSleepIssues && !answers.primaryGoals?.includes('improve_sleep')) {
    focusAreas.push(primaryGoalLabels.improve_sleep);
  }

  // Add anxiety support if high anxiety reported
  if (anxietyLevel >= 3 && !answers.primaryGoals?.includes('reduce_anxiety')) {
    focusAreas.push(primaryGoalLabels.reduce_anxiety);
  }

  // Add mood support if user is struggling
  if (moodLevel < 2 && focusAreas.length < 4) {
    focusAreas.push({
      title: 'Supporto Emotivo',
      icon: <Heart className="w-5 h-5" />,
      color: 'text-rose-500 bg-rose-50',
    });
  }

  // Limit to 4 focus areas
  const displayAreas = focusAreas.slice(0, 4);

  return (
    <div className="min-h-dvh bg-background flex flex-col px-6 py-8">
      {/* Header with Icon */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Celebration Icon */}
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-scale-in">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground mb-3 animate-slide-up">
          Il Tuo Piano Personalizzato
        </h1>
        <p className="text-base text-muted-foreground mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          La tua dashboard sarà ottimizzata per questi obiettivi
        </p>

        {/* Focus Areas - Premium Cards */}
        <div className="w-full max-w-sm space-y-3 mb-10">
          {displayAreas.map((area, index) => (
            <div
              key={index}
              className={cn(
                "p-5 rounded-2xl bg-card shadow-premium flex items-center gap-4",
                "animate-slide-up"
              )}
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                area.color
              )}>
                {area.icon}
              </div>
              <div className="flex-1 text-left">
                <span className="font-medium text-foreground">{area.title}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Mood Summary */}
        <div 
          className="w-full max-w-sm p-4 rounded-2xl bg-muted/50 animate-slide-up"
          style={{ animationDelay: '0.5s' }}
        >
          <p className="text-sm text-muted-foreground">
            Stato attuale: <span className="font-medium text-foreground">{moodLabels[moodLevel]}</span>
          </p>
        </div>
      </div>

      {/* CTA Button */}
      <div className="pt-6 animate-slide-up" style={{ animationDelay: '0.6s' }}>
        <Button 
          onClick={onComplete}
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
