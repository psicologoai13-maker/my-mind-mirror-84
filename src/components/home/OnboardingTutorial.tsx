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
    description: 'Qui vedi i parametri più importanti per te. Si riempiono man mano che fai check-in o parli con Aria.',
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
    id: 'navigation',
    title: 'Esplora l\'App',
    description: 'Usa la barra in basso per navigare tra Home, Analisi, Progressi e il tuo Profilo.',
    icon: <BarChart3 className="w-6 h-6" />,
    highlightSelector: 'nav',
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

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollYRef = useRef(0);

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  // Find, scroll to, and measure the highlighted element
  useEffect(() => {
    if (step.highlightSelector) {
      const element = document.querySelector(step.highlightSelector);
      if (element) {
        setIsScrolling(true);
        setSpotlightRect(null); // Clear while scrolling
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Wait for scroll to complete, then measure and lock
        setTimeout(() => {
          const rect = element.getBoundingClientRect();
          const padding = 12;
          setSpotlightRect({
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
          });
          
          // Now lock scroll position
          scrollYRef.current = window.scrollY;
          setIsScrolling(false);
        }, 400);
      } else {
        setSpotlightRect(null);
      }
    } else {
      setSpotlightRect(null);
    }
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

  // Calculate tooltip position based on spotlight
  const getTooltipStyle = (): React.CSSProperties => {
    const viewportHeight = window.innerHeight;
    const tooltipHeight = 180; // More compact tooltip height
    const gap = 12;
    const statusBarHeight = 60; // Safe area for status bar

    if (!spotlightRect) {
      return {
        position: 'fixed',
        inset: 0,
        margin: 'auto',
        width: 'fit-content',
        height: 'fit-content',
        maxWidth: 'calc(100vw - 48px)',
      };
    }

    // Always try to position ABOVE the spotlight first
    const spaceAbove = spotlightRect.top - statusBarHeight;
    
    if (spaceAbove >= tooltipHeight + gap) {
      // Position above spotlight
      const topPos = Math.max(statusBarHeight, spotlightRect.top - tooltipHeight - gap);
      return { 
        position: 'fixed',
        top: `${topPos}px`, 
        left: '24px',
        right: '24px',
      };
    } else {
      // Position below spotlight only if no space above
      const navBarHeight = 100;
      const safeBottom = viewportHeight - navBarHeight;
      const topPos = spotlightRect.top + spotlightRect.height + gap;
      const adjustedTop = Math.min(topPos, safeBottom - tooltipHeight);
      return { 
        position: 'fixed',
        top: `${Math.max(statusBarHeight, adjustedTop)}px`, 
        left: '24px',
        right: '24px',
      };
    }
  };

  const isTooltipAbove = (): boolean => {
    if (!spotlightRect) return true;
    const statusBarHeight = 60;
    const tooltipHeight = 180;
    const gap = 12;
    const spaceAbove = spotlightRect.top - statusBarHeight;
    return spaceAbove >= tooltipHeight + gap;
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
                {/* White = visible, black = hidden */}
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {spotlightRect && (
                  <motion.rect
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    x={spotlightRect.left}
                    y={spotlightRect.top}
                    width={spotlightRect.width}
                    height={spotlightRect.height}
                    rx="16"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            {/* Semi-transparent overlay with hole */}
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.6)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* Spotlight border glow - enhanced */}
          {spotlightRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                boxShadow: [
                  '0 0 0 4px hsl(var(--aria-violet)), 0 0 40px hsl(var(--aria-violet) / 0.6)',
                  '0 0 0 4px hsl(var(--aria-violet)), 0 0 60px hsl(var(--aria-violet) / 0.8)',
                  '0 0 0 4px hsl(var(--aria-violet)), 0 0 40px hsl(var(--aria-violet) / 0.6)',
                ]
              }}
              transition={{ 
                boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
              }}
              className="absolute pointer-events-none rounded-2xl"
              style={{
                top: spotlightRect.top,
                left: spotlightRect.left,
                width: spotlightRect.width,
                height: spotlightRect.height,
                border: '4px solid hsl(var(--aria-violet))',
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
            <div className="relative w-full max-w-[280px] mx-auto">
              {/* Glass card - ultra compact */}
              <div className="bg-card/95 backdrop-blur-xl p-3 rounded-xl border border-border shadow-elevated overflow-hidden">
                {/* Aurora gradient background */}
                <div className="absolute inset-0 bg-gradient-aria-subtle opacity-30 pointer-events-none" />
                
                <div className="relative z-10">
                  {/* Skip button */}
                  <button
                    onClick={handleSkip}
                    className="absolute -top-0.5 -right-0.5 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Icon + Content inline */}
                  <div className="flex items-start gap-2.5 mb-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.1 }}
                      className="w-8 h-8 rounded-lg bg-gradient-aria flex items-center justify-center shadow-aria-glow shrink-0"
                    >
                      <div className="text-white [&>svg]:w-4 [&>svg]:h-4">{step.icon}</div>
                    </motion.div>
                    <div className="text-left min-w-0">
                      <h3 className="text-xs font-bold text-foreground mb-0.5">
                        {step.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="h-0.5 bg-muted/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-aria rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {!isLastStep && (
                      <Button
                        variant="ghost"
                        onClick={handleSkip}
                        className="flex-1 h-7 rounded-full text-muted-foreground text-[11px] px-2"
                      >
                        Salta
                      </Button>
                    )}
                    <Button
                      onClick={handleNext}
                      className={cn(
                        "h-7 rounded-full bg-gradient-aria text-white font-semibold shadow-aria-glow hover:shadow-elevated transition-all text-[11px] px-3",
                        "flex-1"
                      )}
                    >
                      {isLastStep ? 'Inizia!' : 'Avanti'}
                      {!isLastStep && <ChevronRight className="w-3 h-3 ml-0.5" />}
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
                    isTooltipAbove() ? "-bottom-1.5" : "-top-1.5"
                  )}
                >
                  <div 
                    className={cn(
                      "w-3 h-3 bg-card rotate-45 border border-border",
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
