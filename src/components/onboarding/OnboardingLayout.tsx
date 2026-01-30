import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  showProgress?: boolean;
  onBack?: () => void;
  showBack?: boolean;
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  currentStep,
  totalSteps,
  showProgress = true,
  onBack,
  showBack = true,
}) => {
  return (
    <div className="min-h-dvh bg-background flex flex-col relative overflow-hidden">
      {/* Subtle Aurora Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />

      {/* Progress Header */}
      {showProgress && (
        <motion.div 
          className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 pb-3 bg-background/80 backdrop-blur-xl border-b border-glass-border"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-4">
            {/* Back Button */}
            {showBack && onBack && currentStep > 1 && (
              <motion.button
                onClick={onBack}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 rounded-full bg-glass backdrop-blur-xl border border-glass-border shadow-glass flex items-center justify-center hover:shadow-glass-elevated transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </motion.button>
            )}

            {/* Dot Progress Indicators */}
            <div className="flex-1 flex items-center justify-center gap-2">
              {Array.from({ length: totalSteps }).map((_, index) => {
                const stepNum = index + 1;
                const isCompleted = stepNum < currentStep;
                const isCurrent = stepNum === currentStep;
                const isFuture = stepNum > currentStep;

                return (
                  <motion.div
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "rounded-full transition-all duration-300",
                      isCurrent 
                        ? "w-8 h-2 bg-primary shadow-glass-glow" 
                        : isCompleted 
                          ? "w-2 h-2 bg-primary/60"
                          : "w-2 h-2 bg-muted-foreground/30"
                    )}
                  />
                );
              })}
            </div>

            {/* Spacer to balance back button */}
            {showBack && currentStep > 1 && <div className="w-10" />}
          </div>
        </motion.div>
      )}

      {/* Content */}
      <main className={cn(
        "flex-1 flex flex-col relative z-10",
        showProgress && "pt-20"
      )}>
        {children}
      </main>
    </div>
  );
};

export default OnboardingLayout;
