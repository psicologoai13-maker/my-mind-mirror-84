import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MoreVertical, Target, Sparkles, Trash2, ChevronDown, RefreshCw, Bot } from 'lucide-react';
import { Objective, CATEGORY_CONFIG, calculateProgress, ObjectiveCategory } from '@/hooks/useObjectives';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ObjectiveCardProps {
  objective: Objective;
  onUpdate?: (id: string, updates: Partial<Objective>) => void;
  onDelete?: (id: string) => void;
}

// Category border colors for the card (full border)
const CATEGORY_BORDER_COLORS: Record<ObjectiveCategory, string> = {
  mind: 'border-purple-500/50',
  body: 'border-orange-500/50',
  study: 'border-blue-500/50',
  work: 'border-slate-400/50',
  relationships: 'border-pink-500/50',
  growth: 'border-emerald-500/50',
  finance: 'border-amber-500/50',
};

// Helper to determine tracking type
const getTrackingType = (objective: Objective): 'auto' | 'aria' => {
  if (objective.auto_sync_enabled || objective.linked_habit || objective.linked_body_metric) {
    return 'auto';
  }
  return 'aria';
};

// Category badge component
const CategoryBadge: React.FC<{ category: ObjectiveCategory }> = ({ category }) => {
  const config = CATEGORY_CONFIG[category];
  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "text-[10px] px-1.5 py-0 h-5 gap-1 font-medium",
        config.color
      )}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </Badge>
  );
};

// Tracking badge component
const TrackingBadge: React.FC<{ type: 'auto' | 'aria' }> = ({ type }) => {
  if (type === 'auto') {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
        <RefreshCw className="w-2.5 h-2.5" />
        Auto
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 border-primary/40 text-primary bg-primary/10">
      <Bot className="w-2.5 h-2.5" />
      Aria
    </Badge>
  );
};

// Circular progress component - Always positive gradient (violet → teal → emerald)
const CircularProgress: React.FC<{ progress: number; size?: number }> = ({ 
  progress, 
  size = 48 
}) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  // Positive gradient: indigo → primary → teal → emerald as progress increases
  const getStrokeColor = () => {
    if (progress >= 75) return '#10b981'; // emerald-500
    if (progress >= 50) return '#14b8a6'; // teal-500
    if (progress >= 25) return '#8b5cf6'; // violet-500 (primary)
    return '#a78bfa'; // violet-400 (soft start)
  };

  const getGlowIntensity = () => {
    // Glow increases with progress
    const intensity = Math.max(0.2, progress / 100 * 0.6);
    if (progress >= 75) return `drop-shadow(0 0 ${4 + progress/20}px rgba(16,185,129,${intensity}))`;
    if (progress >= 50) return `drop-shadow(0 0 ${4 + progress/25}px rgba(20,184,166,${intensity}))`;
    if (progress >= 25) return `drop-shadow(0 0 ${3 + progress/30}px rgba(139,92,246,${intensity}))`;
    return `drop-shadow(0 0 2px rgba(167,139,250,0.2))`;
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90 relative z-10"
        width={size}
        height={size}
        style={{ filter: getGlowIntensity() }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="fill-none transition-all duration-700 ease-out"
          style={{
            stroke: getStrokeColor(),
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <span className="text-sm font-bold text-foreground">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

export const ObjectiveCard: React.FC<ObjectiveCardProps> = ({
  objective,
  onUpdate,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const hasTarget = objective.target_value !== null && objective.target_value !== undefined;
  const hasProgress = (objective.current_value ?? 0) > (objective.starting_value ?? 0) || 
                      (objective.ai_progress_estimate ?? 0) > 0 ||
                      (objective.ai_milestones && objective.ai_milestones.length > 0);
  
  // Calculate progress
  const progress = hasTarget 
    ? calculateProgress(objective) 
    : (objective.ai_progress_estimate ?? 0);

  // Generate summary based on state - prioritize AI feedback for current state
  const getSummary = () => {
    // If AI feedback exists (dynamic state description), show it as primary
    if (objective.ai_feedback) {
      return objective.ai_feedback;
    }
    
    // If custom AI description exists (motivational phrase from creation)
    if (objective.ai_custom_description) {
      return objective.ai_custom_description;
    }
    
    // Generate contextual default
    if (hasProgress && progress > 0) {
      return getProgressComment();
    }
    
    if (objective.description) {
      return objective.description;
    }
    
    return "Parla con Aria per iniziare a tracciare questo obiettivo";
  };

  const getProgressComment = () => {
    if (progress >= 100) return "🎉 Obiettivo raggiunto!";
    if (progress >= 80) return "Quasi al traguardo!";
    if (progress >= 50) return "Ottimo, più di metà strada!";
    if (progress >= 25) return "Buon inizio, continua così!";
    if (progress > 0) return "Hai iniziato il percorso";
    return "";
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(objective.id);
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <motion.div 
        layout
        className={cn(
          "relative overflow-hidden rounded-2xl",
          "bg-glass backdrop-blur-xl",
          "shadow-glass hover:shadow-glass-elevated",
          "transition-all duration-300 ease-out",
          "cursor-pointer",
          // Category color border
          "border-2",
          CATEGORY_BORDER_COLORS[objective.category as ObjectiveCategory] || 'border-primary/50'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        whileTap={{ scale: 0.98 }}
      >
        {/* Ambient gradient - always positive vibes */}
        <div className={cn(
          "absolute inset-0 opacity-10 transition-opacity duration-500",
          progress >= 75 ? "bg-gradient-to-br from-emerald-500/30 to-teal-500/10" :
          progress >= 50 ? "bg-gradient-to-br from-teal-500/25 to-primary/10" :
          progress >= 25 ? "bg-gradient-to-br from-primary/20 to-violet-500/10" :
          "bg-gradient-to-br from-violet-400/15 to-primary/5"
        )} />
        
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 p-3">
          {/* Main row: Title + Circle */}
          <div className="flex items-start gap-2.5">
            {/* Title and summary */}
            <div className="flex-1 min-w-0">
              {/* Title with category badge inline */}
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <CategoryBadge category={objective.category as ObjectiveCategory} />
                <h3 className="font-semibold text-foreground text-sm leading-tight">
                  {objective.title}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-[1.4] h-[3.15rem] overflow-hidden pr-1">
                {getSummary()}
              </p>
            </div>
            
            {/* Circular progress */}
            <div className="shrink-0">
              <CircularProgress progress={progress} size={44} />
            </div>
            
            {/* Menu button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg shrink-0 -mr-0.5 -mt-0.5">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl bg-card/95 backdrop-blur-xl border-glass-border min-w-[160px]">
                {onUpdate && objective.status === 'active' && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(objective.id, { status: 'achieved' });
                  }}>
                    <Target className="h-4 w-4 mr-2" />
                    Raggiunto
                  </DropdownMenuItem>
                )}
                {onUpdate && objective.status === 'active' && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(objective.id, { status: 'paused' });
                  }}>
                    In pausa
                  </DropdownMenuItem>
                )}
                {onUpdate && objective.status === 'paused' && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(objective.id, { status: 'active' });
                  }}>
                    Riattiva
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Expand indicator */}
          <div className="flex justify-center mt-2">
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
            </motion.div>
          </div>
          
          {/* Expandable details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-2 border-t border-glass-border/50">
                  {/* AI insight card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-aria flex items-center justify-center shrink-0 shadow-aria-glow">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-primary mb-1">Aria dice:</p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {objective.ai_feedback || getDetailedExplanation()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Milestones */}
                  {objective.ai_milestones && objective.ai_milestones.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Traguardi raggiunti</p>
                      <div className="space-y-1.5">
                        {objective.ai_milestones.slice(-3).map((milestone, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <p className="text-xs text-muted-foreground">{milestone.milestone}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Delete dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo obiettivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare "{objective.title}". Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
  
  function getDetailedExplanation() {
    if (hasTarget) {
      const current = objective.current_value ?? 0;
      const target = objective.target_value!;
      const unit = objective.unit ? ' ' + objective.unit : '';
      
      if (progress >= 100) {
        return `Complimenti! Hai raggiunto il tuo obiettivo di ${target}${unit}. Un traguardo importante che dimostra il tuo impegno! 🎉`;
      }
      if (progress >= 75) {
        return `Manca poco al traguardo! Continua con questa determinazione per raggiungere ${target}${unit}. Sei sulla strada giusta.`;
      }
      if (progress >= 50) {
        return `Ottimo progresso, sei oltre la metà del percorso! Attualmente a ${current}${unit} su ${target}. Continua così!`;
      }
      if (progress > 0) {
        return `Hai iniziato bene il tuo percorso! Sei a ${current}${unit}, continua a lavorare verso il tuo obiettivo di ${target}.`;
      }
      return `Inizia a tracciare i tuoi progressi verso ${target}${unit}. Raccontami come sta andando per ricevere supporto.`;
    }
    
    // Qualitative
    if (progress >= 75) {
      return "Stai facendo progressi eccellenti verso questo obiettivo! La tua costanza sta dando i suoi frutti.";
    }
    if (progress >= 50) {
      return "Buoni progressi! Continua così, sei sulla strada giusta verso il raggiungimento del tuo obiettivo.";
    }
    if (progress > 0) {
      return "Hai iniziato il tuo percorso verso questo obiettivo. Raccontami i tuoi progressi per aggiornare la valutazione.";
    }
    return "Parla con me per iniziare a tracciare questo obiettivo. Ti aiuterò con feedback e supporto personalizzato.";
  }
};

export default ObjectiveCard;