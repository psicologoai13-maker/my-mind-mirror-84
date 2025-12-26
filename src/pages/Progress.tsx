import React from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import VitalTrendsSparklines from '@/components/progress/VitalTrendsSparklines';
import EmotionalWeather from '@/components/progress/EmotionalWeather';
import ImprovedLifeRadar from '@/components/progress/ImprovedLifeRadar';
import MoodCalendar from '@/components/progress/MoodCalendar';

const Progress: React.FC = () => {
  return (
    <MobileLayout>
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Analisi Clinica</h1>
        <p className="text-muted-foreground text-sm mt-1">Centro di monitoraggio benessere</p>
      </header>

      <div className="px-4 space-y-5 pb-8">
        {/* Section 1: Vital Trends Sparklines */}
        <section className="animate-fade-in">
          <VitalTrendsSparklines />
        </section>

        {/* Section 2: Emotional Weather - Stacked Bar Chart */}
        <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <EmotionalWeather />
        </section>

        {/* Section 3: Life Areas Radar Chart 2.0 */}
        <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <ImprovedLifeRadar />
        </section>

        {/* Section 4: Mood Calendar */}
        <section className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <MoodCalendar />
        </section>
      </div>
    </MobileLayout>
  );
};

export default Progress;