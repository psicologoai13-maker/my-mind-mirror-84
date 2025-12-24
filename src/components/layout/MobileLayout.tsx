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
    <>
      <main 
        className={cn(
          "min-h-screen bg-background max-w-md mx-auto",
          "pb-32", // Large padding to ensure content doesn't go under fixed navbar
          className
        )}
        style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))' }}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </>
  );
};

export default MobileLayout;
