import React, { useMemo, useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import AdaptiveVitalsSection from '@/components/home/AdaptiveVitalsSection';
import SmartCheckinSection from '@/components/home/SmartCheckinSection';
import EmotionalMixBar from '@/components/home/EmotionalMixBar';
import CheckinSummaryModal from '@/components/home/CheckinSummaryModal';
import WellnessScoreBox from '@/components/home/WellnessScoreBox';
import WelcomeBackBanner from '@/components/home/WelcomeBackBanner';
import { ClipboardCheck, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useAIDashboard } from '@/hooks/useAIDashboard';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { usePersonalizedCheckins } from '@/hooks/usePersonalizedCheckins';
import { useCheckinTimer } from '@/hooks/useCheckinTimer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';

const Index: React.FC = () => {
  const { user } = useAuth();
  const { profile, isLoading } = useProfile();
  const { layout, isLoading: isLoadingAI } = useAIDashboard();
  const { layout: analysisLayout } = useAIAnalysis('week');
  const { completedCount, allCompleted, dailyCheckins } = usePersonalizedCheckins();
  const { checkinStartedAt, startCheckinTimer } = useCheckinTimer();
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [welcomeBannerDismissed, setWelcomeBannerDismissed] = useState(false);

  // Query last session date for welcome-back banner
  const { data: lastSessionDate } = useQuery({
    queryKey: ['last-session-date', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('sessions')
        .select('start_time')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('start_time', { ascending: false })
        .limit(1);
      return data?.[0]?.start_time || null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const daysSinceLastSession = useMemo(() => {
    if (!lastSessionDate) return null;
    const diffMs = Date.now() - new Date(lastSessionDate).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }, [lastSessionDate]);

  const showWelcomeBack = daysSinceLastSession !== null && daysSinceLastSession >= 3 && !welcomeBannerDismissed;
  
  const userName = profile?.name?.split(' ')[0] || 'Utente';

  // Personalized greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Buonanotte';
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  }, []);

  // Check if this is a new user (no wellness score yet - activates after check-in or Aria conversation)
  const hasWellnessScore = layout.wellness_score !== null && layout.wellness_score !== undefined;
  const isNewUser = profile?.onboarding_completed && !hasWellnessScore;

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
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {isLoading ? '...' : `${greeting}, ${userName}`}
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

        {/* Welcome Back Banner - shown after 3+ days of inactivity */}
        <AnimatePresence>
          {showWelcomeBack && (
            <div className="mb-4">
              <WelcomeBackBanner
                daysSinceLastSession={daysSinceLastSession!}
                userName={userName}
                onDismiss={() => setWelcomeBannerDismissed(true)}
              />
            </div>
          )}
        </AnimatePresence>

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
