import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays } from 'date-fns';

export interface BodyMetric {
  id: string;
  user_id: string;
  date: string;
  weight: number | null;
  waist_circumference: number | null;
  sleep_hours: number | null;
  resting_heart_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  notes: string | null;
  created_at: string;
}

export interface BodyMetricsTrend {
  current: number | null;
  previous: number | null;
  change: number | null;
  changePercent: number | null;
  trend: 'up' | 'down' | 'stable';
}

export const useBodyMetrics = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch body metrics history (last 90 days)
  const { data: metricsHistory, isLoading } = useQuery({
    queryKey: ['body-metrics', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('body_metrics')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', ninetyDaysAgo)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return (data || []) as BodyMetric[];
    },
    enabled: !!user,
  });

  // Get today's metrics
  const todayMetrics = metricsHistory?.find(m => m.date === today) || null;

  // Get latest metrics (most recent entry for each field)
  const getLatestValue = (field: keyof BodyMetric): number | null => {
    if (!metricsHistory) return null;
    for (const metric of metricsHistory) {
      if (metric[field] !== null) {
        return metric[field] as number;
      }
    }
    return null;
  };

  // Calculate trend for a specific metric
  const calculateTrend = (field: keyof BodyMetric, days: number = 30): BodyMetricsTrend => {
    if (!metricsHistory || metricsHistory.length === 0) {
      return { current: null, previous: null, change: null, changePercent: null, trend: 'stable' };
    }

    const recentEntries = metricsHistory.filter(m => m[field] !== null);
    if (recentEntries.length === 0) {
      return { current: null, previous: null, change: null, changePercent: null, trend: 'stable' };
    }

    const current = recentEntries[0]?.[field] as number | null;
    
    // Find entry from ~30 days ago
    const cutoffDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
    const olderEntries = recentEntries.filter(m => m.date <= cutoffDate);
    const previous = olderEntries[0]?.[field] as number | null;

    if (current === null) {
      return { current: null, previous, change: null, changePercent: null, trend: 'stable' };
    }

    if (previous === null) {
      return { current, previous: null, change: null, changePercent: null, trend: 'stable' };
    }

    const change = current - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
    const trend = Math.abs(change) < 0.1 ? 'stable' : change > 0 ? 'up' : 'down';

    return { current, previous, change, changePercent, trend };
  };

  // Log or update body metrics for a specific date
  const logMetrics = useMutation({
    mutationFn: async (metrics: Partial<Omit<BodyMetric, 'id' | 'user_id' | 'created_at'>>) => {
      if (!user) throw new Error('Not authenticated');
      const date = metrics.date || today;

      const { data, error } = await supabase
        .from('body_metrics')
        .upsert({
          user_id: user.id,
          date,
          ...metrics,
        }, { onConflict: 'user_id,date' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['body-metrics'] });
    },
  });

  // Get weight data for chart
  const weightChartData = metricsHistory
    ?.filter(m => m.weight !== null)
    .map(m => ({
      date: m.date,
      value: m.weight as number,
    }))
    .reverse() || [];

  return {
    metricsHistory,
    todayMetrics,
    isLoading,
    getLatestValue,
    calculateTrend,
    logMetrics,
    weightChartData,
    latestWeight: getLatestValue('weight'),
    latestWaist: getLatestValue('waist_circumference'),
    latestHeartRate: getLatestValue('resting_heart_rate'),
    weightTrend: calculateTrend('weight', 30),
  };
};
