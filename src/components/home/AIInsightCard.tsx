import React from 'react';
import { Sparkles, Lightbulb, Loader2, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
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
        <div className="bg-card rounded-3xl p-5 shadow-premium border border-border/30 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded-lg w-3/4" />
              <div className="h-3 bg-muted rounded-lg w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error or empty state
  if (error || !hasContent) {
    return (
      <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-3xl p-5 border border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
            <Brain className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-0.5">Insight AI</p>
            <p className="text-xs text-muted-foreground">
              Interagisci con l'app per sbloccare insight personalizzati
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Synthesis Insight Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-primary/10 rounded-3xl p-5 shadow-premium border border-primary/20">
        {/* Decorative glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="relative flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5">
              Sintesi AI
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {aiSummary}
            </p>
          </div>
        </div>
      </div>

      {/* Focus Insight Card */}
      {focusInsight && (
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-50/80 via-card to-orange-50/50 dark:from-amber-900/20 dark:via-card dark:to-orange-900/10 rounded-3xl p-5 shadow-premium border border-amber-200/30 dark:border-amber-700/30">
          {/* Decorative glow */}
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-200/20 dark:bg-amber-700/10 rounded-full blur-3xl" />
          
          <div className="relative flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1.5">
                Focus
              </p>
              <p className="text-sm text-foreground leading-relaxed">
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
