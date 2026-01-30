import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import OnboardingLayout from '@/components/onboarding/OnboardingLayout';
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import NameInputStep from '@/components/onboarding/NameInputStep';
import GoalsStep from '@/components/onboarding/GoalsStep';
import AboutYouStep from '@/components/onboarding/AboutYouStep';
import ReadyScreen from '@/components/onboarding/ReadyScreen';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

interface OnboardingData {
  name: string;
  primaryGoals: string[];
  currentMood: number;
  ageRange?: string;
  therapyStatus?: string;
}

interface DashboardConfig {
  priority_metrics: string[];
  secondary_metrics: string[];
  hidden_metrics: string[];
  theme: string;
}

// Map goals to dashboard metrics
const buildDashboardConfig = (goals: string[]): DashboardConfig => {
  const priorityMetrics: string[] = [];
  const secondaryMetrics: string[] = [];

  goals.forEach(goal => {
    switch (goal) {
      case 'anxiety':
        priorityMetrics.push('anxiety', 'stress');
        secondaryMetrics.push('calmness');
        break;
      case 'sleep':
        priorityMetrics.push('sleep', 'energy');
        break;
      case 'energy':
        priorityMetrics.push('energy', 'mood');
        break;
      case 'relationships':
        priorityMetrics.push('love', 'social');
        break;
      case 'growth':
        priorityMetrics.push('growth', 'mood');
        break;
      case 'self_esteem':
        priorityMetrics.push('mood');
        secondaryMetrics.push('self_efficacy');
        break;
    }
  });

  // Ensure minimum metrics
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

type Step = 'welcome' | 'name' | 'goals' | 'aboutYou' | 'ready';

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { updateProfile } = useProfile();
  
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [data, setData] = useState<OnboardingData>({
    name: '',
    primaryGoals: [],
    currentMood: 2,
    ageRange: undefined,
    therapyStatus: undefined,
  });

  const stepOrder: Step[] = ['welcome', 'name', 'goals', 'aboutYou', 'ready'];
  const currentIndex = stepOrder.indexOf(currentStep);
  const quizSteps = 3; // name, goals, aboutYou

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < stepOrder.length) {
      setCurrentStep(stepOrder[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex > 0) { // Don't go back to welcome
      setCurrentStep(stepOrder[prevIndex]);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'name':
        return data.name.trim().length >= 2;
      case 'goals':
        return data.primaryGoals.length >= 1;
      case 'aboutYou':
        return true; // mood has default
      default:
        return true;
    }
  };

  const getProgressStep = () => {
    const progressMap: Partial<Record<Step, number>> = {
      name: 1,
      goals: 2,
      aboutYou: 3,
    };
    return progressMap[currentStep] || 0;
  };

  const handleComplete = async () => {
    try {
      const dashboardConfig = buildDashboardConfig(data.primaryGoals);
      const personalizedMetrics = dashboardConfig.priority_metrics.slice(0, 4);
      
      // Map new goal IDs to legacy format for compatibility
      const legacyGoalMap: Record<string, string> = {
        anxiety: 'reduce_anxiety',
        sleep: 'improve_sleep',
        energy: 'boost_energy',
        relationships: 'find_love',
        growth: 'personal_growth',
        self_esteem: 'self_esteem',
      };
      
      const legacyGoals = data.primaryGoals.map(g => legacyGoalMap[g] || g);
      
      await updateProfile.mutateAsync({
        name: data.name,
        onboarding_completed: true,
        onboarding_answers: {
          name: data.name,
          primaryGoals: legacyGoals,
          currentMood: data.currentMood,
          ageRange: data.ageRange,
          therapyStatus: data.therapyStatus,
          // Keep empty for legacy compatibility
          lifeSituation: null,
          vices: [],
          lifestyle: [],
          physicalData: {},
          selectedHabits: [],
        },
        dashboard_config: dashboardConfig,
        active_dashboard_metrics: personalizedMetrics,
        selected_goals: legacyGoals,
      } as any);
      
      toast.success(`Benvenuto/a, ${data.name}! 🎉`);
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

  // Ready screen - no layout
  if (currentStep === 'ready') {
    return (
      <ReadyScreen 
        userName={data.name}
        selectedGoals={data.primaryGoals}
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
    >
      {/* Name Step */}
      {currentStep === 'name' && (
        <NameInputStep
          value={data.name}
          onChange={(name) => setData(prev => ({ ...prev, name }))}
          onNext={handleNext}
        />
      )}

      {/* Goals Step */}
      {currentStep === 'goals' && (
        <>
          <GoalsStep
            userName={data.name}
            selectedGoals={data.primaryGoals}
            onChange={(goals) => setData(prev => ({ ...prev, primaryGoals: goals }))}
          />
          <motion.div 
            className="px-5 pb-8 pt-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="w-full h-14 rounded-full text-base font-semibold bg-gradient-to-r from-primary to-primary/80 shadow-glass-glow hover:shadow-glass-elevated transition-all duration-300 disabled:opacity-40 disabled:shadow-none"
            >
              Continua
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </>
      )}

      {/* About You Step */}
      {currentStep === 'aboutYou' && (
        <>
          <AboutYouStep
            currentMood={data.currentMood}
            onMoodChange={(mood) => setData(prev => ({ ...prev, currentMood: mood }))}
            ageRange={data.ageRange}
            onAgeChange={(age) => setData(prev => ({ ...prev, ageRange: age }))}
            therapyStatus={data.therapyStatus}
            onTherapyChange={(status) => setData(prev => ({ ...prev, therapyStatus: status }))}
          />
          <motion.div 
            className="px-5 pb-8 pt-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={handleNext}
              className="w-full h-14 rounded-full text-base font-semibold bg-gradient-to-r from-primary to-primary/80 shadow-glass-glow hover:shadow-glass-elevated transition-all duration-300"
            >
              Quasi fatto!
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </>
      )}
    </OnboardingLayout>
  );
};

export default Onboarding;
