import React from 'react';
import { cn } from '@/lib/utils';
import BottomNav from './BottomNav';

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  hideNav?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children, className, hideNav }) => {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <main 
        className={cn(
          "flex-1 max-w-md mx-auto w-full",
          // Large padding to ensure content doesn't go under fixed navbar
          !hideNav && "pb-[calc(100px+env(safe-area-inset-bottom,0px))]",
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
