import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Target, Calendar, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
import { Objective, CATEGORY_CONFIG, calculateProgress } from '@/hooks/useObjectives';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ObjectiveCardProps {
  objective: Objective;
  onUpdate?: (id: string, updates: Partial<Objective>) => void;
  onDelete?: (id: string) => void;
  onAddProgress?: (id: string) => void;
}

export const ObjectiveCard: React.FC<ObjectiveCardProps> = ({
  objective,
  onUpdate,
  onDelete,
  onAddProgress,
}) => {
  const categoryConfig = CATEGORY_CONFIG[objective.category];
  
  const hasTarget = objective.target_value !== null && objective.target_value !== undefined;
  const hasStartingValue = objective.starting_value !== null && objective.starting_value !== undefined;
  
  // Use new progress calculation that considers starting value
  const progress = hasTarget ? calculateProgress(objective) : 0;

  const daysRemaining = objective.deadline
    ? differenceInDays(new Date(objective.deadline), new Date())
    : null;

  const getProgressColor = () => {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-primary';
    if (progress >= 25) return 'bg-amber-500';
    return 'bg-muted-foreground';
  };

  const getProgressGradient = () => {
    if (progress >= 80) return 'from-emerald-500 to-teal-400';
    if (progress >= 50) return 'from-primary to-blue-400';
    if (progress >= 25) return 'from-amber-500 to-orange-400';
    return 'from-slate-400 to-slate-300';
  };

  return (
    <Card className="p-5 bg-card border-border shadow-premium hover:shadow-elevated transition-all duration-300 rounded-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl",
            "bg-gradient-to-br shadow-sm",
            categoryConfig.color.includes('purple') ? 'from-purple-100 to-purple-50' :
            categoryConfig.color.includes('orange') ? 'from-orange-100 to-orange-50' :
            categoryConfig.color.includes('blue') ? 'from-blue-100 to-blue-50' :
            categoryConfig.color.includes('slate') ? 'from-slate-100 to-slate-50' :
            categoryConfig.color.includes('pink') ? 'from-pink-100 to-pink-50' :
            categoryConfig.color.includes('emerald') ? 'from-emerald-100 to-emerald-50' :
            categoryConfig.color.includes('yellow') ? 'from-yellow-100 to-yellow-50' :
            'from-gray-100 to-gray-50'
          )}>
            {categoryConfig.emoji}
          </div>
          <div>
            <h3 className="font-semibold text-foreground line-clamp-1">{objective.title}</h3>
            <Badge variant="secondary" className={cn("text-xs mt-1", categoryConfig.color)}>
              {categoryConfig.label}
            </Badge>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onAddProgress && hasTarget && (
              <DropdownMenuItem onClick={() => onAddProgress(objective.id)}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Aggiorna progresso
              </DropdownMenuItem>
            )}
            {onUpdate && objective.status === 'active' && (
              <DropdownMenuItem onClick={() => onUpdate(objective.id, { status: 'achieved' })}>
                <Target className="h-4 w-4 mr-2" />
                Segna come raggiunto
              </DropdownMenuItem>
            )}
            {onUpdate && objective.status === 'active' && (
              <DropdownMenuItem onClick={() => onUpdate(objective.id, { status: 'paused' })}>
                Metti in pausa
              </DropdownMenuItem>
            )}
            {onUpdate && objective.status === 'paused' && (
              <DropdownMenuItem onClick={() => onUpdate(objective.id, { status: 'active' })}>
                Riattiva
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem 
                onClick={() => onDelete(objective.id)}
                className="text-destructive"
              >
                Elimina
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {objective.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {objective.description}
        </p>
      )}

      {/* Missing target or starting value warning */}
      {(!hasTarget || (hasTarget && !hasStartingValue && objective.unit)) && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {!hasTarget ? 'Obiettivo finale non definito' : 'Punto di partenza non definito'}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Parla con Aria per definirlo!
            </p>
          </div>
        </div>
      )}

      {/* Progress bar (only if target is set) */}
      {hasTarget && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-semibold text-foreground">
              {objective.current_value ?? objective.starting_value ?? 0}
              {hasStartingValue ? ` (da ${objective.starting_value})` : ''} → {objective.target_value} {objective.unit}
            </span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              className={cn("h-full transition-all duration-500 bg-gradient-to-r", getProgressGradient())}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right text-xs font-medium text-muted-foreground mt-1">
            {Math.round(progress)}% completato
          </div>
        </div>
      )}

      {/* AI Feedback */}
      {objective.ai_feedback && (
        <div className="mb-4 p-3 bg-primary/5 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Aria</span>
          </div>
          <p className="text-sm text-foreground italic">
            "{objective.ai_feedback}"
          </p>
        </div>
      )}

      {/* Footer with deadline */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {objective.deadline && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full",
            daysRemaining !== null && daysRemaining < 7 
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : "bg-muted"
          )}>
            <Calendar className="h-3 w-3" />
            <span>
              {daysRemaining !== null && daysRemaining >= 0 
                ? `${daysRemaining} giorni rimasti`
                : format(new Date(objective.deadline), 'd MMM yyyy', { locale: it })
              }
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};
