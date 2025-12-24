import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
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

    // Call GPT-4o-mini to analyze the session with rich extraction
    console.log('[process-session] Calling OpenAI for comprehensive analysis...');
    
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Sei un analista esperto di conversazioni terapeutiche e coach di vita. Analizza la conversazione e restituisci SEMPRE un JSON valido con questa struttura esatta:

{
  "mood_score": <numero da 1 a 10, dove 1 è molto triste e 10 è molto felice>,
  "anxiety_score": <numero da 1 a 10, dove 1 è calmo e 10 è molto ansioso>,
  "emotion_tags": [<array di tag emotivi rilevanti, es. "#Lavoro", "#Relazioni", "#Stress", "#Famiglia">],
  "key_facts": [<array di fatti importanti da ricordare per sessioni future, es. "Si è lasciato con la ragazza Maria", "Ha problemi al lavoro con il capo">],
  "summary": "<riassunto breve della sessione in 1-2 frasi>",
  "life_balance_scores": {
    "love": <punteggio 1-10 per Amore/Relazioni romantiche, null se non menzionato>,
    "work": <punteggio 1-10 per Lavoro/Carriera, null se non menzionato>,
    "friendship": <punteggio 1-10 per Amicizia/Vita sociale, null se non menzionato>,
    "energy": <punteggio 1-10 per Energia/Salute fisica, null se non menzionato>,
    "growth": <punteggio 1-10 per Autostima/Crescita personale, null se non menzionato>
  },
  "emotion_breakdown": {
    "<emozione>": <percentuale come numero intero, es. "Gioia": 20, "Rabbia": 30, "Tristezza": 50>
  },
  "key_events": [<lista di eventi fattuali concreti, es. "Ha litigato con il boss", "Nuovo appuntamento venerdì", "Promozione al lavoro">],
  "insights": "<una frase breve di correlazione o osservazione clinica, es. 'La tua ansia sembra aumentare quando parli di Lavoro' o 'Noto un pattern di evitamento nelle relazioni'>"
}

REGOLE IMPORTANTI:
- Per life_balance_scores: assegna un punteggio SOLO se l'utente ha parlato di quell'area. Altrimenti metti null.
- emotion_breakdown: le percentuali devono sommare a 100.
- key_events: estrai SOLO eventi fattuali concreti (chi, cosa, quando), non stati emotivi.
- insights: fornisci un'osservazione utile che colleghi i pattern emotivi alle aree di vita.

Valori attuali delle aree di vita dell'utente (usa come riferimento, ma aggiorna SOLO se ne parla nella conversazione):
${JSON.stringify(currentLifeScores)}

Rispondi SOLO con il JSON, senza markdown o altro testo.`
          },
          {
            role: 'user',
            content: `Analizza questa conversazione terapeutica:\n\n${transcript}`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('[process-session] OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${analysisResponse.status}`);
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
        insights: ''
      };
    }

    console.log('[process-session] Parsed analysis:', analysis);

    // Update the session with all analysis results
    console.log('[process-session] Updating session in database...');
    
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
        status: 'completed'
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
      analysis: {
        mood_score: analysis.mood_score,
        anxiety_score: analysis.anxiety_score,
        emotion_tags: analysis.emotion_tags,
        summary: analysis.summary,
        life_balance_scores: analysis.life_balance_scores,
        emotion_breakdown: analysis.emotion_breakdown,
        key_events: analysis.key_events,
        insights: analysis.insights
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
