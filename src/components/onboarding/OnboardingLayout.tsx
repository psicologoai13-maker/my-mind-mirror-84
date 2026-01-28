import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  showProgress?: boolean;
  onBack?: () => void;
  showBack?: boolean;
  encouragement?: string;
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  currentStep,
  totalSteps,
  showProgress = true,
  onBack,
  showBack = true,
  encouragement,
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Progress Bar */}
      {showProgress && (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 pb-2 bg-background/80 backdrop-blur-lg">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            {showBack && onBack && currentStep > 1 && (
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center hover:shadow-premium transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
            )}

            {/* Progress Bar */}
            <div className="flex-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {/* Step indicators and encouragement */}
              <div className="flex justify-between items-center mt-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {currentStep} di {totalSteps}
                </span>
                {encouragement && (
                  <span className="text-xs font-medium text-primary animate-fade-in">
                    {encouragement}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className={cn(
        "flex-1 flex flex-col",
        showProgress && "pt-20"
      )}>
        {children}
      </main>
    </div>
  );
};

export default OnboardingLayout;