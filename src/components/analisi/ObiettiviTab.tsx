import React from 'react';
import { useObjectives, CATEGORY_CONFIG } from '@/hooks/useObjectives';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { Target, TrendingUp, TrendingDown, Minus, CheckCircle2, Clock, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { OBJECTIVE_TYPES } from '@/lib/objectiveTypes';

const ObiettiviTab: React.FC = () => {
  const { objectives, isLoading } = useObjectives();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const activeObjectives = objectives.filter(o => o.status === 'active');
  const completedObjectives = objectives.filter(o => o.status === 'achieved');

  if (objectives.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-medium text-foreground mb-2">Nessun obiettivo</h3>
        <p className="text-sm text-muted-foreground">
          Crea obiettivi dalla sezione Progressi per tracciare i tuoi traguardi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Active Objectives */}
      {activeObjectives.length > 0 && (
        <section>
          <h2 className="font-display font-semibold text-foreground mb-3 px-1 flex items-center gap-2">
            <span>🎯</span> Obiettivi Attivi ({activeObjectives.length})
          </h2>
          <div className="space-y-4">
            {activeObjectives.map(objective => {
              const preset = objective.preset_type 
                ? OBJECTIVE_TYPES[objective.preset_type]
                : null;
              
              const progress = objective.target_value && objective.target_value > 0
                ? Math.min(100, Math.round(((objective.current_value || 0) / objective.target_value) * 100))
                : 0;
              
              const daysRemaining = objective.deadline
                ? differenceInDays(new Date(objective.deadline), new Date())
                : null;
              
              // Parse progress history for chart
              const historyData = (objective.progress_history as any[] || [])
                .slice(-14) // Last 14 entries
                .map((entry: any) => ({
                  date: format(new Date(entry.date || new Date()), 'dd/MM', { locale: it }),
                  value: entry.value || 0,
                }));

              return (
                <div 
                  key={objective.id}
                  className="bg-card rounded-2xl p-4 shadow-sm border border-border/20"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="text-lg">{preset?.emoji || CATEGORY_CONFIG[objective.category]?.emoji || '🎯'}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{objective.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {objective.description || preset?.description || 'Obiettivo personale'}
                        </p>
                      </div>
                    </div>
                    {daysRemaining !== null && (
                      <div className={cn(
                        "px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1",
                        daysRemaining <= 7 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Clock className="w-3 h-3" />
                        {daysRemaining > 0 ? `${daysRemaining}g` : 'Scaduto'}
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground">
                        {objective.current_value || 0} / {objective.target_value} {objective.unit || ''}
                      </span>
                      <span className="text-sm font-bold text-primary">{progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Progress History Chart */}
                  {historyData.length > 2 && (
                    <div className="h-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id={`progress-${objective.id}`} x1="0" y1="0" x2="0" y2="1">
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
                            fill={`url(#progress-${objective.id})`}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Completed Objectives */}
      {completedObjectives.length > 0 && (
        <section>
          <h2 className="font-display font-semibold text-foreground mb-3 px-1 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Completati ({completedObjectives.length})
          </h2>
          <div className="space-y-3">
            {completedObjectives.slice(0, 5).map(objective => {
              const completedPreset = objective.preset_type 
                ? OBJECTIVE_TYPES[objective.preset_type]
                : null;
              return (
                <div 
                  key={objective.id}
                  className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 flex items-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{objective.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {objective.target_value} {objective.unit || ''} raggiunti
                    </p>
                  </div>
                  <span className="text-lg">{completedPreset?.emoji || CATEGORY_CONFIG[objective.category]?.emoji || '🎯'}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default ObiettiviTab;
