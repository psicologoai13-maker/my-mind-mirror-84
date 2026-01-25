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
  primaryGoals: string[];
  mood: number;
  sleepIssues: string | null;
  // NEW: Deep questions for personalization
  mainChallenge: string | null;
  lifeSituation: string | null;
  supportType: string | null;
  anxietyLevel: number;
}

interface DashboardConfig {
  priority_metrics: string[];
  secondary_metrics: string[];
  hidden_metrics: string[];
  theme: string;
}

const goalOptions = [
  { id: 'anxiety', label: 'Ridurre l\'ansia', emoji: '🧘', description: 'Gestire stress e preoccupazioni' },
  { id: 'sleep', label: 'Dormire meglio', emoji: '😴', description: 'Migliorare la qualità del sonno' },
  { id: 'growth', label: 'Crescita personale', emoji: '🌱', description: 'Sviluppo e consapevolezza' },
  { id: 'mood', label: 'Migliorare l\'umore', emoji: '☀️', description: 'Sentirsi più positivi' },
];

// Primary goals for the new step (maps to selected_goals in DB)
const primaryGoalOptions = [
  { id: 'reduce_anxiety', label: 'Ridurre l\'Ansia', emoji: '🧠', description: 'Meno stress e preoccupazioni quotidiane' },
  { id: 'improve_sleep', label: 'Dormire Meglio', emoji: '🌙', description: 'Notti più riposanti e rigeneranti' },
  { id: 'find_love', label: 'Migliorare Relazioni', emoji: '💕', description: 'Connessioni più profonde con gli altri' },
  { id: 'boost_energy', label: 'Aumentare Energia', emoji: '⚡', description: 'Più vitalità durante la giornata' },
  { id: 'express_feelings', label: 'Sfogarmi/Diario', emoji: '📝', description: 'Esprimere pensieri ed emozioni' },
];

const sleepOptions = [
  { id: 'yes', label: 'Sì, spesso', emoji: '😔' },
  { id: 'sometimes', label: 'A volte', emoji: '😕' },
  { id: 'no', label: 'No, dormo bene', emoji: '😊' },
];

// NEW: Main challenge options
const mainChallengeOptions = [
  { id: 'work_stress', label: 'Stress lavorativo', emoji: '💼', description: 'Pressione, burnout, problemi con colleghi' },
  { id: 'relationships', label: 'Difficoltà relazionali', emoji: '💔', description: 'Partner, famiglia, amicizie' },
  { id: 'self_esteem', label: 'Autostima bassa', emoji: '🪞', description: 'Insicurezze, autocritica, senso di inadeguatezza' },
  { id: 'life_transition', label: 'Cambiamenti di vita', emoji: '🔄', description: 'Trasferimenti, cambi lavoro, separazioni' },
  { id: 'general_anxiety', label: 'Ansia generalizzata', emoji: '😰', description: 'Preoccupazioni costanti, difficoltà a rilassarsi' },
  { id: 'loneliness', label: 'Solitudine', emoji: '🏝️', description: 'Isolamento, mancanza di connessioni' },
];

// NEW: Life situation options
const lifeSituationOptions = [
  { id: 'stable', label: 'Stabile ma insoddisfatto', emoji: '😐', description: 'Le cose vanno, ma sento che manca qualcosa' },
  { id: 'crisis', label: 'Momento difficile', emoji: '🌪️', description: 'Sto attraversando una crisi o periodo duro' },
  { id: 'recovery', label: 'In ripresa', emoji: '🌅', description: 'Sto uscendo da un periodo buio' },
  { id: 'growth_seeking', label: 'Voglio crescere', emoji: '🚀', description: 'Sto bene ma voglio migliorarmi' },
];

// NEW: Support type preference
const supportTypeOptions = [
  { id: 'listener', label: 'Qualcuno che ascolti', emoji: '👂', description: 'Ho bisogno di sfogarmi senza giudizio' },
  { id: 'advisor', label: 'Consigli pratici', emoji: '💡', description: 'Voglio suggerimenti concreti su cosa fare' },
  { id: 'challenger', label: 'Sfidami a crescere', emoji: '🏋️', description: 'Ho bisogno di essere spinto fuori dalla zona comfort' },
  { id: 'comforter', label: 'Supporto emotivo', emoji: '🤗', description: 'Ho bisogno di sentirmi compreso e validato' },
];

type Step = 'goal' | 'primaryGoal' | 'mainChallenge' | 'lifeSituation' | 'supportType' | 'mood' | 'anxietyLevel' | 'sleep' | 'analyzing' | 'result';

// ============================================
// CORE MAPPING LOGIC: Goals -> Dashboard Config
// ============================================
const buildDashboardConfig = (answers: OnboardingAnswers): DashboardConfig => {
  const priorityMetrics: string[] = [];
  const secondaryMetrics: string[] = [];
  const hiddenMetrics: string[] = [];

  // Process primary goals selected by user
  answers.primaryGoals.forEach(goal => {
    switch (goal) {
      case 'reduce_anxiety':
        priorityMetrics.push('anxiety', 'stress');
        secondaryMetrics.push('calmness');
        break;
      case 'improve_sleep':
        priorityMetrics.push('sleep', 'energy');
        secondaryMetrics.push('evening_routine');
        break;
      case 'find_love':
        priorityMetrics.push('love', 'social');
        secondaryMetrics.push('loneliness');
        break;
      case 'boost_energy':
        priorityMetrics.push('energy', 'mood');
        secondaryMetrics.push('vitality');
        break;
      case 'express_feelings':
        priorityMetrics.push('mood', 'emotional_clarity');
        secondaryMetrics.push('sadness', 'joy');
        break;
    }
  });

  // Add based on main challenge
  if (answers.mainChallenge) {
    switch (answers.mainChallenge) {
      case 'work_stress':
        if (!priorityMetrics.includes('work')) priorityMetrics.push('work');
        if (!priorityMetrics.includes('stress')) priorityMetrics.push('stress');
        secondaryMetrics.push('burnout_level');
        break;
      case 'relationships':
        if (!priorityMetrics.includes('love')) priorityMetrics.push('love');
        if (!priorityMetrics.includes('social')) priorityMetrics.push('social');
        break;
      case 'self_esteem':
        secondaryMetrics.push('self_efficacy');
        break;
      case 'loneliness':
        if (!priorityMetrics.includes('social')) priorityMetrics.push('social');
        secondaryMetrics.push('loneliness');
        break;
      case 'general_anxiety':
        if (!priorityMetrics.includes('anxiety')) priorityMetrics.push('anxiety');
        secondaryMetrics.push('rumination');
        break;
    }
  }

  // Add based on single goal selection (backup)
  if (answers.goal && priorityMetrics.length === 0) {
    switch (answers.goal) {
      case 'anxiety':
        priorityMetrics.push('anxiety', 'stress');
        break;
      case 'sleep':
        priorityMetrics.push('sleep', 'energy');
        break;
      case 'growth':
        priorityMetrics.push('growth', 'mood');
        break;
      case 'mood':
        priorityMetrics.push('mood', 'joy');
        break;
    }
  }

  // Add sleep if user has sleep issues
  if ((answers.sleepIssues === 'yes' || answers.sleepIssues === 'sometimes') && 
      !priorityMetrics.includes('sleep')) {
    priorityMetrics.push('sleep');
  }

  // Add anxiety if high anxiety level reported
  if (answers.anxietyLevel >= 3 && !priorityMetrics.includes('anxiety')) {
    priorityMetrics.push('anxiety');
  }

  // Add mood-related metrics based on current mood
  if (answers.mood <= 1 && !priorityMetrics.includes('mood')) {
    priorityMetrics.push('mood');
    secondaryMetrics.push('sadness');
  }

  // Ensure we always have at least 4 priority metrics
  const defaultMetrics = ['mood', 'anxiety', 'energy', 'sleep'];
  defaultMetrics.forEach(metric => {
    if (priorityMetrics.length < 4 && !priorityMetrics.includes(metric)) {
      priorityMetrics.push(metric);
    }
  });

  // Deduplicate and limit
  const uniquePriority = [...new Set(priorityMetrics)].slice(0, 6);
  const uniqueSecondary = [...new Set(secondaryMetrics)]
    .filter(m => !uniquePriority.includes(m))
    .slice(0, 4);

  return {
    priority_metrics: uniquePriority,
    secondary_metrics: uniqueSecondary,
    hidden_metrics: hiddenMetrics,
    theme: 'default',
  };
};

// Legacy function for active_dashboard_metrics (keeps backward compatibility)
const getPersonalizedMetrics = (answers: OnboardingAnswers): string[] => {
  const config = buildDashboardConfig(answers);
  return config.priority_metrics.slice(0, 4);
};

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { updateProfile } = useProfile();
  
  const [currentStep, setCurrentStep] = useState<Step>('goal');
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    goal: null,
    primaryGoals: [],
    mood: 2,
    sleepIssues: null,
    mainChallenge: null,
    lifeSituation: null,
    supportType: null,
    anxietyLevel: 2,
  });

  const stepOrder: Step[] = [
    'goal', 
    'primaryGoal', 
    'mainChallenge',
    'lifeSituation',
    'supportType',
    'mood', 
    'anxietyLevel',
    'sleep', 
    'analyzing', 
    'result'
  ];
  const currentIndex = stepOrder.indexOf(currentStep);
  const quizSteps = 8; // Updated step count

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
      case 'primaryGoal':
        return answers.primaryGoals.length > 0;
      case 'mainChallenge':
        return answers.mainChallenge !== null;
      case 'lifeSituation':
        return answers.lifeSituation !== null;
      case 'supportType':
        return answers.supportType !== null;
      case 'mood':
        return true;
      case 'anxietyLevel':
        return true;
      case 'sleep':
        return answers.sleepIssues !== null;
      default:
        return false;
    }
  };

  const handleComplete = async () => {
    try {
      // Build personalized dashboard configuration
      const dashboardConfig = buildDashboardConfig(answers);
      const personalizedMetrics = getPersonalizedMetrics(answers);
      
      console.log('[Onboarding] Saving config:', { dashboardConfig, personalizedMetrics, answers });
      
      await updateProfile.mutateAsync({
        onboarding_completed: true,
        onboarding_answers: answers,
        dashboard_config: dashboardConfig,
        active_dashboard_metrics: personalizedMetrics,
        selected_goals: answers.primaryGoals,
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
          primaryGoals: answers.primaryGoals,
          mood: answers.mood,
          sleepIssues: answers.sleepIssues ?? undefined,
          mainChallenge: answers.mainChallenge ?? undefined,
          lifeSituation: answers.lifeSituation ?? undefined,
          supportType: answers.supportType ?? undefined,
          anxietyLevel: answers.anxietyLevel,
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
          title="Cosa ti ha portato qui?"
          subtitle="Scegli quello che ti sta più a cuore"
          options={goalOptions}
          selectedValue={answers.goal}
          onSelect={(value) => setAnswers(prev => ({ ...prev, goal: value }))}
        />
      )}

      {currentStep === 'primaryGoal' && (
        <QuizStep
          title="Quali sono i tuoi traguardi?"
          subtitle="Puoi selezionarne più di uno"
          options={primaryGoalOptions}
          selectedValue={null}
          onSelect={() => {}}
          multiSelect={true}
          selectedValues={answers.primaryGoals}
          onMultiSelect={(values) => setAnswers(prev => ({ ...prev, primaryGoals: values }))}
        />
      )}

      {currentStep === 'mainChallenge' && (
        <QuizStep
          title="Qual è la tua sfida principale?"
          subtitle="Cosa ti pesa di più in questo momento"
          options={mainChallengeOptions}
          selectedValue={answers.mainChallenge}
          onSelect={(value) => setAnswers(prev => ({ ...prev, mainChallenge: value }))}
        />
      )}

      {currentStep === 'lifeSituation' && (
        <QuizStep
          title="Come descriveresti la tua situazione attuale?"
          subtitle="Non ci sono risposte giuste o sbagliate"
          options={lifeSituationOptions}
          selectedValue={answers.lifeSituation}
          onSelect={(value) => setAnswers(prev => ({ ...prev, lifeSituation: value }))}
        />
      )}

      {currentStep === 'supportType' && (
        <QuizStep
          title="Di che tipo di supporto hai bisogno?"
          subtitle="Questo ci aiuterà a personalizzare l'esperienza"
          options={supportTypeOptions}
          selectedValue={answers.supportType}
          onSelect={(value) => setAnswers(prev => ({ ...prev, supportType: value }))}
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

      {currentStep === 'anxietyLevel' && (
        <EmojiSlider
          title="Quanto ti senti ansioso/a ultimamente?"
          subtitle="0 = Per niente, 4 = Molto ansioso/a"
          value={answers.anxietyLevel}
          onChange={(value) => setAnswers(prev => ({ ...prev, anxietyLevel: value }))}
          emojis={['😌', '🙂', '😐', '😟', '😰']}
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
