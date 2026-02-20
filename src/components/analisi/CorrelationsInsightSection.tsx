import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, TrendingDown, Lightbulb, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const CorrelationsInsightSection: React.FC = () => {
  const { user } = useAuth();

  const { data: correlations } = useQuery({
    queryKey: ['user-correlations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_correlations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_significant', true)
        .order('strength', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: patterns } = useQuery({
    queryKey: ['emotion-patterns', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('emotion_patterns')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('confidence', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const hasData = (correlations && correlations.length > 0) || (patterns && patterns.length > 0);
  if (!hasData) return null;

  const getStrengthColor = (strength: number) => {
    const abs = Math.abs(strength);
    if (abs >= 0.7) return 'text-emerald-500';
    if (abs >= 0.4) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const getStrengthLabel = (strength: number) => {
    const abs = Math.abs(strength);
    if (abs >= 0.7) return 'Forte';
    if (abs >= 0.4) return 'Moderata';
    return 'Debole';
  };

  return (
    <section>
      <div className="flex items-center gap-2 px-1 mb-3">
        <span className="text-xl">🔬</span>
        <div>
          <h3 className="font-display font-semibold text-base text-foreground">
            Insight Personali
          </h3>
          <p className="text-xs text-muted-foreground">
            Correlazioni e pattern dai tuoi dati
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Correlations */}
        {correlations && correlations.length > 0 && (
          <div className="space-y-2">
            {correlations.map((c) => (
              <Card key={c.id} className="rounded-2xl border-border/50 bg-card">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${c.strength > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {c.strength > 0 ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-relaxed">
                        {c.insight_text || `${c.metric_a} ↔ ${c.metric_b}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs font-medium ${getStrengthColor(c.strength)}`}>
                          {getStrengthLabel(c.strength)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · {c.sample_size} giorni analizzati
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Patterns */}
        {patterns && patterns.length > 0 && (
          <div className="space-y-2">
            {patterns.map((p) => (
              <Card key={p.id} className="rounded-2xl border-border/50 bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-violet-500 mt-0.5">
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-relaxed">
                        {p.description}
                      </p>
                      {p.recommendations && p.recommendations.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {p.recommendations.slice(0, 2).map((rec, i) => (
                            <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <Activity className="w-3 h-3 mt-0.5 shrink-0 text-violet-400" />
                              {rec}
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-medium text-violet-500">
                          Confidence: {Math.round(p.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CorrelationsInsightSection;
