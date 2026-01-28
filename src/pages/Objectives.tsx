import React from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, BarChart3 } from 'lucide-react';
import ObjectivesTabContent from '@/components/objectives/ObjectivesTabContent';
import DailyTrackerTabContent from '@/components/objectives/DailyTrackerTabContent';

const Objectives: React.FC = () => {
  return (
    <MobileLayout>
      <div className="p-4 pb-28">
        {/* Header */}
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">I Tuoi Progressi</h1>
          <p className="text-sm text-muted-foreground">
            Traguardi a lungo termine e abitudini quotidiane
          </p>
        </header>

        {/* Tabs */}
        <Tabs defaultValue="objectives" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6 h-12 p-1 bg-muted/60 rounded-2xl">
            <TabsTrigger 
              value="objectives" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-xl text-sm font-medium"
            >
              <Target className="w-4 h-4" />
              Traguardi
            </TabsTrigger>
            <TabsTrigger 
              value="daily" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-xl text-sm font-medium"
            >
              <BarChart3 className="w-4 h-4" />
              Daily Tracker
            </TabsTrigger>
          </TabsList>

          <TabsContent value="objectives" className="mt-0">
            <ObjectivesTabContent />
          </TabsContent>

          <TabsContent value="daily" className="mt-0">
            <DailyTrackerTabContent />
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default Objectives;
