import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  Target, 
  TrendingUp, 
  MessageCircle, 
  ChevronRight,
  Home,
  BarChart3,
  User,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string;
  position?: 'top' | 'center' | 'bottom';
}

interface OnboardingTutorialProps {
  onComplete: () => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Benvenuto in Aria! 🎉',
    description: 'Iniziamo un tour veloce per scoprire come monitorare il tuo benessere ogni giorno.',
    icon: <Sparkles className="w-6 h-6" />,
    position: 'center',
  },
  {
    id: 'checkin',
    title: 'Check-in Giornalieri',
    description: 'Tocca le card per registrare come ti senti. Bastano pochi secondi per tracciare umore, energia e altro.',
    icon: <Target className="w-6 h-6" />,
    highlight: 'checkin',
    position: 'top',
  },
  {
    id: 'focus',
    title: 'I Tuoi Focus',
    description: 'Qui vedi i parametri più importanti per te. Si riempiono man mano che fai check-in o parli con Aria.',
    icon: <TrendingUp className="w-6 h-6" />,
    highlight: 'focus',
    position: 'center',
  },
  {
    id: 'aria',
    title: 'Parla con Aria',
    description: 'Il pulsante centrale ti porta da Aria, la tua compagna AI. Puoi chattare o parlare a voce!',
    icon: <MessageCircle className="w-6 h-6" />,
    highlight: 'navbar-aria',
    position: 'bottom',
  },
  {
    id: 'navigation',
    title: 'Esplora l\'App',
    description: 'Usa la barra in basso per navigare tra Home, Analisi, Progressi e il tuo Profilo.',
    icon: <BarChart3 className="w-6 h-6" />,
    highlight: 'navbar',
    position: 'bottom',
  },
  {
    id: 'ready',
    title: 'Sei Pronto! ✨',
    description: 'Inizia con un check-in veloce o parla direttamente con Aria per personalizzare la tua esperienza.',
    icon: <Sparkles className="w-6 h-6" />,
    position: 'center',
  },
];

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  // Position classes for the tooltip
  const getPositionClasses = () => {
    switch (step.position) {
      case 'top':
        return 'top-24';
      case 'bottom':
        return 'bottom-32';
      default:
        return 'top-1/2 -translate-y-1/2';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100]"
        >
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />

          {/* Highlight overlay */}
          {step.highlight && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 pointer-events-none"
            >
              {/* This creates a spotlight effect on the highlighted element */}
              <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-background/60" />
            </motion.div>
          )}

          {/* Tutorial Card */}
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "absolute left-4 right-4 mx-auto max-w-sm",
              getPositionClasses()
            )}
          >
            <div className="relative">
              {/* Glass card */}
              <div className="card-glass p-6 rounded-3xl overflow-hidden">
                {/* Aurora gradient background */}
                <div className="absolute inset-0 bg-gradient-aria-subtle opacity-40 pointer-events-none" />
                
                <div className="relative z-10">
                  {/* Skip button */}
                  <button
                    onClick={handleSkip}
                    className="absolute -top-1 -right-1 p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.1 }}
                      className="w-14 h-14 rounded-2xl bg-gradient-aria flex items-center justify-center shadow-aria-glow"
                    >
                      <div className="text-white">{step.icon}</div>
                    </motion.div>
                  </div>

                  {/* Content */}
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-aria rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      {currentStep + 1} / {TUTORIAL_STEPS.length}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    {!isLastStep && (
                      <Button
                        variant="ghost"
                        onClick={handleSkip}
                        className="flex-1 h-11 rounded-full text-muted-foreground"
                      >
                        Salta
                      </Button>
                    )}
                    <Button
                      onClick={handleNext}
                      className={cn(
                        "h-11 rounded-full bg-gradient-aria text-white font-semibold shadow-aria-glow hover:shadow-elevated transition-all",
                        isLastStep ? "flex-1" : "flex-1"
                      )}
                    >
                      {isLastStep ? 'Inizia!' : 'Avanti'}
                      {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Pointer arrow for highlighted elements */}
              {step.highlight && step.position !== 'center' && (
                <motion.div
                  initial={{ opacity: 0, y: step.position === 'top' ? -10 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2",
                    step.position === 'top' ? "-bottom-3" : "-top-3"
                  )}
                >
                  <div 
                    className={cn(
                      "w-4 h-4 bg-card rotate-45 border border-glass-border",
                      step.position === 'top' ? "border-t-0 border-l-0" : "border-b-0 border-r-0"
                    )}
                  />
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingTutorial;
