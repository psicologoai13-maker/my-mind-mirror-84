import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import OnboardingLayout from '@/components/onboarding/OnboardingLayout';
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import NameInputStep from '@/components/onboarding/NameInputStep';
import MotivationStep from '@/components/onboarding/MotivationStep';
import GoalsStep from '@/components/onboarding/GoalsStep';
import AboutYouStep from '@/components/onboarding/AboutYouStep';
import InterestsStep from '@/components/onboarding/InterestsStep';
import ReadyScreen from '@/components/onboarding/ReadyScreen';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useUserInterests } from '@/hooks/useUserInterests';
import { toast } from 'sonner';

interface OnboardingData {
  name: string;
  motivations: string[];
  primaryGoals: string[];
  currentMood: number;
  moodSelected: boolean;
  ageRange?: string;
  therapyStatus?: string;
  gender?: string;
  interests: string[];
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

type Step = 'welcome' | 'name' | 'aboutYou' | 'motivation' | 'goals' | 'interests' | 'ready';

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { updateProfile } = useProfile();
  const { updateInterests } = useUserInterests();
  
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [data, setData] = useState<OnboardingData>({
    name: '',
    motivations: [],
    primaryGoals: [],
    currentMood: 2,
    moodSelected: false,
    ageRange: undefined,
    therapyStatus: undefined,
    gender: undefined,
    interests: [],
  });

  const stepOrder: Step[] = ['welcome', 'name', 'aboutYou', 'motivation', 'goals', 'interests', 'ready'];
  const currentIndex = stepOrder.indexOf(currentStep);
  const quizSteps = 5; // name, aboutYou, motivation, goals, interests

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
      case 'motivation':
        return data.motivations.length >= 1;
      case 'goals':
        return data.primaryGoals.length >= 1;
      case 'aboutYou':
        // All fields are required (mood, gender, age)
        return data.moodSelected && !!data.gender && !!data.ageRange;
      case 'interests':
        return true; // interests are optional
      default:
        return true;
    }
  };

  const getProgressStep = () => {
    const progressMap: Partial<Record<Step, number>> = {
      name: 1,
      aboutYou: 2,
      motivation: 3,
      goals: 4,
      interests: 5,
    };
    return progressMap[currentStep] || 0;
  };

  const handleComplete = async (goToAria: boolean) => {
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
      
      // Save profile with dedicated columns for Aria's brain
      await updateProfile.mutateAsync({
        name: data.name,
        onboarding_completed: true,
        // Save to dedicated columns so Aria can access them
        therapy_status: data.therapyStatus || 'none',
        gender: data.gender,
        onboarding_answers: {
          name: data.name,
          motivations: data.motivations,
          primaryGoals: legacyGoals,
          currentMood: data.currentMood,
          ageRange: data.ageRange,
          therapyStatus: data.therapyStatus,
          gender: data.gender,
          interests: data.interests,
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
      
      // Save interests to user_interests table
      if (data.interests.length > 0) {
        const interestMappings: Record<string, Partial<{ 
          sports_followed: string[];
          music_genres: string[];
          learning_interests: string[];
          dream_destinations: string[];
          creative_hobbies: string[];
          outdoor_activities: string[];
          indoor_activities: string[];
          gaming_interests: string[];
          pet_owner: boolean;
          favorite_genres: string[];
          current_shows: string[];
        }>> = {
          sport: { sports_followed: ['Calcio', 'Sport in generale'] },
          music: { music_genres: ['Musica'] },
          reading: { learning_interests: ['Lettura'] },
          travel: { dream_destinations: ['Viaggio'] },
          cooking: { creative_hobbies: ['Cucina'] },
          nature: { outdoor_activities: ['Natura'] },
          art: { creative_hobbies: ['Arte'] },
          gaming: { gaming_interests: ['Gaming'] },
          fitness: { outdoor_activities: ['Fitness'] },
          movies: { favorite_genres: ['Film'], current_shows: ['Serie TV'] },
          pets: { pet_owner: true },
          photography: { creative_hobbies: ['Fotografia'] },
          yoga: { indoor_activities: ['Yoga', 'Meditazione'] },
          tech: { learning_interests: ['Tecnologia'] },
          fashion: { creative_hobbies: ['Moda'] },
          social: { indoor_activities: ['Socializzare'] },
        };
        
        const interestsUpdate: Record<string, any> = {};
        data.interests.forEach(interest => {
          const mapping = interestMappings[interest];
          if (mapping) {
            Object.entries(mapping).forEach(([key, value]) => {
              if (typeof value === 'boolean') {
                interestsUpdate[key] = value;
              } else if (Array.isArray(value)) {
                interestsUpdate[key] = [...(interestsUpdate[key] || []), ...value];
              }
            });
          }
        });
        
        try {
          await updateInterests(interestsUpdate);
        } catch (err) {
          console.error('Error saving interests:', err);
          // Non-blocking - continue anyway
        }
      }
      
      toast.success(`Benvenuto/a, ${data.name}! 🎉`);
      
      // Navigate based on user choice
      if (goToAria) {
        navigate('/aria', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
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
              className="w-full h-14 rounded-full text-base font-semibold bg-gradient-aria text-white shadow-aria-glow hover:shadow-elevated transition-all duration-300 disabled:opacity-40 disabled:shadow-none"
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
            gender={data.gender}
            onGenderChange={(gender) => setData(prev => ({ ...prev, gender }))}
            moodSelected={data.moodSelected}
            onMoodSelected={(selected) => setData(prev => ({ ...prev, moodSelected: selected }))}
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
              className="w-full h-14 rounded-full text-base font-semibold bg-gradient-aria text-white shadow-aria-glow hover:shadow-elevated transition-all duration-300 disabled:opacity-40 disabled:shadow-none"
            >
              Continua
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </>
      )}

      {/* Motivation Step */}
      {currentStep === 'motivation' && (
        <>
          <MotivationStep
            userName={data.name}
            selectedMotivations={data.motivations}
            onChange={(motivations) => setData(prev => ({ ...prev, motivations }))}
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
              className="w-full h-14 rounded-full text-base font-semibold bg-gradient-aria text-white shadow-aria-glow hover:shadow-elevated transition-all duration-300 disabled:opacity-40 disabled:shadow-none"
            >
              Continua
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </>
      )}

      {/* Interests Step */}
      {currentStep === 'interests' && (
        <>
          <InterestsStep
            userName={data.name}
            selectedInterests={data.interests}
            onChange={(interests) => setData(prev => ({ ...prev, interests }))}
          />
          <motion.div 
            className="px-5 pb-8 pt-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={handleNext}
              className="w-full h-14 rounded-full text-base font-semibold bg-gradient-aria text-white shadow-aria-glow hover:shadow-elevated transition-all duration-300"
            >
              {data.interests.length > 0 ? 'Continua' : 'Salta'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </>
      )}
    </OnboardingLayout>
  );
};

export default Onboarding;
