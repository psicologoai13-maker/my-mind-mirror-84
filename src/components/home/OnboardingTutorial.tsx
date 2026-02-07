import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  Target, 
  TrendingUp, 
  MessageCircle, 
  ChevronRight,
  BarChart3,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlightSelector?: string;
  tooltipPosition: 'top' | 'bottom' | 'center';
}

interface OnboardingTutorialProps {
  onComplete: () => void;
  userId?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Benvenuto in Aria! 🎉',
    description: 'Iniziamo un tour veloce per scoprire come monitorare il tuo benessere ogni giorno.',
    icon: <Sparkles className="w-6 h-6" />,
    tooltipPosition: 'center',
  },
  {
    id: 'checkin',
    title: 'Check-in Giornalieri',
    description: 'Tocca le card per registrare come ti senti. Bastano pochi secondi per tracciare umore, energia e altro.',
    icon: <Target className="w-6 h-6" />,
    highlightSelector: '[data-tutorial="checkin"]',
    tooltipPosition: 'bottom',
  },
  {
    id: 'focus',
    title: 'I Tuoi Focus',
    description: 'Qui vedi i parametri più importanti per te. Si aggiornano man mano che fai check-in o parli con Aria.',
    icon: <TrendingUp className="w-6 h-6" />,
    highlightSelector: '[data-tutorial="vitals"]',
    tooltipPosition: 'top',
  },
  {
    id: 'aria',
    title: 'Parla con Aria',
    description: 'Il pulsante centrale ti porta da Aria, la tua compagna AI. Puoi chattare o parlare a voce!',
    icon: <MessageCircle className="w-6 h-6" />,
    highlightSelector: '[data-tutorial="aria-button"]',
    tooltipPosition: 'top',
  },
  {
    id: 'ready',
    title: 'Sei Pronto! ✨',
    description: 'Inizia con un check-in veloce o parla direttamente con Aria per personalizzare la tua esperienza.',
    icon: <Sparkles className="w-6 h-6" />,
    tooltipPosition: 'center',
  },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onComplete, userId }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollYRef = useRef(0);
  const measureTimeoutRef = useRef<NodeJS.Timeout>();

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  // Find, scroll to, and measure the highlighted element
  useEffect(() => {
    // Clear any pending timeouts
    if (measureTimeoutRef.current) {
      clearTimeout(measureTimeoutRef.current);
    }

    if (step.highlightSelector) {
      const element = document.querySelector(step.highlightSelector);
      if (element) {
        setIsScrolling(true);
        setSpotlightRect(null);
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Wait for scroll to complete, then measure
        measureTimeoutRef.current = setTimeout(() => {
          const rect = element.getBoundingClientRect();
          const padding = 12;
          setSpotlightRect({
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
          });
          
          scrollYRef.current = window.scrollY;
          setIsScrolling(false);
        }, 500);
      } else {
        // Element not found - skip to next step or show centered
        console.warn(`Tutorial element not found: ${step.highlightSelector}`);
        setSpotlightRect(null);
        setIsScrolling(false);
      }
    } else {
      setSpotlightRect(null);
      setIsScrolling(false);
    }

    return () => {
      if (measureTimeoutRef.current) {
        clearTimeout(measureTimeoutRef.current);
      }
    };
  }, [currentStep, step.highlightSelector]);

  // Prevent scroll only after scrolling animation completes
  useEffect(() => {
    if (isVisible && !isScrolling) {
      const preventScroll = (e: Event) => {
        e.preventDefault();
      };
      
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
      };
      
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      
      return () => {
        document.removeEventListener('wheel', preventScroll);
        document.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, [isVisible, isScrolling]);

  const markTutorialComplete = () => {
    // Mark tutorial as seen - use multiple keys for redundancy
    localStorage.setItem('tutorial_completed', 'true');
    if (userId) {
      localStorage.setItem(`tutorial_seen_${userId}`, 'true');
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      setIsVisible(false);
      markTutorialComplete();
      setTimeout(onComplete, 300);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    markTutorialComplete();
    setTimeout(onComplete, 300);
  };

  // Calculate tooltip position based on spotlight
  const getTooltipStyle = (): React.CSSProperties => {
    const viewportHeight = window.innerHeight;
    const tooltipHeight = 280;
    const gap = 24;
    const navBarHeight = 100;
    const safeBottom = viewportHeight - navBarHeight;
    const statusBarHeight = 60;

    if (!spotlightRect) {
      return {
        position: 'fixed',
        inset: 0,
        margin: 'auto',
        width: 'fit-content',
        height: 'fit-content',
        maxWidth: 'calc(100vw - 32px)',
      };
    }

    const spaceAbove = spotlightRect.top - statusBarHeight;
    const spaceBelow = safeBottom - (spotlightRect.top + spotlightRect.height);
    
    const shouldGoAbove = spaceAbove > tooltipHeight + gap || spaceBelow < 150;
    const horizontalPadding = 16;
    
    if (shouldGoAbove) {
      const topPos = Math.max(statusBarHeight, spotlightRect.top - tooltipHeight - gap);
      return { 
        position: 'fixed',
        top: `${topPos}px`, 
        left: `${horizontalPadding}px`,
        right: `${horizontalPadding}px`,
      };
    } else {
      const topPos = spotlightRect.top + spotlightRect.height + gap;
      const adjustedTop = Math.min(topPos, safeBottom - tooltipHeight);
      return { 
        position: 'fixed',
        top: `${Math.max(statusBarHeight, adjustedTop)}px`, 
        left: `${horizontalPadding}px`,
        right: `${horizontalPadding}px`,
      };
    }
  };

  const isTooltipAbove = (): boolean => {
    if (!spotlightRect) return true;
    
    const viewportHeight = window.innerHeight;
    const tooltipHeight = 280;
    const gap = 24;
    const navBarHeight = 100;
    const safeBottom = viewportHeight - navBarHeight;
    const statusBarHeight = 60;
    
    const spaceAbove = spotlightRect.top - statusBarHeight;
    const spaceBelow = safeBottom - (spotlightRect.top + spotlightRect.height);
    
    return spaceAbove > tooltipHeight + gap || spaceBelow < 150;
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
          {/* SVG Mask for spotlight effect */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <mask id="spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {spotlightRect && (
                  <motion.rect
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    x={spotlightRect.left}
                    y={spotlightRect.top}
                    width={spotlightRect.width}
                    height={spotlightRect.height}
                    rx="20"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.75)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* Spotlight border glow */}
          {spotlightRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute pointer-events-none rounded-[20px]"
              style={{
                top: spotlightRect.top,
                left: spotlightRect.left,
                width: spotlightRect.width,
                height: spotlightRect.height,
                boxShadow: '0 0 0 3px hsl(var(--aria-violet)), 0 0 40px hsl(var(--aria-violet) / 0.6)',
              }}
            />
          )}

          {/* Tutorial Tooltip Card */}
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="z-10"
            style={getTooltipStyle()}
          >
            <div className="relative w-full max-w-[320px] mx-auto">
              <div className="bg-card/95 backdrop-blur-xl p-5 rounded-3xl border border-border shadow-elevated overflow-hidden">
                <div className="absolute inset-0 bg-gradient-aria-subtle opacity-30 pointer-events-none" />
                
                <div className="relative z-10">
                  {/* Skip button */}
                  <button
                    onClick={handleSkip}
                    className="absolute -top-1 -right-1 p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Icon */}
                  <div className="flex justify-center mb-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.1 }}
                      className="w-11 h-11 rounded-xl bg-gradient-aria flex items-center justify-center shadow-aria-glow"
                    >
                      <div className="text-white">{step.icon}</div>
                    </motion.div>
                  </div>

                  {/* Content */}
                  <div className="text-center mb-4">
                    <h3 className="text-base font-bold text-foreground mb-1.5">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-aria rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                      {currentStep + 1} / {TUTORIAL_STEPS.length}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {!isLastStep && (
                      <Button
                        variant="ghost"
                        onClick={handleSkip}
                        className="flex-1 h-10 rounded-full text-muted-foreground text-sm"
                      >
                        Salta
                      </Button>
                    )}
                    <Button
                      onClick={handleNext}
                      className={cn(
                        "h-10 rounded-full bg-gradient-aria text-white font-semibold shadow-aria-glow hover:shadow-elevated transition-all text-sm",
                        "flex-1"
                      )}
                    >
                      {isLastStep ? 'Inizia!' : 'Avanti'}
                      {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Pointer arrow */}
              {spotlightRect && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2",
                    isTooltipAbove() ? "-bottom-2" : "-top-2"
                  )}
                >
                  <div 
                    className={cn(
                      "w-4 h-4 bg-card rotate-45 border border-border",
                      isTooltipAbove() ? "border-t-0 border-l-0" : "border-b-0 border-r-0"
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
