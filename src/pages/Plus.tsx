import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Check, Gem, Gift, Flame, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRewardPoints } from '@/hooks/useRewardPoints';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const PREMIUM_FEATURES = [
  { icon: '💬', text: 'Sessioni illimitate con Aria' },
  { icon: '📊', text: 'Report clinici avanzati' },
  { icon: '🧠', text: 'Analisi psicologiche approfondite' },
  { icon: '🎯', text: 'Obiettivi personalizzati illimitati' },
  { icon: '📤', text: 'Export dati completo' },
  { icon: '🚫', text: 'Nessuna pubblicità' },
  { icon: '⚡', text: 'Supporto prioritario' },
];

const POINTS_GUIDE = [
  { icon: Flame, text: '7 giorni consecutivi', points: 100, color: 'text-orange-500' },
  { icon: Flame, text: '30 giorni consecutivi', points: 300, color: 'text-violet-500' },
  { icon: Users, text: 'Invita un amico', points: 400, color: 'text-emerald-500' },
];

const Plus: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { totalPoints, canRedeemPremium, redeemPremium, isLoading } = useRewardPoints();
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const isPremium = profile?.premium_until && new Date(profile.premium_until) > new Date();
  const premiumUntil = profile?.premium_until ? new Date(profile.premium_until) : null;
  const progressToRedemption = Math.min((totalPoints / 1000) * 100, 100);

  const handleRedeemPoints = async () => {
    if (!canRedeemPremium) return;
    
    setIsRedeeming(true);
    try {
      await redeemPremium.mutateAsync();
      toast.success('🎉 Congratulazioni! Hai attivato 1 mese di Aria Plus!');
    } catch (error) {
      toast.error('Errore durante il riscatto. Riprova.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleSubscribe = () => {
    toast.info('Pagamenti in arrivo presto! Per ora puoi usare i punti.');
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-lg">Aria Plus</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="p-6 space-y-6 pb-24">
        {/* Hero */}
        <div className="text-center py-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center shadow-xl">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            ✨ Aria Plus ✨
          </h2>
          <p className="text-muted-foreground">
            Sblocca il tuo potenziale completo
          </p>
          
          {isPremium && premiumUntil && (
            <Badge className="mt-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Attivo fino al {format(premiumUntil, 'd MMMM yyyy', { locale: it })}
            </Badge>
          )}
        </div>

        {/* Features */}
        <Card className="bg-card rounded-3xl border border-border/50 shadow-premium">
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-500" />
              Cosa include Plus
            </h3>
            <div className="space-y-3">
              {PREMIUM_FEATURES.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xl">{feature.icon}</span>
                  <span className="text-sm text-foreground">{feature.text}</span>
                  <Check className="w-4 h-4 text-emerald-500 ml-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Points Redemption */}
        <Card className="bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-fuchsia-950/20 rounded-3xl border border-violet-200/50 dark:border-violet-800/30 shadow-premium">
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Gem className="w-5 h-5 text-violet-500" />
              Riscatta con Punti
            </h3>

            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                1.000 punti = 1 mese Plus
              </p>
              <div className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
                {isLoading ? '...' : totalPoints.toLocaleString()} punti
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <Progress 
                value={progressToRedemption} 
                className="h-3 bg-violet-200/50 dark:bg-violet-800/30"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>1.000</span>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-2xl shadow-lg disabled:opacity-50"
              disabled={!canRedeemPremium || isRedeeming}
              onClick={handleRedeemPoints}
            >
              <Gift className="w-4 h-4 mr-2" />
              {isRedeeming ? 'Riscattando...' : canRedeemPremium ? 'Riscatta 1 mese Plus' : `Mancano ${1000 - totalPoints} punti`}
            </Button>
          </CardContent>
        </Card>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">oppure</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Subscription Options */}
        <Card className="bg-card rounded-3xl border border-border/50 shadow-premium">
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              💳 Abbonamento
            </h3>

            <div className="space-y-3">
              {/* Monthly */}
              <button
                className={`
                  w-full p-4 rounded-2xl border-2 text-left transition-all
                  ${selectedPlan === 'monthly' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/50 hover:border-primary/50'
                  }
                `}
                onClick={() => setSelectedPlan('monthly')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Mensile</div>
                    <div className="text-sm text-muted-foreground">Fatturato ogni mese</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">€4,99</div>
                    <div className="text-xs text-muted-foreground">/mese</div>
                  </div>
                </div>
              </button>

              {/* Yearly */}
              <button
                className={`
                  w-full p-4 rounded-2xl border-2 text-left transition-all relative
                  ${selectedPlan === 'yearly' 
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' 
                    : 'border-border/50 hover:border-amber-500/50'
                  }
                `}
                onClick={() => setSelectedPlan('yearly')}
              >
                <Badge className="absolute -top-2 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                  ⭐ Consigliato
                </Badge>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Annuale</div>
                    <div className="text-sm text-muted-foreground">Risparmi il 33%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">€39,99</div>
                    <div className="text-xs text-muted-foreground">/anno</div>
                    <div className="text-xs text-emerald-600 font-medium">€3,33/mese</div>
                  </div>
                </div>
              </button>
            </div>

            <Button
              className="w-full mt-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl shadow-lg"
              onClick={handleSubscribe}
            >
              <Crown className="w-4 h-4 mr-2" />
              Abbonati {selectedPlan === 'monthly' ? 'mensile' : 'annuale'}
            </Button>
          </CardContent>
        </Card>

        {/* How to Earn Points */}
        <Card className="bg-muted/30 rounded-3xl border border-border/50">
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              🎯 Come guadagnare punti
            </h3>

            <div className="space-y-3">
              {POINTS_GUIDE.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                    <span className="text-sm text-foreground">{item.text}</span>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    +{item.points} pts
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Plus;
