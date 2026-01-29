import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays, differenceInDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { useMemo } from 'react';
import { HABIT_TYPES, HABIT_ALIASES, getHabitMeta } from './useHabits';

export interface HabitDayData {
  date: string;
  value: number;
  target?: number;
}

export interface HabitAnalytics {
  habitType: string;
  label: string;
  icon: string;
  color: string;
  // Data points for charts
  dailyData: HabitDayData[];
  // Aggregated stats
  totalDays: number;          // Days with any data
  activeDays: number;         // Days where value > 0 (or abstained successfully)
  currentStreak: number;      // Consecutive days
  bestStreak: number;         // Best streak ever
  averageValue: number;       // Average value when logged
  totalValue: number;         // Sum of all values
  // Trend
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  // Metadata
  inputMethod: string;
  unit?: string;
  isAbstain: boolean;
}

export interface HabitsAnalyticsResult {
  habits: HabitAnalytics[];
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Hook per analizzare i dati storici delle habits.
 * Calcola streak, medie, trend e prepara dati per i grafici.
 */
export const useHabitsAnalytics = (lookbackDays: number = 30): HabitsAnalyticsResult => {
  const { user } = useAuth();
  const startDate = format(subDays(new Date(), lookbackDays), 'yyyy-MM-dd');
  const endDate = format(new Date(), 'yyyy-MM-dd');

  const { data: rawHabits, isLoading, refetch } = useQuery({
    queryKey: ['habits-analytics', user?.id, lookbackDays],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('daily_habits')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) {
        console.error('[useHabitsAnalytics] Error:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  // Get active habit configs
  const { data: habitConfigs } = useQuery({
    queryKey: ['user-habits-config', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_habits_config')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) return [];
      return data || [];
    },
    enabled: !!user,
  });

  const habitsAnalytics = useMemo<HabitAnalytics[]>(() => {
    if (!rawHabits || rawHabits.length === 0) return [];

    // Group by habit type
    const habitsByType: Record<string, typeof rawHabits> = {};
    
    rawHabits.forEach(entry => {
      // Normalize habit type using aliases
      const normalizedType = HABIT_ALIASES[entry.habit_type] || entry.habit_type;
      if (!habitsByType[normalizedType]) {
        habitsByType[normalizedType] = [];
      }
      habitsByType[normalizedType].push({
        ...entry,
        habit_type: normalizedType,
      });
    });

    // Generate analytics for each habit
    return Object.entries(habitsByType).map(([habitType, entries]) => {
      const meta = getHabitMeta(habitType);
      const isAbstain = meta?.inputMethod === 'abstain';
      
      // Sort by date
      const sortedEntries = [...entries].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Daily data for charts
      const dailyData: HabitDayData[] = sortedEntries.map(e => ({
        date: e.date,
        value: Number(e.value),
        target: e.target_value ? Number(e.target_value) : undefined,
      }));

      // Calculate streaks
      const today = startOfDay(new Date());
      let currentStreak = 0;
      let bestStreak = 0;
      let tempStreak = 0;

      // Check consecutive days from most recent
      const reversedEntries = [...sortedEntries].reverse();
      for (let i = 0; i < reversedEntries.length; i++) {
        const entry = reversedEntries[i];
        const entryDate = startOfDay(new Date(entry.date));
        const expectedDate = subDays(today, i);
        
        const isConsecutive = differenceInDays(expectedDate, entryDate) === 0;
        const isSuccess = isAbstain ? entry.value === 0 : entry.value > 0;
        
        if (isConsecutive && isSuccess) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Calculate best streak ever
      for (const entry of sortedEntries) {
        const isSuccess = isAbstain ? entry.value === 0 : entry.value > 0;
        if (isSuccess) {
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }

      // Aggregate stats
      const totalDays = entries.length;
      const activeDays = entries.filter(e => 
        isAbstain ? e.value === 0 : e.value > 0
      ).length;
      const values = entries.map(e => Number(e.value));
      const totalValue = values.reduce((a, b) => a + b, 0);
      const averageValue = totalDays > 0 ? totalValue / totalDays : 0;

      // Calculate trend (compare first half vs second half)
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercent = 0;
      
      if (sortedEntries.length >= 4) {
        const midpoint = Math.floor(sortedEntries.length / 2);
        const firstHalf = sortedEntries.slice(0, midpoint);
        const secondHalf = sortedEntries.slice(midpoint);
        
        const firstAvg = firstHalf.reduce((a, e) => a + Number(e.value), 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, e) => a + Number(e.value), 0) / secondHalf.length;
        
        if (firstAvg > 0) {
          trendPercent = ((secondAvg - firstAvg) / firstAvg) * 100;
        }
        
        // For abstain habits, down is good
        if (isAbstain) {
          trend = trendPercent < -10 ? 'up' : trendPercent > 10 ? 'down' : 'stable';
        } else {
          trend = trendPercent > 10 ? 'up' : trendPercent < -10 ? 'down' : 'stable';
        }
      }

      // Generate color based on habit type
      const habitColor = `hsl(${Math.abs(habitType.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 360}, 60%, 55%)`;
      
      return {
        habitType,
        label: meta?.label || habitType,
        icon: meta?.icon || '📊',
        color: habitColor,
        dailyData,
        totalDays,
        activeDays,
        currentStreak,
        bestStreak,
        averageValue: Math.round(averageValue * 10) / 10,
        totalValue,
        trend,
        trendPercent: Math.round(trendPercent),
        inputMethod: meta?.inputMethod || 'counter',
        unit: meta?.unit,
        isAbstain,
      };
    }).filter(h => h.totalDays > 0) // Only show habits with data
      .sort((a, b) => b.totalDays - a.totalDays); // Sort by most data
  }, [rawHabits]);

  return {
    habits: habitsAnalytics,
    isLoading,
    refetch,
  };
};

export default useHabitsAnalytics;
