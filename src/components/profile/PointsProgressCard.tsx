import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRewardPoints, STREAK_POINTS } from '@/hooks/useRewardPoints';
import { useReferrals } from '@/hooks/useReferrals';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, Copy, Gift, Flame, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface StreakProgress {
  type: 'week' | 'month';
  currentDays: number;
  targetDays: number;
  points: number;
  canClaim: boolean;
  alreadyClaimed: boolean;
}

const PointsProgressCard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const rewardPoints = useRewardPoints();
  const { referralCode, completedReferrals, pendingReferrals, copyReferralCode } = useReferrals();
  const [copied, setCopied] = useState(false);
  const [claimingStreak, setClaimingStreak] = useState<string | null>(null);

  // Check streak progress
  const { data: streakProgress } = useQuery({
    queryKey: ['streak-progress', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      
      // Get checkins grouped by date with count
      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo);

      // Count checkins per day
      const dailyCounts: Record<string, number> = {};
      checkins?.forEach(c => {
        const date = format(new Date(c.created_at), 'yyyy-MM-dd');
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });

      // Count days with 4+ checkins
      let consecutiveDays = 0;
      const today = new Date();
      
      for (let i = 0; i < 30; i++) {
        const checkDate = format(subDays(today, i), 'yyyy-MM-dd');
        if ((dailyCounts[checkDate] || 0) >= 4) {
          consecutiveDays++;
        } else if (i > 0) {
          break;
        }
      }

      // Check if already claimed
      const { data: transactions } = await supabase
        .from('reward_transactions')
        .select('source_id')
        .eq('user_id', user.id)
        .in('source_id', ['week_streak_claim', 'month_streak_claim']);

      const claimedWeek = transactions?.some(t => t.source_id === 'week_streak_claim');
      const claimedMonth = transactions?.some(t => t.source_id === 'month_streak_claim');

      const progress: StreakProgress[] = [
        {
          type: 'week',
          currentDays: Math.min(consecutiveDays, 7),
          targetDays: 7,
          points: STREAK_POINTS.week_streak,
          canClaim: consecutiveDays >= 7 && !claimedWeek,
          alreadyClaimed: claimedWeek || false,
        },
        {
          type: 'month',
          currentDays: Math.min(consecutiveDays, 30),
          targetDays: 30,
          points: STREAK_POINTS.month_streak,
          canClaim: consecutiveDays >= 30 && !claimedMonth,
          alreadyClaimed: claimedMonth || false,
        },
      ];

      return progress;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Claim streak reward
  const claimStreak = useMutation({
    mutationFn: async (streakType: 'week' | 'month') => {
      if (!user) throw new Error('Not authenticated');

      const points = streakType === 'week' ? STREAK_POINTS.week_streak : STREAK_POINTS.month_streak;
      const sourceId = `${streakType}_streak_claim`;
      const description = streakType === 'week' 
        ? '7 giorni consecutivi con 4+ check-in'
        : '30 giorni consecutivi con 4+ check-in';

      // Insert transaction
      const { error: txError } = await supabase.from('reward_transactions').insert({
        user_id: user.id,
        points: points,
        type: 'streak',
        source_id: sourceId,
        description: description,
      });

      if (txError) throw txError;

      // Update total
      const { error: rpcError } = await supabase.rpc('add_reward_points', {
        p_user_id: user.id,
        p_points: points,
      });

      if (rpcError) throw rpcError;

      return { points };
    },
    onSuccess: (data) => {
      toast.success(`+${data.points} punti riscattati!`);
      queryClient.invalidateQueries({ queryKey: ['streak-progress'] });
      queryClient.invalidateQueries({ queryKey: ['reward-points'] });
      setClaimingStreak(null);
    },
    onError: () => {
      toast.error('Errore nel riscatto');
      setClaimingStreak(null);
    },
  });

  const handleCopyReferral = async () => {
    const success = await copyReferralCode();
    if (success) {
      setCopied(true);
      toast.success('Codice copiato!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClaimStreak = (type: 'week' | 'month') => {
    setClaimingStreak(type);
    claimStreak.mutate(type);
  };

  const weekProgress = streakProgress?.find(s => s.type === 'week');
  const monthProgress = streakProgress?.find(s => s.type === 'month');

  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl",
      "bg-glass backdrop-blur-xl border border-glass-border",
      "shadow-glass"
    )}>
      {/* Inner light */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
      
      <CardContent className="relative z-10 p-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
          <Gift className="w-4 h-4 text-aria-violet" />
          Guadagna Punti
        </h3>

        <div className="space-y-4">
          {/* 7-Day Streak - Glass card */}
          <div className={cn(
            "p-4 rounded-2xl",
            "bg-gradient-to-br from-orange-50/80 to-amber-50/60 dark:from-orange-950/30 dark:to-amber-950/20",
            "backdrop-blur-sm border border-orange-200/30 dark:border-orange-800/30"
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-foreground">7 giorni streak</span>
              </div>
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                +{STREAK_POINTS.week_streak} pts
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Completa almeno 4 check-in al giorno per 7 giorni consecutivi
            </p>
            <div className="flex items-center gap-3">
              <Progress 
                value={((weekProgress?.currentDays || 0) / 7) * 100} 
                className="h-2 flex-1 bg-orange-200/50 dark:bg-orange-800/30"
              />
              <span className="text-xs font-medium text-muted-foreground min-w-[40px]">
                {weekProgress?.currentDays || 0}/7
              </span>
            </div>
            {weekProgress?.alreadyClaimed ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                Riscattato
              </div>
            ) : weekProgress?.canClaim && (
              <Button
                size="sm"
                className="mt-3 w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl"
                onClick={() => handleClaimStreak('week')}
                disabled={claimingStreak === 'week'}
              >
                {claimingStreak === 'week' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Riscatta +100 punti
                  </>
                )}
              </Button>
            )}
          </div>

          {/* 30-Day Streak - Aria glass card */}
          <div className={cn(
            "p-4 rounded-2xl",
            "bg-gradient-aria-subtle",
            "backdrop-blur-sm border border-aria-violet/20"
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-aria-violet" />
                <span className="text-sm font-medium text-foreground">30 giorni streak</span>
              </div>
              <span className="text-sm font-bold text-aria-violet">
                +{STREAK_POINTS.month_streak} pts
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Completa almeno 4 check-in al giorno per 30 giorni consecutivi
            </p>
            <div className="flex items-center gap-3">
              <Progress 
                value={((monthProgress?.currentDays || 0) / 30) * 100} 
                className="h-2 flex-1 bg-aria-violet/20"
              />
              <span className="text-xs font-medium text-muted-foreground min-w-[40px]">
                {monthProgress?.currentDays || 0}/30
              </span>
            </div>
            {monthProgress?.alreadyClaimed ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                Riscattato
              </div>
            ) : monthProgress?.canClaim && (
              <Button
                size="sm"
                className={cn(
                  "mt-3 w-full rounded-xl text-white",
                  "bg-gradient-aria hover:opacity-90"
                )}
                onClick={() => handleClaimStreak('month')}
                disabled={claimingStreak === 'month'}
              >
                {claimingStreak === 'month' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Riscatta +300 punti
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Referral - Glass card */}
          <div className={cn(
            "p-4 rounded-2xl",
            "bg-gradient-to-br from-emerald-50/80 to-teal-50/60 dark:from-emerald-950/30 dark:to-teal-950/20",
            "backdrop-blur-sm border border-emerald-200/30 dark:border-emerald-800/30"
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-foreground">Invita amici</span>
              </div>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                +{STREAK_POINTS.referral} pts
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Guadagna {STREAK_POINTS.referral} punti per ogni amico che usa l'app per 7 giorni
            </p>
            
            {/* Referral Code */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex-1 rounded-xl py-2 px-4",
                "bg-glass-subtle backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-800/30"
              )}>
                <span className="text-sm font-mono font-bold tracking-widest text-emerald-700 dark:text-emerald-300">
                  {referralCode || '------'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                onClick={handleCopyReferral}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Referral Stats */}
            {(completedReferrals.length > 0 || pendingReferrals.length > 0) && (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {completedReferrals.length} completati
                </span>
                {pendingReferrals.length > 0 && (
                  <span className="text-muted-foreground">
                    • {pendingReferrals.length} in attesa
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </div>
  );
};

export default PointsProgressCard;
