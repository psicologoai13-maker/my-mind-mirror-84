import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface MetricConfig {
  key: string;
  value: number;
  label?: string;
  icon?: string;
  priority: number;
  reason: string;
}

export interface WidgetConfig {
  type: 'vitals_grid' | 'radar_chart' | 'emotional_mix' | 'goals_progress' | 'weekly_trend' | 'life_areas' | 'custom_metric';
  title: string;
  description: string;
  priority: number;
  metrics?: MetricConfig[];
  visible: boolean;
}

export interface GoalEvaluation {
  goal_id: string;
  progress: number;
  status: 'in_progress' | 'achieved' | 'struggling';
  ai_feedback: string;
}

export interface DashboardLayout {
  primary_metrics: MetricConfig[];
  widgets: WidgetConfig[];
  ai_message: string;
  focus_areas: string[];
  wellness_score: number | null; // null for new users without data
  wellness_message: string;
  goals_evaluation?: GoalEvaluation[];
}

const DEFAULT_LAYOUT: DashboardLayout = {
  primary_metrics: [
    { key: 'mood', value: 0, priority: 1, reason: 'Metrica fondamentale' },
    { key: 'anxiety', value: 0, priority: 2, reason: 'Monitora lo stress' },
    { key: 'energy', value: 0, priority: 3, reason: 'Livello energetico' },
    { key: 'sleep', value: 0, priority: 4, reason: 'Qualità del riposo' },
  ],
  widgets: [
    { type: 'vitals_grid', title: 'I Tuoi Focus', description: '', priority: 1, visible: true },
    { type: 'goals_progress', title: 'Obiettivi', description: '', priority: 2, visible: true },
    { type: 'radar_chart', title: 'Aree della Vita', description: '', priority: 3, visible: true },
  ],
  ai_message: '',
  focus_areas: [],
  wellness_score: null, // null for new users - score activates after check-in or talking with Aria
  wellness_message: 'Iniziamo questo percorso insieme: ogni piccolo passo conta per il tuo benessere.',
  goals_evaluation: [],
};

// Store layout globally to persist across remounts
let globalCachedLayout: DashboardLayout | null = null;
let globalLastFetchTime: number = 0;

// Helper: Get 6:00 AM Rome time for today
function getTodayResetTime(): Date {
  const now = new Date();
  // Create date in Rome timezone
  const romeTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  const today6AM = new Date(romeTime);
  today6AM.setHours(6, 0, 0, 0);
  
  // If it's before 6 AM Rome time, the reset was yesterday
  if (romeTime < today6AM) {
    today6AM.setDate(today6AM.getDate() - 1);
  }
  
  return today6AM;
}

// Helper: Check if layout needs refresh (daily at 6:00 AM Rome)
function shouldRefreshLayout(cacheUpdatedAt: Date | null): boolean {
  if (!cacheUpdatedAt) return true;
  
  const todayReset = getTodayResetTime();
  // Refresh if cache was updated BEFORE today's 6 AM reset
  return cacheUpdatedAt < todayReset;
}

export function useAIDashboard() {
  const { user, session } = useAuth();
  const [layout, setLayout] = useState<DashboardLayout>(globalCachedLayout || DEFAULT_LAYOUT);
  const [isLoading, setIsLoading] = useState(!globalCachedLayout); // No loading if we have global cache
  const [error, setError] = useState<string | null>(null);
  const [isRefreshingInBackground, setIsRefreshingInBackground] = useState(false);
  const fetchedRef = useRef(false);

  const fetchLayout = useCallback(async (forceRefresh = false) => {
    if (!user || !session?.access_token) {
      setIsLoading(false);
      return;
    }

    // Prevent duplicate fetches on same mount
    if (!forceRefresh && fetchedRef.current) {
      return;
    }
    fetchedRef.current = true;

    try {
      // First, immediately show cached data from DB (don't show loading if we have global cache)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('ai_dashboard_cache, ai_cache_updated_at, last_data_change_at')
        .eq('user_id', user.id)
        .single();

      const cacheUpdatedAt = profile?.ai_cache_updated_at ? new Date(profile.ai_cache_updated_at as string) : null;
      const cachedLayout = profile?.ai_dashboard_cache as unknown as DashboardLayout | null;

      // Check if we have sessions (user has talked with Aria)
      const { count: sessionsCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');

      const hasCompletedSessions = (sessionsCount ?? 0) > 0;

      // IMMEDIATELY show cached data if available (no loading state)
      if (cachedLayout && cachedLayout.primary_metrics?.length > 0) {
        setLayout(cachedLayout);
        globalCachedLayout = cachedLayout;
        setIsLoading(false); // Stop loading immediately
        
        // 🎯 CRITICAL FIX: Force refresh if wellness_score is null BUT user has completed sessions
        const needsScoreRefresh = cachedLayout.wellness_score === null && hasCompletedSessions;
        
        // 🎯 CRITICAL FIX: Force refresh if fewer than 4 focus metrics (incomplete cache)
        const needsMetricsRefresh = cachedLayout.primary_metrics.length < 4;
        
        // 🎯 DAILY REFRESH LOGIC: Only refresh layout once per day at 6:00 AM Rome
        const needsLayoutRefresh = shouldRefreshLayout(cacheUpdatedAt);
        
        if (!forceRefresh && !needsLayoutRefresh && !needsScoreRefresh && !needsMetricsRefresh) {
          console.log('[useAIDashboard] Layout is fresh (updated after today 6AM), no refresh needed');
          return;
        }

        // Refresh in background (don't show loading)
        if (!forceRefresh) {
          console.log('[useAIDashboard] Refresh needed:', { needsLayoutRefresh, needsScoreRefresh, needsMetricsRefresh });
          setIsRefreshingInBackground(true);
        }
      } else {
        // No cache - need to show loading
        setIsLoading(true);
      }

      // Skip if recently fetched (within 30 seconds) and not forcing AND no refresh needed
      const needsScoreRefreshCheck = cachedLayout?.wellness_score === null && hasCompletedSessions;
      const needsMetricsRefreshCheck = (cachedLayout?.primary_metrics?.length ?? 0) < 4;
      if (!forceRefresh && !needsScoreRefreshCheck && !needsMetricsRefreshCheck && Date.now() - globalLastFetchTime < 30000 && globalCachedLayout) {
        console.log('[useAIDashboard] Skipping fetch - recently updated');
        setIsLoading(false);
        setIsRefreshingInBackground(false);
        return;
      }

      console.log('[useAIDashboard] Fetching fresh AI layout (daily refresh)');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-dashboard`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        if (response.status === 429 || response.status === 402) {
          // Keep showing cached layout
          if (cachedLayout) setLayout(cachedLayout);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      globalLastFetchTime = Date.now();
      
      if (data.primary_metrics && Array.isArray(data.primary_metrics)) {
        const newLayout: DashboardLayout = {
          primary_metrics: data.primary_metrics,
          widgets: data.widgets || DEFAULT_LAYOUT.widgets,
          ai_message: data.ai_message || DEFAULT_LAYOUT.ai_message,
          focus_areas: data.focus_areas || [],
          wellness_score: data.wellness_score !== undefined ? data.wellness_score : null, // Keep null if no real data
          wellness_message: data.wellness_message || DEFAULT_LAYOUT.wellness_message,
          goals_evaluation: data.goals_evaluation || [],
        };
        
        setLayout(newLayout);
        globalCachedLayout = newLayout;

        // Save to cache with new timestamp
        await supabase
          .from('user_profiles')
          .update({
            ai_dashboard_cache: newLayout as unknown as null,
            ai_cache_updated_at: new Date().toISOString(),
          } as Record<string, unknown>)
          .eq('user_id', user.id);
      }
    } catch (err) {
      console.error('useAIDashboard error:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
      setIsRefreshingInBackground(false);
    }
  }, [user, session]);

  useEffect(() => {
    fetchedRef.current = false; // Reset on user/session change
    fetchLayout();
  }, [fetchLayout]);

  return {
    layout,
    isLoading,
    isRefreshingInBackground,
    error,
    refetch: () => fetchLayout(true),
  };
}
