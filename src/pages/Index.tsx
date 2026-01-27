import React, { useMemo, useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import AdaptiveVitalsSection from '@/components/home/AdaptiveVitalsSection';
import LifeBalanceRadar from '@/components/home/LifeBalanceRadar';
import AIInsightCard from '@/components/home/AIInsightCard';
import FocusTopics from '@/components/home/FocusTopics';
import SmartCheckinSection from '@/components/home/SmartCheckinSection';
import EmotionalMixBar from '@/components/home/EmotionalMixBar';
import CheckinSummaryModal from '@/components/home/CheckinSummaryModal';
import WellnessScoreBox from '@/components/home/WellnessScoreBox';
import { ClipboardCheck, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useAIDashboard } from '@/hooks/useAIDashboard';
import { usePersonalizedCheckins } from '@/hooks/usePersonalizedCheckins';
import { useCheckinTimer } from '@/hooks/useCheckinTimer';
import { cn } from '@/lib/utils';

const Index: React.FC = () => {
  const { profile, isLoading } = useProfile();
  const { layout, isLoading: isLoadingAI, isRefreshingInBackground } = useAIDashboard();
  const { completedCount, allCompleted, dailyCheckins } = usePersonalizedCheckins();
  const { checkinStartedAt, startCheckinTimer } = useCheckinTimer();
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  
  const userName = profile?.name?.split(' ')[0] || 'Utente';

  // Sort widgets by priority from AI
  const sortedWidgets = useMemo(() => {
    if (!layout.widgets) return [];
    return [...layout.widgets]
      .filter(w => w.visible)
      .sort((a, b) => a.priority - b.priority);
  }, [layout.widgets]);

  // Check-in status for header icon
  const hasAnyCheckin = completedCount > 0 || checkinStartedAt;
  const isAllDone = allCompleted || (dailyCheckins.length === 0 && completedCount > 0);

  // Helper to render widget by type
  const renderWidget = (widget: typeof sortedWidgets[0], index: number) => {
    const baseProps = {
      key: widget.type,
      className: "animate-slide-up",
      style: { animationDelay: `${0.1 + index * 0.05}s` },
    };

    switch (widget.type) {
      case 'vitals_grid':
        return (
          <div {...baseProps}>
            <AdaptiveVitalsSection />
          </div>
        );
      // goals_progress removed - objectives now live in /objectives page
      case 'goals_progress':
        return null;
      case 'radar_chart':
        return (
          <div {...baseProps}>
            <LifeBalanceRadar />
          </div>
        );
      case 'emotional_mix':
        return (
          <div {...baseProps}>
            <EmotionalMixBar />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <MobileLayout>
      {/* Premium Hero Header */}
      <header className="px-6 pt-8 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">
              {isLoading ? '...' : `Ciao ${userName}`}
            </h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowSummaryModal(true)}
            className={cn(
              "relative rounded-2xl w-12 h-12 shadow-premium hover:shadow-elevated transition-all",
              isAllDone 
                ? "bg-emerald-100 dark:bg-emerald-900/50" 
                : "bg-card"
            )}
          >
            {isAllDone ? (
              <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ClipboardCheck className={cn(
                "w-5 h-5",
                hasAnyCheckin ? "text-primary" : "text-muted-foreground"
              )} />
            )}
            {hasAnyCheckin && !isAllDone && (
              <span className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full" />
            )}
          </Button>
        </div>

        {/* Wellness Score Box - Show cached data immediately */}
        <div className="mb-5">
          <WellnessScoreBox 
            score={layout.wellness_score} 
            message={layout.wellness_message}
            isLoading={isLoadingAI && layout.wellness_score === 5}
          />
        </div>

        {/* Smart Personalized Check-in */}
        <SmartCheckinSection onStartCheckin={startCheckinTimer} />
        
        {/* Focus Topics - 2 per row, max 6 */}
        <div className="mt-5">
          <FocusTopics />
        </div>
      </header>

      {/* Content Blocks - AI Driven Order */}
      <div className="px-6 pb-8 space-y-5">
        {/* AI-Ordered Widgets */}
        {sortedWidgets.map((widget, index) => renderWidget(widget, index))}

        {/* AI Insight Card - Moved below Focus */}
        <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <AIInsightCard />
        </div>
      </div>

      {/* Check-in Summary Modal */}
      <CheckinSummaryModal
        open={showSummaryModal}
        onOpenChange={setShowSummaryModal}
      />
    </MobileLayout>
  );
};

export default Index;
