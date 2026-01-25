import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

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

export interface DashboardLayout {
  primary_metrics: MetricConfig[];
  widgets: WidgetConfig[];
  ai_message: string;
  focus_areas: string[];
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
  ai_message: 'Benvenuto! Parla con me per personalizzare la dashboard.',
  focus_areas: [],
};

export function useAIDashboard() {
  const { user, session } = useAuth();
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
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
      
      // Validate and use data
      if (data.primary_metrics && Array.isArray(data.primary_metrics)) {
        setLayout({
          primary_metrics: data.primary_metrics,
          widgets: data.widgets || DEFAULT_LAYOUT.widgets,
          ai_message: data.ai_message || DEFAULT_LAYOUT.ai_message,
          focus_areas: data.focus_areas || [],
        });
      }
    } catch (err) {
      console.error('useAIDashboard error:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  }, [user, session]);

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
