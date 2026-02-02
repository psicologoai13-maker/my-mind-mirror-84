import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Target, Calendar, TrendingUp, AlertTriangle, Sparkles, Edit3, Plus, Home, RefreshCw, EyeOff, Check } from 'lucide-react';
import { Objective, CATEGORY_CONFIG, calculateProgress, TrackingPeriod, CheckinVisibility } from '@/hooks/useObjectives';
import { cn } from '@/lib/utils';
import { format, differenceInDays, endOfDay, endOfWeek, endOfMonth, endOfYear, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TargetInputDialog } from './TargetInputDialog';
// Calculate deadline based on tracking period
const calculatePeriodDeadline = (period: TrackingPeriod): string => {
  const now = new Date();
  switch (period) {
    case 'daily':
      return endOfDay(now).toISOString();
    case 'weekly':
      return endOfWeek(now, { weekStartsOn: 1 }).toISOString(); // Week starts Monday
    case 'monthly':
      return endOfMonth(now).toISOString();
    case 'yearly':
      return endOfYear(now).toISOString();
    case 'one_time':
    default:
      // Default to 30 days for one-time goals
      return addDays(now, 30).toISOString();
  }
};

interface ObjectiveCardProps {
  objective: Objective;
  onUpdate?: (id: string, updates: Partial<Objective>) => void;
  onDelete?: (id: string) => void;
  onAddProgress?: (id: string, value: number, note?: string) => void;
}

export const ObjectiveCard: React.FC<ObjectiveCardProps> = ({
  objective,
  onUpdate,
  onDelete,
  onAddProgress,
}) => {
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const categoryConfig = CATEGORY_CONFIG[objective.category];
  
  const hasTarget = objective.target_value !== null && objective.target_value !== undefined;
  const hasStartingValue = objective.starting_value !== null && objective.starting_value !== undefined;
  
  // Determine what this objective needs based on category and finance type
  const isFinance = objective.category === 'finance';
  const financeType = objective.finance_tracking_type;
  
  // Periodic finance types (savings, limits, income) don't need starting value - they reset each period
  const isPeriodicFinance = isFinance && ['periodic_saving', 'spending_limit', 'periodic_income'].includes(financeType || '');
  
  // Only body and non-periodic finance objectives require starting value
  const requiresStartingValue = objective.category === 'body' || (isFinance && !isPeriodicFinance && financeType !== null);
  
  // Periodic finance only needs target, others need both
  // Finance without type defined needs setup first
  const needsSetup = isFinance 
    ? (financeType === null || financeType === undefined
        ? true  // No finance type defined, needs setup
        : isPeriodicFinance 
          ? !hasTarget  // Periodic only needs target
          : !hasTarget || !hasStartingValue)  // Non-periodic needs both
    : (requiresStartingValue && (!hasTarget || !hasStartingValue));
  
  const progress = hasTarget ? calculateProgress(objective) : 0;

  const daysRemaining = objective.deadline
    ? differenceInDays(new Date(objective.deadline), new Date())
    : null;

  // Parse progress history for chart
  const historyData = useMemo(() => {
    return (objective.progress_history as any[] || [])
      .slice(-14) // Last 14 entries
      .map((entry: any) => ({
        date: format(new Date(entry.date || new Date()), 'dd/MM', { locale: it }),
        value: entry.value || 0,
      }));
  }, [objective.progress_history]);

  const getProgressGradient = () => {
    if (progress >= 80) return 'from-emerald-500 to-teal-400';
    if (progress >= 50) return 'from-primary to-primary-glow';
    if (progress >= 25) return 'from-amber-500 to-orange-400';
    return 'from-slate-400 to-slate-300';
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl p-5",
      "bg-glass backdrop-blur-xl border border-glass-border",
      "shadow-glass hover:shadow-glass-elevated",
      "transition-all duration-300 ease-out",
      "hover:-translate-y-0.5"
    )}>
      {/* Inner light reflection */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl",
              "bg-gradient-to-br shadow-soft",
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
            <div>
              <h3 className="font-semibold text-foreground line-clamp-1 text-base">{objective.title}</h3>
              <Badge variant="secondary" className={cn("text-xs mt-1", categoryConfig.color)}>
                {categoryConfig.label}
              </Badge>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl bg-card/95 backdrop-blur-xl border-glass-border min-w-[200px]">
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
              
              {/* Check-in visibility settings */}
              {onUpdate && hasTarget && !needsSetup && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Visibilità in Check-in Home
                  </div>
                  <DropdownMenuItem 
                    onClick={() => onUpdate(objective.id, { checkin_visibility: 'permanent' })}
                    className={cn(objective.checkin_visibility === 'permanent' && "bg-primary/10")}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sempre visibile
                    {objective.checkin_visibility === 'permanent' && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onUpdate(objective.id, { checkin_visibility: 'daily' })}
                    className={cn((objective.checkin_visibility === 'daily' || !objective.checkin_visibility) && "bg-primary/10")}
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Una volta al giorno
                    {(objective.checkin_visibility === 'daily' || !objective.checkin_visibility) && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onUpdate(objective.id, { checkin_visibility: 'hidden' })}
                    className={cn(objective.checkin_visibility === 'hidden' && "bg-primary/10")}
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Solo da qui
                    {objective.checkin_visibility === 'hidden' && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuSeparator />
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

        {/* Description - show AI custom description if available */}
        {(objective.ai_custom_description || objective.description) && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {objective.ai_custom_description || objective.description}
            </p>
            {objective.ai_custom_description && (
              <div className="flex items-center gap-1 mt-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-primary font-medium">Personalizzato da Aria</span>
              </div>
            )}
          </div>
        )}

        {/* Missing target or starting value warning - with manual input button */}
        {/* Only show for categories that require numeric tracking (body, finance) */}
        {needsSetup && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {isPeriodicFinance 
                    ? 'Definisci obiettivo periodico'
                    : !hasTarget && !hasStartingValue 
                      ? 'Definisci punto di partenza e obiettivo'
                      : !hasTarget 
                        ? 'Obiettivo finale non definito' 
                        : 'Punto di partenza non definito'}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Parla con Aria o inserisci manualmente
                </p>
              </div>
            </div>
            {onUpdate && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-1 bg-card/50 border-amber-300 dark:border-amber-600 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl"
                onClick={() => setShowTargetDialog(true)}
              >
                <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                Definisci traguardi
              </Button>
            )}
          </div>
        )}
        
        {/* Target Input Dialog */}
        <TargetInputDialog
          open={showTargetDialog}
          onOpenChange={setShowTargetDialog}
          objectiveTitle={objective.title}
          objectiveCategory={objective.category}
          unit={objective.unit}
          hasStartingValue={hasStartingValue}
          hasTargetValue={hasTarget}
          financeTrackingType={objective.finance_tracking_type}
          onSave={(data) => {
            if (onUpdate) {
              const updates: Partial<Objective> = {};
              if (data.startingValue !== null) {
                updates.starting_value = data.startingValue;
                // Also set current_value to starting if not set
                if (objective.current_value === null || objective.current_value === 0) {
                  updates.current_value = data.startingValue;
                }
              }
              if (data.targetValue !== null) {
                updates.target_value = data.targetValue;
              }
              if (data.financeTrackingType) {
                updates.finance_tracking_type = data.financeTrackingType;
              }
              if (data.trackingPeriod) {
                updates.tracking_period = data.trackingPeriod;
                // Set deadline based on tracking period
                updates.deadline = calculatePeriodDeadline(data.trackingPeriod);
              }
              // For periodic finance, set current_value to 0 and starting_value to 0
              if (['periodic_saving', 'spending_limit', 'periodic_income'].includes(data.financeTrackingType || '')) {
                updates.starting_value = 0;
                updates.current_value = 0;
              }
              // Clear ai_feedback and needs_clarification since user defined manually
              updates.ai_feedback = null;
              updates.needs_clarification = false;
              onUpdate(objective.id, updates);
            }
          }}
        />

        {/* Progress bar (only if target is set) */}
        {hasTarget && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {isPeriodicFinance ? 'Questo periodo' : 'Progresso'}
              </span>
              <span className="font-semibold text-foreground">
                {objective.current_value ?? 0} → {objective.target_value} {objective.unit || '€'}
                {objective.tracking_period && isPeriodicFinance && (
                  <span className="text-muted-foreground font-normal">
                    /{objective.tracking_period === 'daily' ? 'giorno' : 
                      objective.tracking_period === 'weekly' ? 'sett' :
                      objective.tracking_period === 'monthly' ? 'mese' : 'anno'}
                  </span>
                )}
              </span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/50 backdrop-blur-sm">
              <div 
                className={cn(
                  "h-full transition-all duration-700 ease-out bg-gradient-to-r rounded-full",
                  getProgressGradient(),
                  "shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-right text-xs font-medium text-muted-foreground mt-1">
              {Math.round(progress)}% completato
            </div>
            
            {/* Progress History Chart */}
            {historyData.length >= 2 && (
              <div className="h-20 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`progress-chart-${objective.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                    />
                    <YAxis hide domain={[0, objective.target_value || 'auto']} />
                    {objective.target_value && (
                      <ReferenceLine 
                        y={objective.target_value} 
                        stroke="hsl(var(--primary))" 
                        strokeDasharray="3 3"
                        opacity={0.5}
                      />
                    )}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '10px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [
                        `${value} ${objective.unit || ''}`,
                        'Progresso'
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill={`url(#progress-chart-${objective.id})`}
                      dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* AI Progress for Milestone Objectives (no numeric target) */}
        {!hasTarget && objective.ai_progress_estimate !== null && objective.ai_progress_estimate !== undefined && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">Progresso stimato da Aria</span>
              </div>
              <span className="font-semibold text-foreground">
                {objective.ai_progress_estimate}%
              </span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/50 backdrop-blur-sm">
              <div 
                className={cn(
                  "h-full transition-all duration-700 ease-out bg-gradient-to-r rounded-full",
                  objective.ai_progress_estimate >= 80 ? 'from-emerald-500 to-teal-400' :
                  objective.ai_progress_estimate >= 50 ? 'from-primary to-primary-glow' :
                  objective.ai_progress_estimate >= 25 ? 'from-amber-500 to-orange-400' :
                  'from-slate-400 to-slate-300',
                  "shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]"
                )}
                style={{ width: `${objective.ai_progress_estimate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 italic">
              Parla con Aria dei tuoi progressi per aggiornare
            </p>
          </div>
        )}

        {/* Milestones List */}
        {objective.ai_milestones && objective.ai_milestones.length > 0 && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-1.5 mb-2">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Traguardi raggiunti ({objective.ai_milestones.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {objective.ai_milestones.slice(-3).map((milestone, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{milestone.milestone}</p>
                    {milestone.note && (
                      <p className="text-xs text-muted-foreground">{milestone.note}</p>
                    )}
                  </div>
                </div>
              ))}
              {objective.ai_milestones.length > 3 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  +{objective.ai_milestones.length - 3} altri traguardi
                </p>
              )}
            </div>
          </div>
        )}

        {/* AI Feedback */}
        {objective.ai_feedback && (
          <div className="mb-4 p-3 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">Aria</span>
            </div>
            <p className="text-sm text-foreground italic">
              "{objective.ai_feedback}"
            </p>
          </div>
        )}

        {/* Footer with deadline, visibility indicator, and update button */}
        <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground">
          {objective.deadline && (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
              "bg-glass backdrop-blur-sm border border-glass-border",
              daysRemaining !== null && daysRemaining < 7 
                ? "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                : ""
            )}>
              <Calendar className="h-3 w-3" />
              <span className="font-medium">
                {daysRemaining !== null && daysRemaining >= 0 
                  ? `${daysRemaining} giorni rimasti`
                  : format(new Date(objective.deadline), 'd MMM yyyy', { locale: it })
                }
              </span>
            </div>
          )}
          
          {/* Check-in visibility indicator */}
          {hasTarget && !needsSetup && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full",
              "bg-glass backdrop-blur-sm border border-glass-border",
              objective.checkin_visibility === 'hidden' && "opacity-60"
            )}>
              {objective.checkin_visibility === 'permanent' ? (
                <>
                  <RefreshCw className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Sempre in Home</span>
                </>
              ) : objective.checkin_visibility === 'hidden' ? (
                <>
                  <EyeOff className="h-3 w-3" />
                  <span>Solo qui</span>
                </>
              ) : (
                <>
                  <Home className="h-3 w-3 text-primary" />
                  <span className="text-primary">In Home</span>
                </>
              )}
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};
