import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfWeek, endOfWeek, format, subDays } from 'date-fns';
import { it } from 'date-fns/locale';

export interface DailyCheckin {
  id: string;
  user_id: string;
  created_at: string;
  mood_emoji: string;
  mood_value: number;
  notes: string | null;
}

export const useCheckins = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: todayCheckin, isLoading: todayLoading } = useQuery({
    queryKey: ['checkin-today', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .maybeSingle();
      
      if (error) throw error;
      return data as DailyCheckin | null;
    },
    enabled: !!user,
  });

  const { data: weeklyCheckins, isLoading: weeklyLoading } = useQuery({
    queryKey: ['checkins-weekly', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as DailyCheckin[];
    },
    enabled: !!user,
  });

  const saveCheckin = useMutation({
    mutationFn: async ({ mood_emoji, mood_value, notes }: { mood_emoji: string; mood_value: number; notes?: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if already checked in today
      if (todayCheckin) {
        const { data, error } = await supabase
          .from('daily_checkins')
          .update({ mood_emoji, mood_value, notes })
          .eq('id', todayCheckin.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
      
      const { data, error } = await supabase
        .from('daily_checkins')
        .insert({ user_id: user.id, mood_emoji, mood_value, notes })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin-today', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['checkins-weekly', user?.id] });
    },
  });

  // Transform weekly data for chart
  const weeklyChartData = (() => {
    const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    
    return days.map((day, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const checkin = weeklyCheckins?.find(c => 
        format(new Date(c.created_at), 'yyyy-MM-dd') === dateStr
      );
      
      return {
        day,
        mood: checkin?.mood_value || 0,
        satisfaction: checkin ? Math.min(5, checkin.mood_value + (Math.random() > 0.5 ? 1 : -1)) : 0,
      };
    });
  })();

  return {
    todayCheckin,
    weeklyCheckins,
    weeklyChartData,
    saveCheckin,
    isLoading: todayLoading || weeklyLoading,
  };
};
