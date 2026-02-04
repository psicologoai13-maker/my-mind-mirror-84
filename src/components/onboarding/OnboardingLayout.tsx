import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import FloatingParticles from '@/components/aria/FloatingParticles';

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
      {/* Aurora Ambient Background */}
      <div className="absolute inset-0 bg-gradient-mesh" />
      <div className="absolute inset-0 bg-gradient-aria-subtle opacity-40" />
      
      {/* Floating Particles */}
      <FloatingParticles />

      {/* Progress Header */}
      {showProgress && (
        <motion.div 
          className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 pb-3 bg-glass backdrop-blur-2xl border-b border-glass-border"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-4">
            {/* Back Button - Enhanced */}
            {showBack && onBack && currentStep > 1 && (
              <motion.button
                onClick={onBack}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                className="w-11 h-11 rounded-full bg-glass backdrop-blur-xl border border-glass-border shadow-glass flex items-center justify-center hover:shadow-aria-glow hover:border-aria-violet/30 transition-all duration-300"
              >
                <ChevronLeft className="w-6 h-6 text-foreground" />
              </motion.button>
            )}

            {/* Premium Dot Progress Indicators */}
            <div className="flex-1 flex items-center justify-center gap-2.5">
              {Array.from({ length: totalSteps }).map((_, index) => {
                const stepNum = index + 1;
                const isCompleted = stepNum < currentStep;
                const isCurrent = stepNum === currentStep;

                return (
                  <motion.div
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "rounded-full transition-all duration-500",
                      isCurrent 
                        ? "w-10 h-2.5 bg-gradient-aria shadow-aria-glow" 
                        : isCompleted 
                          ? "w-2.5 h-2.5 bg-aria-violet shadow-[0_0_10px_rgba(155,111,208,0.4)]"
                          : "w-2 h-2 bg-muted-foreground/20"
                    )}
                  />
                );
              })}
            </div>

            {/* Spacer to balance back button */}
            {showBack && currentStep > 1 && <div className="w-11" />}
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
