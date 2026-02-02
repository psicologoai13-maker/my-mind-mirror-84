import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Target, Sparkles, Trash2, ChevronDown } from 'lucide-react';
import { Objective, CATEGORY_CONFIG, calculateProgress } from '@/hooks/useObjectives';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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
  onAddProgress?: (id: string, value: number, note?: string) => void;
}

// Circular progress component
const CircularProgress: React.FC<{ progress: number; size?: number }> = ({ 
  progress, 
  size = 72 
}) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  // Color based on progress
  const getProgressColor = () => {
    if (progress >= 80) return 'stroke-emerald-500';
    if (progress >= 50) return 'stroke-primary';
    if (progress >= 25) return 'stroke-amber-500';
    return 'stroke-muted-foreground/50';
  };

  const getGlowColor = () => {
    if (progress >= 80) return 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]';
    if (progress >= 50) return 'drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]';
    if (progress >= 25) return 'drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]';
    return '';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background glow */}
      <div className={cn(
        "absolute inset-0 rounded-full blur-lg opacity-30",
        progress >= 80 ? "bg-emerald-500" :
        progress >= 50 ? "bg-primary" :
        progress >= 25 ? "bg-amber-500" : "bg-muted"
      )} />
      
      <svg
        className={cn("transform -rotate-90 relative z-10", getGlowColor())}
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-muted/30"
        />
        {/* Progress circle */}
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
      
      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <span className="text-lg font-bold text-foreground">
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
  const categoryConfig = CATEGORY_CONFIG[objective.category];
  
  const hasTarget = objective.target_value !== null && objective.target_value !== undefined;
  
  // Calculate progress - use AI estimate for qualitative goals
  const progress = hasTarget 
    ? calculateProgress(objective) 
    : (objective.ai_progress_estimate ?? 0);

  // Generate AI explanation based on objective data
  const getAIExplanation = () => {
    if (objective.ai_feedback) {
      return objective.ai_feedback;
    }
    
    if (hasTarget) {
      const current = objective.current_value ?? 0;
      const target = objective.target_value!;
      const starting = objective.starting_value ?? 0;
      const progressMade = Math.abs(current - starting);
      const totalNeeded = Math.abs(target - starting);
      
      if (progress >= 100) {
        return `🎉 Obiettivo raggiunto! Hai completato ${objective.title.toLowerCase()}.`;
      }
      if (progress >= 75) {
        return `Sei quasi al traguardo! Manca poco per completare ${objective.title.toLowerCase()}.`;
      }
      if (progress >= 50) {
        return `Buon progresso! Hai superato la metà del percorso verso ${objective.title.toLowerCase()}.`;
      }
      if (progress > 0) {
        return `Hai iniziato il percorso verso ${objective.title.toLowerCase()}. Continua così!`;
      }
      return `Inizia a lavorare su ${objective.title.toLowerCase()} parlando con Aria dei tuoi progressi.`;
    }
    
    // Qualitative objective
    if (objective.ai_milestones && objective.ai_milestones.length > 0) {
      const lastMilestone = objective.ai_milestones[objective.ai_milestones.length - 1];
      return `Ultimo traguardo: "${lastMilestone.milestone}". ${progress >= 50 ? 'Stai facendo ottimi progressi!' : 'Continua così!'}`;
    }
    
    return `Parla con Aria per aggiornare i progressi su ${objective.title.toLowerCase()}.`;
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
          "cursor-pointer"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        whileTap={{ scale: 0.98 }}
      >
        {/* Ambient gradient background based on progress */}
        <div className={cn(
          "absolute inset-0 opacity-20 transition-opacity duration-500",
          progress >= 80 ? "bg-gradient-to-br from-emerald-500/30 to-teal-500/10" :
          progress >= 50 ? "bg-gradient-to-br from-primary/30 to-primary/5" :
          progress >= 25 ? "bg-gradient-to-br from-amber-500/30 to-orange-500/10" :
          "bg-gradient-to-br from-muted/20 to-transparent"
        )} />
        
        {/* Inner light reflection */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 p-5">
          {/* Main content row */}
          <div className="flex items-center gap-4">
            {/* Category emoji */}
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl",
              "bg-gradient-to-br shadow-soft shrink-0",
              categoryConfig.color.includes('purple') ? 'from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10' :
              categoryConfig.color.includes('orange') ? 'from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-900/10' :
              categoryConfig.color.includes('blue') ? 'from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10' :
              categoryConfig.color.includes('slate') ? 'from-slate-100 to-slate-50 dark:from-slate-800/30 dark:to-slate-800/10' :
              categoryConfig.color.includes('pink') ? 'from-pink-100 to-pink-50 dark:from-pink-900/30 dark:to-pink-900/10' :
              categoryConfig.color.includes('emerald') ? 'from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/10' :
              categoryConfig.color.includes('yellow') ? 'from-yellow-100 to-yellow-50 dark:from-yellow-900/30 dark:to-yellow-900/10' :
              'from-gray-100 to-gray-50 dark:from-gray-800/30 dark:to-gray-800/10'
            )}>
              {categoryConfig.emoji}
            </div>
            
            {/* Title and category */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground line-clamp-1 text-base">
                {objective.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={cn("text-xs", categoryConfig.color)}>
                  {categoryConfig.label}
                </Badge>
                {!hasTarget && objective.ai_progress_estimate !== null && (
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-[10px] text-primary font-medium">AI</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Circular progress */}
            <CircularProgress progress={progress} size={72} />
            
            {/* Menu button - stop propagation */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl bg-card/95 backdrop-blur-xl border-glass-border min-w-[180px]">
                {onUpdate && objective.status === 'active' && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(objective.id, { status: 'achieved' });
                  }}>
                    <Target className="h-4 w-4 mr-2" />
                    Segna come raggiunto
                  </DropdownMenuItem>
                )}
                {onUpdate && objective.status === 'active' && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(objective.id, { status: 'paused' });
                  }}>
                    Metti in pausa
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
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </div>
          
          {/* Expandable AI explanation */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-3 border-t border-glass-border">
                  {/* AI explanation card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-aria flex items-center justify-center shrink-0 shadow-aria-glow">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary mb-1">Aria dice:</p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {getAIExplanation()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Milestones if available */}
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
                  
                  {/* Description if available */}
                  {(objective.ai_custom_description || objective.description) && (
                    <p className="text-xs text-muted-foreground mt-3 italic">
                      {objective.ai_custom_description || objective.description}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Delete confirmation dialog */}
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
};

export default ObjectiveCard;