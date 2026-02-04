import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { subDays, format } from 'date-fns';
import {
  EmotionKey,
  ALL_EMOTION_KEYS,
  filterActiveEmotions,
  sortEmotionsByValue,
  calculateEmotionPercentages,
  groupEmotionsByCategory,
} from '@/lib/emotionConfig';

interface DailyEmotionRow {
  date: string;
  joy: number | null;
  sadness: number | null;
  anger: number | null;
  fear: number | null;
  apathy: number | null;
  shame: number | null;
  jealousy: number | null;
  hope: number | null;
  frustration: number | null;
  nostalgia: number | null;
  nervousness: number | null;
  overwhelm: number | null;
  excitement: number | null;
  disappointment: number | null;
}

interface EmotionDataPoint {
  key: EmotionKey;
  value: number;
  percentage?: number;
}

interface UseEmotionsDataOptions {
  days?: number;
  halfLife?: number; // For time-weighted averaging
}

/**
 * Unified hook for fetching and processing emotions data
 * Supports all 14 emotions tracked in the database
 */
export const useEmotionsData = (options: UseEmotionsDataOptions = {}) => {
  const { days = 30, halfLife = 10 } = options;
  const { user } = useAuth();

  // Fetch raw emotions data from database
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ['emotions-data', user?.id, days],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const startDate = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('daily_emotions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return (data || []) as DailyEmotionRow[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate time-weighted averages for all emotions
  const timeWeightedEmotions = useMemo(() => {
    if (!rawData || rawData.length === 0) {
      return ALL_EMOTION_KEYS.reduce((acc, key) => {
        acc[key] = null;
        return acc;
      }, {} as Record<EmotionKey, number | null>);
    }

    const today = new Date();
    const weightedSums: Record<EmotionKey, number> = {} as Record<EmotionKey, number>;
    const totalWeights: Record<EmotionKey, number> = {} as Record<EmotionKey, number>;

    ALL_EMOTION_KEYS.forEach(key => {
      weightedSums[key] = 0;
      totalWeights[key] = 0;
    });

    rawData.forEach(row => {
      const rowDate = new Date(row.date);
      const daysAgo = Math.floor((today.getTime() - rowDate.getTime()) / (1000 * 60 * 60 * 24));
      const weight = Math.exp(-daysAgo / halfLife); // Exponential decay

      ALL_EMOTION_KEYS.forEach(key => {
        const value = row[key];
        if (value !== null && value !== undefined && value > 0) {
          weightedSums[key] += value * weight;
          totalWeights[key] += weight;
        }
      });
    });

    const result: Record<EmotionKey, number | null> = {} as Record<EmotionKey, number | null>;
    ALL_EMOTION_KEYS.forEach(key => {
      result[key] = totalWeights[key] > 0 
        ? weightedSums[key] / totalWeights[key] 
        : null;
    });

    return result;
  }, [rawData, halfLife]);

  // Get active emotions (value > 0) sorted by value
  const activeEmotions = useMemo(() => {
    const filtered = filterActiveEmotions(timeWeightedEmotions);
    return sortEmotionsByValue(filtered);
  }, [timeWeightedEmotions]);

  // Get emotions with percentages for pie/bar charts
  const emotionsWithPercentages = useMemo(() => {
    return calculateEmotionPercentages(activeEmotions);
  }, [activeEmotions]);

  // Get emotions grouped by category
  const groupedEmotions = useMemo(() => {
    return groupEmotionsByCategory(activeEmotions);
  }, [activeEmotions]);

  // Get most recent day's emotions (not time-weighted)
  const latestDayEmotions = useMemo(() => {
    if (!rawData || rawData.length === 0) return null;
    
    const latest = rawData[0];
    const result: Record<EmotionKey, number> = {} as Record<EmotionKey, number>;
    
    ALL_EMOTION_KEYS.forEach(key => {
      result[key] = latest[key] ?? 0;
    });
    
    return result;
  }, [rawData]);

  // Get daily data for charts (last N days)
  const dailyData = useMemo(() => {
    if (!rawData) return [];
    
    return rawData.map(row => {
      const emotions: Record<EmotionKey, number> = {} as Record<EmotionKey, number>;
      ALL_EMOTION_KEYS.forEach(key => {
        emotions[key] = row[key] ?? 0;
      });
      
      return {
        date: row.date,
        ...emotions,
      };
    }).reverse(); // Chronological order
  }, [rawData]);

  // Check if we have any data
  const hasData = activeEmotions.length > 0;
  
  // Get dominant emotion
  const dominantEmotion = activeEmotions.length > 0 ? activeEmotions[0] : null;

  return {
    // Raw data
    rawData,
    dailyData,
    
    // Processed data
    timeWeightedEmotions,
    activeEmotions,
    emotionsWithPercentages,
    groupedEmotions,
    latestDayEmotions,
    dominantEmotion,
    
    // State
    isLoading,
    error,
    hasData,
  };
};

// Specialized hook for specific date range (used by EmotionalWeather)
export const useEmotionsRange = (startDate: Date, endDate: Date) => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['emotions-range', user?.id, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('daily_emotions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true });
      
      if (error) throw error;
      return (data || []) as DailyEmotionRow[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const dailyData = useMemo(() => {
    if (!data) return [];
    
    return data.map(row => {
      const emotions: Partial<Record<EmotionKey, number>> = {};
      ALL_EMOTION_KEYS.forEach(key => {
        const value = row[key];
        if (value !== null && value !== undefined && value > 0) {
          emotions[key] = value;
        }
      });
      
      return {
        date: row.date,
        ...emotions,
      };
    });
  }, [data]);

  const hasData = dailyData.some(d => 
    ALL_EMOTION_KEYS.some(key => (d as any)[key] > 0)
  );

  return {
    dailyData,
    isLoading,
    hasData,
  };
};
