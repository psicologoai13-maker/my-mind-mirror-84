import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Sparkles, CreditCard, Gem, ChevronRight, Check } from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useRewardPoints } from '@/hooks/useRewardPoints';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const PremiumCard: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { totalPoints, canRedeemPremium } = useRewardPoints();

  const isPremium = profile?.premium_until && new Date(profile.premium_until) > new Date();
  const premiumUntil = profile?.premium_until ? new Date(profile.premium_until) : null;

  if (isPremium) {
    return (
      <div className={cn(
        "relative overflow-hidden rounded-3xl",
        "bg-glass backdrop-blur-xl border border-amber-200/50 dark:border-amber-800/30",
        "shadow-glass"
      )}>
        {/* Golden gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/80 via-orange-50/60 to-rose-50/40 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-950/20 rounded-3xl" />
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent to-white/20 pointer-events-none" />
        
        <CardContent className="relative z-10 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent to-white/25 pointer-events-none" />
              <Crown className="w-6 h-6 text-white relative z-10" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                Aria Plus
                <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full">
                  Attivo
                </span>
              </h3>
              {premiumUntil && (
                <p className="text-xs text-muted-foreground">
                  Scade il {format(premiumUntil, 'd MMMM yyyy', { locale: it })}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <Check className="w-3.5 h-3.5" />
              Sessioni illimitate
            </div>
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <Check className="w-3.5 h-3.5" />
              Report avanzati
            </div>
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <Check className="w-3.5 h-3.5" />
              Analisi profonda
            </div>
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <Check className="w-3.5 h-3.5" />
              Nessun limite
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full rounded-xl border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
            onClick={() => navigate('/plus')}
          >
            Gestisci abbonamento
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </CardContent>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl",
      "bg-glass backdrop-blur-xl border border-glass-border",
      "shadow-glass"
    )}>
      {/* Aria gradient overlay */}
      <div className="absolute inset-0 bg-gradient-aria-subtle rounded-3xl" />
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent to-white/20 pointer-events-none" />
      
      <CardContent className="relative z-10 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
            "bg-gradient-aria shadow-aria-glow"
          )}>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent to-white/25 pointer-events-none" />
            <Sparkles className="w-6 h-6 text-white relative z-10" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Passa a Plus</h3>
            <p className="text-xs text-muted-foreground">
              Sblocca tutte le funzionalità
            </p>
          </div>
        </div>

        {/* Two payment options */}
        <div className="space-y-3">
          {/* Points option */}
          <div className={cn(
            "p-3 rounded-xl",
            "bg-glass-subtle backdrop-blur-sm border border-aria-violet/20"
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Gem className="w-4 h-4 text-aria-violet" />
                <span className="text-sm font-medium">Con i punti</span>
              </div>
              <span className="text-xs text-muted-foreground">1000 pts = 1 mese</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Hai: <strong className="text-aria-violet">{totalPoints}</strong> punti
              </span>
              {canRedeemPremium ? (
                <Button
                  size="sm"
                  className={cn(
                    "h-7 text-xs rounded-lg text-white",
                    "bg-gradient-aria hover:opacity-90"
                  )}
                  onClick={() => navigate('/plus')}
                >
                  Riscatta
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Mancano {Math.max(1000 - totalPoints, 0)} pts
                </span>
              )}
            </div>
          </div>

          {/* Card option */}
          <div className={cn(
            "p-3 rounded-xl",
            "bg-glass-subtle backdrop-blur-sm border border-border/30"
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-aria-violet" />
                <span className="text-sm font-medium">Con carta</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs">
                <span className="text-muted-foreground">Da </span>
                <span className="font-bold text-foreground">€4,99</span>
                <span className="text-muted-foreground">/mese</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs rounded-lg border-aria-violet/30 text-aria-violet hover:bg-aria-violet/10"
                onClick={() => navigate('/plus')}
              >
                Abbonati
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </div>
  );
};

export default PremiumCard;
