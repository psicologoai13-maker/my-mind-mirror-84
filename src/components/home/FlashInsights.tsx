import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Lightbulb, TrendingDown, AlertTriangle, Sparkles, Target, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Insight {
  type: 'correlation' | 'alert' | 'positive' | 'suggestion' | 'goal';
  title: string;
  message: string;
}

interface CacheData {
  insights: Insight[];
}

const iconMap = {
  positive: <Sparkles className="w-4 h-4" />,
  alert: <AlertTriangle className="w-4 h-4" />,
  suggestion: <Lightbulb className="w-4 h-4" />,
  correlation: <TrendingDown className="w-4 h-4" />,
  goal: <Target className="w-4 h-4" />,
};

const colorMap = {
  positive: { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  alert: { text: 'text-orange-600', bg: 'bg-orange-50' },
  suggestion: { text: 'text-blue-600', bg: 'bg-blue-50' },
  correlation: { text: 'text-violet-600', bg: 'bg-violet-50' },
  goal: { text: 'text-teal-600', bg: 'bg-teal-50' },
};

const FlashInsights: React.FC = () => {
  const { user, session } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      if (!user || !session?.access_token) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Check cache first
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('ai_insights_cache, ai_cache_updated_at, last_data_change_at')
          .eq('user_id', user.id)
          .single();

        const cacheUpdatedAt = profile?.ai_cache_updated_at ? new Date(profile.ai_cache_updated_at as string) : null;
        const lastDataChange = profile?.last_data_change_at ? new Date(profile.last_data_change_at as string) : null;
        const cachedData = profile?.ai_insights_cache as unknown as CacheData | null;

        // Use cache if valid
        const shouldUseCache = cachedData?.insights && 
          cacheUpdatedAt && 
          lastDataChange && 
          cacheUpdatedAt >= lastDataChange;

        if (shouldUseCache && cachedData?.insights) {
          console.log('[FlashInsights] Using cached insights');
          setInsights(cachedData.insights);
          setIsLoading(false);
          return;
        }

        console.log('[FlashInsights] Fetching fresh AI insights');

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-insights`,
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
            if (cachedData?.insights) setInsights(cachedData.insights);
          } else if (response.status === 402) {
            setError('Crediti AI esauriti');
            if (cachedData?.insights) setInsights(cachedData.insights);
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
          return;
        }

        const data = await response.json();
        const newInsights = data.insights || [];
        setInsights(newInsights);

        // Save to cache
        const cachePayload: CacheData = { insights: newInsights };
        await supabase
          .from('user_profiles')
          .update({
            ai_insights_cache: cachePayload as unknown as null,
            ai_cache_updated_at: new Date().toISOString(),
          } as Record<string, unknown>)
          .eq('user_id', user.id);

      } catch (err) {
        console.error('[FlashInsights] Error:', err);
        setError('Errore nel caricamento');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, [user, session?.access_token]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          Flash Insights
        </h3>
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Caricamento...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          Flash Insights
        </h3>
        <div className="p-3 rounded-xl bg-muted/50 text-center">
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // No insights
  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        Flash Insights
        <span className="text-xs font-normal text-primary/60 ml-auto">✨ AI</span>
      </h3>
      
      <div className="space-y-2">
        {insights.map((insight, index) => {
          const colors = colorMap[insight.type] || colorMap.suggestion;
          const icon = iconMap[insight.type] || iconMap.suggestion;
          
          return (
            <div
              key={index}
              className={cn(
                "p-3 rounded-xl border transition-all duration-200 animate-slide-up",
                colors.bg,
                "border-transparent"
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-2">
                <div className={cn("mt-0.5", colors.text)}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={cn("text-sm font-medium", colors.text)}>
                    {insight.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                    {insight.message}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FlashInsights;
