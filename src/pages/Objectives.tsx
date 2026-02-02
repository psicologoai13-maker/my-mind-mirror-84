import React, { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Target, BarChart3, Info } from 'lucide-react';
import { PillTabs } from '@/components/ui/pill-tabs';
import ObjectivesTabContent from '@/components/objectives/ObjectivesTabContent';
import DailyTrackerTabContent from '@/components/objectives/DailyTrackerTabContent';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const Objectives: React.FC = () => {
  const [activeTab, setActiveTab] = useState('objectives');

  const tabs = [
    { 
      value: 'objectives', 
      label: 'Traguardi',
      icon: <Target className="w-4 h-4" />
    },
    { 
      value: 'daily', 
      label: 'Daily Tracker',
      icon: <BarChart3 className="w-4 h-4" />
    },
  ];

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
                I Tuoi Progressi
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Traguardi a lungo termine e abitudini quotidiane
              </p>
            </div>
          </div>
        </header>

        {/* Pill Tabs with Info Tooltip */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <PillTabs
            tabs={tabs}
            value={activeTab}
            onValueChange={setActiveTab}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-1.5 rounded-full hover:bg-muted transition-colors">
                  <Info className="w-4 h-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[280px] p-3">
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" /> Traguardi
                    </p>
                    <p className="text-muted-foreground">
                      Obiettivi a lungo termine con un punto di arrivo. Es: "Perdere 5kg", "Risparmiare €2000"
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" /> Daily Tracker
                    </p>
                    <p className="text-muted-foreground">
                      Abitudini ricorrenti da fare ogni giorno. Es: "Meditare", "8 bicchieri d'acqua"
                    </p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'objectives' ? (
            <ObjectivesTabContent />
          ) : (
            <DailyTrackerTabContent />
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default Objectives;
