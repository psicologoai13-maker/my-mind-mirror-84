import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays } from 'date-fns';

export interface DailyMetrics {
  date: string;
  vitals: {
    mood: number;
    anxiety: number;
    energy: number;
    sleep: number;
  };
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    apathy: number;
  };
  has_checkin: boolean;
  has_sessions: boolean;
  checkin_priority: boolean;
}

export interface WeeklyAverages {
  mood: number;
  anxiety: number;
  energy: number;
  sleep: number;
  daysWithData: number;
}

/**
 * Hook unificato per ottenere le metriche giornaliere aggregate.
 * Questa è la SINGOLA FONTE DI VERITÀ per Dashboard e Analisi.
 */
export const useDailyMetrics = (date?: Date) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetDate = date || new Date();
  const dateString = format(targetDate, 'yyyy-MM-dd');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['daily-metrics', user?.id, dateString],
    queryFn: async (): Promise<DailyMetrics | null> => {
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_daily_metrics', {
        p_user_id: user.id,
        p_date: dateString,
      });

      if (error) {
        console.error('[useDailyMetrics] RPC error:', error);
        throw error;
      }

      return data as unknown as DailyMetrics;
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Function to invalidate and refetch metrics
  const invalidateMetrics = () => {
    queryClient.invalidateQueries({ queryKey: ['daily-metrics', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['weekly-averages', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['checkin-today'] });
    queryClient.invalidateQueries({ queryKey: ['checkins-weekly'] });
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };

  // Helper to convert 1-10 scale to 0-100 for display
  const toPercentage = (value: number) => Math.round(value * 10);

  // Get vitals as percentages (0-100)
  const vitalsPercentage = data?.vitals ? {
    mood: toPercentage(data.vitals.mood),
    anxiety: toPercentage(data.vitals.anxiety),
    energy: toPercentage(data.vitals.energy),
    sleep: toPercentage(data.vitals.sleep),
  } : null;

  return {
    metrics: data,
    vitals: data?.vitals || null,
    vitalsPercentage,
    emotions: data?.emotions || null,
    hasData: data?.has_checkin || data?.has_sessions || false,
    isLoading,
    error,
    refetch,
    invalidateMetrics,
  };
};

/**
 * Hook per ottenere la MEDIA degli ultimi 7 giorni
 */
export const useWeeklyAverages = () => {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['weekly-averages', user?.id],
    queryFn: async (): Promise<WeeklyAverages> => {
      if (!user) {
        return { mood: 0, anxiety: 0, energy: 0, sleep: 0, daysWithData: 0 };
      }

      const today = new Date();
      const results: DailyMetrics[] = [];

      // Fetch last 7 days
      for (let i = 0; i < 7; i++) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');

        const { data, error } = await supabase.rpc('get_daily_metrics', {
          p_user_id: user.id,
          p_date: dateStr,
        });

        if (!error && data) {
          const metrics = data as unknown as DailyMetrics;
          // Only include days with actual data
          if (metrics.has_checkin || metrics.has_sessions) {
            results.push(metrics);
          }
        }
      }

      if (results.length === 0) {
        return { mood: 0, anxiety: 0, energy: 0, sleep: 0, daysWithData: 0 };
      }

      // Calculate averages
      const sum = results.reduce(
        (acc, m) => ({
          mood: acc.mood + (m.vitals?.mood || 0),
          anxiety: acc.anxiety + (m.vitals?.anxiety || 0),
          energy: acc.energy + (m.vitals?.energy || 0),
          sleep: acc.sleep + (m.vitals?.sleep || 0),
        }),
        { mood: 0, anxiety: 0, energy: 0, sleep: 0 }
      );

      return {
        mood: Number((sum.mood / results.length).toFixed(1)),
        anxiety: Number((sum.anxiety / results.length).toFixed(1)),
        energy: Number((sum.energy / results.length).toFixed(1)),
        sleep: Number((sum.sleep / results.length).toFixed(1)),
        daysWithData: results.length,
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute cache
  });

  return {
    averages: data || { mood: 0, anxiety: 0, energy: 0, sleep: 0, daysWithData: 0 },
    isLoading,
    refetch,
  };
};

/**
 * Hook per ottenere metriche per un range di date (per grafici)
 */
export const useDailyMetricsRange = (startDate: Date, endDate: Date) => {
  const { user } = useAuth();
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['daily-metrics-range', user?.id, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async (): Promise<DailyMetrics[]> => {
      if (!user) return [];

      const results: DailyMetrics[] = [];
      const current = new Date(startDate);
      
      while (current <= endDate) {
        const dateStr = format(current, 'yyyy-MM-dd');
        
        const { data, error } = await supabase.rpc('get_daily_metrics', {
          p_user_id: user.id,
          p_date: dateStr,
        });

        if (!error && data) {
          results.push(data as unknown as DailyMetrics);
        }
        
        current.setDate(current.getDate() + 1);
      }

      return results;
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute for range queries
  });

  return {
    metricsRange: data || [],
    isLoading,
    refetch,
  };
};
