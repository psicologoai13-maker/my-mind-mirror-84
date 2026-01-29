import React from 'react';
import { cn } from '@/lib/utils';
import BottomNav from './BottomNav';

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  hideNav?: boolean;
  withMesh?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ 
  children, 
  className, 
  hideNav,
  withMesh = true 
}) => {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative">
      {/* Gradient mesh background */}
      {withMesh && (
        <div className="fixed inset-0 bg-gradient-mesh opacity-60 pointer-events-none" />
      )}
      
      <main 
        className={cn(
          "relative z-10 flex-1 max-w-md mx-auto w-full",
          // Large padding to ensure content doesn't go under fixed navbar
          !hideNav && "pb-[calc(120px+env(safe-area-inset-bottom,0px))]",
          hideNav && "h-[100dvh] overflow-hidden",
          className
        )}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
};

export default MobileLayout;
