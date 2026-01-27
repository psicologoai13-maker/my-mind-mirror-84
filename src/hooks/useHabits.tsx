import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays, differenceInCalendarDays } from 'date-fns';

export interface HabitConfig {
  id: string;
  user_id: string;
  habit_type: string;
  is_active: boolean;
  daily_target: number | null;
  unit: string | null;
  streak_type: 'daily' | 'abstain';
  created_at: string;
}

export interface DailyHabit {
  id: string;
  user_id: string;
  date: string;
  habit_type: string;
  value: number;
  unit: string | null;
  target_value: number | null;
  notes: string | null;
  created_at: string;
}

export interface HabitWithStreak extends HabitConfig {
  todayValue: number;
  streak: number;
  lastEntry: DailyHabit | null;
}

// Predefined habit types with metadata
export const HABIT_TYPES = {
  water: { label: 'Acqua', icon: '💧', unit: 'L', defaultTarget: 2, streakType: 'daily' as const },
  cigarettes: { label: 'Sigarette', icon: '🚭', unit: 'pezzi', defaultTarget: 0, streakType: 'abstain' as const },
  exercise: { label: 'Esercizio', icon: '🏃', unit: 'min', defaultTarget: 30, streakType: 'daily' as const },
  meditation: { label: 'Meditazione', icon: '🧘', unit: 'min', defaultTarget: 10, streakType: 'daily' as const },
  alcohol: { label: 'Alcol', icon: '🍷', unit: 'drink', defaultTarget: 0, streakType: 'abstain' as const },
  caffeine: { label: 'Caffeina', icon: '☕', unit: 'tazze', defaultTarget: 3, streakType: 'daily' as const },
  steps: { label: 'Passi', icon: '👟', unit: 'passi', defaultTarget: 10000, streakType: 'daily' as const },
  sleep: { label: 'Sonno', icon: '😴', unit: 'ore', defaultTarget: 8, streakType: 'daily' as const },
  reading: { label: 'Lettura', icon: '📚', unit: 'min', defaultTarget: 20, streakType: 'daily' as const },
};

export const useHabits = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's habit configurations
  const { data: habitConfigs, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['habit-configs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_habits_config')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as HabitConfig[];
    },
    enabled: !!user,
  });

  // Fetch today's habit entries
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayHabits, isLoading: isLoadingToday } = useQuery({
    queryKey: ['daily-habits', user?.id, today],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('daily_habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);
      
      if (error) throw error;
      return (data || []) as DailyHabit[];
    },
    enabled: !!user,
  });

  // Fetch habit history for streaks (last 60 days)
  const { data: habitHistory } = useQuery({
    queryKey: ['habit-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('daily_habits')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', sixtyDaysAgo)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return (data || []) as DailyHabit[];
    },
    enabled: !!user,
  });

  // Calculate streak for a habit
  const calculateStreak = (habitType: string, streakType: 'daily' | 'abstain'): number => {
    if (!habitHistory) return 0;
    
    const habitEntries = habitHistory
      .filter(h => h.habit_type === habitType)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (habitEntries.length === 0) return 0;
    
    let streak = 0;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    if (streakType === 'abstain') {
      // For abstain habits (cigarettes, alcohol): count consecutive days with 0 value
      for (let i = 0; i < 60; i++) {
        const checkDate = format(subDays(todayDate, i), 'yyyy-MM-dd');
        const entry = habitEntries.find(e => e.date === checkDate);
        
        if (entry && entry.value === 0) {
          streak++;
        } else if (entry && entry.value > 0) {
          break;
        } else if (!entry && i === 0) {
          // Today not logged yet, continue counting
          continue;
        } else if (!entry) {
          // Missing day breaks streak for abstain
          break;
        }
      }
    } else {
      // For daily habits: count consecutive days with entry > 0
      for (let i = 0; i < 60; i++) {
        const checkDate = format(subDays(todayDate, i), 'yyyy-MM-dd');
        const entry = habitEntries.find(e => e.date === checkDate);
        
        if (entry && entry.value > 0) {
          streak++;
        } else if (i === 0 && !entry) {
          // Today not logged yet, continue
          continue;
        } else {
          break;
        }
      }
    }
    
    return streak;
  };

  // Combined habits with streaks
  const habitsWithStreaks: HabitWithStreak[] = (habitConfigs || []).map(config => {
    const todayEntry = todayHabits?.find(h => h.habit_type === config.habit_type);
    const streak = calculateStreak(config.habit_type, config.streak_type as 'daily' | 'abstain');
    
    return {
      ...config,
      todayValue: todayEntry?.value || 0,
      streak,
      lastEntry: todayEntry || null,
    };
  });

  // Add a new habit to track
  const addHabit = useMutation({
    mutationFn: async (habitType: string) => {
      if (!user) throw new Error('Not authenticated');
      const habitMeta = HABIT_TYPES[habitType as keyof typeof HABIT_TYPES];
      
      const { data, error } = await supabase
        .from('user_habits_config')
        .upsert({
          user_id: user.id,
          habit_type: habitType,
          is_active: true,
          daily_target: habitMeta?.defaultTarget,
          unit: habitMeta?.unit,
          streak_type: habitMeta?.streakType || 'daily',
        }, { onConflict: 'user_id,habit_type' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-configs'] });
    },
  });

  // Remove a habit from tracking
  const removeHabit = useMutation({
    mutationFn: async (habitType: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('user_habits_config')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('habit_type', habitType);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-configs'] });
    },
  });

  // Log a habit entry for today
  const logHabit = useMutation({
    mutationFn: async ({ habitType, value, notes }: { habitType: string; value: number; notes?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const config = habitConfigs?.find(c => c.habit_type === habitType);
      
      const { data, error } = await supabase
        .from('daily_habits')
        .upsert({
          user_id: user.id,
          date: today,
          habit_type: habitType,
          value,
          unit: config?.unit,
          target_value: config?.daily_target,
          notes,
        }, { onConflict: 'user_id,date,habit_type' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit-history'] });
    },
  });

  // Update habit target
  const updateHabitTarget = useMutation({
    mutationFn: async ({ habitType, target }: { habitType: string; target: number }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('user_habits_config')
        .update({ daily_target: target })
        .eq('user_id', user.id)
        .eq('habit_type', habitType);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-configs'] });
    },
  });

  return {
    habits: habitsWithStreaks,
    habitConfigs,
    todayHabits,
    isLoading: isLoadingConfigs || isLoadingToday,
    addHabit,
    removeHabit,
    logHabit,
    updateHabitTarget,
    HABIT_TYPES,
  };
};
