import React, { useState } from 'react';
import { Sparkles, Lightbulb, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIDashboard } from '@/hooks/useAIDashboard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const AIInsightCard: React.FC = () => {
  const { layout, isLoading, error } = useAIDashboard();
  const [isOpen, setIsOpen] = useState(false);

  // Extract AI message and focus areas from dashboard layout
  const aiSummary = layout.ai_message || '';
  const focusAreas = layout.focus_areas || [];

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
            <h3 className="text-sm font-semibold text-foreground">AI Insight</h3>
            <p className="text-xs text-muted-foreground">Analizzando i tuoi dati...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error or empty state
  if (error || !aiSummary) {
    return (
      <div className="bg-card rounded-3xl p-5 shadow-premium border border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">AI Insight</h3>
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
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">AI Insight</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  Personalizzato
                </span>
              </div>
              {!isOpen && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {getPreview(aiSummary)}
                </p>
              )}
            </div>
            <ChevronDown className={cn(
              "w-5 h-5 text-muted-foreground transition-transform duration-300",
              isOpen && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="px-5 pb-5 space-y-4">
            {/* Sintesi AI */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5">
                    Sintesi AI
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed">
                    {aiSummary}
                  </p>
                </div>
              </div>
            </div>

            {/* Insight Focale - if we have focus areas */}
            {focusAreas.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/50">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">
                      Insight Focale
                    </h4>
                    <p className="text-sm text-foreground leading-relaxed">
                      {focusAreas.length === 1 
                        ? `Oggi concentrati su: ${focusAreas[0]}`
                        : `Le aree su cui concentrarti oggi sono: ${focusAreas.join(', ')}.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default AIInsightCard;
