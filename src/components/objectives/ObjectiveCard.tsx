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

// Category border colors for the card
const CATEGORY_BORDER_COLORS: Record<ObjectiveCategory, string> = {
  mind: 'border-l-purple-500',
  body: 'border-l-orange-500',
  study: 'border-l-blue-500',
  work: 'border-l-slate-500',
  relationships: 'border-l-pink-500',
  growth: 'border-l-emerald-500',
  finance: 'border-l-yellow-500',
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

// Circular progress component
const CircularProgress: React.FC<{ progress: number; size?: number }> = ({ 
  progress, 
  size = 64 
}) => {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  const getProgressColor = () => {
    if (progress >= 80) return 'stroke-emerald-500';
    if (progress >= 50) return 'stroke-primary';
    if (progress >= 25) return 'stroke-amber-500';
    return 'stroke-muted-foreground/50';
  };

  const getGlowColor = () => {
    if (progress >= 80) return 'drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]';
    if (progress >= 50) return 'drop-shadow-[0_0_6px_rgba(var(--primary-rgb),0.5)]';
    if (progress >= 25) return 'drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]';
    return '';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className={cn(
        "absolute inset-0 rounded-full blur-md opacity-30",
        progress >= 80 ? "bg-emerald-500" :
        progress >= 50 ? "bg-primary" :
        progress >= 25 ? "bg-amber-500" : "bg-muted"
      )} />
      
      <svg
        className={cn("transform -rotate-90 relative z-10", getGlowColor())}
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn("fill-none transition-all duration-700 ease-out", getProgressColor())}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <span className="text-base font-bold text-foreground">
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
          "relative overflow-hidden rounded-3xl",
          "bg-glass backdrop-blur-xl border border-glass-border",
          "shadow-glass hover:shadow-glass-elevated",
          "transition-all duration-300 ease-out",
          "cursor-pointer",
          // Category color border on left
          "border-l-4",
          CATEGORY_BORDER_COLORS[objective.category as ObjectiveCategory] || 'border-l-primary'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        whileTap={{ scale: 0.98 }}
      >
        {/* Ambient gradient based on progress */}
        <div className={cn(
          "absolute inset-0 opacity-15 transition-opacity duration-500",
          progress >= 80 ? "bg-gradient-to-br from-emerald-500/40 to-teal-500/10" :
          progress >= 50 ? "bg-gradient-to-br from-primary/40 to-primary/5" :
          progress >= 25 ? "bg-gradient-to-br from-amber-500/40 to-orange-500/10" :
          "bg-gradient-to-br from-muted/30 to-transparent"
        )} />
        
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/8 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 p-4">
          {/* Main row: Title + Circle */}
          <div className="flex items-start gap-3">
            {/* Title and summary */}
            <div className="flex-1 min-w-0">
              {/* Title with category badge inline */}
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <CategoryBadge category={objective.category as ObjectiveCategory} />
                <h3 className="font-semibold text-foreground text-base leading-tight">
                  {objective.title}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {getSummary()}
              </p>
            </div>
            
            {/* Circular progress */}
            <div className="shrink-0">
              <CircularProgress progress={progress} size={56} />
            </div>
            
            {/* Menu button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg shrink-0 -mr-1 -mt-1">
                  <MoreVertical className="h-4 w-4" />
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
          <div className="flex justify-center mt-3">
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
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
      const starting = objective.starting_value ?? 0;
      
      if (progress >= 100) {
        return `Complimenti! Hai raggiunto il tuo obiettivo di ${target}${objective.unit ? ' ' + objective.unit : ''}. Un traguardo importante! 🎉`;
      }
      if (progress >= 75) {
        return `Sei al ${Math.round(progress)}%, manca poco! Continua così per raggiungere ${target}${objective.unit ? ' ' + objective.unit : ''}.`;
      }
      if (progress >= 50) {
        return `Ottimo progresso! Sei oltre la metà del percorso. Attualmente a ${current}${objective.unit ? ' ' + objective.unit : ''} su ${target}.`;
      }
      if (progress > 0) {
        return `Hai iniziato bene! Sei a ${current}${objective.unit ? ' ' + objective.unit : ''}, continua a lavorare verso ${target}.`;
      }
      return `Inizia a tracciare i tuoi progressi verso ${target}${objective.unit ? ' ' + objective.unit : ''}. Raccontami come sta andando!`;
    }
    
    // Qualitative
    if (progress >= 75) {
      return "Stai facendo progressi eccellenti verso questo obiettivo!";
    }
    if (progress >= 50) {
      return "Buoni progressi! Continua così, sei sulla strada giusta.";
    }
    if (progress > 0) {
      return "Hai iniziato il tuo percorso. Raccontami i tuoi progressi per aggiornare la valutazione.";
    }
    return "Parla con me per iniziare a tracciare questo obiettivo e ricevere feedback personalizzato.";
  }
};

export default ObjectiveCard;