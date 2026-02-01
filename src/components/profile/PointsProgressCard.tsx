import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRewardPoints, STREAK_POINTS } from '@/hooks/useRewardPoints';
import { useReferrals } from '@/hooks/useReferrals';
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

interface PointsProgressCardProps {
  compact?: boolean;
}

const PointsProgressCard: React.FC<PointsProgressCardProps> = ({ compact = false }) => {
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
      
      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo);

      const dailyCounts: Record<string, number> = {};
      checkins?.forEach(c => {
        const date = format(new Date(c.created_at), 'yyyy-MM-dd');
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });

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

  const claimStreak = useMutation({
    mutationFn: async (streakType: 'week' | 'month') => {
      if (!user) throw new Error('Not authenticated');

      const points = streakType === 'week' ? STREAK_POINTS.week_streak : STREAK_POINTS.month_streak;
      const sourceId = `${streakType}_streak_claim`;
      const description = streakType === 'week' 
        ? '7 giorni consecutivi con 4+ check-in'
        : '30 giorni consecutivi con 4+ check-in';

      const { error: txError } = await supabase.from('reward_transactions').insert({
        user_id: user.id,
        points: points,
        type: 'streak',
        source_id: sourceId,
        description: description,
      });

      if (txError) throw txError;

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

  // Compact version for inline in profile header
  if (compact) {
    return (
      <div className="mt-4 pt-4 border-t border-border/30">
        <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5 text-aria-violet" />
          Guadagna Punti
        </h4>
        
        <div className="grid grid-cols-1 gap-2">
          {/* 7-Day Streak - Compact */}
          <div className={cn(
            "p-3 rounded-xl",
            "bg-gradient-to-br from-orange-50/60 to-amber-50/40 dark:from-orange-950/20 dark:to-amber-950/15",
            "border border-orange-200/20 dark:border-orange-800/20"
          )}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">7 giorni streak</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {weekProgress?.currentDays || 0}/7
                </span>
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                  +{STREAK_POINTS.week_streak}
                </span>
              </div>
            </div>
            <Progress 
              value={((weekProgress?.currentDays || 0) / 7) * 100} 
              className="h-1.5 mt-2 bg-orange-200/40 dark:bg-orange-800/20"
            />
            {weekProgress?.alreadyClaimed && (
              <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600">
                <Check className="w-3 h-3" />
                Riscattato
              </div>
            )}
            {weekProgress?.canClaim && !weekProgress.alreadyClaimed && (
              <Button
                size="sm"
                className="mt-2 w-full h-7 text-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg"
                onClick={() => handleClaimStreak('week')}
                disabled={claimingStreak === 'week'}
              >
                {claimingStreak === 'week' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  'Riscatta'
                )}
              </Button>
            )}
          </div>

          {/* 30-Day Streak - Compact */}
          <div className={cn(
            "p-3 rounded-xl",
            "bg-gradient-aria-subtle",
            "border border-aria-violet/15"
          )}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Flame className="w-3.5 h-3.5 text-aria-violet shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">30 giorni streak</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {monthProgress?.currentDays || 0}/30
                </span>
                <span className="text-xs font-bold text-aria-violet">
                  +{STREAK_POINTS.month_streak}
                </span>
              </div>
            </div>
            <Progress 
              value={((monthProgress?.currentDays || 0) / 30) * 100} 
              className="h-1.5 mt-2 bg-aria-violet/15"
            />
            {monthProgress?.alreadyClaimed && (
              <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600">
                <Check className="w-3 h-3" />
                Riscattato
              </div>
            )}
            {monthProgress?.canClaim && !monthProgress.alreadyClaimed && (
              <Button
                size="sm"
                className="mt-2 w-full h-7 text-xs bg-gradient-aria hover:opacity-90 text-white rounded-lg"
                onClick={() => handleClaimStreak('month')}
                disabled={claimingStreak === 'month'}
              >
                {claimingStreak === 'month' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  'Riscatta'
                )}
              </Button>
            )}
          </div>

          {/* Referral - Compact */}
          <div className={cn(
            "p-3 rounded-xl",
            "bg-gradient-to-br from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/15",
            "border border-emerald-200/20 dark:border-emerald-800/20"
          )}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-foreground">Invita amici</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                +{STREAK_POINTS.referral}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex-1 rounded-lg py-1.5 px-3",
                "bg-white/50 dark:bg-black/20 border border-emerald-200/30 dark:border-emerald-800/20"
              )}>
                <span className="text-xs font-mono font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
                  {referralCode || '------'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                onClick={handleCopyReferral}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>

            {(completedReferrals.length > 0 || pendingReferrals.length > 0) && (
              <div className="mt-2 flex items-center gap-2 text-[10px]">
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
      </div>
    );
  }

  // Full version (kept for backwards compatibility)
  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl",
      "bg-glass backdrop-blur-xl border border-glass-border",
      "shadow-glass"
    )}>
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 p-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
          <Gift className="w-4 h-4 text-aria-violet" />
          Guadagna Punti
        </h3>

        <div className="space-y-3">
          {/* 7-Day Streak */}
          <div className={cn(
            "p-3 rounded-xl",
            "bg-gradient-to-br from-orange-50/80 to-amber-50/60 dark:from-orange-950/30 dark:to-amber-950/20",
            "backdrop-blur-sm border border-orange-200/30 dark:border-orange-800/30"
          )}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-foreground">7 giorni streak</span>
              </div>
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                +{STREAK_POINTS.week_streak} pts
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              4+ check-in/giorno per 7 giorni
            </p>
            <div className="flex items-center gap-3">
              <Progress 
                value={((weekProgress?.currentDays || 0) / 7) * 100} 
                className="h-1.5 flex-1 bg-orange-200/50 dark:bg-orange-800/30"
              />
              <span className="text-xs font-medium text-muted-foreground">
                {weekProgress?.currentDays || 0}/7
              </span>
            </div>
            {weekProgress?.alreadyClaimed ? (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                <Check className="w-3.5 h-3.5" />
                Riscattato
              </div>
            ) : weekProgress?.canClaim && (
              <Button
                size="sm"
                className="mt-2 w-full h-8 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl"
                onClick={() => handleClaimStreak('week')}
                disabled={claimingStreak === 'week'}
              >
                {claimingStreak === 'week' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-1.5" />
                    Riscatta +100
                  </>
                )}
              </Button>
            )}
          </div>

          {/* 30-Day Streak */}
          <div className={cn(
            "p-3 rounded-xl",
            "bg-gradient-aria-subtle",
            "backdrop-blur-sm border border-aria-violet/20"
          )}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-aria-violet" />
                <span className="text-sm font-medium text-foreground">30 giorni streak</span>
              </div>
              <span className="text-sm font-bold text-aria-violet">
                +{STREAK_POINTS.month_streak} pts
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              4+ check-in/giorno per 30 giorni
            </p>
            <div className="flex items-center gap-3">
              <Progress 
                value={((monthProgress?.currentDays || 0) / 30) * 100} 
                className="h-1.5 flex-1 bg-aria-violet/20"
              />
              <span className="text-xs font-medium text-muted-foreground">
                {monthProgress?.currentDays || 0}/30
              </span>
            </div>
            {monthProgress?.alreadyClaimed ? (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                <Check className="w-3.5 h-3.5" />
                Riscattato
              </div>
            ) : monthProgress?.canClaim && (
              <Button
                size="sm"
                className="mt-2 w-full h-8 bg-gradient-aria hover:opacity-90 text-white rounded-xl"
                onClick={() => handleClaimStreak('month')}
                disabled={claimingStreak === 'month'}
              >
                {claimingStreak === 'month' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-1.5" />
                    Riscatta +300
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Referral */}
          <div className={cn(
            "p-3 rounded-xl",
            "bg-gradient-to-br from-emerald-50/80 to-teal-50/60 dark:from-emerald-950/30 dark:to-teal-950/20",
            "backdrop-blur-sm border border-emerald-200/30 dark:border-emerald-800/30"
          )}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-foreground">Invita amici</span>
              </div>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                +{STREAK_POINTS.referral} pts
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              +{STREAK_POINTS.referral} punti per ogni amico attivo 7 giorni
            </p>
            
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex-1 rounded-xl py-1.5 px-3",
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

            {(completedReferrals.length > 0 || pendingReferrals.length > 0) && (
              <div className="mt-2 flex items-center gap-2 text-xs">
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
      </div>
    </div>
  );
};

export default PointsProgressCard;
