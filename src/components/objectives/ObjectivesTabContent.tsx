import React, { useState } from 'react';
import { Target, Trophy, Loader2, Sparkles, Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ObjectiveCard } from '@/components/objectives/ObjectiveCard';
import { useObjectives, CATEGORY_CONFIG } from '@/hooks/useObjectives';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ObjectiveCreationModal } from './ObjectiveCreationModal';
import { ObjectiveUpdateModal } from './ObjectiveUpdateModal';
import { cn } from '@/lib/utils';
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

const ObjectivesTabContent: React.FC = () => {
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const {
    activeObjectives,
    achievedObjectives,
    isLoading,
    deleteObjective,
  } = useObjectives();

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteObjective.mutateAsync(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Box at Top */}
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
              <h3 className="font-semibold text-foreground">Gestisci i tuoi obiettivi</h3>
              <p className="text-xs text-muted-foreground">Parla con Aria per creare o aggiornare</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => setShowCreationModal(true)}
              className="flex-1 rounded-xl gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Plus className="h-4 w-4" />
              Nuovo Obiettivo
            </Button>
            <Button
              onClick={() => setShowUpdateModal(true)}
              variant="outline"
              className={cn(
                "flex-1 rounded-xl gap-2 bg-glass backdrop-blur-sm border-emerald-500/30",
                "hover:bg-emerald-500/10 hover:border-emerald-500/50",
                "text-emerald-600 dark:text-emerald-400"
              )}
              disabled={activeObjectives.length === 0}
            >
              <TrendingUp className="h-4 w-4" />
              Aggiorna Progressi
            </Button>
          </div>
        </div>
      </div>

      {/* Active Objectives */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Obiettivi Attivi</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {activeObjectives.length}
          </span>
        </div>

        {activeObjectives.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl p-6 text-center bg-glass backdrop-blur-xl border border-glass-border shadow-soft">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Nessun obiettivo attivo</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                Crea il tuo primo obiettivo con l'aiuto di Aria
              </p>
              <Button
                onClick={() => setShowCreationModal(true)}
                className="rounded-xl gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Crea Obiettivo
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeObjectives.map(objective => (
              <ObjectiveCard
                key={objective.id}
                objective={objective}
                onDelete={(id) => setDeleteConfirm(id)}
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

      {/* Creation Modal */}
      <ObjectiveCreationModal
        open={showCreationModal}
        onOpenChange={setShowCreationModal}
      />

      {/* Update Modal */}
      <ObjectiveUpdateModal
        open={showUpdateModal}
        onOpenChange={setShowUpdateModal}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo obiettivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. L'obiettivo e tutti i progressi verranno eliminati.
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

export default ObjectivesTabContent;