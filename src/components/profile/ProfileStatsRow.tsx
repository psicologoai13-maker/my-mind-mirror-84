import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Flame, MessageCircle, Trophy } from 'lucide-react';
import { format, subDays, differenceInCalendarDays } from 'date-fns';

const ProfileStatsRow: React.FC = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['profile-stats-row', user?.id],
    queryFn: async () => {
      if (!user) return { currentStreak: 0, totalSessions: 0, longestStreak: 0 };

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
        totalSessions: allSessionsResult.count || 0,
        longestStreak,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const { currentStreak = 0, totalSessions = 0, longestStreak = 0 } = stats || {};

  return (
    <div className="flex items-center gap-2">
      {/* Current Streak */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100/80 dark:bg-orange-900/30 rounded-xl">
        <Flame className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{currentStreak}</span>
        <span className="text-xs text-orange-600/70 dark:text-orange-400/70">giorni</span>
      </div>

      {/* Sessions */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100/80 dark:bg-violet-900/30 rounded-xl">
        <MessageCircle className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{totalSessions}</span>
        <span className="text-xs text-violet-600/70 dark:text-violet-400/70">sessioni</span>
      </div>

      {/* Record */}
      {longestStreak > currentStreak && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100/80 dark:bg-amber-900/30 rounded-xl">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{longestStreak}</span>
          <span className="text-xs text-amber-600/70 dark:text-amber-400/70">record</span>
        </div>
      )}
    </div>
  );
};

export default ProfileStatsRow;
