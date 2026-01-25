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

// NEW: Deep Psychology Metrics Interface
interface DeepPsychology {
  // Cognitive
  rumination: number | null;
  self_efficacy: number | null;
  mental_clarity: number | null;
  // Stress & Coping
  burnout_level: number | null;
  coping_ability: number | null;
  loneliness_perceived: number | null;
  // Physiological
  somatic_tension: number | null;
  appetite_changes: number | null;
  sunlight_exposure: number | null;
  // Complex Emotional
  guilt: number | null;
  gratitude: number | null;
  irritability: number | null;
}

interface UserContext {
  selected_goals?: string[];
  priority_metrics?: string[];
  primary_life_area?: string;
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
  deep_psychology: DeepPsychology;
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
  'love', 'work', 'friendship', 'growth', 'health',
  'stress', 'calmness', 'social', 'loneliness', 'emotional_clarity',
  // New deep psychology metrics
  'rumination', 'self_efficacy', 'mental_clarity', 'burnout_level',
  'coping_ability', 'somatic_tension', 'guilt', 'gratitude', 'irritability'
];

// Build priority analysis instructions based on user goals
const buildPriorityAnalysisInstructions = (
  goals: string[],
  priorityMetrics: string[],
  primaryLifeArea: string | null
): string => {
  const instructions: string[] = [];

  // Goal-based analysis focus
  if (goals.includes('reduce_anxiety')) {
    instructions.push(`🔍 FOCUS ANSIA: Cerca OSSESSIVAMENTE indizi di ansia nel testo:
    - Parole chiave: "preoccupato", "nervoso", "agitato", "non riesco a rilassarmi", "pensieri che girano"
    - Sintomi fisici: battito cardiaco, respiro, sudore, tensione muscolare
    - Pattern: domande retoriche, frasi interrotte, ripetizioni
    - Anche se l'utente NON dice esplicitamente "sono ansioso", inferisci dai segnali.`);
  }

  if (goals.includes('improve_sleep')) {
    instructions.push(`🔍 FOCUS SONNO: Cerca OSSESSIVAMENTE indizi sul sonno:
    - Parole chiave: "stanco", "esausto", "non dormo", "sveglio", "incubo", "nottata"
    - Segnali indiretti: "caffè", "pomeriggio pesante", "non ho energie al mattino"
    - Orari: qualsiasi menzione di ore serali/notturne
    - Se l'utente menziona stanchezza, CHIEDI SEMPRE del sonno.`);
  }

  if (goals.includes('find_love') || goals.includes('express_feelings')) {
    instructions.push(`🔍 FOCUS RELAZIONI/EMOZIONI: Cerca indizi su:
    - Relazioni: partner, amici, famiglia, solitudine
    - Emozioni non espresse: tono, esitazioni, cose non dette
    - Bisogni affettivi nascosti`);
  }

  if (goals.includes('boost_energy')) {
    instructions.push(`🔍 FOCUS ENERGIA: Cerca indizi su:
    - Livelli di energia: "stanco", "carico", "motivato", "svogliato"
    - Attività fisica, alimentazione, routine
    - Motivazione e produttività`);
  }

  // Priority metrics analysis
  if (priorityMetrics.length > 0) {
    const metricsLabels = priorityMetrics.slice(0, 4).join(', ');
    instructions.push(`📊 METRICHE PRIORITARIE DA ANALIZZARE: ${metricsLabels}
    - Dai PESO MAGGIORE a queste metriche nell'analisi.
    - Cerca indizi anche se non esplicitamente menzionati.
    - Se non trovi dati, cerca di inferire da contesto e tono.`);
  }

  // Primary life area focus
  if (primaryLifeArea) {
    const areaLabels: Record<string, string> = {
      love: 'AMORE (relazioni romantiche, partner, dating)',
      work: 'LAVORO (carriera, colleghi, progetti, stress lavorativo)',
      social: 'SOCIALITÀ (amici, famiglia, isolamento, connessioni)',
      growth: 'CRESCITA (sviluppo personale, obiettivi, apprendimento)',
      health: 'SALUTE (fisica, mentale, abitudini, energia)',
    };
    instructions.push(`🎯 AREA VITA PRIMARIA: ${areaLabels[primaryLifeArea] || primaryLifeArea}
    - Questa è l'area PIÙ IMPORTANTE per l'utente.
    - DEVI estrarre un punteggio per questa area se c'è qualsiasi indizio.`);
  }

  return instructions.length > 0 
    ? `\n═══════════════════════════════════════════════
🎯 ANALISI PERSONALIZZATA (BASATA SU OBIETTIVI UTENTE)
═══════════════════════════════════════════════
${instructions.join('\n\n')}`
    : '';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, user_id, transcript, is_voice = false, user_context } = await req.json() as {
      session_id: string;
      user_id: string;
      transcript: string;
      is_voice?: boolean;
      user_context?: UserContext;
    };

    if (!session_id || !user_id || !transcript) {
      console.error('Missing required fields:', { session_id, user_id, hasTranscript: !!transcript });
      throw new Error('Missing required fields: session_id, user_id, transcript');
    }

    console.log('[process-session] Processing session:', session_id, 'is_voice:', is_voice);
    console.log('[process-session] User context:', user_context);
    console.log('[process-session] Transcript length:', transcript.length);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current user profile (including personalization data)
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('life_areas_scores, long_term_memory, selected_goals, dashboard_config')
      .eq('user_id', user_id)
      .maybeSingle();

    const currentLifeScores = profileData?.life_areas_scores || {};
    
    // Extract user context (from request or profile)
    const selectedGoals = user_context?.selected_goals || (profileData?.selected_goals as string[]) || [];
    const dashboardConfig = profileData?.dashboard_config as { priority_metrics?: string[] } | null;
    const priorityMetrics = user_context?.priority_metrics || dashboardConfig?.priority_metrics || [];
    const primaryLifeArea = user_context?.primary_life_area || null;

    // Build personalized analysis instructions
    const personalizedInstructions = buildPriorityAnalysisInstructions(
      selectedGoals,
      priorityMetrics,
      primaryLifeArea
    );

    // VOICE ANALYSIS HEURISTICS (text-based)
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

    // Build Data Hunter instructions for missing life areas
    const lifeAreasKeys = ['love', 'work', 'social', 'growth', 'health'];
    const missingLifeAreas = lifeAreasKeys.filter(key => {
      const score = currentLifeScores[key];
      return score === null || score === undefined || score === 0;
    });
    
    const dataHunterLifeAreas = missingLifeAreas.length > 0
      ? `
═══════════════════════════════════════════════
🎯 DATA HUNTER - AREE MANCANTI DA RIEMPIRE
═══════════════════════════════════════════════
Il radar dell'utente ha queste aree VUOTE: ${missingLifeAreas.join(', ')}
PRESTA ATTENZIONE EXTRA a qualsiasi indizio su queste aree nella conversazione.
Se trovi anche un minimo riferimento, ESTRAI un punteggio.`
      : '';

    // NEW: Deep Psychology semantic extraction rules
    const deepPsychologyPrompt = `
═══════════════════════════════════════════════
🧠 DEEP PSYCHOLOGY - ANALISI MECCANISMI SOTTOSTANTI
═══════════════════════════════════════════════
Devi leggere TRA LE RIGHE per estrarre pattern psicologici profondi.

📌 REGOLE DI ESTRAZIONE SEMANTICA:

**COGNITIVI:**
- rumination (pensieri ossessivi): "Non riesco a smettere di pensare a...", "mi tormento", "continuo a rimuginare" → 7-10
  - Ripetizione dello stesso tema nella conversazione → segnale di ruminazione
- self_efficacy (fiducia in sé): "ce la posso fare", "sono capace" → 8-10 | "non ne sono capace", "fallirò" → 1-4
- mental_clarity: "ho le idee chiare", "so cosa fare" → 8-10 | "confuso", "non so", "nebbia mentale" → 1-4

**STRESS & COPING:**
- burnout_level: "sono esausto", "non ce la faccio più", "svuotato", "logorato" → 8-10
  - Menzione di lavoro eccessivo + stanchezza cronica = burnout
- coping_ability (resilienza): "riesco a gestire", "ce la faccio" → 8-10 | "mi sento sopraffatto" → 1-4
- loneliness_perceived: "mi sento solo anche tra la gente", "nessuno mi capisce", "isolato" → 7-10
  - ATTENZIONE: Diversa dalla socialità bassa! Uno può avere amici ma sentirsi solo.

**FISIOLOGICI:**
- somatic_tension: "peso sul petto", "nodo allo stomaco", "tensione muscolare", "mal di testa da stress" → 7-10
  - Qualsiasi sintomo fisico correlato a stress emotivo
- appetite_changes: "non mangio", "mangio troppo per il nervoso", "fame nervosa" → 7-10
  - Sia troppo che troppo poco indicano cambiamenti significativi
- sunlight_exposure: "sempre in casa", "non esco mai", "lavoro al buio" → 1-4 | "esco, cammino" → 7-10
  - Inferisci anche da abitudini descritte (es. "lavoro da remoto tutto il giorno")

**EMOTIVI COMPLESSI:**
- guilt (senso di colpa): "è colpa mia", "avrei dovuto", "mi sento in colpa", "ho deluso" → 7-10
- gratitude: "sono grato", "apprezzo", "fortunato" → 7-10 | assenza di gratitudine in contesti positivi → 1-4
- irritability: "mi dà fastidio", "sono irascibile", "mi innervosisco facilmente" → 7-10

⚠️ ANTI-HALLUCINATION: Se NON ci sono indizi, il valore DEVE essere null.
Solo valori ESPLICITI o FORTEMENTE INFERIBILI → assegna punteggio.
`;

    // Build the OMNISCIENT analysis prompt with personalization
    const analysisPrompt = `SEI UN ANALISTA CLINICO OMNISCIENTE. Analizza la conversazione e restituisci SEMPRE un JSON valido.
${personalizedInstructions}
${dataHunterLifeAreas}
${deepPsychologyPrompt}

═══════════════════════════════════════════════
⚠️ REGOLE ANTI-HALLUCINATION (CRITICHE)
═══════════════════════════════════════════════
- NON INVENTARE DATI. Se qualcosa non è espresso, usa 0 per emozioni o null per metriche opzionali.
- APATIA: Assegna > 0 SOLO per frasi esplicite come "non sento niente", "vuoto", "indifferenza totale". 
  Stanchezza fisica o noia NON sono apatia → apathy = 0.
- SONNO: Assegna valore SOLO se l'utente menziona esplicitamente il sonno/riposo. Altrimenti null.
- ANSIA: Deriva da sintomi fisici (cuore, respiro) o preoccupazioni esplicite. Tristezza ≠ ansia.

═══════════════════════════════════════════════
📊 STRUTTURA JSON RICHIESTA
═══════════════════════════════════════════════
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
  "deep_psychology": {
    "rumination": <1-10 o null, pensieri ossessivi ricorrenti>,
    "self_efficacy": <1-10 o null, fiducia nelle proprie capacità>,
    "mental_clarity": <1-10 o null, chiarezza mentale>,
    "burnout_level": <1-10 o null, esaurimento professionale/emotivo>,
    "coping_ability": <1-10 o null, capacità di gestire lo stress>,
    "loneliness_perceived": <1-10 o null, solitudine percepita anche in compagnia>,
    "somatic_tension": <1-10 o null, tensione fisica da stress>,
    "appetite_changes": <1-10 o null, alterazioni appetito>,
    "sunlight_exposure": <1-10 o null, esposizione alla luce/uscite>,
    "guilt": <1-10 o null, senso di colpa>,
    "gratitude": <1-10 o null, gratitudine espressa>,
    "irritability": <1-10 o null, irritabilità>
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

═══════════════════════════════════════════════
🎯 REGOLE LIFE_AREAS (CRUCIALI)
═══════════════════════════════════════════════
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

═══════════════════════════════════════════════
📝 METRICHE DASHBOARD
═══════════════════════════════════════════════
- Scegli 4 tra: mood, anxiety, energy, sleep, joy, sadness, anger, fear, apathy, love, work, social, growth, health, stress, calmness, rumination, burnout_level, guilt, irritability
- Basati sui temi REALI della conversazione E sulle priorità utente: ${priorityMetrics.join(', ') || 'nessuna specificata'}
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
      
      // Ensure deep_psychology exists
      if (!analysis.deep_psychology) {
        analysis.deep_psychology = {
          rumination: null,
          self_efficacy: null,
          mental_clarity: null,
          burnout_level: null,
          coping_ability: null,
          loneliness_perceived: null,
          somatic_tension: null,
          appetite_changes: null,
          sunlight_exposure: null,
          guilt: null,
          gratitude: null,
          irritability: null
        };
      }
    } catch (parseError) {
      console.error('[process-session] Failed to parse analysis:', parseError);
      // Fallback with priority metrics preserved
      analysis = {
        vitals: { mood: null, anxiety: null, energy: null, sleep: null },
        emotions: { joy: 0, sadness: 0, anger: 0, fear: 0, apathy: 0 },
        life_areas: { work: null, love: null, health: null, social: null, growth: null },
        deep_psychology: {
          rumination: null,
          self_efficacy: null,
          mental_clarity: null,
          burnout_level: null,
          coping_ability: null,
          loneliness_perceived: null,
          somatic_tension: null,
          appetite_changes: null,
          sunlight_exposure: null,
          guilt: null,
          gratitude: null,
          irritability: null
        },
        voice_analysis: null,
        emotion_tags: [],
        key_facts: [],
        summary: 'Sessione analizzata con valori predefiniti.',
        key_events: [],
        insights: '',
        crisis_risk: 'low',
        clinical_indices: { rumination: null, emotional_openness: null, perceived_stress: null },
        recommended_dashboard_metrics: priorityMetrics.length >= 4 
          ? priorityMetrics.slice(0, 4) 
          : ['mood', 'anxiety', 'energy', 'sleep']
      };
    }

    console.log('[process-session] Parsed analysis:', JSON.stringify(analysis, null, 2));

    const isCrisisAlert = analysis.crisis_risk === 'high';
    const today = new Date().toISOString().split('T')[0];

    // 1. Update the SESSION with all analysis results (including deep_psychology)
    console.log('[process-session] Updating session in database...');
    
    // Map new life_areas to old life_balance_scores for backwards compatibility
    const lifeBalanceScores: LifeBalanceScores = {
      love: analysis.life_areas.love,
      work: analysis.life_areas.work,
      friendship: analysis.life_areas.social,
      energy: analysis.life_areas.health,
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
        sleep_quality: analysis.vitals.sleep,
        deep_psychology: analysis.deep_psychology // NEW: Store deep psychology in session
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

    // 4. NEW: SAVE TO daily_psychology (upsert) - only if any deep psychology metric was detected
    const hasDeepPsychology = Object.values(analysis.deep_psychology).some(v => v !== null);
    if (hasDeepPsychology) {
      console.log('[process-session] Saving to daily_psychology...');
      const { error: psychologyError } = await supabase
        .from('daily_psychology')
        .upsert({
          user_id: user_id,
          date: today,
          // Cognitive
          rumination: analysis.deep_psychology.rumination,
          self_efficacy: analysis.deep_psychology.self_efficacy,
          mental_clarity: analysis.deep_psychology.mental_clarity,
          // Stress & Coping
          burnout_level: analysis.deep_psychology.burnout_level,
          coping_ability: analysis.deep_psychology.coping_ability,
          loneliness_perceived: analysis.deep_psychology.loneliness_perceived,
          // Physiological
          somatic_tension: analysis.deep_psychology.somatic_tension,
          appetite_changes: analysis.deep_psychology.appetite_changes,
          sunlight_exposure: analysis.deep_psychology.sunlight_exposure,
          // Complex Emotional
          guilt: analysis.deep_psychology.guilt,
          gratitude: analysis.deep_psychology.gratitude,
          irritability: analysis.deep_psychology.irritability,
          // Metadata
          source: 'session',
          session_id: session_id
        }, { onConflict: 'user_id,date,source' });

      if (psychologyError) {
        console.error('[process-session] Error saving daily_psychology:', psychologyError);
      } else {
        console.log('[process-session] Deep psychology metrics saved successfully');
      }
    }

    // 5. Update user's profile
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

    // Update dashboard metrics - prefer user's priority metrics
    const recommendedMetrics = analysis.recommended_dashboard_metrics || [];
    
    // Merge recommended with priority (priority first, then fill with recommendations)
    const finalMetrics = [...new Set([
      ...priorityMetrics.filter(m => ALL_AVAILABLE_METRICS.includes(m)),
      ...recommendedMetrics.filter(m => ALL_AVAILABLE_METRICS.includes(m))
    ])].slice(0, 4);
    
    const validFinalMetrics = finalMetrics.length === 4 
      ? finalMetrics 
      : [...finalMetrics, ...['mood', 'anxiety', 'energy', 'sleep'].filter(m => !finalMetrics.includes(m))].slice(0, 4);

    const { error: profileUpdateError } = await supabase
      .from('user_profiles')
      .update({ 
        long_term_memory: updatedMemory,
        life_areas_scores: mergedLifeScores,
        active_dashboard_metrics: validFinalMetrics
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
        deep_psychology: analysis.deep_psychology, // NEW: Include in response
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
