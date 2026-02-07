import React, { useState } from 'react';
import { Target, Trophy, Loader2, Sparkles, Plus, TrendingUp, Info, RefreshCw, Bot } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ObjectivesTabContent: React.FC = () => {
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [preselectedObjective, setPreselectedObjective] = useState<typeof activeObjectives[0] | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const {
    activeObjectives,
    achievedObjectives,
    isLoading,
    deleteObjective,
    updateObjective,
  } = useObjectives();
  
  // Handle update from specific objective card
  const handleUpdateWithAria = (objective: typeof activeObjectives[0]) => {
    setPreselectedObjective(objective);
    setShowUpdateModal(true);
  };
  
  // Reset preselected when modal closes
  const handleUpdateModalChange = (open: boolean) => {
    setShowUpdateModal(open);
    if (!open) {
      setPreselectedObjective(null);
    }
  };

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-aria flex items-center justify-center shadow-aria-glow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Gestisci i tuoi obiettivi</h3>
                <p className="text-xs text-muted-foreground">Parla con Aria per creare o aggiornare</p>
              </div>
            </div>
            
            {/* Info tooltip for tracking types */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="p-1.5 rounded-full hover:bg-muted transition-colors">
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px] p-3">
                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-500" /> Auto
                      </p>
                      <p className="text-muted-foreground">
                        Obiettivi tracciati automaticamente da dati corporei, passi, sonno, etc.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-primary" /> Aria
                      </p>
                      <p className="text-muted-foreground">
                        Obiettivi aggiornati parlando con Aria durante le sessioni.
                      </p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
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
              Nuovo Obiettivo
            </Button>
            <Button
              onClick={() => setShowUpdateModal(true)}
              variant="outline"
              className={cn(
                "flex-1 rounded-xl gap-2 bg-glass backdrop-blur-sm border-emerald-500/40",
                "hover:bg-emerald-500/10 hover:border-emerald-500/60",
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

      {/* Active Objectives - no header, just cards */}
      {activeObjectives.length > 0 && (
        <div className="space-y-3">
          {activeObjectives.map(objective => (
            <ObjectiveCard
              key={objective.id}
              objective={objective}
              onUpdate={(id, updates) => updateObjective.mutate({ id, ...updates })}
              onDelete={(id) => setDeleteConfirm(id)}
              onUpdateWithAria={handleUpdateWithAria}
            />
          ))}
        </div>
      )}
      

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
        onOpenChange={handleUpdateModalChange}
        preselectedObjective={preselectedObjective}
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