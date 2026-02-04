import React, { useState } from 'react';
import { Sparkles, Lightbulb, ChevronDown, MessageCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedRing } from '@/components/ui/animated-ring';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface WellnessScoreBoxProps {
  score?: number | null;
  message?: string;
  isLoading?: boolean;
  aiSummary?: string;
  focusInsight?: string;
  isNewUser?: boolean;
}

const WellnessScoreBox: React.FC<WellnessScoreBoxProps> = ({ 
  score, 
  message, 
  isLoading,
  aiSummary,
  focusInsight,
  isNewUser = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  
  // Check if user has real data
  const hasRealData = score !== null && score !== undefined;
  const safeScore = hasRealData ? score : null;
  
  // Default message for new users vs existing users
  const safeMessage = message || (isNewUser || !hasRealData
    ? 'Iniziamo questo percorso insieme: ogni piccolo passo conta per il tuo benessere.'
    : 'Parla con me per iniziare a monitorare il tuo benessere.');

  // Check if we have expandable content
  const hasExpandableContent = (aiSummary || focusInsight) && hasRealData;

  // Get glow color based on score
  const getGlowColor = (value: number | null) => {
    if (value === null) return 'hsl(var(--muted-foreground))';
    if (value >= 7) return 'hsl(var(--mood-excellent))';
    if (value >= 5) return 'hsl(var(--mood-neutral))';
    return 'hsl(var(--mood-low))';
  };

  if (isLoading) {
    return (
      <div className={cn(
        "relative overflow-hidden rounded-[32px] p-6",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass animate-pulse"
      )}>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-muted/50" />
          <div className="flex-1 space-y-3">
            <div className="h-3 bg-muted/50 rounded-full w-24" />
            <div className="h-4 bg-muted/50 rounded-full w-full" />
            <div className="h-4 bg-muted/50 rounded-full w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  // New user empty state with CTA
  if (!hasRealData || isNewUser) {
    return (
      <div 
        className={cn(
          "relative overflow-hidden rounded-[32px]",
          "bg-glass backdrop-blur-xl border border-glass-border",
          "shadow-glass-glow",
          "animate-scale-in"
        )}
      >
        {/* Gradient mesh background */}
        <div className="absolute inset-0 bg-gradient-aria-subtle opacity-30 pointer-events-none" />
        
        {/* Inner light reflection */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none rounded-[32px]" />
        
        {/* Main Content */}
        <div className="relative z-10 p-6">
          <div className="flex items-center gap-5">
            {/* Animated Ring Score - Empty state */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full border-4 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-aria-violet animate-pulse" />
              </div>
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-aria-violet/15 backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5 text-aria-violet" />
                </div>
                <span className="text-xs font-semibold text-aria-violet uppercase tracking-wide">
                  Il tuo stato
                </span>
              </div>
              <p className="text-[15px] text-foreground leading-relaxed font-medium">
                {safeMessage}
              </p>
            </div>
          </div>

          {/* CTA for new users */}
          <div className="mt-4 pt-4 border-t border-border/30">
            <Button
              onClick={() => navigate('/aria')}
              className="w-full h-11 rounded-full bg-gradient-aria text-white font-medium shadow-aria-glow hover:shadow-elevated transition-all group"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Parla con Aria per iniziare
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-[32px]",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass-glow",
        "animate-scale-in",
        hasExpandableContent && "cursor-pointer"
      )}
      onClick={() => hasExpandableContent && setIsExpanded(!isExpanded)}
    >
      {/* Gradient mesh background */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-50 pointer-events-none" />
      
      {/* Inner light reflection */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none rounded-[32px]" />
      
      {/* Main Content */}
      <div className="relative z-10 p-6">
        <div className="flex items-center gap-5">
          {/* Animated Ring Score */}
          <div className="relative shrink-0">
            {/* Glow effect behind ring */}
            <div 
              className="absolute inset-0 rounded-full blur-xl opacity-40"
              style={{ background: getGlowColor(safeScore) }}
            />
            <AnimatedRing
              value={(safeScore ?? 0) * 10}
              size="lg"
              thickness={8}
              color={getGlowColor(safeScore)}
              glowColor={getGlowColor(safeScore)}
              showValue={true}
            />
          </div>

          {/* Message */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-primary/10 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                Il tuo stato
              </span>
              {hasExpandableContent && (
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-auto"
                >
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              )}
            </div>
            <p className="text-[15px] text-foreground leading-relaxed font-medium">
              {safeMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Insights Section */}
      <AnimatePresence>
        {isExpanded && hasExpandableContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="relative z-10 px-6 pb-6 space-y-4">
              {/* Divider */}
              <div className="h-px bg-border/50" />
              
              {/* AI Summary */}
              {aiSummary && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                      Sintesi AI
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {aiSummary}
                    </p>
                  </div>
                </div>
              )}

              {/* Focus Insight */}
              {focusInsight && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
                      Focus
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {focusInsight}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WellnessScoreBox;
