import React, { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyzingScreenProps {
  onComplete: () => void;
  duration?: number;
}

const steps = [
  { label: 'Analisi del profilo...', delay: 0 },
  { label: 'Identificazione obiettivi...', delay: 800 },
  { label: 'Creazione piano personalizzato...', delay: 1600 },
  { label: 'Preparazione dashboard...', delay: 2400 },
];

const AnalyzingScreen: React.FC<AnalyzingScreenProps> = ({
  onComplete,
  duration = 3500,
}) => {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    steps.forEach((step, index) => {
      setTimeout(() => {
        setCompletedSteps(prev => [...prev, index]);
      }, step.delay);
    });

    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [onComplete, duration]);

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6">
      {/* Animated Circle */}
      <div className="relative mb-12">
        <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center animate-pulse-soft">
            <Sparkles className="w-12 h-12 text-primary animate-spin-slow" />
          </div>
        </div>
        {/* Orbiting dots */}
        <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '4s' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full" />
        </div>
        <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-primary/60 rounded-full" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-foreground mb-8 text-center">
        Stiamo preparando tutto per te
      </h2>

      {/* Checklist */}
      <div className="w-full max-w-xs space-y-4">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isActive = !isCompleted && completedSteps.length === index;

          return (
            <div
              key={index}
              className={cn(
                "flex items-center gap-3 transition-all duration-500",
                isCompleted ? "opacity-100" : isActive ? "opacity-100" : "opacity-40"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
                isCompleted 
                  ? "bg-primary" 
                  : isActive 
                    ? "bg-primary/20 animate-pulse-soft" 
                    : "bg-muted"
              )}>
                {isCompleted ? (
                  <Check className="w-4 h-4 text-primary-foreground" />
                ) : isActive ? (
                  <div className="w-2 h-2 bg-primary rounded-full" />
                ) : null}
              </div>
              <span className={cn(
                "text-sm font-medium transition-colors",
                isCompleted ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnalyzingScreen;