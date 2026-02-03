import React, { useState } from 'react';
import { useHabits, HABIT_TYPES, getHabitMeta } from '@/hooks/useHabits';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageCircle, RefreshCw, Check, Clock, X, AlertCircle, Trash2, Plus, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { HabitCreationModal } from '@/components/habits/HabitCreationModal';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

// Read-only habit display card with delete option
interface HabitDisplayProps {
  habit: ReturnType<typeof useHabits>['habits'][0];
  onDelete: (habitType: string) => void;
}

const HabitDisplayCard: React.FC<HabitDisplayProps> = ({ habit, onDelete }) => {
  const habitMeta = getHabitMeta(habit.habit_type) || HABIT_TYPES[habit.habit_type as keyof typeof HABIT_TYPES];
  const isAbstain = habit.streak_type === 'abstain';
  const isAutoSync = habitMeta?.inputMethod === 'auto_sync';
  const target = habit.daily_target || habitMeta?.defaultTarget || 1;
  
  // Determine status
  let status: 'completed' | 'pending' | 'failed' | 'not_logged' = 'not_logged';
  if (isAbstain) {
    if (habit.lastEntry !== null) {
      status = habit.todayValue === 0 ? 'completed' : 'failed';
    }
  } else {
    if (habit.todayValue >= target) status = 'completed';
    else if (habit.todayValue > 0) status = 'pending';
  }

  const StatusIcon = () => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-emerald-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground/50" />;
    }
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-4",
      "bg-glass backdrop-blur-xl border",
      "transition-all duration-200",
      status === 'completed' && "border-emerald-500/30 bg-emerald-500/5",
      status === 'failed' && "border-red-500/30 bg-red-500/5",
      status === 'pending' && "border-amber-500/30 bg-amber-500/5",
      status === 'not_logged' && "border-glass-border"
    )}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-card/50 flex items-center justify-center text-2xl">
          {habitMeta?.icon || '📌'}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground truncate">
              {habitMeta?.label || habit.habit_type}
            </p>
            {isAutoSync && (
              <RefreshCw className="w-3 h-3 text-primary flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusIcon />
            <span className="text-sm text-muted-foreground">
              {isAbstain 
                ? (status === 'completed' ? 'Oggi OK ✓' : status === 'failed' ? 'Ceduto' : 'Da registrare')
                : `${habit.todayValue}/${target} ${habitMeta?.unit || ''}`
              }
            </span>
          </div>
        </div>
        
        {/* Streak badge */}
        {habit.streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
            🔥 {habit.streak}
          </div>
        )}

        {/* Delete menu - only for non-auto-sync */}
        {!isAutoSync && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem 
                onClick={() => onDelete(habit.habit_type)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {/* Auto-sync badge */}
      {isAutoSync && (
        <div className="absolute top-2 right-2">
          <div className="px-1.5 py-0.5 rounded bg-primary/10 text-[9px] text-primary font-medium">
            Auto
          </div>
        </div>
      )}
    </div>
  );
};

const DailyTrackerTabContent: React.FC = () => {
  const navigate = useNavigate();
  const { habits, isLoading, removeHabit } = useHabits();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showCreationModal, setShowCreationModal] = useState(false);

  const handleDelete = async () => {
    if (deleteConfirm) {
      await removeHabit.mutateAsync(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  // Calculate stats
  const completedToday = habits.filter(h => {
    const target = h.daily_target || HABIT_TYPES[h.habit_type as keyof typeof HABIT_TYPES]?.defaultTarget || 1;
    return h.streak_type === 'abstain' ? h.todayValue === 0 && h.lastEntry : h.todayValue >= target;
  }).length;

  // Separate auto-sync habits from manual ones (based on metadata, not DB field)
  const autoSyncHabits = habits.filter(h => {
    const meta = getHabitMeta(h.habit_type) || HABIT_TYPES[h.habit_type as keyof typeof HABIT_TYPES];
    return meta?.inputMethod === 'auto_sync';
  });
  const manualHabits = habits.filter(h => {
    const meta = getHabitMeta(h.habit_type) || HABIT_TYPES[h.habit_type as keyof typeof HABIT_TYPES];
    return meta?.inputMethod !== 'auto_sync';
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-3xl" />
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Box at Top - similar to Objectives */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-glass backdrop-blur-xl border border-glass-border shadow-glass">
        {/* Ambient gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-emerald-500/10 pointer-events-none" />
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-aria flex items-center justify-center shadow-aria-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Gestisci le tue abitudini</h3>
              <p className="text-xs text-muted-foreground">Parla con Aria per creare o aggiornare</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => setShowCreationModal(true)}
              variant="outline"
              className={cn(
                "flex-1 rounded-xl gap-2 bg-glass backdrop-blur-sm border-primary/40",
                "hover:bg-primary/10 hover:border-primary/60",
                "text-primary"
              )}
            >
              <Plus className="h-4 w-4" />
              Nuova Abitudine
            </Button>
            <Button
              onClick={() => navigate('/aria')}
              variant="outline"
              className={cn(
                "flex-1 rounded-xl gap-2 bg-glass backdrop-blur-sm border-emerald-500/40",
                "hover:bg-emerald-500/10 hover:border-emerald-500/60",
                "text-emerald-600 dark:text-emerald-400"
              )}
              disabled={habits.length === 0}
            >
              <TrendingUp className="h-4 w-4" />
              Aggiorna Progressi
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats - Glass card */}
      {habits.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl p-4 bg-glass backdrop-blur-xl border border-primary/20 shadow-glass">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completate oggi</p>
              <p className="text-2xl font-bold text-foreground">
                {completedToday}/{habits.length}
              </p>
            </div>
            <div className="text-4xl">
              {completedToday === habits.length && habits.length > 0 ? '🎉' : '📊'}
            </div>
          </div>
        </div>
      )}

      {/* Habits Section */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Le Tue Abitudini</h2>

        {habits.length === 0 ? (
          <div className="relative overflow-hidden p-8 rounded-3xl bg-glass backdrop-blur-xl border border-glass-border text-center shadow-soft">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Nessuna abitudine attiva</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                Usa il pulsante "Nuova Abitudine" per crearle con Aria, oppure parlale direttamente.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Auto-sync habits first */}
            {autoSyncHabits.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground font-medium px-1">
                  Sincronizzate automaticamente
                </p>
                {autoSyncHabits.map(habit => (
                  <HabitDisplayCard 
                    key={habit.habit_type} 
                    habit={habit} 
                    onDelete={(habitType) => setDeleteConfirm(habitType)}
                  />
                ))}
              </>
            )}
            
            {/* Manual habits (managed by Aria) */}
            {manualHabits.length > 0 && (
              <>
                {autoSyncHabits.length > 0 && (
                  <p className="text-xs text-muted-foreground font-medium px-1 mt-4">
                    Gestite da Aria
                  </p>
                )}
                {manualHabits.map(habit => (
                  <HabitDisplayCard 
                    key={habit.habit_type} 
                    habit={habit} 
                    onDelete={(habitType) => setDeleteConfirm(habitType)}
                  />
                ))}
              </>
            )}
            
          </div>
        )}
      </div>

      {/* Habit Creation Modal */}
      <HabitCreationModal
        open={showCreationModal}
        onOpenChange={setShowCreationModal}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa abitudine?</AlertDialogTitle>
            <AlertDialogDescription>
              L'abitudine verrà disattivata. Potrai riattivarla parlando con Aria.
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
    </div>
  );
};

export default DailyTrackerTabContent;
