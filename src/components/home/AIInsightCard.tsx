import React, { useState } from 'react';
import { Sparkles, Lightbulb, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const AIInsightCard: React.FC = () => {
  const { layout, isLoading, error } = useAIAnalysis('week');
  const [isOpen, setIsOpen] = useState(false);

  // Extract AI summary and focus insight from analysis layout
  const aiSummary = layout.ai_summary || '';
  const focusInsight = layout.focus_insight || '';

  // Check if we have real content
  const hasContent = aiSummary && !aiSummary.includes('Caricamento') && !aiSummary.includes('Benvenuto');

  // Generate a short preview (first sentence or max 80 chars)
  const getPreview = (text: string) => {
    if (!text) return 'Tocca per vedere i tuoi insight AI';
    const firstSentence = text.split(/[.!?]/)[0];
    if (firstSentence.length <= 80) return firstSentence + '.';
    return text.substring(0, 77) + '...';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-card rounded-3xl p-5 shadow-premium border border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Analizzando i tuoi dati...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error or empty state
  if (error || !hasContent) {
    return (
      <div className="bg-card rounded-3xl p-5 shadow-premium border border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              {error || 'Interagisci con l\'app per sbloccare insight personalizzati'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-card rounded-3xl shadow-premium border border-border/50 overflow-hidden transition-all duration-300">
        <CollapsibleTrigger className="w-full p-5 text-left">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
              isOpen ? "bg-primary" : "bg-primary/10"
            )}>
              <Sparkles className={cn(
                "w-5 h-5 transition-colors",
                isOpen ? "text-primary-foreground" : "text-primary"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              {!isOpen && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {getPreview(aiSummary)}
                </p>
              )}
            </div>
            <ChevronDown className={cn(
              "w-5 h-5 text-muted-foreground transition-transform duration-300 flex-shrink-0",
              isOpen && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="px-5 pb-5 space-y-3">
            {/* AI Summary - solo icona */}
            <div className="px-4 py-3 bg-primary/5 rounded-2xl border border-primary/10">
              <p className="text-sm text-foreground/90 flex items-start gap-2.5 leading-relaxed">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>{aiSummary}</span>
              </p>
            </div>

            {/* Focus Insight - solo icona */}
            {focusInsight && (
              <div className="px-4 py-3 bg-amber-50/80 rounded-2xl border border-amber-100/50">
                <p className="text-sm text-foreground/90 flex items-start gap-2.5 leading-relaxed">
                  <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{focusInsight}</span>
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default AIInsightCard;
