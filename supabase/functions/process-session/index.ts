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

interface LifeAreas {
  work: number | null;
  love: number | null;
  health: number | null;
  social: number | null;
  growth: number | null;
}

interface VoiceAnalysis {
  tone: 'calm' | 'agitated' | 'neutral';
  speed: 'slow' | 'fast' | 'normal';
  confidence: number;
}

interface OmniscientAnalysis {
  vitals: {
    mood: number | null;
    anxiety: number | null;
    energy: number | null;
    sleep: number | null;
  };
  emotions: SpecificEmotions;
  life_areas: LifeAreas;
  voice_analysis: VoiceAnalysis | null;
  emotion_tags: string[];
  key_facts: string[];
  summary: string;
  key_events: string[];
  insights: string;
  crisis_risk: 'low' | 'medium' | 'high';
  clinical_indices: ClinicalIndices;
  recommended_dashboard_metrics: string[];
}

// All available metrics for the adaptive dashboard
const ALL_AVAILABLE_METRICS = [
  'mood', 'anxiety', 'energy', 'sleep',
  'joy', 'sadness', 'anger', 'fear', 'apathy',
  'love', 'work', 'friendship', 'growth', 'health'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, user_id, transcript, is_voice = false } = await req.json();

    if (!session_id || !user_id || !transcript) {
      console.error('Missing required fields:', { session_id, user_id, hasTranscript: !!transcript });
      throw new Error('Missing required fields: session_id, user_id, transcript');
    }

    console.log('[process-session] Processing session:', session_id, 'is_voice:', is_voice);
    console.log('[process-session] Transcript length:', transcript.length);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current user profile
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('life_areas_scores, long_term_memory')
      .eq('user_id', user_id)
      .maybeSingle();

    const currentLifeScores = profileData?.life_areas_scores || {};

    // VOICE ANALYSIS EURISTICS (text-based)
    const voiceHeuristicsPrompt = is_voice ? `
ANALISI VOCALE (euristica testuale):
Analizza la struttura del testo per inferire il tono emotivo:
- Frasi BREVI e SPEZZATE (< 5 parole), molti punti → tono: "agitated", speed: "fast"
- Frasi LUNGHE e scorrevoli → tono: "calm", speed: "slow"
- Uso di "...", esitazioni, filler ("ehm", "boh", "cioè") → tono: "neutral", velocità normale
- Esclamazioni frequenti (!) → energia alta, possibile agitazione
- Domande retoriche continue → possibile ansia
Restituisci voice_analysis con tone, speed e confidence (0-1).
` : '';

    // Build the OMNISCIENT analysis prompt
    const analysisPrompt = `SEI UN ANALISTA CLINICO OMNISCIENTE. Analizza la conversazione e restituisci SEMPRE un JSON valido.

⚠️ REGOLE ANTI-HALLUCINATION (CRITICHE):
- NON INVENTARE DATI. Se qualcosa non è espresso, usa 0 per emozioni o null per metriche opzionali.
- APATIA: Assegna > 0 SOLO per frasi esplicite come "non sento niente", "vuoto", "indifferenza totale", "non mi importa di nulla". 
  Stanchezza fisica o noia NON sono apatia → apathy = 0.
- SONNO: Assegna valore SOLO se l'utente menziona esplicitamente il sonno/riposo. Altrimenti null.
- ANSIA: Deriva da sintomi fisici (cuore, respiro) o preoccupazioni esplicite. Tristezza ≠ ansia.

📊 STRUTTURA JSON RICHIESTA:
{
  "vitals": {
    "mood": <1-10 o null>,
    "anxiety": <1-10 o null>,
    "energy": <1-10 o null>,
    "sleep": <1-10 o null>
  },
  "emotions": {
    "joy": <0-10, 0 se non presente>,
    "sadness": <0-10, 0 se non presente>,
    "anger": <0-10, 0 se non presente>,
    "fear": <0-10, 0 se non presente>,
    "apathy": <0-10, 0 se non ESPLICITAMENTE vuoto/distacco>
  },
  "life_areas": {
    "work": <1-10 o null>,
    "love": <1-10 o null>,
    "health": <1-10 o null>,
    "social": <1-10 o null>,
    "growth": <1-10 o null>
  },
  "voice_analysis": ${is_voice ? '{ "tone": "calm|agitated|neutral", "speed": "slow|fast|normal", "confidence": 0.0-1.0 }' : 'null'},
  "emotion_tags": ["#Tag1", "#Tag2"],
  "key_facts": ["fatto concreto da ricordare"],
  "summary": "<riassunto 1-2 frasi>",
  "key_events": ["evento chiave"],
  "insights": "<osservazione clinica breve>",
  "crisis_risk": "low|medium|high",
  "clinical_indices": {
    "rumination": <1-10 o null>,
    "emotional_openness": <1-10 o null>,
    "perceived_stress": <1-10 o null>
  },
  "recommended_dashboard_metrics": ["metric1", "metric2", "metric3", "metric4"]
}

🎯 REGOLE LIFE_AREAS (CRUCIALI):
- Se l'utente PARLA di un'area, DEVI stimare un punteggio:
  - "Il lavoro va bene" → work: 7-8
  - "Il lavoro va benissimo/fantastico" → work: 9-10
  - "Il lavoro va male/stressante" → work: 3-4
  - "Sono innamorato/felice in amore" → love: 8-9
  - "Sono single ma sto bene" → love: 6
  - "Ho litigato col partner" → love: 4
  - "Mi alleno regolarmente" → health: 8
  - "Mi sento in salute" → health: 7
  - "Sono malato/stanco fisicamente" → health: 3-4
  - "Ho visto gli amici" → social: 7
  - "Mi sento solo" → social: 3
  - "Sto imparando cose nuove" → growth: 7-8
- Se NON menzionata → null (NON inventare)

${voiceHeuristicsPrompt}

📝 METRICHE DASHBOARD:
- Scegli 4 tra: mood, anxiety, energy, sleep, joy, sadness, anger, fear, apathy, love, work, social, growth, health
- Basati sui temi REALI della conversazione
- Default se conversazione neutra: ["mood", "anxiety", "energy", "sleep"]

🔒 Valori ATTUALI aree di vita (aggiorna SOLO se menzionate con nuovi dati):
${JSON.stringify(currentLifeScores)}

⚡ Rispondi SOLO con JSON valido, SENZA markdown code blocks.`;

    console.log('[process-session] Calling Gemini Flash for omniscient analysis...');
    
    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: analysisPrompt },
          { role: 'user', content: `Analizza questa conversazione terapeutica:\n\n${transcript}` }
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

    let analysis: OmniscientAnalysis;
    try {
      const cleanedText = analysisText.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('[process-session] Failed to parse analysis:', parseError);
      analysis = {
        vitals: { mood: null, anxiety: null, energy: null, sleep: null },
        emotions: { joy: 0, sadness: 0, anger: 0, fear: 0, apathy: 0 },
        life_areas: { work: null, love: null, health: null, social: null, growth: null },
        voice_analysis: null,
        emotion_tags: [],
        key_facts: [],
        summary: 'Sessione analizzata con valori predefiniti.',
        key_events: [],
        insights: '',
        crisis_risk: 'low',
        clinical_indices: { rumination: null, emotional_openness: null, perceived_stress: null },
        recommended_dashboard_metrics: ['mood', 'anxiety', 'energy', 'sleep']
      };
    }

    console.log('[process-session] Parsed analysis:', JSON.stringify(analysis, null, 2));

    const isCrisisAlert = analysis.crisis_risk === 'high';
    const today = new Date().toISOString().split('T')[0];

    // 1. Update the SESSION with all analysis results
    console.log('[process-session] Updating session in database...');
    
    // Map new life_areas to old life_balance_scores for backwards compatibility
    const lifeBalanceScores: LifeBalanceScores = {
      love: analysis.life_areas.love,
      work: analysis.life_areas.work,
      friendship: analysis.life_areas.social, // Map social -> friendship
      energy: analysis.life_areas.health, // Map health -> energy
      growth: analysis.life_areas.growth
    };

    const { error: sessionError } = await supabase
      .from('sessions')
      .update({
        transcript: transcript,
        mood_score_detected: analysis.vitals.mood,
        anxiety_score_detected: analysis.vitals.anxiety,
        emotion_tags: analysis.emotion_tags,
        ai_summary: analysis.summary,
        life_balance_scores: lifeBalanceScores,
        emotion_breakdown: analysis.emotions,
        key_events: analysis.key_events,
        insights: analysis.insights,
        crisis_alert: isCrisisAlert,
        status: 'completed',
        specific_emotions: analysis.emotions,
        clinical_indices: analysis.clinical_indices,
        sleep_quality: analysis.vitals.sleep
      })
      .eq('id', session_id);

    if (sessionError) {
      console.error('[process-session] Error updating session:', sessionError);
      throw new Error(`Failed to update session: ${sessionError.message}`);
    }

    // 2. SAVE TO daily_emotions (upsert)
    console.log('[process-session] Saving to daily_emotions...');
    const { error: emotionsError } = await supabase
      .from('daily_emotions')
      .upsert({
        user_id: user_id,
        date: today,
        joy: analysis.emotions.joy || 0,
        sadness: analysis.emotions.sadness || 0,
        anger: analysis.emotions.anger || 0,
        fear: analysis.emotions.fear || 0,
        apathy: analysis.emotions.apathy || 0,
        source: 'session',
        session_id: session_id
      }, { onConflict: 'user_id,date,source' });

    if (emotionsError) {
      console.error('[process-session] Error saving daily_emotions:', emotionsError);
    }

    // 3. SAVE TO daily_life_areas (upsert) - only if any area was detected
    const hasLifeAreas = Object.values(analysis.life_areas).some(v => v !== null);
    if (hasLifeAreas) {
      console.log('[process-session] Saving to daily_life_areas...');
      const { error: lifeAreasError } = await supabase
        .from('daily_life_areas')
        .upsert({
          user_id: user_id,
          date: today,
          work: analysis.life_areas.work,
          love: analysis.life_areas.love,
          health: analysis.life_areas.health,
          social: analysis.life_areas.social,
          growth: analysis.life_areas.growth,
          source: 'session',
          session_id: session_id
        }, { onConflict: 'user_id,date,source' });

      if (lifeAreasError) {
        console.error('[process-session] Error saving daily_life_areas:', lifeAreasError);
      }
    }

    // 4. Update user's profile
    console.log('[process-session] Updating user profile...');
    
    // Merge life balance scores
    const mergedLifeScores = { ...currentLifeScores };
    if (analysis.life_areas.love !== null) mergedLifeScores.love = analysis.life_areas.love;
    if (analysis.life_areas.work !== null) mergedLifeScores.work = analysis.life_areas.work;
    if (analysis.life_areas.social !== null) mergedLifeScores.friendship = analysis.life_areas.social;
    if (analysis.life_areas.health !== null) mergedLifeScores.wellness = analysis.life_areas.health;
    if (analysis.life_areas.growth !== null) mergedLifeScores.growth = analysis.life_areas.growth;

    // Update long-term memory
    const existingMemory = profileData?.long_term_memory || [];
    const updatedMemory = [...existingMemory, ...analysis.key_facts].slice(-50);

    // Update dashboard metrics
    const recommendedMetrics = analysis.recommended_dashboard_metrics || ['mood', 'anxiety', 'energy', 'sleep'];
    const validMetrics = recommendedMetrics.filter(m => ALL_AVAILABLE_METRICS.includes(m)).slice(0, 4);
    const finalMetrics = validMetrics.length === 4 ? validMetrics : ['mood', 'anxiety', 'energy', 'sleep'];

    const { error: profileUpdateError } = await supabase
      .from('user_profiles')
      .update({ 
        long_term_memory: updatedMemory,
        life_areas_scores: mergedLifeScores,
        active_dashboard_metrics: finalMetrics
      })
      .eq('user_id', user_id);

    if (profileUpdateError) {
      console.error('[process-session] Error updating profile:', profileUpdateError);
    } else {
      console.log('[process-session] Profile updated with', analysis.key_facts.length, 'new facts');
    }

    console.log('[process-session] Session processing complete!');

    return new Response(JSON.stringify({ 
      success: true,
      crisis_alert: isCrisisAlert,
      analysis: {
        vitals: analysis.vitals,
        emotions: analysis.emotions,
        life_areas: analysis.life_areas,
        voice_analysis: analysis.voice_analysis,
        summary: analysis.summary,
        emotion_tags: analysis.emotion_tags,
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
