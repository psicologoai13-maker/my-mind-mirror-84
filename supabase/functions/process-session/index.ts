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
}

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
            content: `Sei un analista clinico esperto di conversazioni terapeutiche. Analizza la conversazione e restituisci SEMPRE un JSON valido con questa struttura esatta:

{
  "mood_score": <numero da 1 a 10, dove 1 è molto triste e 10 è molto felice>,
  "anxiety_score": <numero da 1 a 10, dove 1 è calmo e 10 è molto ansioso>,
  "emotion_tags": [<array di tag emotivi rilevanti, es. "#Lavoro", "#Relazioni", "#Stress", "#Famiglia">],
  "key_facts": [<array di fatti importanti da ricordare per sessioni future>],
  "summary": "<riassunto breve della sessione in 1-2 frasi>",
  "life_balance_scores": {
    "love": <punteggio 1-10 per Amore/Relazioni romantiche, null se non menzionato>,
    "work": <punteggio 1-10 per Lavoro/Carriera, null se non menzionato>,
    "friendship": <punteggio 1-10 per Amicizia/Vita sociale, null se non menzionato>,
    "energy": <punteggio 1-10 per Energia/Salute fisica, null se non menzionato>,
    "growth": <punteggio 1-10 per Autostima/Crescita personale, null se non menzionato>
  },
  "emotion_breakdown": {
    "<emozione>": <percentuale come numero intero>
  },
  "specific_emotions": {
    "joy": <percentuale di Gioia (0-100)>,
    "sadness": <percentuale di Tristezza (0-100)>,
    "anger": <percentuale di Rabbia (0-100)>,
    "fear": <percentuale di Paura (0-100)>,
    "apathy": <percentuale di Apatia (0-100)>
  },
  "clinical_indices": {
    "rumination": <livello di ruminazione 1-10, null se non valutabile>,
    "emotional_openness": <apertura emotiva 1-10, null se non valutabile>,
    "perceived_stress": <stress percepito 1-10, null se non valutabile>
  },
  "sleep_quality": <qualità del sonno 1-10 se menzionato, null altrimenti>,
  "key_events": [<lista di eventi fattuali concreti>],
  "insights": "<osservazione clinica breve>",
  "crisis_risk": "<'low', 'medium', o 'high'>"
}

REGOLE PER ESTRAZIONE DATI CLINICI:
- specific_emotions: le 5 emozioni DEVONO sommare a 100. Basati sul tono generale della conversazione.
- clinical_indices:
  * rumination: quanto l'utente ripete gli stessi pensieri negativi (1=nessuno, 10=estremo)
  * emotional_openness: quanto l'utente si apre ed esprime emozioni (1=chiuso, 10=molto aperto)
  * perceived_stress: livello di stress generale percepito (1=rilassato, 10=molto stressato)
- sleep_quality: se l'utente menziona sonno, insonnia, stanchezza, estrai un punteggio (1=pessimo, 10=ottimo). Null se non menzionato.
- crisis_risk: 'high' SOLO per pensieri suicidi/autolesionismo. 'medium' per forte angoscia. 'low' normale.

Valori attuali aree di vita (aggiorna SOLO se menzionate):
${JSON.stringify(currentLifeScores)}

Rispondi SOLO con il JSON, senza markdown.`
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
        sleep_quality: null
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

    const { error: profileUpdateError } = await supabase
      .from('user_profiles')
      .update({ 
        long_term_memory: trimmedMemory,
        life_areas_scores: mergedLifeScores
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
