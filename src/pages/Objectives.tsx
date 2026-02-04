import React from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import ObjectivesTabContent from '@/components/objectives/ObjectivesTabContent';
import { cn } from '@/lib/utils';

const Objectives: React.FC = () => {
  return (
    <MobileLayout>
      <div className="pb-28">
        {/* Header */}
        <header className="px-5 pt-6 pb-4">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Obiettivi
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            I tuoi traguardi personali
          </p>
        </header>

        {/* Objectives Content */}
        <div className="px-5 animate-fade-in">
          <ObjectivesTabContent />
        </div>
      </div>
    </MobileLayout>
  );
};

export default Objectives;
