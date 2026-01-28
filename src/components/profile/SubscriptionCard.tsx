import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const SubscriptionCard: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();

  const isPremium = profile?.premium_until && new Date(profile.premium_until) > new Date();
  const premiumType = profile?.premium_type;
  const premiumUntil = profile?.premium_until ? new Date(profile.premium_until) : null;

  return (
    <Card className={`
      rounded-3xl border shadow-premium overflow-hidden
      ${isPremium 
        ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-950/20 border-amber-200/50 dark:border-amber-800/30' 
        : 'bg-card border-border/50'
      }
    `}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`
              w-12 h-12 rounded-2xl flex items-center justify-center
              ${isPremium 
                ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg' 
                : 'bg-muted'
              }
            `}>
              {isPremium ? (
                <Crown className="w-6 h-6 text-white" />
              ) : (
                <Sparkles className="w-6 h-6 text-muted-foreground" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {isPremium ? 'Aria Plus' : 'Piano Free'}
                </span>
                {isPremium && (
                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0">
                    {premiumType === 'points' ? 'Punti' : 'Attivo'}
                  </Badge>
                )}
              </div>
              {isPremium && premiumUntil ? (
                <p className="text-xs text-muted-foreground">
                  Scade il {format(premiumUntil, 'd MMMM yyyy', { locale: it })}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sblocca tutte le funzionalità
                </p>
              )}
            </div>
          </div>

          <Button
            variant={isPremium ? 'outline' : 'default'}
            size="sm"
            className={`
              rounded-2xl
              ${isPremium 
                ? 'border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30' 
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
              }
            `}
            onClick={() => navigate('/plus')}
          >
            {isPremium ? 'Gestisci' : 'Passa a Plus'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionCard;
