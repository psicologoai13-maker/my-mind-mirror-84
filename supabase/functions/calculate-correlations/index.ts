import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Correlation pairs to calculate
const CORRELATION_PAIRS = [
  { metric_a: 'sleep', metric_b: 'mood', type: 'vital_vital' },
  { metric_a: 'sleep', metric_b: 'anxiety', type: 'vital_vital' },
  { metric_a: 'sleep', metric_b: 'energy', type: 'vital_vital' },
  { metric_a: 'energy', metric_b: 'mood', type: 'vital_vital' },
  { metric_a: 'exercise', metric_b: 'anxiety', type: 'habit_vital' },
  { metric_a: 'exercise', metric_b: 'mood', type: 'habit_vital' },
  { metric_a: 'meditation', metric_b: 'anxiety', type: 'habit_vital' },
  { metric_a: 'meditation', metric_b: 'mental_clarity', type: 'habit_psychology' },
  { metric_a: 'water', metric_b: 'energy', type: 'habit_vital' },
  { metric_a: 'social', metric_b: 'loneliness_perceived', type: 'area_psychology' },
  { metric_a: 'work', metric_b: 'burnout_level', type: 'area_psychology' },
  { metric_a: 'sunlight_exposure', metric_b: 'mood', type: 'psychology_vital' },
  // HealthKit correlations
  { metric_a: 'hk_sleep_hours', metric_b: 'mood', type: 'hk_vital' },
  { metric_a: 'hk_steps', metric_b: 'mood', type: 'hk_vital' },
  { metric_a: 'hk_hrv_avg', metric_b: 'somatic_tension', type: 'hk_psychology' },
  { metric_a: 'hk_heart_rate_avg', metric_b: 'rumination', type: 'hk_psychology' },
];

// Pearson correlation coefficient calculation
function pearsonCorrelation(x: number[], y: number[]): { r: number; n: number } {
  const n = Math.min(x.length, y.length);
  if (n < 5) return { r: 0, n: 0 };
  
  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);
  
  const meanX = xSlice.reduce((a, b) => a + b, 0) / n;
  const meanY = ySlice.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  
  for (let i = 0; i < n; i++) {
    const diffX = xSlice[i] - meanX;
    const diffY = ySlice[i] - meanY;
    numerator += diffX * diffY;
    denomX += diffX * diffX;
    denomY += diffY * diffY;
  }
  
  const denominator = Math.sqrt(denomX * denomY);
  if (denominator === 0) return { r: 0, n };
  
  return { r: numerator / denominator, n };
}

// Generate insight text based on correlation
function generateInsight(metricA: string, metricB: string, r: number): string {
  const labels: Record<string, string> = {
    sleep: 'sonno',
    mood: 'umore',
    anxiety: 'ansia',
    energy: 'energia',
    exercise: 'esercizio fisico',
    meditation: 'meditazione',
    water: 'idratazione',
    social: 'socialità',
    loneliness_perceived: 'solitudine',
    work: 'lavoro',
    burnout_level: 'burnout',
    mental_clarity: 'chiarezza mentale',
    sunlight_exposure: 'esposizione al sole',
    hk_sleep_hours: 'sonno (HealthKit)',
    hk_steps: 'passi (HealthKit)',
    hk_hrv_avg: 'HRV (HealthKit)',
    hk_heart_rate_avg: 'frequenza cardiaca (HealthKit)',
    somatic_tension: 'tensione somatica',
    rumination: 'ruminazione',
  };
  
  const labelA = labels[metricA] || metricA;
  const labelB = labels[metricB] || metricB;
  
  const absR = Math.abs(r);
  const direction = r > 0 ? 'positiva' : 'negativa';
  
  if (absR >= 0.7) {
    return `Forte correlazione ${direction} tra ${labelA} e ${labelB}. Quando ${labelA} migliora, ${r > 0 ? 'migliora' : 'peggiora'} anche ${labelB}.`;
  } else if (absR >= 0.4) {
    return `Correlazione moderata ${direction} tra ${labelA} e ${labelB}.`;
  } else if (absR >= 0.2) {
    return `Leggera correlazione ${direction} tra ${labelA} e ${labelB}.`;
  }
  return `Nessuna correlazione significativa tra ${labelA} e ${labelB}.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // FIX 1.4: Verifica autenticazione — OBBLIGATORIA
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    // SICUREZZA: ignora user_id dal body, usa solo JWT
    const user_id = user.id;

    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[calculate-correlations] Processing correlations for user: ${user_id}`);

    // Get last 60 days of data
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const dateFilter = sixtyDaysAgo.toISOString().split('T')[0];

    // Fetch data in parallel
    const [sessionsResult, habitsResult, psychologyResult, lifeAreasResult, healthkitResult, dailyCheckinsResult] = await Promise.all([
      supabase
        .from('sessions')
        .select('start_time, mood_score_detected, anxiety_score_detected, energy_score_detected, sleep_quality')
        .eq('user_id', user_id)
        .eq('status', 'completed')
        .gte('start_time', dateFilter)
        .order('start_time', { ascending: true }),
      supabase
        .from('daily_habits')
        .select('date, habit_type, value')
        .eq('user_id', user_id)
        .gte('date', dateFilter)
        .order('date', { ascending: true }),
      supabase
        .from('daily_psychology')
        .select('date, mental_clarity, burnout_level, loneliness_perceived, somatic_tension, rumination')
        .eq('user_id', user_id)
        .gte('date', dateFilter)
        .order('date', { ascending: true }),
      supabase
        .from('daily_life_areas')
        .select('date, work, social')
        .eq('user_id', user_id)
        .gte('date', dateFilter)
        .order('date', { ascending: true }),
      supabase
        .from('healthkit_data')
        .select('date, sleep_hours, steps, hrv_avg, heart_rate_avg')
        .eq('user_id', user_id)
        .gte('date', dateFilter)
        .order('date', { ascending: true }),
      supabase
        .from('daily_checkins')
        .select('date, mood_value')
        .eq('user_id', user_id)
        .gte('date', dateFilter)
        .order('date', { ascending: true }),
    ]);

    // Organize data by date
    const dataByDate: Record<string, Record<string, number>> = {};
    
    // Process sessions
    for (const session of sessionsResult.data || []) {
      const date = session.start_time?.split('T')[0];
      if (!date) continue;
      if (!dataByDate[date]) dataByDate[date] = {};
      if (session.mood_score_detected) dataByDate[date].mood = session.mood_score_detected;
      if (session.anxiety_score_detected) dataByDate[date].anxiety = session.anxiety_score_detected;
      if (session.energy_score_detected) dataByDate[date].energy = session.energy_score_detected;
      if (session.sleep_quality) dataByDate[date].sleep = session.sleep_quality;
    }
    
    // Process habits
    for (const habit of habitsResult.data || []) {
      const date = habit.date;
      if (!date) continue;
      if (!dataByDate[date]) dataByDate[date] = {};
      dataByDate[date][habit.habit_type] = habit.value;
    }
    
    // Process psychology
    for (const psych of psychologyResult.data || []) {
      const date = psych.date;
      if (!date) continue;
      if (!dataByDate[date]) dataByDate[date] = {};
      if (psych.mental_clarity) dataByDate[date].mental_clarity = psych.mental_clarity;
      if (psych.burnout_level) dataByDate[date].burnout_level = psych.burnout_level;
      if (psych.loneliness_perceived) dataByDate[date].loneliness_perceived = psych.loneliness_perceived;
      if (psych.somatic_tension) dataByDate[date].somatic_tension = psych.somatic_tension;
      if (psych.rumination) dataByDate[date].rumination = psych.rumination;
    }
    
    // Process life areas
    for (const area of lifeAreasResult.data || []) {
      const date = area.date;
      if (!date) continue;
      if (!dataByDate[date]) dataByDate[date] = {};
      if (area.work) dataByDate[date].work = area.work;
      if (area.social) dataByDate[date].social = area.social;
    }

    // Process HealthKit data
    for (const hk of healthkitResult.data || []) {
      const date = hk.date;
      if (!date) continue;
      if (!dataByDate[date]) dataByDate[date] = {};
      if (hk.sleep_hours) dataByDate[date].hk_sleep_hours = hk.sleep_hours;
      if (hk.steps) dataByDate[date].hk_steps = hk.steps;
      if (hk.hrv_avg) dataByDate[date].hk_hrv_avg = hk.hrv_avg;
      if (hk.heart_rate_avg) dataByDate[date].hk_heart_rate_avg = hk.heart_rate_avg;
    }

    // Process daily checkins (mood_value for HK correlations)
    for (const checkin of dailyCheckinsResult.data || []) {
      const date = checkin.date;
      if (!date) continue;
      if (!dataByDate[date]) dataByDate[date] = {};
      if (checkin.mood_value) dataByDate[date].mood = checkin.mood_value;
    }

    const dates = Object.keys(dataByDate).sort();
    console.log(`[calculate-correlations] Processing ${dates.length} days of data`);

    // Calculate correlations
    const correlationsToUpsert = [];

    for (const pair of CORRELATION_PAIRS) {
      const xValues: number[] = [];
      const yValues: number[] = [];
      
      for (const date of dates) {
        const dayData = dataByDate[date];
        const xVal = dayData[pair.metric_a];
        const yVal = dayData[pair.metric_b];
        
        if (xVal !== undefined && yVal !== undefined && xVal > 0 && yVal > 0) {
          xValues.push(xVal);
          yValues.push(yVal);
        }
      }
      
      if (xValues.length >= 5) {
        const { r, n } = pearsonCorrelation(xValues, yValues);
        const isSignificant = Math.abs(r) >= 0.3 && n >= 10;
        const insight = generateInsight(pair.metric_a, pair.metric_b, r);
        
        correlationsToUpsert.push({
          user_id,
          metric_a: pair.metric_a,
          metric_b: pair.metric_b,
          correlation_type: pair.type,
          strength: Math.round(r * 1000) / 1000,
          sample_size: n,
          is_significant: isSignificant,
          insight_text: insight,
          last_calculated_at: new Date().toISOString(),
        });
      }
    }

    console.log(`[calculate-correlations] Upserting ${correlationsToUpsert.length} correlations`);

    // Upsert correlations
    for (const corr of correlationsToUpsert) {
      const { error } = await supabase
        .from('user_correlations')
        .upsert(corr, { 
          onConflict: 'user_id,metric_a,metric_b',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error(`[calculate-correlations] Error upserting correlation:`, error);
      }
    }

    // Get significant correlations for response
    const significantCorrelations = correlationsToUpsert
      .filter(c => c.is_significant)
      .sort((a, b) => Math.abs(b.strength) - Math.abs(a.strength))
      .slice(0, 5);

    return new Response(JSON.stringify({
      success: true,
      total_correlations: correlationsToUpsert.length,
      significant_correlations: significantCorrelations.length,
      top_insights: significantCorrelations.map(c => c.insight_text),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[calculate-correlations] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
