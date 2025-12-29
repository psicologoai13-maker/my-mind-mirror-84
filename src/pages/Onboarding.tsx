import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingLayout from '@/components/onboarding/OnboardingLayout';
import QuizStep from '@/components/onboarding/QuizStep';
import EmojiSlider from '@/components/onboarding/EmojiSlider';
import AnalyzingScreen from '@/components/onboarding/AnalyzingScreen';
import ResultScreen from '@/components/onboarding/ResultScreen';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

interface OnboardingAnswers {
  goal: string | null;
  mood: number;
  sleepIssues: string | null;
}

const goalOptions = [
  { id: 'anxiety', label: 'Ridurre l\'ansia', emoji: '🧘', description: 'Gestire stress e preoccupazioni' },
  { id: 'sleep', label: 'Dormire meglio', emoji: '😴', description: 'Migliorare la qualità del sonno' },
  { id: 'growth', label: 'Crescita personale', emoji: '🌱', description: 'Sviluppo e consapevolezza' },
  { id: 'mood', label: 'Migliorare l\'umore', emoji: '☀️', description: 'Sentirsi più positivi' },
];

const sleepOptions = [
  { id: 'yes', label: 'Sì, spesso', emoji: '😔' },
  { id: 'sometimes', label: 'A volte', emoji: '😕' },
  { id: 'no', label: 'No, dormo bene', emoji: '😊' },
];

type Step = 'goal' | 'mood' | 'sleep' | 'analyzing' | 'result';

// Map onboarding goals to dashboard metrics
const getPersonalizedMetrics = (answers: OnboardingAnswers): string[] => {
  const metrics: string[] = [];
  
  // Always include mood
  metrics.push('mood');
  
  // Based on goal
  switch (answers.goal) {
    case 'anxiety':
      metrics.push('anxiety');
      break;
    case 'sleep':
      metrics.push('sleep');
      break;
    case 'growth':
      metrics.push('growth');
      break;
    case 'mood':
      metrics.push('joy');
      break;
    default:
      metrics.push('anxiety');
  }
  
  // Based on sleep issues
  if (answers.sleepIssues === 'yes' || answers.sleepIssues === 'sometimes') {
    if (!metrics.includes('sleep')) {
      metrics.push('sleep');
    }
  }
  
  // Based on mood level
  if (answers.mood < 2) {
    metrics.push('sadness');
  } else {
    metrics.push('energy');
  }
  
  // Ensure we have exactly 4 unique metrics
  const allMetrics = ['mood', 'anxiety', 'energy', 'sleep', 'joy', 'sadness', 'love', 'work'];
  const uniqueMetrics = [...new Set(metrics)];
  
  while (uniqueMetrics.length < 4) {
    const nextMetric = allMetrics.find(m => !uniqueMetrics.includes(m));
    if (nextMetric) uniqueMetrics.push(nextMetric);
    else break;
  }
  
  return uniqueMetrics.slice(0, 4);
};

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { updateProfile } = useProfile();
  
  const [currentStep, setCurrentStep] = useState<Step>('goal');
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    goal: null,
    mood: 2,
    sleepIssues: null,
  });

  const stepOrder: Step[] = ['goal', 'mood', 'sleep', 'analyzing', 'result'];
  const currentIndex = stepOrder.indexOf(currentStep);
  const quizSteps = 3;

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < stepOrder.length) {
      setCurrentStep(stepOrder[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(stepOrder[prevIndex]);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'goal':
        return answers.goal !== null;
      case 'mood':
        return true;
      case 'sleep':
        return answers.sleepIssues !== null;
      default:
        return false;
    }
  };

  const handleComplete = async () => {
    try {
      // Calculate personalized metrics based on answers
      const personalizedMetrics = getPersonalizedMetrics(answers);
      
      await updateProfile.mutateAsync({
        onboarding_completed: true,
        onboarding_answers: answers,
        active_dashboard_metrics: personalizedMetrics,
      } as any);
      
      toast.success('Profilo personalizzato!');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error saving onboarding:', error);
      toast.error('Errore nel salvataggio');
      navigate('/', { replace: true });
    }
  };

  // Analyzing and Result screens don't show standard layout
  if (currentStep === 'analyzing') {
    return <AnalyzingScreen onComplete={handleNext} />;
  }

  if (currentStep === 'result') {
    return (
      <ResultScreen 
        answers={{
          goal: answers.goal ?? undefined,
          mood: answers.mood,
          sleepIssues: answers.sleepIssues ?? undefined,
        }}
        onComplete={handleComplete}
      />
    );
  }

  return (
    <OnboardingLayout 
      currentStep={currentIndex + 1} 
      totalSteps={quizSteps}
    >
      {/* Step Content */}
      {currentStep === 'goal' && (
        <QuizStep
          title="Qual è il tuo obiettivo principale?"
          subtitle="Scegli quello che ti sta più a cuore"
          options={goalOptions}
          selectedValue={answers.goal}
          onSelect={(value) => setAnswers(prev => ({ ...prev, goal: value }))}
        />
      )}

      {currentStep === 'mood' && (
        <EmojiSlider
          title="Come ti senti ultimamente?"
          subtitle="Seleziona l'emoji che meglio rappresenta il tuo stato"
          value={answers.mood}
          onChange={(value) => setAnswers(prev => ({ ...prev, mood: value }))}
        />
      )}

      {currentStep === 'sleep' && (
        <QuizStep
          title="Hai problemi di sonno?"
          subtitle="Difficoltà ad addormentarti o risvegli notturni"
          options={sleepOptions}
          selectedValue={answers.sleepIssues}
          onSelect={(value) => setAnswers(prev => ({ ...prev, sleepIssues: value }))}
        />
      )}

      {/* Navigation */}
      <div className="px-6 pb-8 pt-4 flex gap-3">
        {currentIndex > 0 && (
          <Button
            variant="outline"
            onClick={handleBack}
            className="h-14 px-6 rounded-full border-border"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <Button
          onClick={handleNext}
          disabled={!canProceed()}
          className="flex-1 h-14 rounded-full text-base font-medium shadow-premium hover:shadow-elevated transition-all duration-300 disabled:opacity-50"
        >
          Continua
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </OnboardingLayout>
  );
};

export default Onboarding;