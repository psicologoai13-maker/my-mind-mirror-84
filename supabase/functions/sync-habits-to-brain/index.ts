import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapping from habit types to brain metrics
const HABITS_TO_BRAIN_METRICS: Record<string, { 
  type: 'vitals' | 'psychology' | 'behavior' | 'health';
  metric: string;
  transform?: (value: number, target: number) => number; // Transform to 1-10 scale
}> = {
  // Health vitals
  sleep: { 
    type: 'vitals', 
    metric: 'sleep_quality',
    transform: (value, target) => Math.min(10, (value / target) * 10)
  },
  water: { 
    type: 'health', 
    metric: 'hydration',
    transform: (value, target) => Math.min(10, (value / target) * 10)
  },
  weight: { 
    type: 'health', 
    metric: 'body_weight',
    transform: (value) => value // Raw value for tracking
  },
  heart_rate: { 
    type: 'health', 
    metric: 'resting_heart_rate',
    transform: (value) => value // Raw value
  },
  
  // Fitness/Activity
  steps: { 
    type: 'health', 
    metric: 'physical_activity',
    transform: (value, target) => Math.min(10, (value / target) * 10)
  },
  exercise: { 
    type: 'health', 
    metric: 'physical_activity',
    transform: (value, target) => Math.min(10, (value / target) * 10)
  },
  cardio: { 
    type: 'health', 
    metric: 'physical_activity',
    transform: (value, target) => Math.min(10, (value / target) * 10)
  },
  yoga: { 
    type: 'psychology', 
    metric: 'mindfulness_practice',
    transform: (value, target) => Math.min(10, (value / target) * 10)
  },
  
  // Mental health
  meditation: { 
    type: 'psychology', 
    metric: 'mindfulness_practice',
    transform: (value, target) => Math.min(10, (value / target) * 10)
  },
  journaling: { 
    type: 'psychology', 
    metric: 'emotional_expression',
    transform: (value) => value > 0 ? 8 : 0
  },
  gratitude: { 
    type: 'psychology', 
    metric: 'gratitude',
    transform: (value, target) => Math.min(10, (value / target) * 10)
  },
  affirmations: { 
    type: 'psychology', 
    metric: 'self_efficacy',
    transform: (value) => value > 0 ? 7 : 0
  },
  breathing: { 
    type: 'psychology', 
    metric: 'stress_relief',
    transform: (value, target) => Math.min(10, (value / target) * 10)
  },
  
  // Bad habits (inverted - 0 is good)
  cigarettes: { 
    type: 'behavior', 
    metric: 'smoking_status',
    transform: (value) => value === 0 ? 10 : Math.max(1, 10 - value)
  },
  alcohol: { 
    type: 'behavior', 
    metric: 'alcohol_status',
    transform: (value) => value === 0 ? 10 : Math.max(1, 10 - value * 2)
  },
  caffeine: { 
    type: 'behavior', 
    metric: 'caffeine_intake',
    transform: (value, target) => value <= target ? 8 : Math.max(3, 10 - value)
  },
  social_media: { 
    type: 'behavior', 
    metric: 'screen_time',
    transform: (value, target) => value <= target ? 8 : Math.max(3, 10 - (value / 60))
  },
  
  // Social
  social_interaction: { 
    type: 'psychology', 
    metric: 'social_connection',
    transform: (value) => value > 0 ? 8 : 2
  },
  call_loved_one: { 
    type: 'psychology', 
    metric: 'social_connection',
    transform: (value) => value > 0 ? 7 : 0
  },
  quality_time: { 
    type: 'psychology', 
    metric: 'relationship_quality',
    transform: (value) => value > 0 ? 8 : 0
  },
  kindness: { 
    type: 'psychology', 
    metric: 'prosocial_behavior',
    transform: (value) => value > 0 ? 7 : 0
  },
  
  // Self-care
  sunlight: { 
    type: 'psychology', 
    metric: 'sunlight_exposure',
    transform: (value) => value > 0 ? 8 : 2
  },
  nature: { 
    type: 'psychology', 
    metric: 'nature_exposure',
    transform: (value) => value > 0 ? 8 : 2
  },
  hobby: { 
    type: 'psychology', 
    metric: 'creative_expression',
    transform: (value, target) => Math.min(10, (value / target) * 10)
  },
  creative_time: { 
    type: 'psychology', 
    metric: 'creative_expression',
    transform: (value, target) => Math.min(10, (value / target) * 10)
  },
};

interface HabitData {
  habit_type: string;
  value: number;
  target_value: number | null;
  unit: string | null;
}

interface BrainMetrics {
  vitals: Record<string, number>;
  psychology: Record<string, number>;
  behavior: Record<string, number>;
  health: Record<string, number>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, date } = await req.json() as {
      user_id: string;
      date?: string;
    };

    if (!user_id) {
      throw new Error('Missing user_id');
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    console.log('[sync-habits-to-brain] Processing habits for user:', user_id, 'date:', targetDate);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch today's habits with their configs
    const { data: habits, error: habitsError } = await supabase
      .from('daily_habits')
      .select('habit_type, value, target_value, unit')
      .eq('user_id', user_id)
      .eq('date', targetDate);

    if (habitsError) {
      console.error('[sync-habits-to-brain] Error fetching habits:', habitsError);
      throw habitsError;
    }

    // Fetch habit configs for default targets
    const { data: configs } = await supabase
      .from('user_habits_config')
      .select('habit_type, daily_target, unit')
      .eq('user_id', user_id)
      .eq('is_active', true);

    const configMap = new Map(configs?.map(c => [c.habit_type, c]) || []);

    // Fetch body metrics for the day
    const { data: bodyMetrics } = await supabase
      .from('body_metrics')
      .select('weight, sleep_hours, resting_heart_rate')
      .eq('user_id', user_id)
      .eq('date', targetDate)
      .maybeSingle();

    // Transform habits to brain metrics
    const brainMetrics: BrainMetrics = {
      vitals: {},
      psychology: {},
      behavior: {},
      health: {},
    };

    // Process habits
    for (const habit of (habits || [])) {
      const mapping = HABITS_TO_BRAIN_METRICS[habit.habit_type];
      if (!mapping) continue;

      const config = configMap.get(habit.habit_type);
      const target = habit.target_value || config?.daily_target || 1;
      
      const transformedValue = mapping.transform 
        ? mapping.transform(habit.value, target)
        : habit.value;

      brainMetrics[mapping.type][mapping.metric] = transformedValue;
    }

    // Add body metrics if available
    if (bodyMetrics) {
      if (bodyMetrics.weight) {
        brainMetrics.health['body_weight'] = bodyMetrics.weight;
      }
      if (bodyMetrics.sleep_hours) {
        brainMetrics.vitals['sleep_quality'] = Math.min(10, (bodyMetrics.sleep_hours / 8) * 10);
      }
      if (bodyMetrics.resting_heart_rate) {
        brainMetrics.health['resting_heart_rate'] = bodyMetrics.resting_heart_rate;
      }
    }

    // Calculate aggregate scores for AI context
    const aggregateScores = {
      physical_health_score: calculateAggregateScore([
        brainMetrics.health['physical_activity'],
        brainMetrics.health['hydration'],
        brainMetrics.vitals['sleep_quality'],
      ]),
      mental_wellness_score: calculateAggregateScore([
        brainMetrics.psychology['mindfulness_practice'],
        brainMetrics.psychology['emotional_expression'],
        brainMetrics.psychology['gratitude'],
        brainMetrics.psychology['self_efficacy'],
      ]),
      social_connection_score: calculateAggregateScore([
        brainMetrics.psychology['social_connection'],
        brainMetrics.psychology['relationship_quality'],
        brainMetrics.psychology['prosocial_behavior'],
      ]),
      bad_habits_control_score: calculateAggregateScore([
        brainMetrics.behavior['smoking_status'],
        brainMetrics.behavior['alcohol_status'],
        brainMetrics.behavior['screen_time'],
      ]),
    };

    // Build context summary for AI
    const habitsSummary = buildHabitsSummary(habits || [], configMap);

    // Update user profile with habits context for AI access
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        last_data_change_at: new Date().toISOString(),
      })
      .eq('user_id', user_id);

    if (updateError) {
      console.error('[sync-habits-to-brain] Error updating profile:', updateError);
    }

    console.log('[sync-habits-to-brain] Processed metrics:', {
      habitsCount: habits?.length || 0,
      brainMetrics,
      aggregateScores,
    });

    return new Response(
      JSON.stringify({
        success: true,
        date: targetDate,
        habits_processed: habits?.length || 0,
        brain_metrics: brainMetrics,
        aggregate_scores: aggregateScores,
        summary: habitsSummary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[sync-habits-to-brain] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateAggregateScore(values: (number | undefined)[]): number | null {
  const validValues = values.filter((v): v is number => v !== undefined && v !== null);
  if (validValues.length === 0) return null;
  return Math.round((validValues.reduce((a, b) => a + b, 0) / validValues.length) * 10) / 10;
}

function buildHabitsSummary(
  habits: HabitData[], 
  configMap: Map<string, { daily_target: number | null }>
): string {
  if (habits.length === 0) return 'Nessuna habit registrata oggi.';

  const completed: string[] = [];
  const inProgress: string[] = [];
  const abstainSuccess: string[] = [];

  for (const habit of habits) {
    const config = configMap.get(habit.habit_type);
    const target = habit.target_value || config?.daily_target || 1;
    const mapping = HABITS_TO_BRAIN_METRICS[habit.habit_type];

    if (habit.value === 0 && mapping?.type === 'behavior') {
      abstainSuccess.push(habit.habit_type);
    } else if (habit.value >= target) {
      completed.push(habit.habit_type);
    } else if (habit.value > 0) {
      inProgress.push(habit.habit_type);
    }
  }

  const parts: string[] = [];
  if (completed.length > 0) {
    parts.push(`Completate: ${completed.join(', ')}`);
  }
  if (abstainSuccess.length > 0) {
    parts.push(`Astinenza OK: ${abstainSuccess.join(', ')}`);
  }
  if (inProgress.length > 0) {
    parts.push(`In corso: ${inProgress.join(', ')}`);
  }

  return parts.join('. ') || 'Nessuna habit completata oggi.';
}
