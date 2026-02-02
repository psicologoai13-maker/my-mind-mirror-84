import React from 'react';
import { useHabits, HABIT_TYPES, getHabitMeta } from '@/hooks/useHabits';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageCircle, RefreshCw, Check, Clock, X, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// Read-only habit display card
interface HabitDisplayProps {
  habit: ReturnType<typeof useHabits>['habits'][0];
}

const HabitDisplayCard: React.FC<HabitDisplayProps> = ({ habit }) => {
  const habitMeta = getHabitMeta(habit.habit_type) || HABIT_TYPES[habit.habit_type as keyof typeof HABIT_TYPES];
  const isAbstain = habit.streak_type === 'abstain';
  // Check if it's an auto-sync habit from the metadata
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
  const { habits, isLoading } = useHabits();

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
            <div className="flex items-center gap-2">
              <div className="text-4xl">
                {completedToday === habits.length && habits.length > 0 ? '🎉' : '📊'}
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Sparkles className="h-3 w-3" />
                Via Aria
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Habits Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Le Tue Habits</h2>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Sparkles className="h-3 w-3" />
            Gestito da Aria
          </div>
        </div>

        {habits.length === 0 ? (
          <div className="relative overflow-hidden p-8 rounded-3xl bg-glass backdrop-blur-xl border border-glass-border text-center shadow-soft">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Nessuna habit attiva</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                Parla con Aria per creare le tue abitudini. Lei le rileverà dalle conversazioni e ti aiuterà a monitorarle.
              </p>
              <Button onClick={() => navigate('/aria')} className="rounded-xl gap-2">
                <Sparkles className="w-4 h-4" />
                Parla con Aria
              </Button>
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
                  <HabitDisplayCard key={habit.habit_type} habit={habit} />
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
                  <HabitDisplayCard key={habit.habit_type} habit={habit} />
                ))}
              </>
            )}
            
            {/* CTA to talk to Aria for updates */}
            <div className="relative overflow-hidden rounded-2xl p-4 bg-glass backdrop-blur-xl border border-primary/20 shadow-soft mt-4">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Aggiorna le tue habits</p>
                  <p className="text-xs text-muted-foreground">
                    Parla con Aria per registrare i progressi
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl bg-glass backdrop-blur-sm border-glass-border"
                  onClick={() => navigate('/aria')}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Aria
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyTrackerTabContent;
