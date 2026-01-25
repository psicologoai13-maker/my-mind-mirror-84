import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface MetricConfig {
  key: string;
  label: string;
  category: 'vitali' | 'emozioni' | 'aree' | 'psicologia';
  icon: string;
  priority: number;
  reason: string;
  showChart: boolean;
  showInSummary: boolean;
}

export interface SectionConfig {
  id: string;
  title: string;
  description: string;
  priority: number;
  visible: boolean;
  metrics: string[];
  chartType: 'grid' | 'bar' | 'radar' | 'line' | 'mix';
}

export interface AnalysisLayout {
  sections: SectionConfig[];
  highlighted_metrics: MetricConfig[];
  ai_summary: string;
  focus_insight: string;
  recommended_deep_dive: string[];
}

const DEFAULT_LAYOUT: AnalysisLayout = {
  sections: [
    { id: 'wellness_hero', title: 'Wellness Score', description: 'Il tuo punteggio complessivo', priority: 1, visible: true, metrics: [], chartType: 'grid' },
    { id: 'vitals_grid', title: 'Parametri Vitali', description: 'I tuoi indicatori principali', priority: 2, visible: true, metrics: ['mood', 'anxiety', 'energy', 'sleep'], chartType: 'grid' },
    { id: 'emotional_mix', title: 'Mix Emotivo', description: 'Distribuzione delle emozioni', priority: 3, visible: true, metrics: ['joy', 'sadness', 'anger', 'fear', 'apathy'], chartType: 'bar' },
    { id: 'life_areas', title: 'Aree della Vita', description: 'Bilancio vita personale', priority: 4, visible: true, metrics: ['love', 'work', 'health', 'social', 'growth'], chartType: 'radar' },
  ],
  highlighted_metrics: [],
  ai_summary: 'Caricamento analisi...',
  focus_insight: '',
  recommended_deep_dive: [],
};

interface CacheData {
  layout: AnalysisLayout;
  timeRange: string;
}

export function useAIAnalysis(timeRange: string) {
  const { user, session } = useAuth();
  const [layout, setLayout] = useState<AnalysisLayout>(DEFAULT_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLayout = useCallback(async (forceRefresh = false) => {
    if (!user || !session?.access_token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // First check if we have cached data and if it's still valid
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('ai_analysis_cache, ai_cache_updated_at, last_data_change_at')
        .eq('user_id', user.id)
        .single();

      const cacheUpdatedAt = profile?.ai_cache_updated_at ? new Date(profile.ai_cache_updated_at as string) : null;
      const lastDataChange = profile?.last_data_change_at ? new Date(profile.last_data_change_at as string) : null;
      const cachedData = profile?.ai_analysis_cache as unknown as CacheData | null;

      // Use cache if: has cache, not forcing refresh, same timeRange, and no new data since last cache
      const shouldUseCache = !forceRefresh && 
        cachedData?.layout && 
        cachedData?.timeRange === timeRange &&
        cacheUpdatedAt && 
        lastDataChange &&
        cacheUpdatedAt >= lastDataChange;

      if (shouldUseCache && cachedData?.layout) {
        console.log('[useAIAnalysis] Using cached layout');
        setLayout(cachedData.layout);
        setIsLoading(false);
        return;
      }

      console.log('[useAIAnalysis] Fetching fresh AI layout');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analysis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ timeRange }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          setError('Limite richieste raggiunto');
          if (cachedData?.layout) setLayout(cachedData.layout);
          return;
        }
        if (response.status === 402) {
          setError('Crediti AI esauriti');
          if (cachedData?.layout) setLayout(cachedData.layout);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.sections && Array.isArray(data.sections)) {
        const newLayout: AnalysisLayout = {
          sections: data.sections,
          highlighted_metrics: data.highlighted_metrics || [],
          ai_summary: data.ai_summary || DEFAULT_LAYOUT.ai_summary,
          focus_insight: data.focus_insight || '',
          recommended_deep_dive: data.recommended_deep_dive || [],
        };
        
        setLayout(newLayout);

        // Save to cache with timeRange
        const cachePayload: CacheData = { layout: newLayout, timeRange };
        await supabase
          .from('user_profiles')
          .update({
            ai_analysis_cache: cachePayload as unknown as null,
            ai_cache_updated_at: new Date().toISOString(),
          } as Record<string, unknown>)
          .eq('user_id', user.id);
      }
    } catch (err) {
      console.error('useAIAnalysis error:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  }, [user, session, timeRange]);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  return {
    layout,
    isLoading,
    error,
    refetch: () => fetchLayout(true),
  };
}
