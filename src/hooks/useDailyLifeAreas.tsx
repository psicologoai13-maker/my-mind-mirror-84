import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DailyLifeAreas {
  id: string;
  user_id: string;
  date: string;
  work: number | null;
  love: number | null;
  health: number | null;
  social: number | null;
  growth: number | null;
  source: string;
  session_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch the most recent life areas data
 * This is the source of truth for the Life Balance Radar chart
 */
export const useDailyLifeAreas = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: latestLifeAreas, isLoading } = useQuery({
    queryKey: ['daily-life-areas', user?.id, 'latest'],
    queryFn: async () => {
      if (!user) return null;
      
      // Get the most recent record with any data
      const { data, error } = await supabase
        .from('daily_life_areas')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as DailyLifeAreas | null;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get life areas for a specific date range (for charts)
  const useLifeAreasRange = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['daily-life-areas', user?.id, 'range', startDate, endDate],
      queryFn: async () => {
        if (!user) return [];
        
        const { data, error } = await supabase
          .from('daily_life_areas')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });
        
        if (error) throw error;
        return (data || []) as DailyLifeAreas[];
      },
      enabled: !!user && !!startDate && !!endDate,
    });
  };

  // Invalidate all life areas queries
  const invalidateLifeAreas = () => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['daily-life-areas', user.id] });
    }
  };

  return {
    latestLifeAreas,
    isLoading,
    useLifeAreasRange,
    invalidateLifeAreas,
  };
};

export default useDailyLifeAreas;
