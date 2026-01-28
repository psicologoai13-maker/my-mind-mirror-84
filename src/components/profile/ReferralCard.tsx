import React, { useState } from 'react';
import { Users, Copy, Share2, Check, Gift } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useReferrals } from '@/hooks/useReferrals';
import { toast } from 'sonner';

const ReferralCard: React.FC = () => {
  const { 
    referralCode, 
    completedReferrals, 
    pendingReferrals,
    shareReferralCode, 
    copyReferralCode 
  } = useReferrals();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyReferralCode();
    if (success) {
      setCopied(true);
      toast.success('Codice copiato!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    await shareReferralCode();
  };

  return (
    <Card className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-950/20 rounded-3xl border border-emerald-200/50 dark:border-emerald-800/30 shadow-premium overflow-hidden">
      <CardContent className="p-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-500" />
          Invita Amici
        </h3>

        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground mb-3">
            Condividi il tuo codice e guadagna <strong className="text-emerald-600 dark:text-emerald-400">400 punti</strong> per ogni amico che usa l'app per 7 giorni!
          </p>

          <div className="bg-white dark:bg-card/50 rounded-2xl py-4 px-6 border border-emerald-200/50 dark:border-emerald-800/30 mb-4">
            <div className="text-2xl font-mono font-bold tracking-widest text-emerald-700 dark:text-emerald-300">
              {referralCode || '------'}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-2xl border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="w-4 h-4 mr-2 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copied ? 'Copiato!' : 'Copia'}
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Condividi
            </Button>
          </div>
        </div>

        {(completedReferrals.length > 0 || pendingReferrals.length > 0) && (
          <div className="pt-4 border-t border-emerald-200/50 dark:border-emerald-800/30">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Amici invitati</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {completedReferrals.length} completati
                {pendingReferrals.length > 0 && (
                  <span className="text-muted-foreground ml-1">
                    ({pendingReferrals.length} in attesa)
                  </span>
                )}
              </span>
            </div>
            {completedReferrals.length > 0 && (
              <div className="flex items-center gap-2 mt-2 py-2 px-3 bg-emerald-100/50 dark:bg-emerald-900/20 rounded-xl">
                <Gift className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm text-emerald-700 dark:text-emerald-300">
                  Hai guadagnato <strong>{completedReferrals.length * 400}</strong> punti!
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralCard;
