import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

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

export function useAIAnalysis(timeRange: string) {
  const { user, session } = useAuth();
  const [layout, setLayout] = useState<AnalysisLayout>(DEFAULT_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLayout = useCallback(async () => {
    if (!user || !session?.access_token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

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
          return;
        }
        if (response.status === 402) {
          setError('Crediti AI esauriti');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.sections && Array.isArray(data.sections)) {
        setLayout({
          sections: data.sections,
          highlighted_metrics: data.highlighted_metrics || [],
          ai_summary: data.ai_summary || DEFAULT_LAYOUT.ai_summary,
          focus_insight: data.focus_insight || '',
          recommended_deep_dive: data.recommended_deep_dive || [],
        });
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
    refetch: fetchLayout,
  };
}
