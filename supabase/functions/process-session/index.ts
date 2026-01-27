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

interface GoalUpdate {
  goal_id: string;
  action: 'keep' | 'suggest_add' | 'suggest_remove' | 'achieved';
  reason: string;
  progress_score?: number; // 0-100
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
  goal_updates?: GoalUpdate[];
  suggested_new_goals?: string[];
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

  // Goal progress analysis
  // Goal detection instructions (always active, even if no goals are set yet)
  const goalLabels: Record<string, string> = {
    reduce_anxiety: 'Ridurre Ansia',
    improve_sleep: 'Dormire Meglio',
    find_love: 'Migliorare Relazioni',
    boost_energy: 'Aumentare Energia',
    express_feelings: 'Sfogarmi/Esprimere Emozioni',
    emotional_stability: 'Stabilità Emotiva',
  };

  if (goals.length > 0) {
    const goalsListText = goals.map(g => `- ${g}: ${goalLabels[g] || g}`).join('\n');
    
    instructions.push(`🎯 VALUTAZIONE OBIETTIVI UTENTE:
Gli obiettivi attivi sono:
${goalsListText}

Per OGNI obiettivo, valuta:
1. PROGRESSO (0-100%): Quanto l'utente sta facendo progressi?
2. STATO: "keep" (continua), "achieved" (raggiunto!), "suggest_remove" (non più rilevante)
3. Se l'utente menziona NUOVI focus che potrebbero diventare obiettivi, suggeriscili in "suggested_new_goals".

IDs validi per nuovi obiettivi: reduce_anxiety, improve_sleep, find_love, boost_energy, express_feelings, emotional_stability`);
  }

  // 🎯 AI GOAL DETECTION: Always look for new goals, even if user has none yet
  instructions.push(`
═══════════════════════════════════════════════
🎯 RILEVAMENTO AUTOMATICO NUOVI OBIETTIVI (CRITICO!)
═══════════════════════════════════════════════
DEVI analizzare la conversazione per rilevare NUOVI OBIETTIVI che l'utente potrebbe avere.

📌 OBIETTIVI MENTALI (ID predefiniti):
- "Vorrei dormire meglio" → improve_sleep
- "Devo gestire la mia ansia" → reduce_anxiety
- "Voglio migliorare le mie relazioni" → find_love
- "Ho bisogno di più energia" → boost_energy
- "Voglio stabilità emotiva" → emotional_stability
- "Ho bisogno di sfogarmi" → express_feelings

📌 OBIETTIVI CUSTOM (NUOVA FEATURE!) - Aggiungi a "custom_objectives_detected":
L'utente può avere obiettivi NON MENTALI. DEVI rilevarli e restituirli in un array dedicato.

CATEGORIE CUSTOM:
- BODY (corpo): "Voglio dimagrire", "Perdere peso", "Fare più sport", "Smettere di fumare"
  - Se specifica "5kg" → target_value: 5, unit: "kg"
  - Se NON specifica → target_value: null (Aria chiederà)

- STUDY (studio): "Devo superare l'esame", "Voglio laurearmi", "Studiare per..."
  - Se specifica l'esame → title: "Superare esame [nome]"

- WORK (lavoro): "Voglio una promozione", "Cambiare lavoro", "Guadagnare di più"

- FINANCE (finanze): "Risparmiare", "Mettere da parte soldi", "Comprare casa"
  - Se specifica cifra "5000€" → target_value: 5000, unit: "€"

- RELATIONSHIPS (relazioni): "Trovare partner", "Migliorare rapporto con..."

- GROWTH (crescita): "Imparare a...", "Leggere di più", "Meditare ogni giorno"

⚠️ FORMATO per custom_objectives_detected (array di oggetti):
{
  "category": "body|study|work|finance|relationships|growth",
  "title": "Titolo breve dell'obiettivo",
  "description": "Descrizione opzionale",
  "target_value": <numero o null se non specificato>,
  "unit": "kg|€|ore|libri|ecc o null",
  "ai_feedback": "Messaggio di Aria (es: 'Di quanti kg vuoi dimagrire?')"
}

ESEMPIO:
- Utente dice: "Vorrei perdere peso, sono ingrassato troppo"
  → custom_objectives_detected: [{
       "category": "body",
       "title": "Perdere peso",
       "description": null,
       "target_value": null,
       "unit": "kg",
       "ai_feedback": "Di quanti kg vorresti dimagrire?"
     }]

- Utente dice: "Devo risparmiare 3000 euro per le vacanze"
  → custom_objectives_detected: [{
       "category": "finance",
       "title": "Risparmiare per le vacanze",
       "description": null,
       "target_value": 3000,
       "unit": "€",
       "ai_feedback": null
     }]

⚠️ NON inventare obiettivi. Solo se ESPLICITAMENTE menzionati.
`);

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

    // 🎯 Get all active objectives for progress tracking
    const { data: activeObjectives } = await supabase
      .from('user_objectives')
      .select('id, title, category, target_value, current_value, unit, status')
      .eq('user_id', user_id)
      .eq('status', 'active');

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

    // 🎯 Build objectives tracking instructions for progress extraction
    let objectivesTrackingPrompt = '';
    if (activeObjectives && activeObjectives.length > 0) {
      const objectivesList = activeObjectives.map(o => {
        const progress = o.target_value 
          ? `${o.current_value || 0}/${o.target_value} ${o.unit || ''}` 
          : 'target non definito';
        return `- ID: ${o.id} | "${o.title}" (${o.category}) | Progresso: ${progress}`;
      }).join('\n');
      
      objectivesTrackingPrompt = `
═══════════════════════════════════════════════
🎯 OBIETTIVI ATTIVI - RILEVA PROGRESSI (CRUCIALE!)
═══════════════════════════════════════════════
L'utente ha questi obiettivi REALI da tracciare:
${objectivesList}

**DEVI estrarre aggiornamenti di progresso dalla conversazione:**

ESEMPI DI RILEVAMENTO:
- Utente dice: "Oggi peso 73kg" → per obiettivo "Perdere peso":
  objective_progress_updates: [{"objective_id": "<uuid>", "new_value": 73, "note": "Peso registrato", "completed": false}]

- Utente dice: "Ho messo da parte 800 euro questo mese" → per obiettivo "Risparmiare":
  objective_progress_updates: [{"objective_id": "<uuid>", "new_value": 800, "note": "Risparmio mensile", "completed": false}]

- Utente dice: "Questa settimana ho studiato 12 ore" → per obiettivo "Studiare 20h/settimana":
  objective_progress_updates: [{"objective_id": "<uuid>", "new_value": 12, "note": null, "completed": false}]

- Utente dice: "Ce l'ho fatta! Ho raggiunto i 70kg!" → se target era 70kg:
  objective_progress_updates: [{"objective_id": "<uuid>", "new_value": 70, "note": "Obiettivo raggiunto!", "completed": true}]

**REGOLE:**
- Estrai SOLO valori NUMERICI ESPLICITI menzionati
- Se l'utente NON menziona un valore numerico specifico, NON inventare
- Per obiettivi senza unità (es. "superare esame"), usa 100 per completato, 0-99 per progresso stimato
- Se new_value >= target_value, imposta completed: true
- NON modificare obiettivi che non sono menzionati nella conversazione
`;
    }

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
    const analysisPrompt = `SEI UN ANALISTA CLINICO OMNISCIENTE con formazione in Psichiatria, Psicologia Clinica e Neuroscienze.
Analizza la conversazione e restituisci SEMPRE un JSON valido.
${personalizedInstructions}
${dataHunterLifeAreas}
${deepPsychologyPrompt}
${objectivesTrackingPrompt}

═══════════════════════════════════════════════
🔍 SCREENING PSICHIATRICO AVANZATO
═══════════════════════════════════════════════
Durante l'analisi, cerca PATTERN per questi disturbi:

**DEPRESSIONE MAGGIORE:**
- Criteri: Anedonia + umore deflesso + fatica + alterazioni sonno/appetito + colpa per almeno 2 settimane
- Se criteri presenti → crisis_risk: "medium"
- Se ideazione suicidaria → crisis_risk: "high"
- Nota in insights se pattern rilevato

**DISTURBO BIPOLARE (Segnali Ipomania):**
- Energia eccessiva + ridotto bisogno di sonno + grandiosità + impulsività
- Parla veloce, idee accelerate, progetti grandiosi
- Se presenti → aggiungere nota a insights: "Pattern compatibile con ipomania"

**PTSD/TRAUMA:**
- Flashback, evitamento di trigger, ipervigilanza, numbing emotivo
- Menzioni di traumi passati, incubi ricorrenti
- Se presenti → nota clinica + suggerire EMDR/specialista

**OCD:**
- Pensieri intrusivi ego-distonici + rituali/compulsioni
- DISTINGUI da ruminazione (ego-sintonica, senza rituali)
- OCD: "Non voglio pensarlo ma non riesco a fermarlo"
- Ruminazione: "Continuo a pensarci perché è importante"

**DISTURBI ALIMENTARI:**
- Alterazioni appetito + body image issues + colpa post-pasto
- Restrizione, abbuffate, comportamenti compensatori
- Se presenti → nota critica, suggerire team specializzato

**GAD (Ansia Generalizzata):**
- Preoccupazione cronica su molteplici aree
- Difficoltà a controllare la preoccupazione
- Tensione muscolare, irritabilità, disturbi sonno

**DISTURBO DI PANICO:**
- Attacchi improvvisi, paura della paura
- Evitamento agorafobico

**ANSIA SOCIALE:**
- Paura del giudizio, evitamento situazioni sociali
- Rimuginazione post-evento

**BURNOUT:**
- Esaurimento + Cinismo + Inefficacia professionale
- Spesso confuso con depressione ma legato specificamente al lavoro

**DISTURBI DELLA PERSONALITÀ (Solo riconoscimento):**
- Borderline: Instabilità, paura abbandono, splitting, impulsività
- Se pattern rilevato → nota: "Tratti borderline possibili, valutare DBT"

═══════════════════════════════════════════════
⚠️ REGOLE ANTI-HALLUCINATION (CRITICHE)
═══════════════════════════════════════════════
- NON INVENTARE DATI. Se qualcosa non è espresso, usa 0 per emozioni o null per metriche opzionali.
- APATIA: Assegna > 0 SOLO per frasi esplicite come "non sento niente", "vuoto", "indifferenza totale". 
  Stanchezza fisica o noia NON sono apatia → apathy = 0.
- SONNO: Assegna valore SOLO se l'utente menziona esplicitamente il sonno/riposo. Altrimenti null.
- ANSIA: Deriva da sintomi fisici (cuore, respiro) o preoccupazioni esplicite. Tristezza ≠ ansia.
- BURNOUT: Assegna SOLO se esplicitamente legato a lavoro/doveri. Stanchezza generica ≠ burnout.

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
  "personal_details": {
    "mentioned_names": ["nomi di persone care menzionate: partner, amici, familiari"],
    "hobbies_interests": ["hobby, passioni, interessi emersi"],
    "likes": ["cose che piacciono all'utente: film, serie, musica, cibo"],
    "dislikes": ["cose che non piacciono o infastidiscono"],
    "life_events": ["eventi di vita importanti: lavoro, relazioni, salute"],
    "preferences": ["preferenze personali: come gli piace essere trattato, supportato"]
  },
  "summary": "<riassunto 1-2 frasi>",
  "key_events": ["evento chiave"],
  "insights": "<osservazione clinica breve>",
  "crisis_risk": "low|medium|high",
  "clinical_indices": {
    "rumination": <1-10 o null>,
    "emotional_openness": <1-10 o null>,
    "perceived_stress": <1-10 o null>
  },
  "recommended_dashboard_metrics": ["metric1", "metric2", "metric3", "metric4"],
  "goal_updates": [
    {"goal_id": "reduce_anxiety", "action": "keep|achieved|suggest_remove", "reason": "Spiegazione breve", "progress_score": 75}
  ],
  "suggested_new_goals": ["goal_id se emerge un nuovo focus dalla conversazione"],
  "custom_objectives_detected": [
    {"category": "body|study|work|finance|relationships|growth", "title": "Titolo obiettivo", "description": "Descrizione opzionale", "target_value": null, "unit": "kg|€|ore|null", "ai_feedback": "Messaggio se target mancante"}
  ],
  "objective_progress_updates": [
    {"objective_id": "uuid dell'obiettivo", "new_value": <numero>, "note": "Nota opzionale", "completed": false}
  ]
}

═══════════════════════════════════════════════
👯 ESTRAZIONE DETTAGLI PERSONALI (MEMORIA AMICO)
═══════════════════════════════════════════════
Un buon amico ricorda i dettagli della vita dell'utente.
Estrai TUTTO ciò che potrebbe servire per future conversazioni amichevoli:

**NOMI DA RICORDARE (mentioned_names):**
- Partner: "Marco mi ha detto..." → "Partner: Marco"
- Amici: "La mia amica Sara..." → "Amica: Sara"
- Familiari: "Mia madre..." → "Madre menzionata"
- Colleghi: "Il mio capo Giovanni..." → "Capo: Giovanni"

**HOBBY E INTERESSI (hobbies_interests):**
- Sport: "Gioco a calcetto" → "Calcetto"
- Creativi: "Sto imparando a suonare la chitarra" → "Chitarra"
- Altri: "Mi piace cucinare" → "Cucina"

**PREFERENZE (likes/dislikes):**
- Film/Serie: "Ho visto quella nuova serie su Netflix" → "Guarda serie Netflix"
- Musica: "Amo i Coldplay" → "Fan Coldplay"
- Cibo: "Adoro la pizza" → "Ama la pizza"

**EVENTI DI VITA (life_events):**
- "Ho iniziato un nuovo lavoro" → "Nuovo lavoro"
- "Mi sono trasferito" → "Trasferimento recente"
- "Sto cercando casa" → "In cerca di casa"

⚠️ Estrai SOLO ciò che è esplicito. NON inventare.

═══════════════════════════════════════════════
🎯 REGOLE LIFE_AREAS - VALUTAZIONE STATO ATTUALE (CRUCIALI!)
═══════════════════════════════════════════════
⚠️ IMPORTANTE: Stai valutando lo STATO ATTUALE dell'utente, NON una variazione incrementale.
Il punteggio che assegni È IL VOTO FINALE che verrà mostrato in Dashboard.
DEVI considerare la GRAVITÀ degli eventi, non fare medie con il passato.

📌 SCALA DI GRAVITÀ (eventi determinano punteggio assoluto):
- EVENTI DEVASTANTI → 1-2:
  - "Mi sono lasciato/a" → love: 1-2 (anche se ieri era 10!)
  - "Ho perso il lavoro" → work: 1-2
  - "È morto qualcuno che amavo" → mood: 1-2
  - "Sono crollato, non ce la faccio più" → qualsiasi area coinvolta: 1-2

- EVENTI MOLTO NEGATIVI → 3-4:
  - "Ho litigato gravemente col partner" → love: 3-4
  - "Sono stato licenziato/demansionato" → work: 3-4
  - "Ho avuto una brutta diagnosi" → health: 3
  - "I miei amici mi hanno tradito" → social: 3

- DIFFICOLTÀ MODERATE → 4-5:
  - "Il lavoro è stressante" → work: 4-5
  - "Problemi col partner ma ci parliamo" → love: 5
  - "Mi sento giù ultimamente" → mood: 4-5

- SITUAZIONE NEUTRA/OK → 6:
  - "Sono single ma sto bene" → love: 6
  - "Il lavoro è normale, routine" → work: 6

- BUONA SITUAZIONE → 7-8:
  - "Il lavoro va bene" → work: 7
  - "Sono felice con il mio partner" → love: 7-8
  - "Ho visto gli amici, bello" → social: 7

- OTTIMA SITUAZIONE → 9-10:
  - "Sono innamoratissimo/a!" → love: 9
  - "Promozione! Fantastico!" → work: 9
  - "Mi sento al top della forma" → health: 9

🚨 REGOLA D'ORO: Se l'utente racconta un EVENTO SIGNIFICATIVO (rottura, lutto, licenziamento),
il punteggio DEVE riflettere la gravità attuale, INDIPENDENTEMENTE dai valori passati.
Sei uno psicologo: se qualcuno ti dice "mi sono lasciato e sto male", non gli dici "beh, la media è 7.1".

- Se NON menzionata l'area → null (NON inventare)

${voiceHeuristicsPrompt}

═══════════════════════════════════════════════
📝 METRICHE DASHBOARD
═══════════════════════════════════════════════
- Scegli 4 tra: mood, anxiety, energy, sleep, joy, sadness, anger, fear, apathy, love, work, social, growth, health, stress, calmness, rumination, burnout_level, guilt, irritability
- Basati sui temi REALI della conversazione E sulle priorità utente: ${priorityMetrics.join(', ') || 'nessuna specificata'}
- Default se conversazione neutra: ["mood", "anxiety", "energy", "sleep"]

⚡ I valori che restituisci SOVRASCRIVERANNO quelli precedenti (non viene fatta media).
Questo è intenzionale: se oggi è cambiato qualcosa, il Dashboard deve riflettere il cambiamento.

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
    // Also store health and energy separately for clarity
    const lifeBalanceScores: LifeBalanceScores & { health?: number | null } = {
      love: analysis.life_areas.love,
      work: analysis.life_areas.work,
      friendship: analysis.life_areas.social,
      energy: analysis.vitals.energy, // Energy comes from vitals, not life_areas
      growth: analysis.life_areas.growth,
      health: analysis.life_areas.health, // Store health separately
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

    // Update long-term memory - include personal details for "friend memory"
    const existingMemory = profileData?.long_term_memory || [];
    
    // Extract personal details from analysis if present
    const personalDetails = (analysis as any).personal_details || {};
    const personalMemoryItems: string[] = [];
    
    // Add mentioned names
    if (personalDetails.mentioned_names?.length > 0) {
      personalDetails.mentioned_names.forEach((name: string) => {
        if (name && !existingMemory.includes(name)) {
          personalMemoryItems.push(`[PERSONA] ${name}`);
        }
      });
    }
    
    // Add hobbies/interests
    if (personalDetails.hobbies_interests?.length > 0) {
      personalDetails.hobbies_interests.forEach((hobby: string) => {
        if (hobby && !existingMemory.some((m: string) => m.includes(hobby))) {
          personalMemoryItems.push(`[HOBBY] ${hobby}`);
        }
      });
    }
    
    // Add likes
    if (personalDetails.likes?.length > 0) {
      personalDetails.likes.forEach((like: string) => {
        if (like && !existingMemory.some((m: string) => m.includes(like))) {
          personalMemoryItems.push(`[PIACE] ${like}`);
        }
      });
    }
    
    // Add life events
    if (personalDetails.life_events?.length > 0) {
      personalDetails.life_events.forEach((event: string) => {
        if (event && !existingMemory.some((m: string) => m.includes(event))) {
          personalMemoryItems.push(`[EVENTO] ${event}`);
        }
      });
    }
    
    // Combine key_facts with personal memory items
    const newMemoryItems = [...analysis.key_facts, ...personalMemoryItems];
    const updatedMemory = [...existingMemory, ...newMemoryItems].slice(-60); // Increased to 60 for richer memory

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

    // 🎯 AI-DRIVEN GOAL MANAGEMENT: Add new goals suggested by AI
    const validGoalIds = ['reduce_anxiety', 'improve_sleep', 'find_love', 'boost_energy', 'express_feelings', 'emotional_stability'];
    const suggestedNewGoals = (analysis.suggested_new_goals || []).filter(g => validGoalIds.includes(g));
    
    // Merge existing goals with AI-suggested ones (no duplicates)
    const updatedGoals = [...new Set([...selectedGoals, ...suggestedNewGoals])];
    
    // Log if new goals were added
    if (suggestedNewGoals.length > 0) {
      console.log('[process-session] AI suggested new goals:', suggestedNewGoals);
      console.log('[process-session] Updated goals list:', updatedGoals);
    }

    // 🎯 NEW: Save custom objectives detected by AI to user_objectives table
    const customObjectives = (analysis as any).custom_objectives_detected || [];
    if (customObjectives.length > 0) {
      console.log('[process-session] AI detected custom objectives:', customObjectives);
      
      for (const obj of customObjectives) {
        // Check if similar objective already exists
        const { data: existingObj } = await supabase
          .from('user_objectives')
          .select('id')
          .eq('user_id', user_id)
          .ilike('title', `%${obj.title}%`)
          .eq('status', 'active')
          .maybeSingle();
        
        if (!existingObj) {
          // Create new objective
          const { error: objError } = await supabase
            .from('user_objectives')
            .insert({
              user_id: user_id,
              category: obj.category || 'growth',
              title: obj.title,
              description: obj.description || null,
              target_value: obj.target_value || null,
              unit: obj.unit || null,
              current_value: 0,
              status: 'active',
              ai_feedback: obj.ai_feedback || null,
              progress_history: []
            });
          
          if (objError) {
            console.error('[process-session] Error creating custom objective:', objError);
          } else {
            console.log('[process-session] Created custom objective:', obj.title);
          }
        } else {
          console.log('[process-session] Objective already exists:', obj.title);
        }
      }
    }

    // 🎯 NEW: Update progress for existing objectives
    const objectiveProgressUpdates = (analysis as any).objective_progress_updates || [];
    if (objectiveProgressUpdates.length > 0) {
      console.log('[process-session] AI detected objective progress updates:', objectiveProgressUpdates);
      
      for (const update of objectiveProgressUpdates) {
        if (!update.objective_id || update.new_value === undefined) continue;
        
        // Get the existing objective to update progress history
        const { data: existingObj } = await supabase
          .from('user_objectives')
          .select('id, current_value, progress_history, target_value')
          .eq('id', update.objective_id)
          .eq('user_id', user_id)
          .maybeSingle();
        
        if (existingObj) {
          const newHistory = [
            ...((existingObj.progress_history as any[]) || []),
            { 
              date: new Date().toISOString(), 
              value: update.new_value, 
              note: update.note || null 
            }
          ];
          
          const newStatus = update.completed || 
            (existingObj.target_value && update.new_value >= existingObj.target_value) 
              ? 'achieved' 
              : 'active';
          
          const { error: updateError } = await supabase
            .from('user_objectives')
            .update({
              current_value: update.new_value,
              progress_history: newHistory,
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', update.objective_id)
            .eq('user_id', user_id);
          
          if (updateError) {
            console.error('[process-session] Error updating objective progress:', updateError);
          } else {
            console.log(`[process-session] Updated objective ${update.objective_id}: ${update.new_value}`);
            if (newStatus === 'achieved') {
              console.log(`[process-session] 🎉 Objective achieved!`);
            }
          }
        }
      }
    }

    const { error: profileUpdateError } = await supabase
      .from('user_profiles')
      .update({ 
        long_term_memory: updatedMemory,
        life_areas_scores: mergedLifeScores,
        active_dashboard_metrics: validFinalMetrics,
        selected_goals: updatedGoals // 🎯 Save AI-updated goals
      })
      .eq('user_id', user_id);

    if (profileUpdateError) {
      console.error('[process-session] Error updating profile:', profileUpdateError);
    } else {
      console.log('[process-session] Profile updated with', analysis.key_facts.length, 'new facts');
      if (suggestedNewGoals.length > 0) {
        console.log('[process-session] Added', suggestedNewGoals.length, 'new AI-detected goals');
      }
      if (customObjectives.length > 0) {
        console.log('[process-session] Created', customObjectives.length, 'custom objectives');
      }
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
