import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { useTimeWeightedMetrics } from '@/hooks/useTimeWeightedMetrics';

const AIInsightCard: React.FC = () => {
  const { layout, isLoading, error } = useAIAnalysis('week');
  const { vitals, lifeAreas, hasData } = useTimeWeightedMetrics(30, 7);

  // Calculate wellness score from available metrics
  const wellnessScore = React.useMemo(() => {
    const values: number[] = [];
    
    // Add vitals (invert anxiety)
    if (vitals.mood) values.push(vitals.mood);
    if (vitals.anxiety) values.push(10 - vitals.anxiety);
    if (vitals.energy) values.push(vitals.energy);
    if (vitals.sleep) values.push(vitals.sleep);
    
    // Add life areas
    if (lifeAreas.love) values.push(lifeAreas.love);
    if (lifeAreas.work) values.push(lifeAreas.work);
    if (lifeAreas.health) values.push(lifeAreas.health);
    if (lifeAreas.social) values.push(lifeAreas.social);
    if (lifeAreas.growth) values.push(lifeAreas.growth);
    
    if (values.length === 0) return null;
    
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.round(avg * 10) / 10;
  }, [vitals, lifeAreas]);

  // Extract AI summary
  const aiSummary = layout.ai_summary || '';

  // Check if we have real content
  const hasContent = aiSummary && !aiSummary.includes('Caricamento') && !aiSummary.includes('Benvenuto');

  // Get score color
  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 7) return 'text-emerald-600';
    if (score >= 5) return 'text-amber-600';
    return 'text-rose-600';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </div>
          <p className="text-xs text-muted-foreground">Analizzando...</p>
        </div>
      </div>
    );
  }

  // Error or empty state
  if (error || (!hasContent && !wellnessScore)) {
    return (
      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            {error || 'Interagisci per sbloccare insight AI'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50">
      <div className="flex items-start gap-3">
        {/* Score Badge */}
        {wellnessScore && (
          <div className={cn(
            "flex flex-col items-center justify-center min-w-[48px] h-12 rounded-xl bg-primary/5",
          )}>
            <span className={cn("text-lg font-bold", getScoreColor(wellnessScore))}>
              {wellnessScore}
            </span>
            <span className="text-[10px] text-muted-foreground -mt-0.5">/10</span>
          </div>
        )}
        
        {/* AI Summary Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="text-[10px] font-medium text-primary uppercase tracking-wide">Insight AI</span>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
            {aiSummary || 'Oggi sei stabile.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIInsightCard;
