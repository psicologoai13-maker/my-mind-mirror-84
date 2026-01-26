import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Target, Calendar, TrendingUp } from 'lucide-react';
import { Objective, CATEGORY_CONFIG } from '@/hooks/useObjectives';
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
  
  const progress = objective.target_value && objective.current_value
    ? Math.min(100, (objective.current_value / objective.target_value) * 100)
    : 0;

  const daysRemaining = objective.deadline
    ? differenceInDays(new Date(objective.deadline), new Date())
    : null;

  const getProgressColor = () => {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-primary';
    if (progress >= 25) return 'bg-amber-500';
    return 'bg-muted-foreground';
  };

  return (
    <Card className="p-4 bg-card border-border shadow-card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{categoryConfig.emoji}</span>
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
            {onAddProgress && (
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
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {objective.description}
        </p>
      )}

      {objective.target_value !== null && objective.target_value !== undefined && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">
              {objective.current_value ?? 0} / {objective.target_value} {objective.unit}
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              className={cn("h-full transition-all", getProgressColor())}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right text-xs text-muted-foreground mt-1">
            {Math.round(progress)}%
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {objective.deadline && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              {daysRemaining !== null && daysRemaining >= 0 
                ? `${daysRemaining} giorni rimasti`
                : format(new Date(objective.deadline), 'd MMM yyyy', { locale: it })
              }
            </span>
          </div>
        )}
        
        {objective.ai_feedback && (
          <p className="text-primary italic text-xs flex-1 text-right ml-2 line-clamp-1">
            "{objective.ai_feedback}"
          </p>
        )}
      </div>
    </Card>
  );
};
