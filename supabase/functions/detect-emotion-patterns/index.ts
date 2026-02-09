import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PatternDetection {
  pattern_type: string;
  description: string;
  confidence: number;
  data_points: number;
  trigger_factors: string[];
  recommendations: string[];
}

// Day of week helpers
function getDayOfWeek(date: Date): number {
  return date.getDay(); // 0 = Sunday, 1 = Monday, etc.
}

function isWeekend(date: Date): boolean {
  const day = getDayOfWeek(date);
  return day === 0 || day === 6;
}

// Calculate average for array
function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Detect morning dip pattern (mood lower in morning sessions)
function detectMorningDip(sessions: any[]): PatternDetection | null {
  const morningMoods: number[] = [];
  const eveningMoods: number[] = [];
  
  for (const session of sessions) {
    if (!session.mood_score_detected || !session.start_time) continue;
    
    const hour = new Date(session.start_time).getHours();
    if (hour >= 5 && hour < 12) {
      morningMoods.push(session.mood_score_detected);
    } else if (hour >= 17 && hour < 23) {
      eveningMoods.push(session.mood_score_detected);
    }
  }
  
  if (morningMoods.length < 5 || eveningMoods.length < 5) return null;
  
  const morningAvg = average(morningMoods);
  const eveningAvg = average(eveningMoods);
  const diff = eveningAvg - morningAvg;
  
  if (diff >= 1.5) {
    const confidence = Math.min(0.95, 0.5 + (diff / 5) + (morningMoods.length / 50));
    return {
      pattern_type: 'morning_dip',
      description: `Il tuo umore tende ad essere più basso al mattino (media ${morningAvg.toFixed(1)}) rispetto alla sera (media ${eveningAvg.toFixed(1)}). Questo è un pattern comune.`,
      confidence: Math.round(confidence * 100) / 100,
      data_points: morningMoods.length + eveningMoods.length,
      trigger_factors: ['risveglio', 'routine mattutina', 'qualità sonno'],
      recommendations: [
        'Prova a fare 10 minuti di stretching al risveglio',
        'Esponi gli occhi alla luce naturale appena possibile',
        'Ritarda le decisioni importanti al pomeriggio',
        'Considera una routine mattutina più graduale',
      ],
    };
  }
  
  return null;
}

// Detect weekend boost pattern
function detectWeekendBoost(sessions: any[]): PatternDetection | null {
  const weekdayMoods: number[] = [];
  const weekendMoods: number[] = [];
  
  for (const session of sessions) {
    if (!session.mood_score_detected || !session.start_time) continue;
    
    const date = new Date(session.start_time);
    if (isWeekend(date)) {
      weekendMoods.push(session.mood_score_detected);
    } else {
      weekdayMoods.push(session.mood_score_detected);
    }
  }
  
  if (weekdayMoods.length < 10 || weekendMoods.length < 4) return null;
  
  const weekdayAvg = average(weekdayMoods);
  const weekendAvg = average(weekendMoods);
  const diff = weekendAvg - weekdayAvg;
  
  if (diff >= 1.0) {
    const confidence = Math.min(0.9, 0.5 + (diff / 4) + (weekendMoods.length / 30));
    return {
      pattern_type: 'weekend_boost',
      description: `Il tuo umore migliora significativamente nel weekend (media ${weekendAvg.toFixed(1)}) rispetto ai giorni lavorativi (media ${weekdayAvg.toFixed(1)}).`,
      confidence: Math.round(confidence * 100) / 100,
      data_points: weekdayMoods.length + weekendMoods.length,
      trigger_factors: ['lavoro', 'stress settimanale', 'riposo'],
      recommendations: [
        'Integra elementi del weekend nella routine settimanale',
        'Pianifica attività piacevoli anche durante la settimana',
        'Considera il work-life balance nel tuo lavoro',
        'Prova a fare una "mini-vacanza" mentale ogni giorno',
      ],
    };
  }
  
  return null;
}

// Detect Monday blues pattern
function detectMondayBlues(sessions: any[]): PatternDetection | null {
  const mondayMoods: number[] = [];
  const otherDayMoods: number[] = [];
  
  for (const session of sessions) {
    if (!session.mood_score_detected || !session.start_time) continue;
    
    const date = new Date(session.start_time);
    const day = getDayOfWeek(date);
    
    if (day === 1) { // Monday
      mondayMoods.push(session.mood_score_detected);
    } else if (day >= 2 && day <= 4) { // Tuesday-Thursday
      otherDayMoods.push(session.mood_score_detected);
    }
  }
  
  if (mondayMoods.length < 4 || otherDayMoods.length < 10) return null;
  
  const mondayAvg = average(mondayMoods);
  const otherAvg = average(otherDayMoods);
  const diff = otherAvg - mondayAvg;
  
  if (diff >= 1.2) {
    const confidence = Math.min(0.85, 0.4 + (diff / 4) + (mondayMoods.length / 20));
    return {
      pattern_type: 'monday_blues',
      description: `Il lunedì è il tuo giorno più difficile (media umore ${mondayAvg.toFixed(1)}) rispetto al resto della settimana (media ${otherAvg.toFixed(1)}).`,
      confidence: Math.round(confidence * 100) / 100,
      data_points: mondayMoods.length + otherDayMoods.length,
      trigger_factors: ['fine weekend', 'ansia lavorativa', 'routine'],
      recommendations: [
        'Prepara il lunedì la domenica sera (vestiti, borsa, colazione)',
        'Pianifica qualcosa di piacevole per il lunedì sera',
        'Evita riunioni stressanti il lunedì mattina se possibile',
        'Inizia la settimana con un piccolo premio (colazione speciale)',
      ],
    };
  }
  
  return null;
}

// Detect anxiety cycle pattern
function detectAnxietyCycle(sessions: any[]): PatternDetection | null {
  const anxietyLevels: { date: string; value: number }[] = [];
  
  for (const session of sessions) {
    if (!session.anxiety_score_detected || !session.start_time) continue;
    const date = session.start_time.split('T')[0];
    anxietyLevels.push({ date, value: session.anxiety_score_detected });
  }
  
  if (anxietyLevels.length < 14) return null;
  
  // Look for weekly cyclical patterns
  const avgAnxiety = average(anxietyLevels.map(a => a.value));
  const highAnxietyDays = anxietyLevels.filter(a => a.value >= avgAnxiety + 2).length;
  const percentage = (highAnxietyDays / anxietyLevels.length) * 100;
  
  if (percentage >= 25) {
    return {
      pattern_type: 'anxiety_spikes',
      description: `Hai picchi di ansia significativi in circa ${Math.round(percentage)}% delle tue sessioni. La tua ansia media è ${avgAnxiety.toFixed(1)}/10.`,
      confidence: 0.7,
      data_points: anxietyLevels.length,
      trigger_factors: ['stress', 'eventi specifici', 'mancanza di riposo'],
      recommendations: [
        'Identifica i trigger specifici dei picchi',
        'Pratica tecniche di respirazione quotidianamente',
        'Considera la meditazione guidata',
        'Limita caffeina e stimolanti',
      ],
    };
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    
    if (!user_id) {
      throw new Error('user_id is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[detect-emotion-patterns] Processing patterns for user: ${user_id}`);

    // Get last 90 days of session data
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateFilter = ninetyDaysAgo.toISOString();

    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('start_time, mood_score_detected, anxiety_score_detected, energy_score_detected')
      .eq('user_id', user_id)
      .eq('status', 'completed')
      .gte('start_time', dateFilter)
      .order('start_time', { ascending: true });

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

    console.log(`[detect-emotion-patterns] Analyzing ${sessions?.length || 0} sessions`);

    if (!sessions || sessions.length < 10) {
      return new Response(JSON.stringify({
        success: true,
        patterns_detected: 0,
        message: 'Non abbastanza dati per rilevare pattern. Continua a chattare con Aria!',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Detect all patterns
    const detectedPatterns: PatternDetection[] = [];
    
    const morningDip = detectMorningDip(sessions);
    if (morningDip) detectedPatterns.push(morningDip);
    
    const weekendBoost = detectWeekendBoost(sessions);
    if (weekendBoost) detectedPatterns.push(weekendBoost);
    
    const mondayBlues = detectMondayBlues(sessions);
    if (mondayBlues) detectedPatterns.push(mondayBlues);
    
    const anxietyCycle = detectAnxietyCycle(sessions);
    if (anxietyCycle) detectedPatterns.push(anxietyCycle);

    console.log(`[detect-emotion-patterns] Detected ${detectedPatterns.length} patterns`);

    // Save/update patterns in database
    for (const pattern of detectedPatterns) {
      // Check if pattern already exists
      const { data: existing } = await supabase
        .from('emotion_patterns')
        .select('id')
        .eq('user_id', user_id)
        .eq('pattern_type', pattern.pattern_type)
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        // Update existing pattern
        await supabase
          .from('emotion_patterns')
          .update({
            description: pattern.description,
            confidence: pattern.confidence,
            data_points: pattern.data_points,
            trigger_factors: pattern.trigger_factors,
            recommendations: pattern.recommendations,
            last_validated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Insert new pattern
        await supabase
          .from('emotion_patterns')
          .insert({
            user_id,
            pattern_type: pattern.pattern_type,
            description: pattern.description,
            confidence: pattern.confidence,
            data_points: pattern.data_points,
            trigger_factors: pattern.trigger_factors,
            recommendations: pattern.recommendations,
            is_active: true,
          });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      patterns_detected: detectedPatterns.length,
      patterns: detectedPatterns.map(p => ({
        type: p.pattern_type,
        description: p.description,
        confidence: p.confidence,
        recommendations: p.recommendations.slice(0, 2),
      })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[detect-emotion-patterns] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
