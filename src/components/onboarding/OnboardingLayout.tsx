import React from 'react';
import { cn } from '@/lib/utils';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  showProgress?: boolean;
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  currentStep,
  totalSteps,
  showProgress = true,
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Progress Bar */}
      {showProgress && (
        <div className="fixed top-0 left-0 right-0 z-50 px-6 pt-4 pb-2 bg-background/80 backdrop-blur-lg">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {currentStep}/{totalSteps}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <main className={cn(
        "flex-1 flex flex-col",
        showProgress && "pt-14"
      )}>
        {children}
      </main>
    </div>
  );
};

export default OnboardingLayout;