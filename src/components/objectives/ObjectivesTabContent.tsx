import React, { useState } from 'react';
import { Plus, Target, Trophy, AlertTriangle, Loader2, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ObjectiveCard } from '@/components/objectives/ObjectiveCard';
import { ObjectiveQuizModal } from '@/components/objectives/ObjectiveQuizModal';
import { useObjectives, CATEGORY_CONFIG } from '@/hooks/useObjectives';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { isAutoSyncObjective, isAIDetectable } from '@/lib/objectiveTypes';

const ObjectivesTabContent: React.FC = () => {
  const [showNewModal, setShowNewModal] = useState(false);
  
  const {
    activeObjectives,
    achievedObjectives,
    isLoading,
    createObjective,
    updateObjective,
    deleteObjective,
  } = useObjectives();

  // Count objectives with missing target/starting for categories that require them
  const objectivesWithMissingData = activeObjectives.filter(o => {
    if (o.category === 'body') {
      return o.target_value === null || o.target_value === undefined ||
             o.starting_value === null || o.starting_value === undefined;
    }
    if (o.category === 'finance') {
      const financeType = o.finance_tracking_type;
      const isPeriodicFinance = ['periodic_saving', 'spending_limit', 'periodic_income'].includes(financeType || '');
      
      // Periodic finance only needs target value
      if (isPeriodicFinance) {
        return o.target_value === null || o.target_value === undefined;
      }
      // Accumulation and debt_reduction need both values (but only if type is defined)
      if (financeType) {
        return o.target_value === null || o.target_value === undefined ||
               o.starting_value === null || o.starting_value === undefined;
      }
      // If no finance type defined yet, needs setup
      return true;
    }
    return false;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning for objectives with missing data - Glass card */}
      {objectivesWithMissingData.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl p-4 bg-glass backdrop-blur-xl border border-amber-500/30 shadow-soft">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {objectivesWithMissingData.length} obiettiv{objectivesWithMissingData.length === 1 ? 'o' : 'i'} da completare
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Definisci punto di partenza e target per tracciare i progressi
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Objectives */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Obiettivi Attivi</h2>
          </div>
          <Button
            onClick={() => setShowNewModal(true)}
            size="sm"
            variant="outline"
            className="rounded-full"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuovo
          </Button>
        </div>

        {activeObjectives.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl p-6 text-center bg-glass backdrop-blur-xl border border-glass-border shadow-soft">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="text-4xl mb-2">🎯</div>
              <p className="text-muted-foreground text-sm">
                Nessun obiettivo attivo. Creane uno!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Puoi anche parlare con Aria e lei rileverà automaticamente i tuoi obiettivi
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewModal(true)}
                className="mt-3 rounded-xl bg-glass backdrop-blur-sm border-glass-border"
              >
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeObjectives.map(objective => (
              <ObjectiveCard
                key={objective.id}
                objective={objective}
                onUpdate={(id, updates) => updateObjective.mutate({ id, ...updates })}
                onDelete={(id) => deleteObjective.mutate(id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Achieved Objectives */}
      {achievedObjectives.length > 0 && (
        <section>
          <Separator className="mb-4" />
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold text-foreground">Traguardi Raggiunti</h2>
          </div>

          <div className="space-y-2">
            {achievedObjectives.map(objective => (
              <div
                key={objective.id}
                className="flex items-center gap-3 p-3 bg-glass backdrop-blur-sm rounded-2xl border border-emerald-500/20"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <span className="text-sm">✅</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{objective.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(objective.updated_at), 'd MMMM yyyy', { locale: it })}
                  </p>
                </div>
                <span className="text-lg">{CATEGORY_CONFIG[objective.category].emoji}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <ObjectiveQuizModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={(input) => createObjective.mutate(input)}
      />
    </div>
  );
};

export default ObjectivesTabContent;
