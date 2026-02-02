import React from 'react';
import { Target, Trophy, Loader2, Sparkles, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ObjectiveCard } from '@/components/objectives/ObjectiveCard';
import { useObjectives, CATEGORY_CONFIG } from '@/hooks/useObjectives';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const ObjectivesTabContent: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeObjectives,
    achievedObjectives,
    isLoading,
  } = useObjectives();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Objectives */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Obiettivi Attivi</h2>
          </div>
          {/* Badge "Gestito da Aria" */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Sparkles className="h-3 w-3" />
            Gestito da Aria
          </div>
        </div>

        {activeObjectives.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl p-6 text-center bg-glass backdrop-blur-xl border border-glass-border shadow-soft">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Nessun obiettivo attivo</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                Parla con Aria per definire i tuoi obiettivi. Lei ti aiuterà a crearli e monitorare i progressi.
              </p>
              <Button
                onClick={() => navigate('/aria')}
                className="rounded-xl gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Parla con Aria
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeObjectives.map(objective => (
              <ObjectiveCard
                key={objective.id}
                objective={objective}
                // Read-only mode: no update/delete/addProgress handlers
              />
            ))}
            
            {/* CTA to talk to Aria for updates */}
            <div className="relative overflow-hidden rounded-2xl p-4 bg-glass backdrop-blur-xl border border-primary/20 shadow-soft">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Aggiorna i tuoi progressi</p>
                  <p className="text-xs text-muted-foreground">
                    Parla con Aria per registrare i tuoi progressi
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
    </div>
  );
};

export default ObjectivesTabContent;
