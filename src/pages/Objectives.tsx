import React, { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Target, BarChart3 } from 'lucide-react';
import { PillTabs } from '@/components/ui/pill-tabs';
import ObjectivesTabContent from '@/components/objectives/ObjectivesTabContent';
import DailyTrackerTabContent from '@/components/objectives/DailyTrackerTabContent';

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
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            I Tuoi Progressi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Traguardi a lungo termine e abitudini quotidiane
          </p>
        </header>

        {/* Pill Tabs */}
        <div className="flex justify-center mb-6">
          <PillTabs
            tabs={tabs}
            value={activeTab}
            onValueChange={setActiveTab}
          />
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
