import React, { useState } from 'react';
import { Plus, Target, Trophy, Loader2, AlertTriangle } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { ObjectiveCard } from '@/components/objectives/ObjectiveCard';
import { NewObjectiveModal } from '@/components/objectives/NewObjectiveModal';
import { useObjectives, CATEGORY_CONFIG } from '@/hooks/useObjectives';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card } from '@/components/ui/card';

const Objectives: React.FC = () => {
  const [showNewModal, setShowNewModal] = useState(false);
  
  const {
    activeObjectives,
    achievedObjectives,
    isLoading,
    createObjective,
    updateObjective,
    deleteObjective,
  } = useObjectives();

  // Count objectives with missing target
  const objectivesWithMissingTarget = activeObjectives.filter(o => o.target_value === null || o.target_value === undefined);

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 pb-28 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">I Tuoi Obiettivi</h1>
            <p className="text-sm text-muted-foreground">
              {activeObjectives.length} attivi • {achievedObjectives.length} raggiunti
            </p>
          </div>
          <Button
            onClick={() => setShowNewModal(true)}
            size="icon"
            className="rounded-full h-12 w-12 shadow-lg"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        {/* Warning for objectives with missing target */}
        {objectivesWithMissingTarget.length > 0 && (
          <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {objectivesWithMissingTarget.length} obiettiv{objectivesWithMissingTarget.length === 1 ? 'o' : 'i'} senza target
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Parla con Aria per definire i tuoi traguardi!
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Active Objectives */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Obiettivi Attivi</h2>
          </div>

          {activeObjectives.length === 0 ? (
            <div className="bg-muted/50 rounded-2xl p-6 text-center">
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
                className="mt-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi
              </Button>
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
                  className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl"
                >
                  <span className="text-lg">✅</span>
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
      </div>

      <NewObjectiveModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={(input) => createObjective.mutate(input)}
      />
    </MobileLayout>
  );
};

export default Objectives;
