import React from 'react';
import { Sparkles, Lightbulb, Loader2 } from 'lucide-react';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';

const AIInsightCard: React.FC = () => {
  const { layout, isLoading, error } = useAIAnalysis('week');

  // Extract AI summary and focus insight from analysis layout
  const aiSummary = layout.ai_summary || '';
  const focusInsight = layout.focus_insight || '';

  // Check if we have real content
  const hasContent = aiSummary && !aiSummary.includes('Caricamento') && !aiSummary.includes('Benvenuto');

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-5 border border-primary/10 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-primary/10 rounded w-3/4" />
              <div className="h-3 bg-primary/10 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error or empty state
  if (error || !hasContent) {
    return (
      <div className="bg-card rounded-3xl p-5 shadow-soft border border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground flex-1">
            Interagisci con l'app per sbloccare insight personalizzati
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Green Insight - Weekly Summary */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50/80 dark:from-emerald-950/30 dark:to-teal-950/20 rounded-3xl p-5 border border-emerald-200/50 dark:border-emerald-800/30 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
              Sintesi Settimanale
            </span>
            <p className="text-sm text-foreground/90 leading-relaxed mt-1">
              {aiSummary}
            </p>
          </div>
        </div>
      </div>

      {/* Yellow Insight - Focus Alert */}
      {focusInsight && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/80 dark:from-amber-950/30 dark:to-orange-950/20 rounded-3xl p-5 border border-amber-200/50 dark:border-amber-800/30 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                Focus Consigliato
              </span>
              <p className="text-sm text-foreground/90 leading-relaxed mt-1">
                {focusInsight}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightCard;
