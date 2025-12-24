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
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      <main className={cn("flex-1 overflow-y-auto pb-24", className)}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
};

export default MobileLayout;
