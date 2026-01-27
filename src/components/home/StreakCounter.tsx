import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Flame, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, differenceInCalendarDays } from 'date-fns';

const StreakCounter: React.FC = () => {
  const { user } = useAuth();

  const { data: streakData } = useQuery({
    queryKey: ['app-streak', user?.id],
    queryFn: async () => {
      if (!user) return { currentStreak: 0, longestStreak: 0, activeDays: 0 };

      // Get last 60 days of activity (check-ins + sessions)
      const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');
      
      const [checkinsResult, sessionsResult] = await Promise.all([
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
      ]);

      // Combine all dates
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
          // Today not logged yet, continue
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
        activeDays: allDates.size,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { currentStreak = 0, longestStreak = 0 } = streakData || {};

  // Don't show if no streak
  if (currentStreak === 0) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-2xl",
      currentStreak >= 7 
        ? "bg-gradient-to-r from-orange-100 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800"
        : "bg-muted/50"
    )}>
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center",
        currentStreak >= 7 
          ? "bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg" 
          : "bg-muted"
      )}>
        <Flame className={cn(
          "w-5 h-5",
          currentStreak >= 7 ? "text-white" : "text-muted-foreground"
        )} />
      </div>
      
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "text-2xl font-bold",
            currentStreak >= 7 ? "text-orange-600 dark:text-orange-400" : "text-foreground"
          )}>
            {currentStreak}
          </span>
          <span className="text-sm text-muted-foreground">
            giorni consecutivi
          </span>
        </div>
        {longestStreak > currentStreak && (
          <p className="text-xs text-muted-foreground">
            Record: {longestStreak} giorni
          </p>
        )}
      </div>

      {currentStreak >= 7 && (
        <span className="text-2xl animate-pulse">🔥</span>
      )}
    </div>
  );
};

export default StreakCounter;
