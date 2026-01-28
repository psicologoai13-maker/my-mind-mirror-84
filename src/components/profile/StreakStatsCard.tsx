import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Flame, MessageCircle, Award, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { format, subDays, differenceInCalendarDays } from 'date-fns';

const StreakStatsCard: React.FC = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['profile-streak-stats', user?.id],
    queryFn: async () => {
      if (!user) return { currentStreak: 0, longestStreak: 0, totalSessions: 0, totalBadges: 0 };

      const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');
      
      const [checkinsResult, sessionsResult, badgesResult, allSessionsResult] = await Promise.all([
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
          .from('user_achievements')
          .select('id')
          .eq('user_id', user.id),
        supabase
          .from('sessions')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('status', 'completed'),
      ]);

      // Combine dates for streak calculation
      const allDates = new Set<string>();
      
      checkinsResult.data?.forEach(c => {
        allDates.add(format(new Date(c.created_at), 'yyyy-MM-dd'));
      });
      
      sessionsResult.data?.forEach(s => {
        allDates.add(format(new Date(s.start_time), 'yyyy-MM-dd'));
      });

      // Calculate current streak
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

      // Calculate longest streak
      const sortedDates = Array.from(allDates).sort();
      let longestStreak = 0;
      let tempStreak = 1;

      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diff = differenceInCalendarDays(currDate, prevDate);

        if (diff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      return {
        currentStreak,
        longestStreak,
        totalSessions: allSessionsResult.count || 0,
        totalBadges: badgesResult.data?.length || 0,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const { currentStreak = 0, longestStreak = 0, totalSessions = 0, totalBadges = 0 } = stats || {};

  return (
    <Card className="bg-card rounded-3xl border border-border/50 shadow-premium overflow-hidden">
      <CardContent className="p-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          Streak & Statistiche
        </h3>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {currentStreak}
            </div>
            <div className="text-xs text-muted-foreground mt-1">giorni</div>
          </div>

          <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">
              {totalSessions}
            </div>
            <div className="text-xs text-muted-foreground mt-1">sessioni</div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {totalBadges}
            </div>
            <div className="text-xs text-muted-foreground mt-1">badge</div>
          </div>
        </div>

        {longestStreak > currentStreak && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-amber-100/50 dark:bg-amber-900/20 rounded-xl">
            <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm text-amber-700 dark:text-amber-300">
              Record: <strong>{longestStreak} giorni</strong>
            </span>
          </div>
        )}

        {currentStreak >= 7 && (
          <div className="flex items-center justify-center gap-2 mt-3 py-2 px-4 bg-orange-100/50 dark:bg-orange-900/20 rounded-xl">
            <span className="text-lg">🔥</span>
            <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">
              Sei in fuoco! Continua così!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StreakStatsCard;
