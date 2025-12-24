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
      <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
        <main className={cn("flex-1 pb-40", className)}>
          {children}
        </main>
      </div>
      {!hideNav && <BottomNav />}
    </>
  );
};

export default MobileLayout;
