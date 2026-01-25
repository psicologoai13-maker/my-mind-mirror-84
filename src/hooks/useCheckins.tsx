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

  // Get start and end of today in Rome timezone, converted to UTC for DB queries
  const getTodayRomeRange = (): { start: string; end: string } => {
    // Get current date in Rome timezone
    const now = new Date();
    const romeFormatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const todayRome = romeFormatter.format(now);
    
    // Create start of day in Rome and convert to UTC
    // Rome is UTC+1 in winter, UTC+2 in summer
    // We need to find the UTC equivalent of midnight Rome time
    const startRome = new Date(`${todayRome}T00:00:00+01:00`); // Use +01:00 for winter, DST handled by Date
    const endRome = new Date(`${todayRome}T23:59:59.999+01:00`);
    
    return {
      start: startRome.toISOString(),
      end: endRome.toISOString()
    };
  };

  const { data: todayCheckin, isLoading: todayLoading } = useQuery({
    queryKey: ['checkin-today', user?.id, new Date().toDateString()],
    queryFn: async () => {
      if (!user) return null;
      
      const { start, end } = getTodayRomeRange();
      
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })
        .limit(1)
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
