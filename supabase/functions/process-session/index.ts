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
  // Secondary emotions
  shame?: number;
  jealousy?: number;
  hope?: number;
  frustration?: number;
  nostalgia?: number;
  // NEW: Extended emotions (Profilazione 360°)
  nervousness?: number;    // Nervosismo/agitazione
  overwhelm?: number;      // Sopraffazione
  excitement?: number;     // Eccitazione/entusiasmo
  disappointment?: number; // Delusione
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

// NEW: Deep Psychology Metrics Interface (16 parametri totali)
interface DeepPsychology {
  // Cognitive (4)
  rumination: number | null;
  self_efficacy: number | null;
  mental_clarity: number | null;
  concentration: number | null;    // NEW: Livello di concentrazione
  // Stress & Coping (3)
  burnout_level: number | null;
  coping_ability: number | null;
  loneliness_perceived: number | null;
  // Physiological (3)
  somatic_tension: number | null;
  appetite_changes: number | null;
  sunlight_exposure: number | null;
  // Complex Emotional (4)
  guilt: number | null;
  gratitude: number | null;
  irritability: number | null;
  // NEW: Extended Psychology (Profilazione 360°)
  motivation: number | null;        // Livello di motivazione
  intrusive_thoughts: number | null; // Pensieri intrusivi
  self_worth: number | null;        // Autostima/valore di sé
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

interface MemoryCorrection {
  wrong_fact: string;
  corrected_to: string;
  keywords_to_remove: string[];
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
  corrections: MemoryCorrection[];  // NEW: Detected corrections from user
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

📌 OBIETTIVI CUSTOM (IMPORTANTE!) - Aggiungi a "custom_objectives_detected":
L'utente può avere obiettivi NON MENTALI. DEVI rilevarli e restituirli.

CATEGORIE CUSTOM:
- BODY (corpo): "Voglio dimagrire", "Prendere peso", "Fare più sport"
  ⚠️ REGOLA SPECIALE BODY/FINANCE: Se l'utente dice "voglio prendere 10kg":
    - target_value: null (chiedi qual è il peso finale desiderato!)
    - starting_value: peso_attuale (SE menzionato nella conversazione o memoria)
    - ai_feedback: "Quanto pesi adesso? Così so da dove partiamo!"
  
  Se l'utente dice "peso 70kg e voglio arrivare a 80kg":
    - starting_value: 70
    - target_value: 80
    - unit: "kg"
    - ai_feedback: null (tutto completo!)

- FINANCE (finanze): "Risparmiare 5000€"
  - Se specifica cifra → target_value: 5000, unit: "€"
  - Se NON specifica → target_value: null, ai_feedback: "Quanto vorresti risparmiare?"

- STUDY (studio): "Superare l'esame", "Studiare 20h/settimana"
- WORK (lavoro): "Voglio una promozione"
- RELATIONSHIPS (relazioni): "Trovare partner"
- GROWTH (crescita): "Leggere di più", "Meditare"

⚠️ FORMATO per custom_objectives_detected:
{
  "category": "body|study|work|finance|relationships|growth",
  "title": "Titolo breve",
  "description": "Descrizione opzionale",
  "starting_value": <numero peso/risparmio attuale SE noto, altrimenti null>,
  "target_value": <numero obiettivo finale SE specificato, altrimenti null>,
  "unit": "kg|€|ore|null",
  "ai_feedback": "Messaggio se manca starting_value O target_value"
}

ESEMPI CORRETTI:
1. Utente dice: "Vorrei prendere 10kg, peso 65"
   → {"category": "body", "title": "Prendere peso", "starting_value": 65, "target_value": 75, "unit": "kg", "ai_feedback": null}

2. Utente dice: "Devo dimagrire" (senza numeri)
   → {"category": "body", "title": "Perdere peso", "starting_value": null, "target_value": null, "unit": "kg", "ai_feedback": "Quanto pesi adesso e qual è il tuo peso obiettivo?"}

3. Utente dice: "Voglio risparmiare per le vacanze"
   → {"category": "finance", "title": "Risparmiare per vacanze", "starting_value": null, "target_value": null, "unit": "€", "ai_feedback": "Che cifra hai in mente?"}

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
      .select('id, title, category, target_value, current_value, unit, status, starting_value')
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
        // Include starting_value for context
        const startVal = o.starting_value !== null ? o.starting_value : 'NON DEFINITO';
        const currVal = o.current_value ?? 0;
        const targetVal = o.target_value !== null ? o.target_value : 'NON DEFINITO';
        return `- ID: ${o.id} | "${o.title}" (${o.category}) | Partenza: ${startVal} ${o.unit || ''} | Attuale: ${currVal} ${o.unit || ''} | Target: ${targetVal} ${o.unit || ''}`;
      }).join('\n');
      
      objectivesTrackingPrompt = `
═══════════════════════════════════════════════
🎯 OBIETTIVI ATTIVI - RILEVA PROGRESSI (CRUCIALE!)
═══════════════════════════════════════════════
L'utente ha questi obiettivi REALI da tracciare:
${objectivesList}

**DEVI estrarre aggiornamenti di progresso dalla conversazione:**

⚠️ REGOLA FONDAMENTALE: DISTINGUI TRA:
1. VALORE ATTUALE (il peso/valore di oggi) → aggiorna current_value, completed: FALSE
2. OBIETTIVO RAGGIUNTO (l'utente ESPLICITAMENTE festeggia o dichiara di aver raggiunto il target) → completed: TRUE

ESEMPI DI VALORE ATTUALE (completed: FALSE):
- Utente dice: "peso 70kg" → Sta comunicando il suo peso attuale
  → objective_progress_updates: [{"objective_id": "<uuid>", "new_value": 70, "note": "Peso aggiornato", "completed": false}]

- Utente dice: "Oggi peso 73kg, vediamo come va" → Sta comunicando il progresso
  → completed: FALSE (sta solo aggiornando, non ha raggiunto nessun traguardo)

ESEMPI DI OBIETTIVO RAGGIUNTO (completed: TRUE):
- Utente dice: "Ce l'ho fatta! Finalmente sono arrivato a 80kg!" E il target era 80kg
  → completed: TRUE (celebra esplicitamente il raggiungimento)

- Utente dice: "Obiettivo raggiunto!" O "Ho centrato il mio goal!"
  → completed: TRUE (dichiarazione esplicita)

⚠️ ATTENZIONE PESO:
- Se l'obiettivo è "Prendere peso" (aumentare) e l'utente dice "peso 70kg":
  - Se starting_value è NON DEFINITO → questo potrebbe essere il PUNTO DI PARTENZA
  - NON marcare completed: true solo perché un numero corrisponde!
  - Solo se l'utente CELEBRA o il valore SUPERA il target in direzione corretta

⚠️ QUANDO starting_value È "NON DEFINITO":
- Se l'utente fornisce un valore numerico E starting_value manca:
  - Questo valore dovrebbe essere usato come starting_value (punto di partenza)
  - Aggiungi "is_starting_value": true nel JSON
  
ESEMPIO:
- Obiettivo: "Prendere peso" con Partenza: NON DEFINITO
- Utente dice: "peso 70kg"
→ {"objective_id": "<uuid>", "new_value": 70, "note": "Peso iniziale registrato", "completed": false, "is_starting_value": true}

**REGOLE:**
- Estrai SOLO valori NUMERICI ESPLICITI menzionati
- Se l'utente NON menziona un valore numerico specifico, NON inventare
- completed: TRUE solo se l'utente ESPLICITAMENTE dichiara di aver raggiunto l'obiettivo
- NON modificare obiettivi che non sono menzionati nella conversazione
- Se starting_value è NON DEFINITO e l'utente dà un valore → is_starting_value: true
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
- concentration (NEW): "Riesco a concentrarmi", "focus", "mente lucida sul task" → 8-10
  "Mi distraggo", "non riesco a focalizzarmi", "pensieri vagano" → 1-4
  - Inferisci anche da come l'utente parla (coerente vs frammentato)

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

**NUOVI PARAMETRI PSICOLOGICI:**
- motivation (NEW): "Sono motivato", "voglio farlo", "ci credo" → 8-10
  "Non ho voglia", "a che scopo", "perché dovrei" → 1-4
  - CORRELATO ma diverso da energia: uno può avere energia ma non motivazione
- intrusive_thoughts (NEW): "Non riesco a togliermi dalla testa...", "pensiero che torna", "ossessione" → 7-10
  - Diverso da RUMINAZIONE: i pensieri intrusivi sono ego-distonici (non li vuole)
  - La ruminazione è ego-sintonica (ci pensa perché "deve")
- self_worth (NEW): "Mi sento inutile", "non valgo niente", "sono un fallimento" → 1-3
  "Sono fiero di me", "ce l'ho fatta", "sono capace" → 8-10
  - CORRELATO a self_efficacy ma più ampio (valore personale vs capacità)

═══════════════════════════════════════════════
😰 EMOZIONI AGGIUNTIVE - ESTRAZIONE SEMANTICA
═══════════════════════════════════════════════

**NERVOSISMO (nervousness):**
- "Sono nervoso", "agitato", "non riesco a stare fermo", "irrequieto" → 7-10
- Movimento continuo, mani sudate, parlare veloce → inferisci 5-7
- Diverso da ANSIA: il nervosismo è più fisico/superficiale, l'ansia è più profonda

**SOPRAFFAZIONE (overwhelm):**
- "Mi sento sopraffatto", "è troppo", "non ce la faccio", "troppe cose" → 7-10
- Menzione di liste infinite, scadenze multiple, responsabilità eccessive → 6-8
- CRITICO per burnout detection

**ECCITAZIONE (excitement):**
- "Sono elettrizzato", "non vedo l'ora", "entusiasta", "gasato" → 7-10
- Nuove opportunità, eventi positivi imminenti → inferisci
- Può coesistere con nervosismo (eccitazione nervosa)

**DELUSIONE (disappointment):**
- "Sono deluso", "mi aspettavo di più", "che peccato", "speravo meglio" → 7-10
- Aspettative non soddisfatte, promesse non mantenute → 5-7

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
🔄 RILEVAMENTO CORREZIONI (CRUCIALE!)
═══════════════════════════════════════════════
Se l'utente CORREGGE un'informazione precedente, DEVI rilevarlo e NON salvare l'errore.

**PATTERN CORRETTIVI DA RICONOSCERE:**
- "No", "Non è così", "Hai capito male", "Mi sono spiegato male"
- "Intendevo dire...", "In realtà...", "Volevo dire..."
- "Non ho detto questo", "Hai frainteso", "No aspetta"
- "Non intendevo questo", "Mi sono espresso male"

**QUANDO RILEVI UNA CORREZIONE:**
1. L'informazione PRECEDENTE (di Aria) è SBAGLIATA → NON salvarla in key_facts
2. L'informazione NUOVA dopo la correzione è quella GIUSTA → salva SOLO questa
3. Aggiungi al campo "corrections" cosa era sbagliato

**FORMATO corrections:**
"corrections": [
  {
    "wrong_fact": "L'utente lavora come ingegnere",
    "corrected_to": "L'utente studia ingegneria, non lavora ancora",
    "keywords_to_remove": ["lavora come ingegnere", "ingegnere di professione"]
  }
]

**ESEMPIO:**
Utente: "Lavoro come programmatore"
Aria: "Da quanto fai il programmatore?"
Utente: "No aspetta, studio informatica, non lavoro ancora"

→ key_facts: ["Studia informatica", "Non lavora ancora"] (NON "lavora come programmatore"!)
→ corrections: [{"wrong_fact": "Lavora come programmatore", "corrected_to": "Studia informatica", "keywords_to_remove": ["lavora come programmatore", "programmatore di lavoro"]}]
→ summary: "L'utente studia informatica (ha corretto un malinteso precedente)"

⚠️ ATTENZIONE: Se l'utente corregge, il summary deve riflettere SOLO l'info corretta!

═══════════════════════════════════════════════
⚠️ REGOLE ANTI-HALLUCINATION (CRITICHE)
═══════════════════════════════════════════════
- NON INVENTARE DATI completamente. Ma INFERISCI emozioni dal contesto emotivo complessivo.
- APATIA: Assegna > 0 SOLO per frasi esplicite come "non sento niente", "vuoto", "indifferenza totale". 
  Stanchezza fisica o noia NON sono apatia → apathy = 0.
- SONNO: Assegna valore SOLO se l'utente menziona esplicitamente il sonno/riposo. Altrimenti null.
- ANSIA: Deriva da sintomi fisici (cuore, respiro) o preoccupazioni esplicite. Tristezza ≠ ansia.
- BURNOUT: Assegna SOLO se esplicitamente legato a lavoro/doveri. Stanchezza generica ≠ burnout.

═══════════════════════════════════════════════
⚠️ REGOLE KEY_FACTS (ANTI-ALLUCINAZIONE ESTESE)
═══════════════════════════════════════════════

**SALVA in key_facts SOLO:**
- Fatti ESPLICITAMENTE dichiarati dall'utente
- Informazioni CONFERMATE (non corrette successivamente)
- La versione CORRETTA se l'utente ha fatto una correzione

**NON salvare MAI:**
- Tue deduzioni o ipotesi non confermate
- Domande retoriche ("Forse sei stressato?" → NON è un fatto!)
- Informazioni che l'utente ha corretto → usa il campo corrections
- Risposte a tue domande che non sono state confermate dall'utente

**NEGAZIONI (RISPETTA SEMPRE!):**
- "Non mi piace correre" → "[NON PIACE] correre" (rispetta la negazione!)
- "Non sono mai stato in Giappone" → NON salvare "Giappone" come interesse
- "Non ho figli" → "[NO] figli", non salvare "ha figli"

**CONTESTO TEMPORALE (IMPORTANTE!):**
- "Ieri ero triste" → "[IERI] era triste" (non "è triste" permanente)
- "L'anno scorso lavoravo a Roma" → "[PASSATO] lavorava a Roma"
- "Prima facevo il cuoco" → "[PASSATO] faceva il cuoco"

═══════════════════════════════════════════════
🔗 CORRELAZIONE VITALI → EMOZIONI (IMPORTANTE!)
═══════════════════════════════════════════════
Le emozioni devono RIFLETTERE il contesto emotivo complessivo. USA queste regole:

**ANSIA → PAURA (fear):**
- Se anxiety >= 5, DEVI assegnare fear >= anxiety * 0.6 (minimo)
- Ansia e paura sono correlate: preoccupazione = forma di paura
- Esempio: anxiety: 6 → fear: almeno 4

**UMORE BASSO → TRISTEZZA (sadness):**
- Se mood <= 4, DEVI assegnare sadness >= (10 - mood) * 0.5
- Umore basso implica componente di tristezza sottostante
- Esempio: mood: 3 → sadness: almeno 3-4

**AREE VITA NEGATIVE → EMOZIONI CORRELATE:**
- love <= 3 e contesto negativo → sadness += 2-3 (dolore relazionale)
- work <= 3 + stress → anger o fear += 2 (frustrazione/paura)

**GIOIA NON ESCLUSIVA:**
- Se joy > 0 MA anche mood basso o anxiety alta, BILANCIA con altre emozioni
- Evita il paradosso "100% gioia" quando ci sono segnali negativi

**REGOLA D'ORO:**
Il MIX EMOTIVO deve riflettere la COMPLESSITÀ dello stato psicologico.
Un utente con ansia 6 e umore 4 NON può avere solo "gioia 100%" - 
deve avere fear >= 3 e sadness >= 2 come minimo.

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
    "apathy": <0-10, 0 se non ESPLICITAMENTE vuoto/distacco>,
    "shame": <0-10, vergogna/imbarazzo>,
    "jealousy": <0-10, gelosia/invidia>,
    "hope": <0-10, speranza/ottimismo>,
    "frustration": <0-10, frustrazione/impazienza>,
    "nostalgia": <0-10, nostalgia/malinconia del passato>,
    "nervousness": <0-10, nervosismo/agitazione - diverso da ansia, più fisico>,
    "overwhelm": <0-10, sopraffazione - troppo da gestire>,
    "excitement": <0-10, eccitazione/entusiasmo positivo>,
    "disappointment": <0-10, delusione da aspettative non soddisfatte>
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
    "concentration": <1-10 o null, livello di concentrazione/focus>,
    "burnout_level": <1-10 o null, esaurimento professionale/emotivo>,
    "coping_ability": <1-10 o null, capacità di gestire lo stress>,
    "loneliness_perceived": <1-10 o null, solitudine percepita anche in compagnia>,
    "somatic_tension": <1-10 o null, tensione fisica da stress>,
    "appetite_changes": <1-10 o null, alterazioni appetito>,
    "sunlight_exposure": <1-10 o null, esposizione alla luce/uscite>,
    "guilt": <1-10 o null, senso di colpa>,
    "gratitude": <1-10 o null, gratitudine espressa>,
    "irritability": <1-10 o null, irritabilità>,
    "motivation": <1-10 o null, livello di motivazione - diverso da energia>,
    "intrusive_thoughts": <1-10 o null, pensieri intrusivi ego-distonici>,
    "self_worth": <1-10 o null, autostima/valore di sé>
  },
  "voice_analysis": ${is_voice ? '{ "tone": "calm|agitated|neutral", "speed": "slow|fast|normal", "confidence": 0.0-1.0 }' : 'null'},
  "emotion_tags": ["#Tag1", "#Tag2"],
  "key_facts": ["fatto concreto da ricordare - SOLO fatti ESPLICITI e CONFERMATI, NO info corrette"],
  "corrections": [
    {
      "wrong_fact": "Informazione sbagliata che Aria aveva capito male",
      "corrected_to": "Versione corretta fornita dall'utente",
      "keywords_to_remove": ["parole chiave da cercare e rimuovere dalla memoria esistente"]
    }
  ],
  "personal_details": {
    "mentioned_names": ["nomi di persone care menzionate: partner, amici, familiari"],
    "hobbies_interests": ["hobby, passioni, interessi emersi"],
    "likes": ["cose che piacciono all'utente: film, serie, musica, cibo"],
    "dislikes": ["cose che non piacciono o infastidiscono"],
    "life_events": ["eventi di vita importanti: lavoro, relazioni, salute"],
    "preferences": ["preferenze personali: come gli piace essere trattato, supportato"]
  },
  "summary": "<riassunto 1-2 frasi - se c'è stata correzione, rifletti SOLO l'info corretta>",
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
          concentration: null,
          burnout_level: null,
          coping_ability: null,
          loneliness_perceived: null,
          somatic_tension: null,
          appetite_changes: null,
          sunlight_exposure: null,
          guilt: null,
          gratitude: null,
          irritability: null,
          motivation: null,
          intrusive_thoughts: null,
          self_worth: null
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
          concentration: null,
          burnout_level: null,
          coping_ability: null,
          loneliness_perceived: null,
          somatic_tension: null,
          appetite_changes: null,
          sunlight_exposure: null,
          guilt: null,
          gratitude: null,
          irritability: null,
          motivation: null,
          intrusive_thoughts: null,
          self_worth: null
        },
        voice_analysis: null,
        emotion_tags: [],
        key_facts: [],
        corrections: [],  // NEW: Empty corrections array for fallback
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

    // ═══════════════════════════════════════════════
    // 🔒 POST-PROCESSING FORZATO: Correlazioni Vitali → Emozioni
    // L'AI può ignorare le regole, ma questo codice le FORZA
    // ═══════════════════════════════════════════════
    const forceEmotionCorrelations = (analysis: OmniscientAnalysis): OmniscientAnalysis => {
      const { vitals, emotions, life_areas } = analysis;
      
      // 1. ANXIETY → FEAR: Se ansia >= 4, fear deve essere almeno anxiety * 0.6
      if (vitals.anxiety !== null && vitals.anxiety >= 4) {
        const minFear = Math.round(vitals.anxiety * 0.6);
        if (emotions.fear < minFear) {
          console.log(`[POST-PROCESS] Forcing fear: ${emotions.fear} → ${minFear} (anxiety: ${vitals.anxiety})`);
          emotions.fear = minFear;
        }
      }
      
      // 2. LOW MOOD → SADNESS: Se umore <= 5, sadness deve essere almeno (10 - mood) * 0.5
      if (vitals.mood !== null && vitals.mood <= 5) {
        const minSadness = Math.round((10 - vitals.mood) * 0.5);
        if (emotions.sadness < minSadness) {
          console.log(`[POST-PROCESS] Forcing sadness: ${emotions.sadness} → ${minSadness} (mood: ${vitals.mood})`);
          emotions.sadness = minSadness;
        }
      }
      
      // 3. LOW LOVE → SADNESS boost: Se amore <= 3, aggiungi tristezza relazionale
      if (life_areas.love !== null && life_areas.love <= 3) {
        const loveBoost = Math.round((4 - life_areas.love) * 0.7);
        if (emotions.sadness < loveBoost + 2) {
          const newSadness = Math.min(10, emotions.sadness + loveBoost);
          console.log(`[POST-PROCESS] Boosting sadness from love: ${emotions.sadness} → ${newSadness} (love: ${life_areas.love})`);
          emotions.sadness = newSadness;
        }
      }
      
      // 4. BURNOUT → FRUSTRATION: Se burnout >= 5, frustration deve essere almeno burnout * 0.5
      if (analysis.deep_psychology.burnout_level !== null && analysis.deep_psychology.burnout_level >= 5) {
        const minFrustration = Math.round(analysis.deep_psychology.burnout_level * 0.5);
        if ((emotions.frustration || 0) < minFrustration) {
          console.log(`[POST-PROCESS] Forcing frustration: ${emotions.frustration || 0} → ${minFrustration} (burnout: ${analysis.deep_psychology.burnout_level})`);
          emotions.frustration = minFrustration;
        }
      }
      
      // 5. PREVENT "100% JOY" PARADOX: Se ci sono emozioni negative significative, bilancia joy
      const negativeSum = emotions.sadness + emotions.anger + emotions.fear + (emotions.frustration || 0);
      if (negativeSum >= 5 && emotions.joy > 7) {
        const maxJoy = Math.max(5, 10 - Math.floor(negativeSum / 2));
        if (emotions.joy > maxJoy) {
          console.log(`[POST-PROCESS] Capping joy: ${emotions.joy} → ${maxJoy} (negative sum: ${negativeSum})`);
          emotions.joy = maxJoy;
        }
      }
      
      // 6. LONELINESS → NOSTALGIA: Se solitudine >= 6, nostalgia almeno loneliness * 0.4
      if (analysis.deep_psychology.loneliness_perceived !== null && analysis.deep_psychology.loneliness_perceived >= 6) {
        const minNostalgia = Math.round(analysis.deep_psychology.loneliness_perceived * 0.4);
        if ((emotions.nostalgia || 0) < minNostalgia) {
          console.log(`[POST-PROCESS] Forcing nostalgia: ${emotions.nostalgia || 0} → ${minNostalgia} (loneliness: ${analysis.deep_psychology.loneliness_perceived})`);
          emotions.nostalgia = minNostalgia;
        }
      }
      
      return { ...analysis, emotions };
    };
    
    // Apply forced correlations
    analysis = forceEmotionCorrelations(analysis);
    
    console.log('[process-session] Post-processed analysis:', JSON.stringify(analysis.emotions, null, 2));

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

    // 2. SAVE TO daily_emotions (upsert) - including all 18 emotions
    console.log('[process-session] Saving to daily_emotions with all 18 emotions...');
    const { error: emotionsError } = await supabase
      .from('daily_emotions')
      .upsert({
        user_id: user_id,
        date: today,
        // Primary emotions (5)
        joy: analysis.emotions.joy || 0,
        sadness: analysis.emotions.sadness || 0,
        anger: analysis.emotions.anger || 0,
        fear: analysis.emotions.fear || 0,
        apathy: analysis.emotions.apathy || 0,
        // Secondary emotions (5)
        shame: analysis.emotions.shame || null,
        jealousy: analysis.emotions.jealousy || null,
        hope: analysis.emotions.hope || null,
        frustration: analysis.emotions.frustration || null,
        nostalgia: analysis.emotions.nostalgia || null,
        // NEW: Extended emotions (4) - Profilazione 360°
        nervousness: analysis.emotions.nervousness || null,
        overwhelm: analysis.emotions.overwhelm || null,
        excitement: analysis.emotions.excitement || null,
        disappointment: analysis.emotions.disappointment || null,
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

    // 4. NEW: SAVE TO daily_psychology (upsert) - all 16 parameters
    const hasDeepPsychology = Object.values(analysis.deep_psychology).some(v => v !== null);
    if (hasDeepPsychology) {
      console.log('[process-session] Saving to daily_psychology with all 16 parameters...');
      const { error: psychologyError } = await supabase
        .from('daily_psychology')
        .upsert({
          user_id: user_id,
          date: today,
          // Cognitive (4)
          rumination: analysis.deep_psychology.rumination,
          self_efficacy: analysis.deep_psychology.self_efficacy,
          mental_clarity: analysis.deep_psychology.mental_clarity,
          concentration: analysis.deep_psychology.concentration,
          // Stress & Coping (3)
          burnout_level: analysis.deep_psychology.burnout_level,
          coping_ability: analysis.deep_psychology.coping_ability,
          loneliness_perceived: analysis.deep_psychology.loneliness_perceived,
          // Physiological (3)
          somatic_tension: analysis.deep_psychology.somatic_tension,
          appetite_changes: analysis.deep_psychology.appetite_changes,
          sunlight_exposure: analysis.deep_psychology.sunlight_exposure,
          // Complex Emotional (3)
          guilt: analysis.deep_psychology.guilt,
          gratitude: analysis.deep_psychology.gratitude,
          irritability: analysis.deep_psychology.irritability,
          // NEW: Extended Psychology (3) - Profilazione 360°
          motivation: analysis.deep_psychology.motivation,
          intrusive_thoughts: analysis.deep_psychology.intrusive_thoughts,
          self_worth: analysis.deep_psychology.self_worth,
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
    
    // 🔄 NEW: Handle corrections - clean memory of wrong facts
    const corrections = analysis.corrections || [];
    
    // Remove facts from existing memory that contain keywords from corrections
    const cleanedMemory = existingMemory.filter((fact: string) => {
      const isWrongFact = corrections.some((c: MemoryCorrection) => 
        c.keywords_to_remove?.some((kw: string) => 
          fact.toLowerCase().includes(kw.toLowerCase())
        )
      );
      if (isWrongFact) {
        console.log('[process-session] 🔄 Removing corrected fact from memory:', fact);
      }
      return !isWrongFact;
    });
    
    // Filter key_facts to exclude any that match wrong_fact descriptions
    const filteredKeyFacts = analysis.key_facts.filter((fact: string) => 
      !corrections.some((c: MemoryCorrection) => 
        c.wrong_fact?.toLowerCase().includes(fact.toLowerCase()) ||
        fact.toLowerCase().includes(c.wrong_fact?.toLowerCase() || '')
      )
    );
    
    if (corrections.length > 0) {
      console.log('[process-session] 🔄 Processed', corrections.length, 'corrections');
      console.log('[process-session] 🔄 Cleaned memory items removed:', existingMemory.length - cleanedMemory.length);
      console.log('[process-session] 🔄 Filtered key_facts:', analysis.key_facts.length - filteredKeyFacts.length, 'removed');
    }
    
    // Combine cleaned key_facts with personal memory items
    const newMemoryItems = [...filteredKeyFacts, ...personalMemoryItems];
    const updatedMemory = [...cleanedMemory, ...newMemoryItems].slice(-60); // Increased to 60 for richer memory

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

    // 🎯 Post-processing: Validate and correct categories for custom objectives
    // Keywords that MUST map to body category
    const BODY_KEYWORDS = /peso|kg|dimagr|ingrassare|palestra|sport|muscol|fisico|corpo|chili|massa/i;
    const FINANCE_KEYWORDS = /risparm|soldi|euro|€|debito|guadagn|invest|stipendio|budget|denaro/i;
    const STUDY_KEYWORDS = /esam|laure|studi|corso|scuola|università|voto|materia/i;
    const WORK_KEYWORDS = /lavoro|carriera|promozion|azienda|ufficio|stipendio|progetto|cliente/i;
    
    // 🎯 NEW: Save custom objectives detected by AI to user_objectives table
    const customObjectives = (analysis as any).custom_objectives_detected || [];
    if (customObjectives.length > 0) {
      console.log('[process-session] AI detected custom objectives:', customObjectives);
      
      for (const obj of customObjectives) {
        // 🎯 FIX: Validate and correct category based on keywords
        let correctedCategory = obj.category || 'growth';
        const titleLower = (obj.title || '').toLowerCase();
        
        // Override incorrect categories
        if (BODY_KEYWORDS.test(titleLower) && correctedCategory !== 'body') {
          console.log(`[process-session] Corrected category from ${correctedCategory} to body for: ${obj.title}`);
          correctedCategory = 'body';
        } else if (FINANCE_KEYWORDS.test(titleLower) && correctedCategory !== 'finance') {
          console.log(`[process-session] Corrected category from ${correctedCategory} to finance for: ${obj.title}`);
          correctedCategory = 'finance';
        } else if (STUDY_KEYWORDS.test(titleLower) && correctedCategory !== 'study') {
          console.log(`[process-session] Corrected category from ${correctedCategory} to study for: ${obj.title}`);
          correctedCategory = 'study';
        } else if (WORK_KEYWORDS.test(titleLower) && correctedCategory !== 'work') {
          console.log(`[process-session] Corrected category from ${correctedCategory} to work for: ${obj.title}`);
          correctedCategory = 'work';
        }
        
        // Check if similar objective already exists
        const { data: existingObj } = await supabase
          .from('user_objectives')
          .select('id')
          .eq('user_id', user_id)
          .ilike('title', `%${obj.title}%`)
          .eq('status', 'active')
          .maybeSingle();
        
        if (!existingObj) {
          // Create new objective with starting_value support
          const startingVal = obj.starting_value || null;
          const currentVal = startingVal || 0; // current starts at starting_value if provided
          
          // Determine appropriate ai_feedback based on what's missing
          let aiFeedback = obj.ai_feedback || null;
          const needsStartingValue = (correctedCategory === 'body' || correctedCategory === 'finance') && !startingVal;
          const needsTargetValue = (correctedCategory === 'body' || correctedCategory === 'finance') && !obj.target_value;
          
          if (needsStartingValue && needsTargetValue) {
            aiFeedback = 'Dimmi da dove parti e qual è il tuo obiettivo finale!';
          } else if (needsStartingValue) {
            aiFeedback = 'Qual è il tuo punto di partenza?';
          } else if (needsTargetValue) {
            aiFeedback = 'Qual è il tuo obiettivo finale?';
          }
          
          const { error: objError } = await supabase
            .from('user_objectives')
            .insert({
              user_id: user_id,
              category: correctedCategory,  // Use corrected category
              title: obj.title,
              description: obj.description || null,
              starting_value: startingVal,
              target_value: obj.target_value || null,
              unit: obj.unit || null,
              current_value: currentVal,
              status: 'active',
              ai_feedback: aiFeedback,
              progress_history: []
            });
          
          if (objError) {
            console.error('[process-session] Error creating custom objective:', objError);
          } else {
            console.log('[process-session] Created custom objective:', obj.title, 'category:', correctedCategory);
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
          .select('id, current_value, progress_history, target_value, starting_value, category')
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
          
          // 🎯 FIX: Determine status based on EXPLICIT completion flag from AI
          // Do NOT auto-mark as achieved based on value comparison alone
          // The AI should only set completed: true when user EXPLICITLY celebrates/declares achievement
          let newStatus = 'active';
          
          if (update.completed === true) {
            // AI explicitly detected user celebrating goal achievement
            newStatus = 'achieved';
            console.log(`[process-session] 🎉 AI detected explicit goal achievement!`);
          }
          // Removed auto-detection: the old logic `new_value >= target_value` was wrong for "gain weight" objectives
          
          // 🎯 FIX: If this is the FIRST value and starting_value is null, set it as starting_value
          const isStartingValue = update.is_starting_value === true || 
            (existingObj.starting_value === null && 
             (existingObj.category === 'body' || existingObj.category === 'finance'));
          
          const updateData: Record<string, any> = {
            current_value: update.new_value,
            progress_history: newHistory,
            status: newStatus,
            updated_at: new Date().toISOString()
          };
          
          // If this is the starting value, set it
          if (isStartingValue && existingObj.starting_value === null) {
            updateData.starting_value = update.new_value;
            console.log(`[process-session] Setting starting_value for objective: ${update.new_value}`);
            // Also update ai_feedback to prompt for target
            if (existingObj.target_value === null) {
              updateData.ai_feedback = 'Punto di partenza registrato! Ora definisci il tuo obiettivo finale.';
            }
          }
          
          const { error: updateError } = await supabase
            .from('user_objectives')
            .update(updateData)
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
