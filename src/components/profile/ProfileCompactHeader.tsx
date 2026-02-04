import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useRewardPoints } from '@/hooks/useRewardPoints';
import { Flame, MessageCircle, Gem, Crown } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const ProfileCompactHeader: React.FC = () => {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { totalPoints, isLoading: pointsLoading } = useRewardPoints();

  const isPremium = profile?.premium_until && new Date(profile.premium_until) > new Date();

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['profile-compact-stats', user?.id],
    queryFn: async () => {
      if (!user) return { currentStreak: 0, totalSessions: 0 };

      const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');
      
      const [checkinsResult, sessionsResult, allSessionsResult] = await Promise.all([
        supabase
          .from('daily_checkins')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', sixtyDaysAgo),
        supabase
          .from('sessions')
          .select('start_time')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('start_time', sixtyDaysAgo),
        supabase
          .from('sessions')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('status', 'completed'),
      ]);

      const allDates = new Set<string>();
      
      checkinsResult.data?.forEach(c => {
        allDates.add(format(new Date(c.created_at), 'yyyy-MM-dd'));
      });
      
      sessionsResult.data?.forEach(s => {
        allDates.add(format(new Date(s.start_time), 'yyyy-MM-dd'));
      });

      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < 60; i++) {
        const checkDate = format(subDays(today, i), 'yyyy-MM-dd');
        if (allDates.has(checkDate)) {
          currentStreak++;
        } else if (i === 0) {
          continue;
        } else {
          break;
        }
      }

      return {
        currentStreak,
        totalSessions: allSessionsResult.count || 0,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const { currentStreak = 0, totalSessions = 0 } = stats || {};

  // Calculate streak milestone
  const getNextMilestone = (streak: number) => {
    const milestones = [7, 14, 30, 60, 90, 180, 365];
    for (const m of milestones) {
      if (streak < m) return m;
    }
    return 365;
  };

  const nextMilestone = getNextMilestone(currentStreak);
  const streakProgress = (currentStreak / nextMilestone) * 100;
  const pointsToNextMilestone = (nextMilestone - currentStreak) * 10; // ~10 pts per day

  // Get initials for avatar
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '👤';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl p-4",
      "bg-glass backdrop-blur-xl border border-glass-border",
      "shadow-glass"
    )}>
      {/* Inner light reflection */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10">
        {/* Top Row: Avatar + Name + Badge */}
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar */}
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold",
            isPremium 
              ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
              : "bg-gradient-aria text-white"
          )}>
            {getInitials(profile?.name)}
          </div>
          
          {/* Name + Badge */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold text-foreground truncate">
                {profileLoading ? '...' : (profile?.name || 'Utente')}
              </h2>
              <Badge 
                variant={isPremium ? "default" : "secondary"}
                className={cn(
                  "shrink-0 text-xs",
                  isPremium && "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0"
                )}
              >
                {isPremium ? (
                  <><Crown className="w-3 h-3 mr-1" /> Plus</>
                ) : 'Free'}
              </Badge>
            </div>
            
            {/* Stats Row */}
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="font-medium text-foreground">{currentStreak}</span> giorni
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-violet-500" />
                <span className="font-medium text-foreground">{totalSessions}</span> sessioni
              </span>
              <span className="flex items-center gap-1">
                <Gem className="w-3.5 h-3.5 text-aria-violet" />
                <span className="font-medium text-aria-violet">
                  {pointsLoading ? '...' : totalPoints.toLocaleString()}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Streak Progress - Always Visible */}
        <div className={cn(
          "p-3 rounded-xl",
          "bg-glass-subtle backdrop-blur-sm border border-border/20"
        )}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              Streak giornaliero
            </span>
            <span className="text-xs text-muted-foreground">
              {currentStreak}/{nextMilestone} giorni
            </span>
          </div>
          <Progress 
            value={streakProgress} 
            className="h-2 bg-muted/30"
          />
          <p className="text-[10px] text-muted-foreground mt-1.5">
            +{pointsToNextMilestone} pts al prossimo traguardo
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompactHeader;
