import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Sparkles, CreditCard, Gem, ChevronRight, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useRewardPoints } from '@/hooks/useRewardPoints';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const PremiumCard: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { totalPoints, canRedeemPremium } = useRewardPoints();

  const isPremium = profile?.premium_until && new Date(profile.premium_until) > new Date();
  const premiumUntil = profile?.premium_until ? new Date(profile.premium_until) : null;

  if (isPremium) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-950/20 rounded-3xl border border-amber-200/50 dark:border-amber-800/30 shadow-premium overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Crown className="w-6 h-6 text-white" />
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
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-fuchsia-950/20 rounded-3xl border border-violet-200/50 dark:border-violet-800/30 shadow-premium overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
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
          <div className="p-3 bg-white/50 dark:bg-card/30 rounded-xl border border-violet-200/30 dark:border-violet-700/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Gem className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-medium">Con i punti</span>
              </div>
              <span className="text-xs text-muted-foreground">1000 pts = 1 mese</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Hai: <strong className="text-violet-600 dark:text-violet-400">{totalPoints}</strong> punti
              </span>
              {canRedeemPremium ? (
                <Button
                  size="sm"
                  className="h-7 text-xs bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-lg"
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
          <div className="p-3 bg-white/50 dark:bg-card/30 rounded-xl border border-violet-200/30 dark:border-violet-700/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-violet-500" />
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
                className="h-7 text-xs rounded-lg border-violet-300 dark:border-violet-700"
                onClick={() => navigate('/plus')}
              >
                Abbonati
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PremiumCard;
