import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingLayout from '@/components/onboarding/OnboardingLayout';
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import NameInputStep from '@/components/onboarding/NameInputStep';
import QuizStep from '@/components/onboarding/QuizStep';
import ChipGridStep from '@/components/onboarding/ChipGridStep';
import EmojiSlider from '@/components/onboarding/EmojiSlider';
import VicesStep from '@/components/onboarding/VicesStep';
import LifestyleStep from '@/components/onboarding/LifestyleStep';
import PhysicalDataStep from '@/components/onboarding/PhysicalDataStep';
import AnalyzingScreen from '@/components/onboarding/AnalyzingScreen';
import ResultScreen from '@/components/onboarding/ResultScreen';
import HabitsSelectionStep from '@/components/onboarding/HabitsSelectionStep';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useHabits } from '@/hooks/useHabits';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { toast } from 'sonner';

interface PhysicalData {
  weight?: number;
  height?: number;
  birthYear?: number;
}

interface OnboardingAnswers {
  name: string;
  primaryGoals: string[];
  lifeSituation: string | null;
  currentMood: number;
  vices: string[];
  lifestyle: string[];
  physicalData: PhysicalData;
  selectedHabits: string[];
}

interface DashboardConfig {
  priority_metrics: string[];
  secondary_metrics: string[];
  hidden_metrics: string[];
  theme: string;
}

// Goal options with emoji for gamified feel
const primaryGoalOptions = [
  { id: 'reduce_anxiety', label: 'Gestire l\'ansia', emoji: '🧘' },
  { id: 'improve_sleep', label: 'Dormire meglio', emoji: '😴' },
  { id: 'boost_energy', label: 'Più energia', emoji: '⚡' },
  { id: 'find_love', label: 'Migliorare relazioni', emoji: '💕' },
  { id: 'express_feelings', label: 'Sfogarmi/Diario', emoji: '📝' },
  { id: 'personal_growth', label: 'Crescita personale', emoji: '🌱' },
  { id: 'work_stress', label: 'Stress lavoro', emoji: '💼' },
  { id: 'self_esteem', label: 'Autostima', emoji: '🪞' },
];

const lifeSituationOptions = [
  { id: 'stable', label: 'Stabile ma voglio di più', emoji: '😐', description: 'Le cose vanno, ma sento che manca qualcosa' },
  { id: 'crisis', label: 'Momento difficile', emoji: '🌪️', description: 'Sto attraversando un periodo duro' },
  { id: 'recovery', label: 'In ripresa', emoji: '🌅', description: 'Sto uscendo da un periodo buio' },
  { id: 'growth', label: 'Voglio crescere', emoji: '🚀', description: 'Sto bene ma voglio migliorarmi' },
];

type Step = 'welcome' | 'name' | 'goals' | 'situation' | 'mood' | 'vices' | 'lifestyle' | 'physical' | 'habits' | 'analyzing' | 'result';

const stepEncouragements: Partial<Record<Step, string>> = {
  name: '',
  goals: 'Ottimo inizio!',
  situation: 'Fantastico!',
  mood: 'Ci siamo quasi!',
  vices: 'Nessun giudizio 💙',
  lifestyle: 'Quasi finito!',
  physical: 'Opzionale',
  habits: 'Ultimo step!',
};

const buildDashboardConfig = (answers: OnboardingAnswers): DashboardConfig => {
  const priorityMetrics: string[] = [];
  const secondaryMetrics: string[] = [];

  // Map goals to metrics
  answers.primaryGoals.forEach(goal => {
    switch (goal) {
      case 'reduce_anxiety':
        priorityMetrics.push('anxiety', 'stress');
        secondaryMetrics.push('calmness');
        break;
      case 'improve_sleep':
        priorityMetrics.push('sleep', 'energy');
        break;
      case 'find_love':
        priorityMetrics.push('love', 'social');
        break;
      case 'boost_energy':
        priorityMetrics.push('energy', 'mood');
        break;
      case 'express_feelings':
        priorityMetrics.push('mood', 'emotional_clarity');
        break;
      case 'personal_growth':
        priorityMetrics.push('growth', 'mood');
        break;
      case 'work_stress':
        priorityMetrics.push('work', 'stress');
        secondaryMetrics.push('burnout_level');
        break;
      case 'self_esteem':
        priorityMetrics.push('mood');
        secondaryMetrics.push('self_efficacy');
        break;
    }
  });

  // Add sleep if lifestyle has sleep issues
  if (answers.lifestyle.includes('sleep_issues') && !priorityMetrics.includes('sleep')) {
    priorityMetrics.push('sleep');
  }

  // Add social if alone time is high
  if (answers.lifestyle.includes('alone_time') && !priorityMetrics.includes('social')) {
    secondaryMetrics.push('loneliness');
  }

  // Default metrics if nothing selected
  const defaultMetrics = ['mood', 'anxiety', 'energy', 'sleep'];
  defaultMetrics.forEach(metric => {
    if (priorityMetrics.length < 4 && !priorityMetrics.includes(metric)) {
      priorityMetrics.push(metric);
    }
  });

  return {
    priority_metrics: [...new Set(priorityMetrics)].slice(0, 6),
    secondary_metrics: [...new Set(secondaryMetrics)].filter(m => !priorityMetrics.includes(m)).slice(0, 4),
    hidden_metrics: [],
    theme: 'default',
  };
};

// Map vices to habit types with abstain streak
const viceToHabitMap: Record<string, { habit_type: string; streak_type: string }> = {
  smoking: { habit_type: 'no_smoking', streak_type: 'abstain' },
  alcohol: { habit_type: 'no_alcohol', streak_type: 'abstain' },
  caffeine: { habit_type: 'limit_caffeine', streak_type: 'abstain' },
  sugar: { habit_type: 'no_sugar', streak_type: 'abstain' },
  social_media: { habit_type: 'limit_social', streak_type: 'abstain' },
  nail_biting: { habit_type: 'no_nail_biting', streak_type: 'abstain' },
  procrastination: { habit_type: 'no_procrastination', streak_type: 'abstain' },
  junk_food: { habit_type: 'no_junk_food', streak_type: 'abstain' },
  gaming: { habit_type: 'limit_gaming', streak_type: 'abstain' },
  shopping: { habit_type: 'limit_shopping', streak_type: 'abstain' },
};

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { updateProfile } = useProfile();
  const { addMultipleHabits, addHabit } = useHabits();
  const { logMetrics } = useBodyMetrics();
  
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    name: '',
    primaryGoals: [],
    lifeSituation: null,
    currentMood: 2,
    vices: [],
    lifestyle: [],
    physicalData: {},
    selectedHabits: [],
  });

  const stepOrder: Step[] = [
    'welcome',
    'name',
    'goals',
    'situation',
    'mood',
    'vices',
    'lifestyle',
    'physical',
    'habits',
    'analyzing',
    'result'
  ];

  const currentIndex = stepOrder.indexOf(currentStep);
  const quizSteps = 8; // Excludes welcome, analyzing, result

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < stepOrder.length) {
      setCurrentStep(stepOrder[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0 && stepOrder[prevIndex] !== 'welcome') {
      setCurrentStep(stepOrder[prevIndex]);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'name':
        return answers.name.trim().length > 0;
      case 'goals':
        return answers.primaryGoals.length > 0;
      case 'situation':
        return answers.lifeSituation !== null;
      case 'mood':
      case 'vices':
      case 'lifestyle':
      case 'physical':
      case 'habits':
        return true; // All optional or have defaults
      default:
        return true;
    }
  };

  const getProgressStep = () => {
    // Map actual steps to progress (1-8)
    const progressMap: Partial<Record<Step, number>> = {
      name: 1,
      goals: 2,
      situation: 3,
      mood: 4,
      vices: 5,
      lifestyle: 6,
      physical: 7,
      habits: 8,
    };
    return progressMap[currentStep] || 0;
  };

  const handleComplete = async () => {
    try {
      const dashboardConfig = buildDashboardConfig(answers);
      const personalizedMetrics = dashboardConfig.priority_metrics.slice(0, 4);
      
      console.log('[Onboarding] Saving complete profile:', { answers, dashboardConfig });
      
      // Save profile with name and all answers
      await updateProfile.mutateAsync({
        name: answers.name,
        onboarding_completed: true,
        onboarding_answers: answers,
        dashboard_config: dashboardConfig,
        active_dashboard_metrics: personalizedMetrics,
        selected_goals: answers.primaryGoals,
      } as any);
      
      // Save physical data if provided
      if (answers.physicalData.weight) {
        await logMetrics.mutateAsync({
          weight: answers.physicalData.weight,
        });
      }

      // Save selected habits
      if (answers.selectedHabits.length > 0) {
        await addMultipleHabits.mutateAsync(answers.selectedHabits);
      }

      // Create habits for vices (abstain type) - just add the habit type string
      const viceHabitTypes = answers.vices
        .filter(v => v !== 'none' && viceToHabitMap[v])
        .map(v => viceToHabitMap[v].habit_type);
      
      if (viceHabitTypes.length > 0) {
        try {
          await addMultipleHabits.mutateAsync(viceHabitTypes);
        } catch (e) {
          console.log('Some vice habits may already exist');
        }
      }
      
      toast.success(`Benvenuto/a, ${answers.name}! 🎉`);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error saving onboarding:', error);
      toast.error('Errore nel salvataggio');
      navigate('/', { replace: true });
    }
  };

  // Welcome screen - no layout
  if (currentStep === 'welcome') {
    return <WelcomeStep onStart={handleNext} />;
  }

  // Analyzing screen - no layout
  if (currentStep === 'analyzing') {
    return <AnalyzingScreen onComplete={handleNext} userName={answers.name} />;
  }

  // Result screen - no layout
  if (currentStep === 'result') {
    const resultAnswers = {
      primaryGoals: answers.primaryGoals,
      mood: answers.currentMood,
      lifeSituation: answers.lifeSituation ?? undefined,
      selectedHabits: answers.selectedHabits,
    };
    return (
      <ResultScreen 
        answers={resultAnswers}
        onComplete={handleComplete}
      />
    );
  }

  const showBackButton = currentStep !== 'name';

  return (
    <OnboardingLayout 
      currentStep={getProgressStep()} 
      totalSteps={quizSteps}
      onBack={handleBack}
      showBack={showBackButton}
      encouragement={stepEncouragements[currentStep]}
    >
      {/* Step Content */}
      {currentStep === 'name' && (
        <NameInputStep
          value={answers.name}
          onChange={(name) => setAnswers(prev => ({ ...prev, name }))}
          onNext={handleNext}
        />
      )}

      {currentStep === 'goals' && (
        <ChipGridStep
          title="Cosa vorresti migliorare?"
          subtitle="Seleziona fino a 3 obiettivi"
          options={primaryGoalOptions}
          selectedValues={answers.primaryGoals}
          onChange={(values) => setAnswers(prev => ({ ...prev, primaryGoals: values }))}
          maxSelections={3}
          encouragement="Fantastico! Adesso so cosa è importante per te ✨"
        />
      )}

      {currentStep === 'situation' && (
        <QuizStep
          title="Come descriveresti questo periodo?"
          subtitle="Non ci sono risposte giuste o sbagliate"
          options={lifeSituationOptions}
          selectedValue={answers.lifeSituation}
          onSelect={(value) => setAnswers(prev => ({ ...prev, lifeSituation: value }))}
        />
      )}

      {currentStep === 'mood' && (
        <EmojiSlider
          title="Come ti senti ultimamente?"
          subtitle="Seleziona l'emoji che meglio ti rappresenta"
          value={answers.currentMood}
          onChange={(value) => setAnswers(prev => ({ ...prev, currentMood: value }))}
        />
      )}

      {currentStep === 'vices' && (
        <VicesStep
          selectedValues={answers.vices}
          onChange={(values) => setAnswers(prev => ({ ...prev, vices: values }))}
        />
      )}

      {currentStep === 'lifestyle' && (
        <LifestyleStep
          selectedValues={answers.lifestyle}
          onChange={(values) => setAnswers(prev => ({ ...prev, lifestyle: values }))}
        />
      )}

      {currentStep === 'physical' && (
        <PhysicalDataStep
          value={answers.physicalData}
          onChange={(data) => setAnswers(prev => ({ ...prev, physicalData: data }))}
        />
      )}

      {currentStep === 'habits' && (
        <HabitsSelectionStep
          selectedHabits={answers.selectedHabits}
          onSelect={(habits) => setAnswers(prev => ({ ...prev, selectedHabits: habits }))}
          onboardingAnswers={answers as unknown as Record<string, unknown>}
        />
      )}

      {/* Navigation - only for steps that don't have their own button */}
      {currentStep !== 'name' && (
        <div className="px-6 pb-8 pt-4">
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="w-full h-14 rounded-full text-base font-medium shadow-premium hover:shadow-elevated transition-all duration-300 disabled:opacity-50"
          >
            {(currentStep === 'vices' && (answers.vices.length === 0 || answers.vices.includes('none'))) ||
             (currentStep === 'lifestyle' && answers.lifestyle.length === 0) ||
             (currentStep === 'physical' && !answers.physicalData.weight && !answers.physicalData.height) ||
             (currentStep === 'habits' && answers.selectedHabits.length === 0)
              ? 'Salta'
              : 'Continua'}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}
    </OnboardingLayout>
  );
};

export default Onboarding;
