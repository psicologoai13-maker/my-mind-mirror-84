import React, { useMemo, useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import AdaptiveVitalsSection from '@/components/home/AdaptiveVitalsSection';
import LifeBalanceRadar from '@/components/home/LifeBalanceRadar';
import AIInsightCard from '@/components/home/AIInsightCard';
import GoalsWidget from '@/components/home/GoalsWidget';
import SmartCheckinSection from '@/components/home/SmartCheckinSection';
import EmotionalMixBar from '@/components/home/EmotionalMixBar';
import FlashInsights from '@/components/home/FlashInsights';
import CheckinSummaryModal from '@/components/home/CheckinSummaryModal';
import { ClipboardCheck, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useAIDashboard } from '@/hooks/useAIDashboard';
import { usePersonalizedCheckins } from '@/hooks/usePersonalizedCheckins';
import { useCheckinTimer } from '@/hooks/useCheckinTimer';
import { cn } from '@/lib/utils';

const Index: React.FC = () => {
  const { profile, isLoading } = useProfile();
  const { layout, isLoading: isLoadingAI } = useAIDashboard();
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
      case 'goals_progress':
        // Goals widget removed per user request
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
        <div className="flex items-start justify-between mb-3">
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

        {/* AI-Generated Personal Message - Single prominent message */}
        {!isLoadingAI && layout.ai_message && (
          <p className="text-base text-muted-foreground leading-relaxed mb-5">
            {layout.ai_message}
          </p>
        )}

        {/* AI Insight Card - Above Focus */}
        <div className="animate-slide-up mb-4" style={{ animationDelay: '0.05s' }}>
          <AIInsightCard />
        </div>

        {/* Smart Personalized Check-in with Focus title */}
        <SmartCheckinSection onStartCheckin={startCheckinTimer} showFocusTitle />
      </header>

      {/* Content Blocks - AI Driven Order */}
      <div className="px-6 pb-8 space-y-5">
        {/* AI-Ordered Widgets */}
        {sortedWidgets.map((widget, index) => renderWidget(widget, index))}

        {/* Flash Insights at bottom */}
        <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <FlashInsights />
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
