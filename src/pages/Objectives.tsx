import React from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import ObjectivesTabContent from '@/components/objectives/ObjectivesTabContent';
import { cn } from '@/lib/utils';

const Objectives: React.FC = () => {
  return (
    <MobileLayout>
      <div className="p-4 pb-28">
        {/* Header with glass effect */}
        <header className="mb-6">
          <div className={cn(
            "relative overflow-hidden rounded-3xl p-5 mb-4",
            "bg-glass backdrop-blur-xl border border-glass-border",
            "shadow-glass"
          )}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                I Tuoi Obiettivi
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Tutti i tuoi traguardi in un unico posto
              </p>
            </div>
          </div>
        </header>

        {/* Unified Objectives Content */}
        <div className="animate-fade-in">
          <ObjectivesTabContent />
        </div>
      </div>
    </MobileLayout>
  );
};

export default Objectives;
