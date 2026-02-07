import React, { useMemo, useState, useEffect } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import AdaptiveVitalsSection from '@/components/home/AdaptiveVitalsSection';
import SmartCheckinSection from '@/components/home/SmartCheckinSection';
import EmotionalMixBar from '@/components/home/EmotionalMixBar';
import CheckinSummaryModal from '@/components/home/CheckinSummaryModal';
import WellnessScoreBox from '@/components/home/WellnessScoreBox';
import OnboardingTutorial from '@/components/home/OnboardingTutorial';
import { ClipboardCheck, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useAIDashboard } from '@/hooks/useAIDashboard';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { usePersonalizedCheckins } from '@/hooks/usePersonalizedCheckins';
import { useCheckinTimer } from '@/hooks/useCheckinTimer';
import { cn } from '@/lib/utils';

const Index: React.FC = () => {
  const { profile, isLoading, updateProfile } = useProfile();
  const { layout, isLoading: isLoadingAI, isRefreshingInBackground } = useAIDashboard();
  const { layout: analysisLayout } = useAIAnalysis('week');
  const { completedCount, allCompleted, dailyCheckins } = usePersonalizedCheckins();
  const { checkinStartedAt, startCheckinTimer } = useCheckinTimer();
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  
  const userName = profile?.name?.split(' ')[0] || 'Utente';

  // Check if this is a new user (no wellness score yet - activates after check-in or Aria conversation)
  const hasWellnessScore = layout.wellness_score !== null && layout.wellness_score !== undefined;
  const isNewUser = profile?.onboarding_completed && !hasWellnessScore;

  // Show tutorial ONLY for new users who haven't seen it - check both keys
  useEffect(() => {
    if (profile && profile.onboarding_completed && profile.user_id) {
      // Check both global and user-specific key
      const globalTutorialSeen = localStorage.getItem('tutorial_completed');
      const userTutorialSeen = localStorage.getItem(`tutorial_seen_${profile.user_id}`);
      
      if (!globalTutorialSeen && !userTutorialSeen) {
        // Small delay to let the page render first
        const timer = setTimeout(() => setShowTutorial(true), 600);
        return () => clearTimeout(timer);
      }
    }
  }, [profile?.onboarding_completed, profile?.user_id]);

  const handleTutorialComplete = () => {
    setShowTutorial(false);
  };

  // Get AI insights from analysis layout
  const aiSummary = analysisLayout.ai_summary || '';
  const focusInsight = analysisLayout.focus_insight || '';

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
      // radar_chart moved to Analisi page
      case 'radar_chart':
        return null;
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
      {/* Onboarding Tutorial for new users */}
      {showTutorial && (
        <OnboardingTutorial 
          onComplete={handleTutorialComplete} 
          userId={profile?.user_id}
        />
      )}

      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {isLoading ? '...' : `Ciao ${userName}`}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Come ti senti oggi?</p>
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

        {/* Wellness Score Box with expandable AI insights */}
        <div className="mb-5">
          <WellnessScoreBox 
            score={layout.wellness_score} 
            message={layout.wellness_message}
            isLoading={isLoadingAI && !profile?.wellness_score}
            aiSummary={aiSummary}
            focusInsight={focusInsight}
            isNewUser={isNewUser}
          />
        </div>

        {/* Smart Personalized Check-in */}
        <SmartCheckinSection onStartCheckin={startCheckinTimer} />
      </header>

      <div className="px-5 pb-8 space-y-6">
        {/* AI-Ordered Widgets */}
        {sortedWidgets.map((widget, index) => renderWidget(widget, index))}
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
