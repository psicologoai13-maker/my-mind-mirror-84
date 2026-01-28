import React, { useEffect, useState } from 'react';
import { Check, Sparkles, Brain, Target, LayoutDashboard, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyzingScreenProps {
  onComplete: () => void;
  duration?: number;
  userName?: string;
}

const steps = [
  { label: 'Analisi del profilo', icon: Brain, delay: 0 },
  { label: 'Obiettivi identificati', icon: Target, delay: 800 },
  { label: 'Piano personalizzato creato', icon: Heart, delay: 1600 },
  { label: 'Dashboard pronta', icon: LayoutDashboard, delay: 2400 },
];

const AnalyzingScreen: React.FC<AnalyzingScreenProps> = ({
  onComplete,
  duration = 3500,
  userName,
}) => {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, duration / 50);

    // Complete steps one by one
    steps.forEach((step, index) => {
      setTimeout(() => {
        setCompletedSteps(prev => [...prev, index]);
      }, step.delay);
    });

    const timer = setTimeout(onComplete, duration);
    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [onComplete, duration]);

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6">
      {/* Animated Circle */}
      <div className="relative mb-8">
        {/* Progress ring */}
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="6"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${progress * 2.83} 283`}
            className="transition-all duration-100"
          />
        </svg>
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary animate-pulse" />
          </div>
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '4s' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full" />
        </div>
        <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-primary/60 rounded-full" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-foreground mb-2 text-center">
        {userName ? `${userName}, ` : ''}Stiamo preparando tutto
      </h2>
      <p className="text-sm text-muted-foreground mb-8">Ci vorrà solo un momento...</p>

      {/* Checklist */}
      <div className="w-full max-w-xs space-y-3">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isActive = !isCompleted && completedSteps.length === index;
          const Icon = step.icon;

          return (
            <div
              key={index}
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl transition-all duration-500",
                isCompleted ? "bg-primary/5" : "bg-card/50"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                isCompleted 
                  ? "bg-primary" 
                  : isActive 
                    ? "bg-primary/20 animate-pulse-soft" 
                    : "bg-muted"
              )}>
                {isCompleted ? (
                  <Check className="w-5 h-5 text-primary-foreground animate-scale-in" />
                ) : (
                  <Icon className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                )}
              </div>
              <span className={cn(
                "text-sm font-medium transition-colors",
                isCompleted ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
              {isCompleted && (
                <span className="ml-auto text-xs text-primary animate-fade-in">✓</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnalyzingScreen;