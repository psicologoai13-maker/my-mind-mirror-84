import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Lightbulb, TrendingDown, TrendingUp, AlertTriangle, Sparkles, Target, Heart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Insight {
  type: 'correlation' | 'alert' | 'positive' | 'suggestion' | 'goal';
  title: string;
  message: string;
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
  const { profile } = useProfile();
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
          } else if (response.status === 402) {
            setError('Crediti AI esauriti');
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
          return;
        }

        const data = await response.json();
        setInsights(data.insights || []);
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
          <span className="text-sm">AI sta analizzando...</span>
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
