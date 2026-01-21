import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LifeBalanceScores {
  love: number | null;
  work: number | null;
  friendship: number | null;
  energy: number | null;
  growth: number | null;
}

interface EmotionBreakdown {
  [emotion: string]: number;
}

interface SpecificEmotions {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  apathy: number;
}

interface ClinicalIndices {
  rumination: number | null;
  emotional_openness: number | null;
  perceived_stress: number | null;
}

interface SessionAnalysis {
  mood_score: number;
  anxiety_score: number;
  emotion_tags: string[];
  key_facts: string[];
  summary: string;
  life_balance_scores: LifeBalanceScores;
  emotion_breakdown: EmotionBreakdown;
  key_events: string[];
  insights: string;
  crisis_risk: 'low' | 'medium' | 'high';
  specific_emotions: SpecificEmotions;
  clinical_indices: ClinicalIndices;
  sleep_quality: number | null;
  recommended_dashboard_metrics: string[];
}

// All available metrics for the adaptive dashboard
const ALL_AVAILABLE_METRICS = [
  // Vitals
  'mood', 'anxiety', 'energy', 'sleep',
  // Emotions
  'joy', 'sadness', 'anger', 'fear', 'apathy',
  // Life Areas
  'love', 'work', 'friendship', 'growth', 'health'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, user_id, transcript } = await req.json();

    if (!session_id || !user_id || !transcript) {
      console.error('Missing required fields:', { session_id, user_id, hasTranscript: !!transcript });
      throw new Error('Missing required fields: session_id, user_id, transcript');
    }

    console.log('[process-session] Processing session:', session_id);
    console.log('[process-session] Transcript length:', transcript.length);

    // Use Lovable AI Gateway (Gemini Flash) - FREE
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current user profile for existing life balance scores
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('life_areas_scores, long_term_memory')
      .eq('user_id', user_id)
      .maybeSingle();

    const currentLifeScores = profileData?.life_areas_scores || {};

    // Call Gemini Flash via Lovable AI Gateway for FREE analysis
    console.log('[process-session] Calling Gemini Flash for comprehensive analysis...');
    
    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Sei un analista clinico esperto. Analizza la conversazione e restituisci SEMPRE un JSON valido.

⚠️ REGOLA ANTI-HALLUCINATION (CRITICA):
- NON INVENTARE DATI. Se l'utente NON esprime un'emozione, il valore è 0.
- APATIA: Assegna > 0 SOLO per frasi come "non sento niente", "vuoto", "indifferenza". Altrimenti = 0.
- Se non c'è evidenza chiara, usa NULL per i valori opzionali, NON inventare numeri.

STRUTTURA JSON RICHIESTA:
{
  "mood_score": <1-10, null se non valutabile>,
  "anxiety_score": <1-10, null se non valutabile>,
  "emotion_tags": ["#Tag1", "#Tag2"],
  "key_facts": ["fatto concreto da ricordare"],
  "summary": "<riassunto 1-2 frasi>",
  "life_balance_scores": {
    "love": <1-10 o null>,
    "work": <1-10 o null>,
    "friendship": <1-10 o null>,
    "energy": <1-10 o null>,
    "growth": <1-10 o null>
  },
  "emotion_breakdown": {},
  "specific_emotions": {
    "joy": <0-100, 0 se non presente>,
    "sadness": <0-100, 0 se non presente>,
    "anger": <0-100, 0 se non presente>,
    "fear": <0-100, 0 se non presente>,
    "apathy": <0-100, 0 se non esplicitamente menzionato vuoto/distacco>
  },
  "clinical_indices": {
    "rumination": <1-10 o null>,
    "emotional_openness": <1-10 o null>,
    "perceived_stress": <1-10 o null>
  },
  "sleep_quality": <1-10 o null>,
  "key_events": [],
  "insights": "<osservazione clinica>",
  "crisis_risk": "<low/medium/high>",
  "recommended_dashboard_metrics": ["metric1", "metric2", "metric3", "metric4"]
}

REGOLE EMOZIONI (specific_emotions):
- Rileva SOLO: Gioia, Tristezza, Rabbia, Paura, Apatia
- I valori NON devono per forza sommare a 100
- Se conversazione neutra: joy=0, sadness=0, anger=0, fear=0, apathy=0
- APATIA > 0 SOLO se l'utente dice esplicitamente: "non provo niente", "mi sento vuoto", "sono apatico", "non mi importa di nulla", "anedonia"
- NON assegnare apatia per stanchezza fisica o noia

REGOLE SONNO (sleep_quality):
- Estrai SOLO se menzionato esplicitamente il sonno
- "ho dormito male/poco/incubi" → 2-4
- "ho dormito ok/normale" → 5-6
- "ho dormito bene/riposato" → 7-9
- "non ho dormito" → 1
- Se NON menzionato → null (NON inventare)

REGOLE ANSIA (anxiety_score):
- Estrai da sintomi fisici: "cuore che batte", "respiro corto", "agitazione"
- Estrai da preoccupazioni esplicite
- Se conversazione calma senza stress → null o 2-3
- NON confondere tristezza con ansia

METRICHE DASHBOARD (recommended_dashboard_metrics):
- Scegli 4 tra: mood, anxiety, energy, sleep, joy, sadness, anger, fear, apathy, love, work, friendship, growth, health
- Basati sui temi REALI della conversazione
- Default se neutro: ["mood", "anxiety", "energy", "sleep"]

Valori attuali aree di vita (aggiorna SOLO se menzionate):
${JSON.stringify(currentLifeScores)}

Rispondi SOLO con JSON valido, senza markdown.`
          },
          {
            role: 'user',
            content: `Analizza questa conversazione terapeutica:\n\n${transcript}`
          }
        ],
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('[process-session] Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    const analysisText = analysisData.choices[0].message.content;
    
    console.log('[process-session] Raw analysis:', analysisText);

    let analysis: SessionAnalysis;
    try {
      // Clean up the response in case it has markdown code blocks
      const cleanedText = analysisText.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('[process-session] Failed to parse analysis:', parseError);
      // Fallback values
      analysis = {
        mood_score: 5,
        anxiety_score: 5,
        emotion_tags: [],
        key_facts: [],
        summary: 'Sessione analizzata con valori predefiniti.',
        life_balance_scores: { love: null, work: null, friendship: null, energy: null, growth: null },
        emotion_breakdown: {},
        key_events: [],
        insights: '',
        crisis_risk: 'low',
        specific_emotions: { joy: 20, sadness: 20, anger: 20, fear: 20, apathy: 20 },
        clinical_indices: { rumination: null, emotional_openness: null, perceived_stress: null },
        sleep_quality: null,
        recommended_dashboard_metrics: ['mood', 'anxiety', 'energy', 'sleep']
      };
    }

    console.log('[process-session] Parsed analysis:', analysis);

    // Update the session with all analysis results
    console.log('[process-session] Updating session in database...');
    
    const isCrisisAlert = analysis.crisis_risk === 'high';
    
    const { error: sessionError } = await supabase
      .from('sessions')
      .update({
        transcript: transcript,
        mood_score_detected: analysis.mood_score,
        anxiety_score_detected: analysis.anxiety_score,
        emotion_tags: analysis.emotion_tags,
        ai_summary: analysis.summary,
        life_balance_scores: analysis.life_balance_scores,
        emotion_breakdown: analysis.emotion_breakdown,
        key_events: analysis.key_events,
        insights: analysis.insights,
        crisis_alert: isCrisisAlert,
        status: 'completed',
        specific_emotions: analysis.specific_emotions,
        clinical_indices: analysis.clinical_indices,
        sleep_quality: analysis.sleep_quality
      })
      .eq('id', session_id);

    if (sessionError) {
      console.error('[process-session] Error updating session:', sessionError);
      throw new Error(`Failed to update session: ${sessionError.message}`);
    }

    // Update user's profile with new data
    console.log('[process-session] Updating user profile...');
    
    // Merge life balance scores - only update areas that were mentioned
    const mergedLifeScores = { ...currentLifeScores };
    for (const [key, value] of Object.entries(analysis.life_balance_scores)) {
      if (value !== null) {
        mergedLifeScores[key] = value;
      }
    }

    // Update long-term memory with new key facts
    const existingMemory = profileData?.long_term_memory || [];
    const updatedMemory = [...existingMemory, ...analysis.key_facts];
    
    // Keep only the last 50 facts to prevent memory bloat
    const trimmedMemory = updatedMemory.slice(-50);

    // Update dashboard metrics if AI recommends new ones
    const recommendedMetrics = analysis.recommended_dashboard_metrics || ['mood', 'anxiety', 'energy', 'sleep'];
    // Only take 4 valid metrics
    const validMetrics = recommendedMetrics.filter(m => ALL_AVAILABLE_METRICS.includes(m)).slice(0, 4);
    const finalMetrics = validMetrics.length === 4 ? validMetrics : ['mood', 'anxiety', 'energy', 'sleep'];

    const { error: profileUpdateError } = await supabase
      .from('user_profiles')
      .update({ 
        long_term_memory: trimmedMemory,
        life_areas_scores: mergedLifeScores,
        active_dashboard_metrics: finalMetrics
      })
      .eq('user_id', user_id);

    if (profileUpdateError) {
      console.error('[process-session] Error updating profile:', profileUpdateError);
    } else {
      console.log('[process-session] Profile updated with', analysis.key_facts.length, 'new facts and life scores');
    }

    console.log('[process-session] Session processing complete!');

    return new Response(JSON.stringify({ 
      success: true,
      crisis_alert: isCrisisAlert,
      analysis: {
        mood_score: analysis.mood_score,
        anxiety_score: analysis.anxiety_score,
        emotion_tags: analysis.emotion_tags,
        summary: analysis.summary,
        life_balance_scores: analysis.life_balance_scores,
        emotion_breakdown: analysis.emotion_breakdown,
        key_events: analysis.key_events,
        insights: analysis.insights,
        crisis_risk: analysis.crisis_risk
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[process-session] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
