import React from 'react';
import { Button } from '@/components/ui/button';
import { Target, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingAnswers {
  goal?: string;
  mood?: number;
  sleepIssues?: string;
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

const moodLabels = ['Molto difficile', 'Difficile', 'Nella media', 'Abbastanza bene', 'Molto bene'];

const ResultScreen: React.FC<ResultScreenProps> = ({ answers, onComplete }) => {
  const primaryGoal = answers.goal ? goalLabels[answers.goal] : goalLabels.growth;
  const hasSleepIssues = answers.sleepIssues === 'yes' || answers.sleepIssues === 'sometimes';
  const moodLevel = answers.mood ?? 2;

  const focusAreas = [
    primaryGoal.title,
    hasSleepIssues && 'Qualità del Sonno',
    moodLevel < 2 && 'Supporto Emotivo',
  ].filter(Boolean);

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
          In base alle tue risposte, ecco su cosa ci concentreremo insieme
        </p>

        {/* Focus Areas */}
        <div className="w-full max-w-sm space-y-3 mb-10">
          {focusAreas.map((area, index) => (
            <div
              key={index}
              className={cn(
                "p-5 rounded-2xl bg-card shadow-premium flex items-center gap-4",
                "animate-slide-up"
              )}
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <span className="font-medium text-foreground">{area}</span>
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