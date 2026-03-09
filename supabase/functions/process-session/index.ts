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

// Extended Emotions Interface (20 emotions)
interface SpecificEmotions {
  // Base emotions (Ekman model)
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  disgust?: number;      // NEW: Disgusto - base Ekman
  surprise?: number;     // NEW: Sorpresa - base Ekman
  apathy: number;
  // Secondary emotions
  shame?: number;
  jealousy?: number;
  hope?: number;
  frustration?: number;
  nostalgia?: number;
  nervousness?: number;
  overwhelm?: number;
  excitement?: number;
  disappointment?: number;
  // NEW: Extended emotions
  serenity?: number;     // Calma/pace interiore
  pride?: number;        // Orgoglio/soddisfazione
  affection?: number;    // Affetto/tenerezza
  curiosity?: number;    // Curiosità/interesse
}

interface ClinicalIndices {
  rumination: number | null;
  emotional_openness: number | null;
  perceived_stress: number | null;
}

// Extended Life Areas Interface (9 areas)
interface LifeAreas {
  work: number | null;
  school: number | null;
  love: number | null;
  family?: number | null;   // NEW: Relazioni familiari
  health: number | null;
  social: number | null;
  growth: number | null;
  leisure?: number | null;  // NEW: Tempo libero
  finances?: number | null; // NEW: Finanze
}

interface VoiceAnalysis {
  tone: 'calm' | 'agitated' | 'neutral';
  speed: 'slow' | 'fast' | 'normal';
  confidence: number;
}

// Extended Deep Psychology Metrics Interface (~32 parametri)
interface DeepPsychology {
  // Cognitive (6)
  rumination: number | null;
  self_efficacy: number | null;
  mental_clarity: number | null;
  concentration: number | null;
  dissociation?: number | null;      // NEW: Distacco dalla realtà
  confusion?: number | null;         // NEW: Confusione mentale
  // Activation (4)
  burnout_level: number | null;
  irritability: number | null;
  racing_thoughts?: number | null;   // NEW: Pensieri accelerati
  emotional_regulation?: number | null; // NEW: Capacità regolazione emotiva
  // Behavioral (4) - NEW CATEGORY
  avoidance?: number | null;         // NEW: Evitamento situazioni
  social_withdrawal?: number | null; // NEW: Ritiro sociale
  compulsive_urges?: number | null;  // NEW: Impulsi compulsivi
  procrastination?: number | null;   // NEW: Procrastinazione
  // Somatic (3)
  somatic_tension: number | null;
  appetite_changes: number | null;
  sunlight_exposure: number | null;
  // Resources (11)
  coping_ability: number | null;
  loneliness_perceived: number | null;
  guilt: number | null;
  gratitude: number | null;
  motivation: number | null;
  intrusive_thoughts: number | null;
  self_worth: number | null;
  sense_of_purpose?: number | null;       // NEW: Senso di scopo
  life_satisfaction?: number | null;      // NEW: Soddisfazione di vita
  perceived_social_support?: number | null; // NEW: Supporto sociale
  resilience?: number | null;             // NEW: Resilienza
  mindfulness?: number | null;            // NEW: Presenza/consapevolezza
  // Safety Indicators - CRITICAL (3)
  suicidal_ideation?: number | null;      // NEW: Pensieri suicidari
  hopelessness?: number | null;           // NEW: Disperazione
  self_harm_urges?: number | null;        // NEW: Impulsi autolesionistici
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

- FINANCE (finanze): ⚠️ OBIETTIVI FINANZIARI RICHIEDONO DETTAGLI SPECIFICI!
  
  **TIPI DI OBIETTIVI FINANZIARI (finance_tracking_type):**
  1. "accumulation" - Accumulare una cifra (es. "voglio 10.000€ di risparmi")
     → Ha starting_value (quanto ho ora) e target_value (quanto voglio raggiungere)
  2. "periodic_saving" - Risparmio periodico (es. "risparmiare 500€/mese")
     → Ha SOLO target_value (l'importo periodico) + tracking_period
  3. "spending_limit" - Limite di spesa (es. "max 200€/mese in ristoranti")
     → Ha SOLO target_value (budget massimo) + tracking_period
  4. "periodic_income" - Obiettivo guadagno (es. "guadagnare 3000€/mese")
     → Ha SOLO target_value (importo target) + tracking_period
  5. "debt_reduction" - Riduzione debiti (es. "estinguere debito 5000€")
     → starting_value = debito attuale, target_value = 0

  **PERIODI (tracking_period):** "daily", "weekly", "monthly", "yearly", "one_time"

  ⚠️ SE L'UTENTE DICE UN OBIETTIVO FINANZIARIO GENERICO:
  - DEVI chiedere SUBITO di che tipo è!
  - "Vuoi risparmiare una cifra specifica, oppure mettere da parte X€ al mese?"

- STUDY (studio): "Superare l'esame", "Studiare 20h/settimana"
- WORK (lavoro): "Voglio una promozione"
- RELATIONSHIPS (relazioni): "Trovare partner"
- GROWTH (crescita): "Leggere di più", "Meditare"

⚠️ FORMATO per custom_objectives_detected:
{
  "category": "body|study|work|finance|relationships|growth",
  "title": "Titolo breve",
  "description": "Descrizione opzionale",
  "starting_value": <numero SE applicabile>,
  "target_value": <numero obiettivo SE specificato>,
  "unit": "kg|€|ore|null",
  "finance_tracking_type": "accumulation|periodic_saving|spending_limit|periodic_income|debt_reduction|null",
  "tracking_period": "daily|weekly|monthly|yearly|one_time|null",
  "needs_clarification": true/false,
  "ai_feedback": "Messaggio per chiedere dettagli mancanti"
}

ESEMPI:
1. "Voglio risparmiare" (generico) → needs_clarification: true, ai_feedback: "Che tipo di risparmio? Vuoi accumulare una cifra o mettere via X€ al mese?"
2. "Risparmiare 500€/mese" → finance_tracking_type: "periodic_saving", tracking_period: "monthly", target_value: 500
3. "Arrivare a 10.000€, ora ho 2000€" → finance_tracking_type: "accumulation", starting_value: 2000, target_value: 10000

⚠️ NON inventare obiettivi. Solo se ESPLICITAMENTE menzionati.
`);

  // 🎯 HABITS DETECTION AND MANAGEMENT (ALWAYS ACTIVE!)
  instructions.push(`
═══════════════════════════════════════════════
🔄 GESTIONE HABITS VIA CONVERSAZIONE (CRUCIALE!)
═══════════════════════════════════════════════

Le habits sono INTERAMENTE gestite da te tramite conversazione. L'utente NON può crearle o aggiornarle manualmente!

📌 RILEVAMENTO NUOVE HABITS:
Quando l'utente dice:
- "Voglio iniziare a meditare ogni giorno" → habit_type: "meditation"
- "Devo smettere di fumare" → habit_type: "cigarettes", streak_type: "abstain"
- "Voglio bere più acqua" → habit_type: "water"
- "Devo fare più esercizio" → habit_type: "exercise"
- "Voglio leggere di più" → habit_type: "reading"
- "Devo dormire meglio" → habit_type: "sleep"
- "Voglio fare yoga" → habit_type: "yoga"
- "No junk food" → habit_type: "no_junk_food", streak_type: "abstain"

→ Aggiungi a "habits_detected" con needs_confirmation: true
→ Nella risposta, CHIEDI CONFERMA: "Ho capito che vuoi [X]. Vuoi che te lo aggiunga come habit da monitorare?"

📌 CONFERMA E PARAMETRI:
Se l'utente conferma, imposta:
- needs_confirmation: false
- daily_target appropriato (es: water: 8, meditation: 1, steps: 10000)
- unit appropriata (es: bicchieri, min, passi)
- streak_type: "abstain" per habit negative (sigarette, alcol, junk food)

📌 AGGIORNAMENTO PROGRESSI HABITS:
Quando l'utente dice:
- "Oggi ho meditato 20 minuti" → habit_type: "meditation", value: 20
- "Ho bevuto 6 bicchieri d'acqua" → habit_type: "water", value: 6
- "Non ho fumato oggi!" → habit_type: "cigarettes", value: 0 (SUCCESS per abstain!)
- "Ieri sono andato in palestra" → habit_type: "exercise", value: 1, date: ieri
- "Ho fumato 3 sigarette" → habit_type: "cigarettes", value: 3 (FAILURE per abstain)

→ Aggiungi a "habit_progress_updates"
→ Nella risposta, CELEBRA o SUPPORTA:
  - Se successo: "🎉 Ottimo lavoro! Continuiamo così!"
  - Se fallimento abstain: "Nessun problema, domani è un nuovo giorno. Cosa ha scatenato la ricaduta?"

📌 HABIT TYPES COMUNI:
- meditation, yoga, breathing (mental wellness)
- water, vitamins, healthy_meals (health)
- exercise, stretching, steps (fitness)
- reading, learning, journaling (productivity)
- cigarettes, alcohol, no_junk_food, social_media (abstain - bad habits)
- gratitude, affirmations, digital_detox (self-care)

⚠️ REGOLE HABITS:
- streak_type "abstain" → value 0 = SUCCESSO, value > 0 = FALLIMENTO
- streak_type "daily" → value >= target = SUCCESSO
- Date: usa "YYYY-MM-DD" formato ISO
- NON creare habits se non esplicitamente richieste
- CELEBRA sempre i progressi!
`);

  // 📅 EVENT DETECTION: Extract future events from conversation
  instructions.push(`
═══════════════════════════════════════════════
📅 ESTRAZIONE EVENTI FUTURI (CRUCIALE!)
═══════════════════════════════════════════════
DEVI identificare e estrarre TUTTI gli eventi futuri menzionati nella conversazione.

**TIPI DI EVENTI DA RILEVARE:**
- **travel**: "Parto per Madrid", "Vado a Roma", "Viaggio a Londra", "Vacanza in Spagna"
- **medical**: "Ho il medico", "Visita dal dottore", "Appuntamento all'ospedale", "Controllo"
- **work**: "Colloquio di lavoro", "Riunione", "Presentazione", "Meeting"
- **social**: "Cena con amici", "Festa", "Aperitivo", "Uscita"
- **celebration**: "Matrimonio", "Compleanno", "Laurea", "Anniversario"
- **appointment**: "Appuntamento dal dentista", "Parrucchiere", "Meccanico"
- **generic**: Altri eventi non categorizzabili

**COME ESTRARRE DATA/ORA:**
- "Domani" → data di domani
- "Dopodomani" → data +2 giorni
- "Lunedì prossimo" → calcola la data
- "Il 15" → giorno 15 del mese corrente (o prossimo se già passato)
- "alle 15" / "alle 3" → 15:00 / 15:00 (PM assumido se ambiguo)
- "la mattina" → event_time: "09:00" (approssimativo)
- "la sera" → event_time: "20:00"
- Se SOLO data senza ora → event_time: null, is_all_day: true

**CONTESTO TEMPORALE:**
Data di oggi: ${new Date().toISOString().split('T')[0]}

**ESEMPI:**
1. "Domani alle 10 ho un colloquio" 
   → title: "Colloquio", event_type: "work", event_date: [domani], event_time: "10:00"

2. "Domenica parto per Madrid con amici per il Circo Loco"
   → title: "Viaggio a Madrid - Circo Loco", event_type: "travel", location: "Madrid", tags: ["amici", "evento"]

3. "Il 20 febbraio ho la visita dal medico"
   → title: "Visita medica", event_type: "medical", event_date: "2026-02-20"

4. "Questo weekend vado a sciare"
   → title: "Sciata", event_type: "travel", event_date: [sabato prossimo], is_all_day: true

**REGOLE:**
- Estrai SOLO eventi FUTURI (oggi incluso)
- NON eventi passati (già accaduti)
- Includi extracted_from_text con la frase originale
- Se non riesci a determinare la data esatta → NON estrarre (meglio nulla che sbagliato)
- Se l'utente menziona durata (es: "3 giorni a Roma") → usa end_date
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
    const { session_id, user_id, transcript, is_voice = false, user_context, incremental = false } = await req.json() as {
      session_id: string;
      user_id: string;
      transcript: string;
      is_voice?: boolean;
      user_context?: UserContext;
      incremental?: boolean;
    };

    if (!session_id || !user_id || !transcript) {
      console.error('Missing required fields:', { session_id, user_id, hasTranscript: !!transcript });
      throw new Error('Missing required fields: session_id, user_id, transcript');
    }

    console.log('[process-session] Processing session:', session_id, 'is_voice:', is_voice, 'incremental:', incremental);
    console.log('[process-session] User context:', user_context);
    console.log('[process-session] Transcript length:', transcript.length);

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not configured');
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

    // 🎯 Get all active objectives for progress tracking (including milestone fields)
    const { data: activeObjectives } = await supabase
      .from('user_objectives')
      .select('id, title, category, target_value, current_value, unit, status, starting_value, description, input_method, preset_type, ai_custom_description, ai_progress_estimate, ai_milestones')
      .eq('user_id', user_id)
      .eq('status', 'active');

    // 📖 Load recent shared diary entries (last 7 days) for context enrichment
    const { data: recentDiaryEntries } = await supabase
      .from('diary_entries')
      .select('content_text, entry_date, diary_id')
      .eq('user_id', user_id)
      .eq('is_private', false)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(3);

    let diaryContextBlock = '';
    if (recentDiaryEntries && recentDiaryEntries.length > 0) {
      const diaryLines = recentDiaryEntries.map((entry: any) => {
        const text = (entry.content_text || '').split(/\s+/).slice(0, 150).join(' ');
        return `[${entry.entry_date}]: ${text}`;
      }).join('\n');
      diaryContextBlock = `\n\nDIARI RECENTI (condivisi con Aria):\n${diaryLines}`;
      console.log('[process-session] 📖 Loaded', recentDiaryEntries.length, 'recent diary entries for context');
    }

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
      // Separate numeric objectives from milestone/qualitative objectives
      // NUMERIC: has target_value OR is body/finance category (these usually need numbers)
      const numericObjectives = activeObjectives.filter(o => 
        o.target_value !== null && (o.starting_value !== null || ['body', 'finance'].includes(o.category))
      );
      // QUALITATIVE/MILESTONE: NO target_value OR target is null AND not body/finance
      // This includes ALL objectives without concrete numeric targets
      const milestoneObjectives = activeObjectives.filter(o => 
        o.target_value === null || 
        (!['body', 'finance'].includes(o.category) && o.starting_value === null)
      );
      
      // List for numeric objectives
      const numericList = numericObjectives.map(o => {
        const startVal = o.starting_value !== null ? o.starting_value : 'NON DEFINITO';
        const currVal = o.current_value ?? 0;
        const targetVal = o.target_value !== null ? o.target_value : 'NON DEFINITO';
        return `- ID: ${o.id} | "${o.title}" (${o.category}) | Partenza: ${startVal} ${o.unit || ''} | Attuale: ${currVal} ${o.unit || ''} | Target: ${targetVal} ${o.unit || ''}`;
      }).join('\n');
      
      // List for milestone objectives - with category hints for better matching
      const milestoneList = milestoneObjectives.map(o => {
        const currentDesc = o.ai_custom_description || o.description || 'Nessuna descrizione';
        const currentProgress = o.ai_progress_estimate ?? 0;
        const currentMilestones = (o.ai_milestones as any[]) || [];
        // Include category-specific hints for better semantic matching
        const categoryHints: Record<string, string> = {
          'work': 'lavoro, progetto, app, cliente, carriera, azienda, sviluppo',
          'study': 'studio, esame, corso, università, voto, tesi',
          'growth': 'crescita, sviluppo, apprendimento, miglioramento, skill',
          'relationships': 'relazioni, persone, amici, partner, sociale',
          'mind': 'mentale, emozioni, benessere, meditazione, ansia'
        };
        const hints = categoryHints[o.category] || o.category;
        return `- ID: ${o.id} | "${o.title}" (${o.category})
    🔎 Keywords correlate: ${hints}
    📝 Descrizione attuale: ${currentDesc}
    📊 Progresso AI stimato: ${currentProgress}%
    ✅ Milestones raggiunte: ${currentMilestones.length > 0 ? currentMilestones.map((m: any) => m.milestone).join(', ') : 'Nessuna'}`;
      }).join('\n\n');
      
      objectivesTrackingPrompt = `
═══════════════════════════════════════════════
🎯 OBIETTIVI ATTIVI - RILEVA PROGRESSI (CRUCIALE!)
═══════════════════════════════════════════════

${numericList ? `**OBIETTIVI NUMERICI:**
${numericList}` : ''}

${milestoneList ? `
═══════════════════════════════════════════════
🌟 OBIETTIVI QUALITATIVE/MILESTONE (AGGIORNAMENTO AI!)
═══════════════════════════════════════════════
Questi obiettivi NON hanno valori numerici. Il PROGRESSO è stimato SOLO da te in base alla conversazione!
⚠️ DEVI CERCARE ATTIVAMENTE correlazioni tra la conversazione e questi obiettivi!

${milestoneList}

═══════════════════════════════════════════════
📌 REGOLA FONDAMENTALE PER MILESTONE (LEGGI!)
═══════════════════════════════════════════════
Se l'utente PARLA di un argomento correlato a uno degli obiettivi sopra, DEVI aggiornare il progresso!
NON serve che dica esplicitamente "il mio obiettivo" - basta che parli dell'ARGOMENTO.

**ESEMPI DI RILEVAMENTO:**
- Obiettivo "Sviluppare un'app" + utente dice "sto lavorando all'app" → AGGIORNA ai_progress_estimate!
- Obiettivo "Sviluppare un'app" + utente dice "ho parlato del progetto" → AGGIORNA ai_progress_estimate!
- Obiettivo "Costruire personal brand" + utente dice "ho postato sui social" → AGGIORNA!
- Obiettivo "Migliorare al lavoro" + utente parla di progetti lavorativi → AGGIORNA!

**PER OGNI OBIETTIVO MILESTONE, DEVI:**

1. **CERCARE KEYWORDS CORRELATE** nella conversazione:
   - "app", "sviluppo", "coding", "progetto", "funzionalità" → obiettivi work/tech
   - "brand", "social", "contenuti", "marketing" → obiettivi marketing
   - "studio", "esame", "libro", "corso" → obiettivi studio
   
2. **RACCOGLIERE DETTAGLI** - Se l'utente menziona dettagli, AGGIORNA ai_custom_description!
   Esempio: obiettivo "Sviluppare un'app" + utente dice "L'app è per il wellness"
   → ai_custom_description: "App per il wellness in fase di sviluppo"

3. **STIMARE PROGRESSO (0-100%)** - ANCHE per piccoli aggiornamenti:
   - Parlare dell'obiettivo/argomento = +5-10%
   - Azione concreta = +10-20%
   - Risultato tangibile = +15-25%
   
   Scala generale:
   - 0-20%: Solo idea, discussione iniziale
   - 20-40%: Prime azioni concrete
   - 40-60%: Lavoro attivo, progressi visibili
   - 60-80%: Buoni risultati, quasi completo
   - 80-100%: Obiettivo raggiunto

4. **AGGIUNGERE MILESTONE** per azioni CONCRETE completate:
   - "Ho finito il design" → milestone: "Design completato"
   - "Ho fatto il deploy" → milestone: "Prima release"
   - "Ho parlato al cliente" → milestone: "Meeting cliente"

**FORMATO milestone_objective_updates (USA SEMPRE!):**
"milestone_objective_updates": [
  {
    "objective_id": "<UUID ESATTO dalla lista sopra>",
    "ai_custom_description": "Descrizione AGGIORNATA o null",
    "ai_progress_estimate": <0-100>,
    "new_milestone": {"milestone": "Azione", "note": "opzionale"} | null
  }
]

⚠️ REGOLE CRITICHE:
- ANCHE SE l'utente non dice "obiettivo", se parla dell'argomento → AGGIORNA
- Se c'è QUALSIASI correlazione → aumenta almeno di 5%
- USA l'UUID esatto dalla lista, NON inventare ID
` : ''}

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
    
    const dataHunterLifeAreas = `
═══════════════════════════════════════════════
🏠 AREE DELLA VITA - REGOLE SEMANTICHE (OBBLIGATORIE!)
═══════════════════════════════════════════════
${missingLifeAreas.length > 0 ? `⚠️ AREE MANCANTI: ${missingLifeAreas.join(', ')} - Presta attenzione extra!\n` : ''}
**⚠️ REGOLA FONDAMENTALE: Se l'utente NON parla di un'area → NULL. MAI inventare!**

**work** (lavoro/carriera):
- CERCA: lavoro, ufficio, colleghi, capo, deadline, progetto, riunioni, carriera, stipendio
- NEGATIVO (1-4): "odio il mio lavoro", "colleghi tossici", "capo insopportabile", "voglio licenziarmi", "stress da lavoro"
- NEUTRO (5-6): "lavoro normale", "routine", "niente di speciale al lavoro"
- POSITIVO (7-9): "progetto andato bene", "promozione", "riconoscimento", "soddisfatto del lavoro"
- Se NON menziona lavoro → null

**school** (studio/scuola):
- CERCA: esame, università, studio, voti, professore, tesi, compiti, scuola, lezioni
- NEGATIVO (1-4): "bocciato", "non riesco a studiare", "esame andato male", "ansia da esame"
- NEUTRO (5-6): "studio normale", "lezioni"
- POSITIVO (7-9): "passato l'esame!", "voto alto", "tesi procede bene"
- Se NON menziona studio/scuola → null

**love** (relazione sentimentale):
- CERCA: partner, ragazzo/a, marito/moglie, relazione, appuntamento, litigio di coppia
- NEGATIVO (1-4): "litigato col partner", "crisi di coppia", "lui/lei non mi capisce", "tradimento", "rottura"
- NEUTRO (5-6): "relazione stabile", "niente di particolare"
- POSITIVO (7-9): "bellissima serata insieme", "ci amiamo", "momento romantico", "proposta"
- Se NON menziona partner/relazione → null

**family** (relazioni familiari):
- CERCA: genitori, madre, padre, fratelli, sorelle, figli, nonni, zii, cugini, pranzo in famiglia
- NEGATIVO (1-4): "litigato con mia madre", "mio padre mi critica", "tensioni familiari", "non ci parliamo"
- NEUTRO (5-6): "famiglia normale", "chiamato i genitori"
- POSITIVO (7-9): "bella giornata con la famiglia", "mamma mi ha supportato", "riconciliazione"
- ⚠️ DISTINGUI da love (partner) e social (amici)!
- Se NON menziona famiglia → null

**social** (amicizie/vita sociale):
- CERCA: amici, uscita, festa, aperitivo, compagnia, gruppo, conoscenze, social
- NEGATIVO (1-4): "mi sento solo", "nessuno mi chiama", "amici spariti", "escluso", "isolato"
- NEUTRO (5-6): "visto gli amici", "uscita tranquilla"
- POSITIVO (7-9): "serata fantastica", "amici veri", "nuove conoscenze", "mi supportano"
- Se NON menziona amici/socialità → null

**health** (salute fisica e mentale) ⚠️ REGOLE STRETTE:
- CERCA: salute, medico, visita, malattia, dolore, sintomi, farmaci, sport, esercizio, dieta, sonno, stanchezza fisica
- NEGATIVO (1-4): "sto male", "dolore cronico", "malato", "visita andata male", "diagnosi", "non dormo bene", "zero sport"
- NEUTRO (5-6): "salute normale", "niente di particolare", "routine medica"
- POSITIVO (7-9): "mi sento in forma", "esami ok", "faccio sport regolarmente", "dieta funziona", "energia fisica alta"
- ⚠️ ATTENZIONE: 
  - Energia MENTALE va nei vitals, non qui
  - "Stanco" SENZA specificare se mentale o fisico → NON assegnare
  - Se l'utente NON parla ESPLICITAMENTE di salute fisica/corpo → NULL
  - NON inferire salute da umore o altri fattori!
- Se NON menziona salute/corpo/medico → null

**growth** (crescita personale):
- CERCA: obiettivi, miglioramento, corso, libro, apprendimento, sviluppo, terapia, cambiamento
- NEGATIVO (1-4): "fermo", "non cresco", "stagnazione", "nessun progresso", "perso"
- NEUTRO (5-6): "sto lavorando su me stesso", "piccoli passi"
- POSITIVO (7-9): "ho imparato qualcosa", "cresciuto", "terapia utile", "insight importante"
- Se NON menziona crescita/apprendimento → null

**leisure** (tempo libero/hobby):
- CERCA: hobby, relax, weekend, vacanze, sport per piacere, film, serie, giochi, svago, passatempo
- NEGATIVO (1-4): "non ho tempo per me", "solo lavoro, zero svago", "mai un momento libero", "annoiato"
- NEUTRO (5-6): "un po' di relax", "visto un film"
- POSITIVO (7-9): "bellissima giornata", "mi sono divertito", "tempo per i miei hobby", "vacanza fantastica"
- Se NON menziona tempo libero → null

**finances** (situazione economica):
- CERCA: soldi, spese, risparmio, debiti, stipendio, bollette, mutuo, affitto, costi, investimenti
- NEGATIVO (1-4): "non arrivo a fine mese", "preoccupato per i soldi", "debiti", "ristrettezze"
- NEUTRO (5-6): "finanze ok", "bilancio in pari"
- POSITIVO (7-9): "economicamente tranquillo", "aumento!", "risparmi in crescita", "investimento andato bene"
- Se NON menziona finanze/soldi → null

⚠️ ANTI-HALLUCINATION LIFE AREAS:
- OGNI punteggio DEVE avere una frase ESPLICITA che lo giustifica
- Se l'utente parla solo di emozioni senza menzionare un'area specifica → NULL
- NON inferire aree da altre aree (es. "è stressato" NON significa work basso)
- "Giornata buona" generico → NON assegnare a nessuna area specifica
`;

    // NEW: Deep Psychology semantic extraction rules (HARDENED v2.0)
    const deepPsychologyPrompt = `
═══════════════════════════════════════════════
🧠 DEEP PSYCHOLOGY - ANALISI MECCANISMI SOTTOSTANTI (v2.0)
═══════════════════════════════════════════════
Devi leggere TRA LE RIGHE per estrarre pattern psicologici profondi.
⚠️ REGOLA FONDAMENTALE: Se l'utente NON parla di un tema → NULL. NON inventare mai!

📌 REGOLE DI ESTRAZIONE SEMANTICA:

═══════════════════════════════════════════════
🧩 COGNITIVI (6 metriche)
═══════════════════════════════════════════════

**rumination** (pensieri ossessivi ricorrenti):
- RILEVA: "Non riesco a smettere di pensare a...", "mi tormento", "continuo a rimuginare", "pensiero fisso"
- Ripetizione dello stesso tema nella conversazione → segnale di ruminazione
- PUNTEGGIO: 7-10 se esplicito, 5-6 se inferito da ripetizioni
- Se NON menzionato → null

**self_efficacy** (fiducia nelle proprie capacità):
- ALTA (7-10): "ce la posso fare", "sono capace", "ci riuscirò", "ho le competenze"
- BASSA (1-4): "non ne sono capace", "fallirò", "non ce la faccio", "sono incompetente"
- Se NON menzionato → null

**mental_clarity** (chiarezza mentale):
- ALTA (7-10): "ho le idee chiare", "so cosa fare", "vedo chiaramente", "lucido"
- BASSA (1-4): "confuso", "non so", "nebbia mentale", "idee confuse", "non capisco"
- Se NON menzionato → null

**concentration** (livello di concentrazione):
- ALTA (7-10): "riesco a concentrarmi", "focus", "mente lucida sul task", "sono produttivo"
- BASSA (1-4): "mi distraggo", "non riesco a focalizzarmi", "pensieri vagano", "attenzione dispersa"
- Inferisci anche da come l'utente parla (coerente vs frammentato)
- Se NON menzionato → null

**dissociation** (distacco dalla realtà) ⚠️ CRITICO PER TRAUMA:
- RILEVA: "mi sento distaccato", "come se guardassi da fuori", "non mi sento nel mio corpo"
- RILEVA: "tutto sembra irreale", "sensazione di estraneità", "non sono io", "autopilota"
- PUNTEGGIO: 6-10 se esplicito
- ⚠️ ALERT CLINICO se > 7: possibile dissociazione patologica
- Se NON menzionato → null (MAI inferire!)

**confusion** (confusione mentale):
- RILEVA: "sono confuso", "non capisco", "ho le idee confuse", "nebbia", "non so cosa pensare"
- RILEVA: "mi gira la testa", "non ci capisco niente", "tutto è un casino"
- PUNTEGGIO: 5-8
- Diverso da mental_clarity bassa: confusion è uno STATO ATTIVO di smarrimento
- Se NON menzionato → null

═══════════════════════════════════════════════
⚡ ATTIVAZIONE E STRESS (4 metriche)
═══════════════════════════════════════════════

**burnout_level** (esaurimento professionale/emotivo):
- RILEVA: "sono esausto", "non ce la faccio più", "svuotato", "logorato", "bruciato"
- Menzione di lavoro eccessivo + stanchezza cronica = burnout
- PUNTEGGIO: 8-10 se esplicito, 6-7 se lavoro stressante cronico
- ⚠️ SOLO se legato a lavoro/doveri. Stanchezza generica ≠ burnout
- Se NON menzionato → null

**irritability** (irritabilità):
- RILEVA: "mi dà fastidio", "sono irascibile", "mi innervosisco facilmente", "perdo la pazienza"
- RILEVA: "sbotto", "mi dà sui nervi", "sopporto sempre meno"
- PUNTEGGIO: 7-10 se esplicito
- Se NON menzionato → null

**racing_thoughts** (pensieri accelerati) - INDICATORE IPOMANIA:
- RILEVA: "i pensieri corrono", "mente che non si ferma", "mille pensieri insieme"
- RILEVA: "non riesco a fermare la testa", "saltello da un pensiero all'altro", "testa in corsa"
- PUNTEGGIO: 6-10
- ⚠️ Se > 7 + energia alta + poco sonno → segnalare possibile ipomania in insights
- Se NON menzionato → null

**emotional_regulation** (capacità di gestire le emozioni):
- BASSA (1-4): "esplodo", "non riesco a controllarmi", "perdo le staffe", "reagisco male", "mi faccio travolgere"
- ALTA (7-10): "riesco a gestire", "mantengo la calma", "controllo le emozioni", "non mi faccio sopraffare"
- Se NON menzionato → null

═══════════════════════════════════════════════
🏃 COMPORTAMENTALI (4 metriche)
═══════════════════════════════════════════════

**avoidance** (evitamento situazioni) - CORE DELL'ANSIA:
- RILEVA: "evito", "non voglio affrontare", "scappo da", "non ci vado", "rimando"
- RILEVA: "non ho il coraggio di", "preferisco non pensarci", "lo evito come la peste"
- PUNTEGGIO: 5-9
- ⚠️ Cerca SEMPRE questo indicatore - è il cuore dei disturbi d'ansia!
- Se NON menzionato → null

**social_withdrawal** (ritiro sociale):
- RILEVA: "non esco più", "ho annullato appuntamenti", "preferisco stare solo"
- RILEVA: "non rispondo ai messaggi", "mi isolo", "evito la gente", "non ho voglia di vedere nessuno"
- PUNTEGGIO: 5-9
- Diverso da loneliness: qui è un COMPORTAMENTO attivo
- Se NON menzionato → null

**compulsive_urges** (impulsi compulsivi) - INDICATORE OCD:
- RILEVA: "devo assolutamente", "non resisto", "impulso irresistibile", "bisogno di controllare"
- RILEVA: "devo rifare", "se non faccio X mi sento male", "controllare più volte"
- PUNTEGGIO: 5-9
- ⚠️ Se presente, cercare anche rituali → possibile OCD
- Se NON menzionato → null

**procrastination** (rimandare compiti):
- RILEVA: "rimando", "lo farò domani", "non inizio mai", "aspetto sempre l'ultimo momento"
- RILEVA: "procrastino", "non trovo mai il momento", "rinvio"
- PUNTEGGIO: 4-8
- Se NON menzionato → null

═══════════════════════════════════════════════
🏥 FISIOLOGICI (3 metriche)
═══════════════════════════════════════════════

**somatic_tension** (tensione fisica da stress):
- RILEVA: "peso sul petto", "nodo allo stomaco", "tensione muscolare", "mal di testa da stress"
- Qualsiasi sintomo fisico correlato a stress emotivo → 7-10
- Se NON menzionato → null

**appetite_changes** (alterazioni appetito):
- RILEVA: "non mangio", "mangio troppo per il nervoso", "fame nervosa", "ho perso l'appetito"
- Sia troppo che troppo poco indicano cambiamenti significativi → 7-10
- Se NON menzionato → null

**sunlight_exposure** (esposizione alla luce) ⚠️ SOLO SE ESPLICITAMENTE MENZIONATO:
- BASSO (1-4): "sempre in casa", "non esco mai", "lavoro al buio", "non vedo la luce", "chiuso in casa"
- ALTO (7-10): "sono uscito", "ho fatto una passeggiata", "sono stato al sole", "ho preso aria"
- ⚠️ NON INFERIRE da altre abitudini! Se l'utente non parla di uscire/sole → NULL
- Se NON esplicitamente menzionato → null (MAI inventare!)

═══════════════════════════════════════════════
❤️ EMOTIVI COMPLESSI (6 metriche)
═══════════════════════════════════════════════

**guilt** (senso di colpa):
- RILEVA: "è colpa mia", "avrei dovuto", "mi sento in colpa", "ho deluso", "mi rimprovero"
- PUNTEGGIO: 7-10 se esplicito
- Se NON menzionato → null

**gratitude** (gratitudine espressa):
- RILEVA: "sono grato", "apprezzo", "fortunato", "ringrazio", "che fortuna"
- PUNTEGGIO: 7-10 se esplicito
- Assenza di gratitudine in contesti positivi → non significa 0, significa null
- Se NON menzionato → null

**motivation** (livello di motivazione):
- ALTA (8-10): "sono motivato", "voglio farlo", "ci credo", "non vedo l'ora di iniziare"
- BASSA (1-4): "non ho voglia", "a che scopo", "perché dovrei", "zero motivazione"
- DIVERSO da energia: uno può avere energia ma non motivazione (e viceversa)
- Se NON menzionato → null

**intrusive_thoughts** (pensieri intrusivi ego-distonici):
- RILEVA: "non riesco a togliermi dalla testa...", "pensiero che torna", "ossessione"
- RILEVA: "immagini che non voglio", "pensieri che mi spaventano"
- DIVERSO da RUMINAZIONE: i pensieri intrusivi sono ego-distonici (non li vuole avere)
- La ruminazione è ego-sintonica (ci pensa perché "deve")
- PUNTEGGIO: 7-10 se esplicito
- Se NON menzionato → null

**self_worth** (autostima/valore di sé):
- BASSO (1-3): "mi sento inutile", "non valgo niente", "sono un fallimento", "faccio schifo"
- ALTO (8-10): "sono fiero di me", "ce l'ho fatta", "sono capace", "valgo"
- DIVERSO da self_efficacy: self_worth è valore personale, self_efficacy è capacità
- Se NON menzionato → null

**coping_ability** (capacità di gestire lo stress):
- ALTA (8-10): "riesco a gestire", "ce la faccio", "tengo duro", "so come affrontarlo"
- BASSA (1-4): "mi sento sopraffatto", "non reggo", "crollo", "non so come gestire"
- Se NON menzionato → null

═══════════════════════════════════════════════
🌟 RISORSE PERSONALI (6 metriche)
═══════════════════════════════════════════════

**sense_of_purpose** (senso di scopo/direzione):
- BASSO (1-4): "non so perché faccio le cose", "a che serve", "senza scopo", "vuoto esistenziale", "non ho direzione"
- ALTO (7-10): "ho uno scopo", "so cosa voglio", "la mia missione", "so dove sto andando"
- Se NON menzionato → null

**life_satisfaction** (soddisfazione generale della vita):
- BASSA (1-4): "non sono contento della mia vita", "vorrei tutto diverso", "insoddisfatto", "delusione costante"
- ALTA (7-10): "sono soddisfatto", "la mia vita mi piace", "sono fortunato", "non cambierei nulla"
- Se NON menzionato → null

**perceived_social_support** (supporto percepito dagli altri):
- BASSO (1-4): "nessuno mi aiuta", "sono solo", "non ho nessuno", "non posso contare su nessuno"
- ALTO (7-10): "ho persone su cui contare", "posso chiedere aiuto", "mi supportano", "ho una rete"
- Se NON menzionato → null

**resilience** (capacità di riprendersi):
- BASSA (1-4): "crollo", "non ce la faccio", "mi arrendo", "non mi riprendo mai"
- ALTA (7-10): "mi rialzo sempre", "supero le difficoltà", "ce la farò", "sono resistente"
- Se NON menzionato → null

**mindfulness** (presenza nel momento):
- BASSO (1-4): "sempre nella mia testa", "perso nei pensieri", "non sono presente", "sempre altrove"
- ALTO (7-10): "vivo nel presente", "consapevole", "qui e ora", "focalizzato sul momento"
- Se NON menzionato → null

**loneliness_perceived** (solitudine percepita):
- RILEVA: "mi sento solo anche tra la gente", "nessuno mi capisce", "isolato", "abbandonato"
- ATTENZIONE: Diversa dalla socialità bassa! Uno può avere amici ma sentirsi solo.
- PUNTEGGIO: 7-10 se esplicito
- Se NON menzionato → null

═══════════════════════════════════════════════
🚨 SICUREZZA - INDICATORI CRITICI (3 metriche)
═══════════════════════════════════════════════

**suicidal_ideation** (pensieri di farsi del male) ⚠️ CRITICO:
- RILEVA: "non voglio più vivere", "sarebbe meglio se non ci fossi", "pensieri di farla finita"
- RILEVA: "vorrei sparire", "non ha senso andare avanti"
- PUNTEGGIO: 5-10 in base a intensità
- ⚠️ ALERT se > 5: crisis_risk DEVE essere "high"
- Se NON menzionato → null

**hopelessness** (disperazione totale) ⚠️ CRITICO:
- RILEVA: "non cambierà mai niente", "non c'è speranza", "è tutto inutile", "non vedo via d'uscita"
- PUNTEGGIO: 7-10 se esplicito
- ⚠️ ALERT se > 7: predittore depressione maggiore
- Se NON menzionato → null

**self_harm_urges** (impulsi autolesionistici) ⚠️ CRITICO:
- RILEVA: "voglia di farmi del male", "mi sono fatto del male", "impulso di tagliarmi"
- PUNTEGGIO: 5-10 in base a intensità
- ⚠️ ALERT se > 5: crisis_risk DEVE essere "high"
- Se NON menzionato → null

═══════════════════════════════════════════════
😰 EMOZIONI SECONDARIE - ESTRAZIONE SEMANTICA
═══════════════════════════════════════════════

**nervousness** (nervosismo/agitazione):
- RILEVA: "sono nervoso", "agitato", "non riesco a stare fermo", "irrequieto", "in ansia"
- Movimento continuo, mani sudate, parlare veloce → inferisci 5-7
- DIVERSO da ANSIA: il nervosismo è più fisico/superficiale, l'ansia è più profonda
- Se NON menzionato → null

**overwhelm** (sopraffazione) ⚠️ CRITICO PER BURNOUT:
- RILEVA: "mi sento sopraffatto", "è troppo", "non ce la faccio", "troppe cose"
- Menzione di liste infinite, scadenze multiple, responsabilità eccessive → 6-8
- PUNTEGGIO: 7-10 se esplicito
- Se NON menzionato → null

**excitement** (eccitazione/entusiasmo):
- RILEVA: "sono elettrizzato", "non vedo l'ora", "entusiasta", "gasato", "carico"
- ✅ DEVI INFERIRE da contesto positivo: viaggi imminenti, feste, eventi, nuove opportunità
- ALTA (7-10): viaggio in arrivo, festa importante, evento atteso con entusiasmo
- MEDIA (4-6): piani per il weekend, uscita con amici, piccole occasioni positive
- Può coesistere con nervosismo (eccitazione nervosa)
- Se contesto neutro/negativo → 0

**disappointment** (delusione):
- RILEVA: "sono deluso", "mi aspettavo di più", "che peccato", "speravo meglio"
- Aspettative non soddisfatte, promesse non mantenute → 5-7
- Se NON menzionato → null

═══════════════════════════════════════════════
😀 EMOZIONI EKMAN ESTESE + POSITIVE SECONDARIE
═══════════════════════════════════════════════

**disgust** (avversione/repulsione) - BASE EKMAN:
- RILEVA: "mi fa schifo", "ripugnante", "che disgusto", "non lo sopporto fisicamente"
- ⚠️ DIVERSO da disapprovazione morale! Disgust è FISICO/VISCERALE.
- PUNTEGGIO: 5-10 se esplicito
- Se NON menzionato → null (MAI inferire!)

**surprise** (reazione all'inaspettato) - BASE EKMAN:
- RILEVA: "non me l'aspettavo!", "sono rimasto di stucco", "incredibile!", "che sorpresa"
- Può essere POSITIVA o NEGATIVA. Rileva il TIPO nel contesto.
- PUNTEGGIO: 5-10 se esplicito
- Se NON menzionato → null

**serenity** (calma interiore/pace):
- RILEVA: "mi sento in pace", "sono sereno", "tranquillo", "calma interiore", "pace mentale"
- ✅ PUOI INFERIRE da contesto rilassato: vacanza, relax, momento di svago senza stress
- MEDIA (4-6): vacanza, momento di svago, contesto rilassato
- ALTA (7-10): esplicita menzione di pace/serenità
- ⚠️ DIVERSO da bassa ansia! Serenity è uno stato ATTIVO di pace, non assenza di negatività.
- Se contesto stressante o neutro → 0

**pride** (orgoglio per risultati):
- RILEVA: "sono fiero di me", "ce l'ho fatta!", "sono orgoglioso", "mi sono superato"
- ✅ PUOI INFERIRE da successi, obiettivi raggiunti, promozioni, lauree, traguardi
- ALTA (7-10): promozione, laurea, matrimonio, traguardo importante
- MEDIA (4-6): piccoli successi, risultati positivi
- CORRELATO a achievement - cerca celebrazioni di successi
- Se nessun successo/risultato → 0

**affection** (affetto/tenerezza):
- RILEVA: "gli/le voglio bene", "mi sta a cuore", "lo/la amo", "tenerezza", "mi manca"
- Emozione RELAZIONALE - cerca menzioni di persone care
- PUNTEGGIO: 5-10 se esplicito
- Se NON menzionato → null

**curiosity** (interesse/voglia di esplorare):
- RILEVA: "mi incuriosisce", "vorrei sapere di più", "sono interessato", "mi affascina"
- Segnale POSITIVO di engagement mentale
- PUNTEGGIO: 5-10 se esplicito
- Se NON menzionato → null

═══════════════════════════════════════════════
🏠 AREE VITA ESTESE (family, leisure, finances)
═══════════════════════════════════════════════

**family** (relazioni familiari) - NUOVO:
- CERCA: genitori, madre, padre, fratelli, sorelle, figli, nonni, zii, cugini, famiglia
- NEGATIVO (1-4): "mia madre mi stressa", "litigato con mio padre", "tensioni familiari", "non parlo con i miei"
- POSITIVO (7-9): "bella giornata in famiglia", "mi supportano", "rapporti buoni"
- ⚠️ DISTINGUI da love (partner) e social (amici)!
- Se NON menzionato → null

**leisure** (tempo libero/hobby) - NUOVO:
- CERCA: hobby, relax, weekend, vacanze, sport per piacere, film, serie, giochi, svago
- NEGATIVO (1-3): "non ho tempo per me", "solo lavoro, zero svago", "mai un momento libero"
- POSITIVO (7-9): "mi sono rilassato", "mi sono divertito", "tempo per i miei hobby"
- ✅ PUOI INFERIRE: viaggio/vacanza → leisure: 7-9, uscita con amici → leisure: 6-7
- Se NON menzionato E nessun contesto svago → null

**finances** (situazione economica) - NUOVO:
- CERCA: soldi, spese, risparmio, debiti, stipendio, bollette, mutuo, affitto, costi
- NEGATIVO (1-4): "non arrivo a fine mese", "preoccupato per i soldi", "debiti", "ristrettezze"
- POSITIVO (7-9): "economicamente tranquillo", "ho ricevuto un aumento!", "risparmi ok"
- Se NON menzionato → null

⚠️ ANTI-HALLUCINATION GLOBALE: Se NON ci sono indizi ESPLICITI, il valore DEVE essere null.
Solo valori ESPLICITI o FORTEMENTE INFERIBILI → assegna punteggio.
NON inventare NIENTE basandoti su inferenze generali!
`;

    // NEW: VITALS semantic extraction rules (HARDENED)
    const vitalsSemanticPrompt = `
═══════════════════════════════════════════════
💓 VITALI - REGOLE SEMANTICHE (OBBLIGATORIE!)
═══════════════════════════════════════════════
⚠️ REGOLA FONDAMENTALE: Se l'utente NON parla ESPLICITAMENTE di questi temi → NULL. MAI inventare!

🚨 CALIBRAZIONE ANTI-CONSERVATIVISMO (OBBLIGATORIA!):
I modelli AI tendono ad appiattire i punteggi verso 6-7 per cautela. Questo è un ERRORE CLINICO.
Se l'utente parla CHIARAMENTE BENE di qualcosa, il punteggio DEVE riflettere l'intensità reale.
- NON avere paura di dare 8, 9 o 10 quando il contesto lo giustifica!
- Un utente che dice "sono felicissimo" o "giornata fantastica" merita 9-10, NON 7.
- Un utente che racconta entusiasticamente qualcosa di positivo → almeno 8.
- Il 7 è per situazioni BUONE MA ORDINARIE ("sto bene", senza dettagli), non per entusiasmo genuino.
- REGOLA: Se il transcript contiene molte espressioni positive → punteggio >= 8.
- REGOLA: Se l'utente usa superlativi ("bellissimo", "fantastico", "incredibile") → punteggio >= 9.

**mood** (umore generale 1-10):
- RILEVA: espressioni ESPLICITE dello stato d'animo generale
- BASSO (1-4): "mi sento giù", "sono triste", "depresso", "abbattuto", "giornata nera", "umore a terra", "umore pessimo", "mi sento male", "sono a pezzi"
- MEDIO (5-6): "così così", "normale", "né bene né male", "meh", "insomma", "niente di che"
- BUONO (7): "mi sento bene", "sto bene", "giornata ok" → soddisfazione calma senza entusiasmo
- MOLTO BUONO (8): "sono contento", "giornata bella", "soddisfatto" → positività chiara con dettagli concreti
- OTTIMO (9): "sono molto felice", "giornata fantastica", "ottimo umore", "alla grande" → entusiasmo evidente con esclamazioni
- ECCELLENTE (10): "non potrebbe andare meglio", "umore al massimo", "in forma smagliante", "il giorno più bello" → euforia o picco emotivo raro
- 🚨 Se l'utente racconta cose positive CON ENTUSIASMO → minimo 8. Se ESTREMAMENTE positivo → 9-10.
- ⚠️ SOLO se l'utente ESPRIME il proprio umore! Sintomi fisici ≠ mood
- Se NON menzionato esplicitamente → null

**anxiety** (ansia 1-10):
- RILEVA: preoccupazioni, tensione, sintomi fisici da ansia
- ALTA (7-10): "sono in ansia", "sono preoccupatissimo", "agitato", "nervoso", "pensieri che girano", "non riesco a calmarmi", "panico", "ho l'ansia", "cuore che batte forte", "fiato corto"
- MEDIA (4-6): "un po' teso", "leggermente preoccupato", "mi preoccupa un po'", "sono nervosetto"
- BASSA (1-3): "sono tranquillo", "sereno", "rilassato", "calmo", "zen", "nessuna preoccupazione"
- ⚠️ DISTINGUI ansia da tristezza! Tristezza ≠ ansia. Ansia = preoccupazione + attivazione.
- Se NON menzionato → null

**energy** (energia 1-10):
- RILEVA: livelli di energia fisica/mentale
- BASSA (1-4): "sono stanco", "esausto", "senza forze", "spossato", "zero energie", "morto", "distrutto", "sfinito", "non ho energie", "sono a terra"
- MEDIA (5-6): "energia normale", "ok", "nella media"
- BUONA (7): "mi sento bene", "attivo" → energia positiva ma ordinaria
- ALTA (8): "sono carico", "pieno di energia", "dinamico" → energia sopra la norma
- MOLTO ALTA (9): "energico da paura", "voglia di fare tutto", "in forma smagliante" → entusiasmo energetico
- MASSIMA (10): "non mi sono mai sentito così carico", "energia esplosiva" → picco raro
- 🚨 Se l'utente descrive attività intense fatte con piacere e senza fatica → almeno 8.
- ⚠️ ATTENZIONE: Distingui tra stanchezza FISICA (energy) ed EMOTIVA (mood/burnout)
- Se NON menzionato → null

**sleep** (qualità sonno 1-10):
- RILEVA: SOLO menzioni ESPLICITE del sonno/riposo notturno
- SCARSO (1-4): "ho dormito male", "insonnia", "mi sono svegliato alle 3", "incubi", "non dormo", "notte in bianco", "non riesco a dormire", "mi sveglio sempre"
- MEDIO (5-6): "ho dormito ok", "dormito abbastanza", "così così", "poteva andare meglio"
- BUONO (7-8): "ho dormito bene", "sono riposato", "bella dormita"
- OTTIMO (9-10): "ho dormito benissimo", "8 ore filate", "dormito come un sasso", "notte perfetta", "miglior sonno da mesi"
- ⚠️ REGOLA STRETTA: Assegna SOLO se l'utente PARLA del sonno!
- ⚠️ NON inferire sonno da stanchezza! "Sono stanco" ≠ "ho dormito male"
- Se NON menziona sonno/dormire/riposo → null (MAI inventare!)
`;

    // NEW: Base Emotions semantic extraction rules (HARDENED)
    const baseEmotionsPrompt = `
═══════════════════════════════════════════════
😊 EMOZIONI BASE - REGOLE SEMANTICHE (OBBLIGATORIE!)
═══════════════════════════════════════════════
⚠️ Per le EMOZIONI: Se NON espressa → 0 (default). MAI inventare intensità non presenti!

**joy** (gioia 0-10):
- RILEVA: espressioni di felicità, contentezza, O CONTESTO CHIARAMENTE POSITIVO
- BASSA (1-3): "un po' contento", "niente male"
- MEDIA (4-6): "sono contento", "soddisfatto", "mi fa piacere", "bene così", viaggio programmato, uscita con amici, evento positivo imminente
- BUONA (7): "sono contento!", "bella giornata" → positività senza eccesso
- ALTA (8): "sono molto felice", "che bello!", "fantastico!" → entusiasmo chiaro con esclamazioni
- MOLTO ALTA (9): "sono contentissimo!", "entusiasta!", "non sto nella pelle!" → gioia intensa
- MASSIMA (10): "gioia immensa", "il giorno più bello della mia vita", "piango di gioia" → picco emotivo
- 🚨 ANTI-CONSERVATIVISMO: Se l'utente racconta qualcosa con GENUINO entusiasmo → minimo 8. NON dare 7 a chi è chiaramente felice!
- ✅ PUOI INFERIRE joy da contesto positivo evidente (viaggio, festa, successo, buone notizie)
- Se contesto neutro/negativo → 0

**sadness** (tristezza 0-10):
- RILEVA: espressioni di tristezza, abbattimento
- ALTA (7-10): "sono tristissimo", "ho pianto", "mi sento disperato", "sono a pezzi", "devastato"
- MEDIA (4-6): "sono triste", "mi sento giù", "abbattuto", "sconsolato", "malinconico"
- BASSA (1-3): "un po' giù", "non sono al massimo"
- ⚠️ Tristezza ≠ stanchezza. Tristezza ≠ ansia. Cerca parole EMOTIVE.
- Se NON espressa → 0

**anger** (rabbia 0-10):
- RILEVA: espressioni di rabbia, frustrazione intensa, irritazione
- ALTA (7-10): "sono furioso", "incazzato nero", "mi ha fatto arrabbiare tantissimo", "sono furente", "voglio spaccare tutto"
- MEDIA (4-6): "sono arrabbiato", "mi dà fastidio", "sono irritato", "mi ha fatto innervosire"
- BASSA (1-3): "un po' seccato", "leggermente irritato"
- ⚠️ DIVERSO da frustration (più passiva). Anger = emozione ATTIVA, aggressiva.
- Se NON espressa → 0

**fear** (paura 0-10):
- RILEVA: espressioni di paura, terrore, timore
- ALTA (7-10): "ho paura", "sono terrorizzato", "mi spaventa da morire", "panico", "sono spaventatissimo"
- MEDIA (4-6): "mi preoccupa", "mi fa paura", "ho timore", "mi spaventa"
- BASSA (1-3): "un po' di apprensione", "leggermente timoroso"
- ⚠️ Fear ≠ anxiety. Fear è più acuta e specifica, anxiety è cronica e diffusa.
- ⚠️ Se anxiety >= 6, considera fear >= 3-4 (correlazione)
- Se NON espressa → 0

**shame** (vergogna 0-10):
- RILEVA: espressioni di vergogna, imbarazzo
- ALTA (7-10): "mi vergogno tantissimo", "vorrei sparire", "che figura di m***", "sono mortificato"
- MEDIA (4-6): "mi vergogno", "che figura!", "sono imbarazzato", "mi sento a disagio"
- BASSA (1-3): "un po' imbarazzato", "leggermente a disagio"
- ⚠️ DIVERSO da guilt (colpa per azioni). Shame = giudizio su SÉ STESSO.
- Se NON espressa → 0

**jealousy** (gelosia/invidia 0-10):
- RILEVA: espressioni di gelosia o invidia
- ALTA (7-10): "sono gelosissimo", "rosico da morire", "perché lui sì e io no?!", "non è giusto!"
- MEDIA (4-6): "sono geloso", "lo invidio", "lui ha tutto", "vorrei essere come lui/lei"
- BASSA (1-3): "un po' invidioso", "ammetto che mi rode"
- ⚠️ Può riferirsi a RELAZIONI (gelosia romantica) o POSSESSI (invidia)
- Se NON espressa → 0

**hope** (speranza 0-10):
- RILEVA: espressioni di speranza, ottimismo per il futuro, PIANI FUTURI POSITIVI
- ALTA (7-10): "ho tanta speranza", "sono sicuro che andrà bene", "ce la faremo!", "vedo la luce"
- MEDIA (4-6): "spero", "forse andrà bene", "ho fiducia", "sono ottimista", viaggi programmati, progetti futuri, obiettivi
- BASSA (1-3): "un filo di speranza", "magari..."
- ✅ PUOI INFERIRE hope se l'utente parla di piani futuri positivi (viaggio, evento, progetto)
- Se NON espressa e nessun piano futuro → 0

**frustration** (frustrazione 0-10):
- RILEVA: espressioni di frustrazione, senso di blocco
- ALTA (7-10): "che frustrazione!", "non ce la faccio più", "sono bloccato", "non funziona niente!"
- MEDIA (4-6): "sono frustrato", "mi sento bloccato", "non riesco ad andare avanti"
- BASSA (1-3): "un po' frustrato", "poteva andare meglio"
- ⚠️ DIVERSO da anger (rabbia attiva). Frustration = impotenza, blocco PASSIVO.
- Se NON espressa → 0

**nostalgia** (nostalgia 0-10):
- RILEVA: espressioni di nostalgia per il passato
- ALTA (7-10): "mi manca tantissimo", "bei tempi andati", "rimpiango tanto", "non sarà mai più così"
- MEDIA (4-6): "mi manca", "una volta era meglio", "che nostalgia", "penso spesso a..."
- BASSA (1-3): "a volte mi manca", "ogni tanto ci penso"
- ⚠️ Nostalgia può essere DOLCE (positiva) o DOLOROSA (negativa). Rileva il tono.
- Se NON espressa → 0
`;

    // Build the OMNISCIENT analysis prompt with personalization
    const analysisPrompt = `SEI UN ANALISTA CLINICO OMNISCIENTE con formazione in Psichiatria, Psicologia Clinica e Neuroscienze.
Analizza la conversazione e restituisci SEMPRE un JSON valido.

🚨 CALIBRAZIONE GLOBALE ANTI-APPIATTIMENTO:
I modelli AI tendono sistematicamente a dare 7 quando il contesto è positivo. Questo APPIATTISCE i dati e rende l'analisi clinicamente INUTILE.
REGOLE OBBLIGATORIE per emozioni positive (joy, excitement, serenity, pride, hope, affection, curiosity):
- Se l'utente esprime positività con ENTUSIASMO (esclamazioni, superlativi, dettagli gioiosi) → punteggio 8-9
- Se l'utente è ESTREMAMENTE positivo o usa superlativi ("bellissimo!", "incredibile!", "fantastico!") → punteggio 9-10
- Il 7 è riservato SOLO a positività MODERATA e CALMA senza entusiasmo evidente
- Il 6 o meno è per positività APPENA ACCENNATA
- CHIEDITI: "L'utente sembra genuinamente entusiasta?" → Se sì, dai almeno 8.

${personalizedInstructions}
${vitalsSemanticPrompt}
${baseEmotionsPrompt}
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
REGOLA DIFFERENZIATA PER TIPO DI EMOZIONE:

🔴 EMOZIONI NEGATIVE (tristezza, rabbia, paura, ansia, vergogna, colpa, disperazione):
   → Richiedi evidenza ESPLICITA! NON inventare problemi!
   → Se l'utente NON dice esplicitamente di stare male → 0 o null

🟢 EMOZIONI POSITIVE (gioia, eccitazione, speranza, serenità, orgoglio):
   → PUOI E DEVI INFERIRE dal contesto se chiaramente positivo!
   → Viaggio + amici = excitement + social + joy
   → Festa/evento = excitement + anticipation
   → Obiettivo raggiunto = pride + joy
   → Vacanza programmata = hope + excitement + leisure

REGOLE SPECIFICHE:
- APATIA: Assegna > 0 SOLO per frasi esplicite come "non sento niente", "vuoto", "indifferenza totale". 
  Stanchezza fisica o noia NON sono apatia → apathy = 0.
- SONNO: Assegna valore SOLO se l'utente menziona esplicitamente il sonno/riposo. Altrimenti null.
- ANSIA: Deriva da sintomi fisici (cuore, respiro) o preoccupazioni esplicite. Tristezza ≠ ansia.
- BURNOUT: Assegna SOLO se esplicitamente legato a lavoro/doveri. Stanchezza generica ≠ burnout.

═══════════════════════════════════════════════
🌟 REGOLE DI INFERENZA CONTESTUALE (EMOZIONI POSITIVE)
═══════════════════════════════════════════════
Quando il contesto è CHIARAMENTE POSITIVO, DEVI assegnare punteggi:

**VIAGGIO/VACANZA:**
- "parto per X", "vado a X", "viaggio a X", "vacanza" → excitement: 6-8, leisure: 7-9, hope: 5-7
- Se con amici/partner → aggiungi social: 7-8 o love: 7-8

**EVENTI POSITIVI:**
- "festa", "compleanno", "matrimonio", "laurea" → excitement: 7-8, joy: 6-8
- "promozione", "nuovo lavoro" → pride: 6-8, joy: 6-7, work: 8-9

**SOCIALITÀ:**
- "con amici", "uscita", "aperitivo", "gruppo" → social: 7-8, joy: 5-6

**TEMPO LIBERO:**
- "weekend", "relax", "hobby", "sport" → leisure: 6-8

**PIANI FUTURI POSITIVI:**
- Qualsiasi progetto/piano entusiasmante → hope: 5-7, excitement: 4-6

⚠️ RICORDA: Le emozioni NEGATIVE richiedono ancora parole esplicite.
Le emozioni POSITIVE DEVONO essere inferite da contesto positivo evidente.

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
📊 STRUTTURA JSON RICHIESTA (ESTESA v2.0 - ~66 metriche)
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
    "disgust": <0-10, avversione/repulsione>,
    "surprise": <0-10, reazione all'inaspettato>,
    "shame": <0-10, vergogna/imbarazzo>,
    "jealousy": <0-10, gelosia/invidia>,
    "hope": <0-10, speranza/ottimismo>,
    "frustration": <0-10, frustrazione/impazienza>,
    "nostalgia": <0-10, nostalgia/malinconia del passato>,
    "nervousness": <0-10, nervosismo/agitazione - diverso da ansia, più fisico>,
    "overwhelm": <0-10, sopraffazione - troppo da gestire>,
    "excitement": <0-10, eccitazione/entusiasmo positivo>,
    "disappointment": <0-10, delusione da aspettative non soddisfatte>,
    "serenity": <0-10, calma interiore e pace>,
    "pride": <0-10, orgoglio per risultati>,
    "affection": <0-10, affetto/tenerezza>,
    "curiosity": <0-10, interesse/voglia di esplorare>
  },
  "life_areas": {
    "work": <1-10 o null>,
    "school": <1-10 o null>,
    "love": <1-10 o null>,
    "family": <1-10 o null, relazioni familiari>,
    "health": <1-10 o null>,
    "social": <1-10 o null>,
    "growth": <1-10 o null>,
    "leisure": <1-10 o null, tempo libero/hobby>,
    "finances": <1-10 o null, situazione economica>
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
    "self_worth": <1-10 o null, autostima/valore di sé>,
    "dissociation": <1-10 o null, distacco dalla realtà - CRITICO per trauma>,
    "confusion": <1-10 o null, confusione mentale>,
    "racing_thoughts": <1-10 o null, pensieri accelerati - indicatore mania>,
    "emotional_regulation": <1-10 o null, capacità di gestire emozioni>,
    "avoidance": <1-10 o null, evitamento situazioni - core ansia>,
    "social_withdrawal": <1-10 o null, ritiro sociale>,
    "compulsive_urges": <1-10 o null, impulsi compulsivi - OCD>,
    "procrastination": <1-10 o null, rimandare compiti>,
    "sense_of_purpose": <1-10 o null, senso di scopo/direzione>,
    "life_satisfaction": <1-10 o null, soddisfazione generale>,
    "perceived_social_support": <1-10 o null, supporto dagli altri>,
    "resilience": <1-10 o null, capacità di riprendersi>,
    "mindfulness": <1-10 o null, presenza nel momento>,
    "suicidal_ideation": <0-10 o null, CRITICO - pensieri di farsi del male. Alert se > 5>,
    "hopelessness": <0-10 o null, CRITICO - perdita totale di speranza. Alert se > 7>,
    "self_harm_urges": <0-10 o null, CRITICO - impulsi autolesionistici. Alert se > 5>
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
  ],
  "milestone_objective_updates": [
    {"objective_id": "uuid", "ai_custom_description": "descrizione aggiornata o null", "ai_progress_estimate": <0-100>, "new_milestone": {"milestone": "testo", "note": "opzionale"} | null}
  ],
  "habits_detected": [
    {
      "habit_type": "identificatore habit (es: meditation, water, exercise, cigarettes)",
      "label": "Nome leggibile (es: Meditazione)",
      "daily_target": <numero target giornaliero>,
      "streak_type": "daily|abstain",
      "unit": "unità (es: min, bicchieri, sessioni) o null",
      "needs_confirmation": true/false
    }
  ],
  "habit_progress_updates": [
    {
      "habit_type": "identificatore habit",
      "value": <numero registrato>,
      "date": "YYYY-MM-DD (oggi o data menzionata)",
      "note": "nota opzionale"
    }
  ],
  "events_detected": [
    {
      "title": "Titolo breve dell'evento (es: Colloquio di lavoro, Viaggio a Madrid)",
      "event_type": "travel|medical|work|social|celebration|appointment|generic",
      "event_date": "YYYY-MM-DD",
      "event_time": "HH:MM o null se non specificato",
      "end_date": "YYYY-MM-DD o null",
      "is_all_day": true/false,
      "location": "Luogo se menzionato o null",
      "description": "Dettagli aggiuntivi o null",
      "tags": ["tag1", "tag2"],
      "extracted_from_text": "Frase originale dell'utente"
    }
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
    
    const analysisResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: analysisPrompt }] },
        contents: [{ role: 'user', parts: [{ text: `Analizza questa conversazione terapeutica:\n\n${transcript}${diaryContextBlock}` }] }],
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('[process-session] Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    const analysisText = analysisData.candidates[0].content.parts[0].text;
    
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
        life_areas: { work: null, school: null, love: null, health: null, social: null, growth: null },
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

    // ═══════════════════════════════════════════════
    // 🌟 POST-PROCESSING CONTESTUALE: Forza emozioni positive da pattern
    // Cattura pattern ovvi che l'AI potrebbe aver ignorato
    // ═══════════════════════════════════════════════
    const forceContextualInferences = (analysis: OmniscientAnalysis, transcriptText: string): OmniscientAnalysis => {
      const lowerTranscript = transcriptText.toLowerCase();
      const { emotions, life_areas } = analysis;
      
      // 1. Pattern VIAGGIO/VACANZA → excitement, leisure, hope
      if (/viaggio|vacanza|parto per|vado a|andiamo a|voleremo|volo per|partenza|destinazione|madrid|rio|parigi|londra|berlino|amsterdam|barcellona|ibiza/.test(lowerTranscript)) {
        if (!emotions.excitement || emotions.excitement < 6) {
          console.log(`[CONTEXTUAL] Forcing excitement: ${emotions.excitement || 0} → 7 (travel detected)`);
          emotions.excitement = 7;
        }
        if (!life_areas.leisure || life_areas.leisure < 7) {
          console.log(`[CONTEXTUAL] Forcing leisure: ${life_areas.leisure || 'null'} → 8 (travel detected)`);
          life_areas.leisure = 8;
        }
        if (!emotions.hope || emotions.hope < 5) {
          console.log(`[CONTEXTUAL] Forcing hope: ${emotions.hope || 0} → 6 (travel detected)`);
          emotions.hope = 6;
        }
        // Se umore alto ma joy bassa, alza joy
        if (analysis.vitals.mood && analysis.vitals.mood >= 7 && emotions.joy < 5) {
          console.log(`[CONTEXTUAL] Forcing joy: ${emotions.joy} → 6 (high mood + travel)`);
          emotions.joy = 6;
        }
      }
      
      // 2. Pattern AMICI/SOCIALE → social, joy
      if (/con (?:i |gli |le )?amici|con (?:i )?ragazzi|gruppo|aperitivo|uscita|usciamo|cena fuori|serata|festa|party|circo loco|discoteca|club/.test(lowerTranscript)) {
        if (!life_areas.social || life_areas.social < 6) {
          console.log(`[CONTEXTUAL] Forcing social: ${life_areas.social || 'null'} → 7 (friends detected)`);
          life_areas.social = 7;
        }
        if (emotions.joy < 5) {
          console.log(`[CONTEXTUAL] Boosting joy: ${emotions.joy} → 6 (social context)`);
          emotions.joy = Math.max(emotions.joy, 6);
        }
      }
      
      // 3. Pattern EVENTI POSITIVI → excitement, joy, pride
      if (/matrimonio|laurea|compleanno|promozione|nuovo lavoro|assunto|contratto|celebrazione|festeggiare/.test(lowerTranscript)) {
        if (!emotions.excitement || emotions.excitement < 7) {
          console.log(`[CONTEXTUAL] Forcing excitement: ${emotions.excitement || 0} → 8 (positive event)`);
          emotions.excitement = 8;
        }
        if (emotions.joy < 6) {
          console.log(`[CONTEXTUAL] Forcing joy: ${emotions.joy} → 7 (positive event)`);
          emotions.joy = 7;
        }
        if (/promozione|nuovo lavoro|assunto|laurea/.test(lowerTranscript)) {
          if (!emotions.pride || emotions.pride < 6) {
            console.log(`[CONTEXTUAL] Forcing pride: ${emotions.pride || 0} → 7 (achievement)`);
            emotions.pride = 7;
          }
          if (/lavoro|assunto|promozione/.test(lowerTranscript) && (!life_areas.work || life_areas.work < 7)) {
            console.log(`[CONTEXTUAL] Forcing work: ${life_areas.work || 'null'} → 8 (work success)`);
            life_areas.work = 8;
          }
        }
      }
      
      // 4. Pattern RELAX/TEMPO LIBERO → leisure, serenity
      if (/weekend|relax|rilassarmi|hobby|sport|palestra|yoga|meditazione|film|serie|netflix|giocando|videogiochi/.test(lowerTranscript)) {
        if (!life_areas.leisure || life_areas.leisure < 6) {
          console.log(`[CONTEXTUAL] Forcing leisure: ${life_areas.leisure || 'null'} → 7 (leisure activity)`);
          life_areas.leisure = 7;
        }
        if (/relax|rilassarmi|sereno|tranquillo/.test(lowerTranscript)) {
          if (!emotions.serenity || emotions.serenity < 5) {
            console.log(`[CONTEXTUAL] Forcing serenity: ${emotions.serenity || 0} → 6 (relaxation)`);
            emotions.serenity = 6;
          }
        }
      }
      
      // 5. Pattern PARTNER/AMORE → love, affection
      if (/fidanzat[oa]|ragazz[oa]|partner|marit[oa]|compagn[oa]|insieme a lei|insieme a lui|con lei|con lui|la mia lei|il mio lui/.test(lowerTranscript)) {
        // Solo se contesto positivo (nessun litigio, problema)
        if (!/litiga|problem|difficolt|lascia|rottura|crisi/.test(lowerTranscript)) {
          if (!life_areas.love || life_areas.love < 6) {
            console.log(`[CONTEXTUAL] Forcing love: ${life_areas.love || 'null'} → 7 (partner mention positive)`);
            life_areas.love = 7;
          }
          if (!emotions.affection || emotions.affection < 5) {
            console.log(`[CONTEXTUAL] Forcing affection: ${emotions.affection || 0} → 6 (partner context)`);
            emotions.affection = 6;
          }
        }
      }
      
      // 6. Pattern UMORE ALTO senza emozioni → forza joy/excitement (ANTI-CONSERVATIVISMO)
      if (analysis.vitals.mood && analysis.vitals.mood >= 8) {
        if (emotions.joy < 7) {
          console.log(`[CONTEXTUAL] Forcing joy: ${emotions.joy} → ${Math.max(7, analysis.vitals.mood - 1)} (high mood ${analysis.vitals.mood})`);
          emotions.joy = Math.max(7, analysis.vitals.mood - 1);
        }
        if (!emotions.excitement || emotions.excitement < 5) {
          console.log(`[CONTEXTUAL] Forcing excitement: ${emotions.excitement || 0} → 5 (high mood ${analysis.vitals.mood})`);
          emotions.excitement = 5;
        }
        if (!emotions.hope || emotions.hope < 5) {
          console.log(`[CONTEXTUAL] Forcing hope: ${emotions.hope || 0} → 5 (high mood)`);
          emotions.hope = 5;
        }
      }
      
      return { ...analysis, emotions, life_areas };
    };
    
    // Apply forced correlations (negative)
    analysis = forceEmotionCorrelations(analysis);
    
    // Apply contextual inferences (positive)
    analysis = forceContextualInferences(analysis, transcript);
    
    console.log('[process-session] Post-processed analysis:', JSON.stringify({
      emotions: analysis.emotions,
      life_areas: analysis.life_areas
    }, null, 2));

    const isCrisisAlert = analysis.crisis_risk === 'high';
    const today = new Date().toISOString().split('T')[0];

    // Track DB write errors for graceful degradation
    const dbErrors: Array<{ table: string; error: string }> = [];

    // 1. Update the SESSION with all analysis results (including deep_psychology)
    try {
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
        energy_score_detected: analysis.vitals.energy, // NEW: Store energy in session
        emotion_tags: analysis.emotion_tags,
        ai_summary: analysis.summary,
        life_balance_scores: lifeBalanceScores,
        emotion_breakdown: analysis.emotions,
        key_events: analysis.key_events,
        insights: analysis.insights,
        crisis_alert: isCrisisAlert,
        ...(incremental ? {} : { status: 'completed' }),
        specific_emotions: analysis.emotions,
        clinical_indices: analysis.clinical_indices,
        sleep_quality: analysis.vitals.sleep,
        deep_psychology: analysis.deep_psychology // Store deep psychology in session
      })
      .eq('id', session_id);

    if (sessionError) {
      console.error(`[process-session] Failed to save sessions for session ${session_id}:`, sessionError.message);
      dbErrors.push({ table: 'sessions', error: sessionError.message });
    }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[process-session] Failed to save sessions for session ${session_id}:`, msg);
      dbErrors.push({ table: 'sessions', error: msg });
    }

    // 2. SAVE TO daily_emotions (upsert) - including all 20 emotions
    try {
    console.log('[process-session] Saving to daily_emotions with all 20 emotions...');
    const { error: emotionsError } = await supabase
      .from('daily_emotions')
      .upsert({
        user_id: user_id,
        date: today,
        // Primary emotions - Ekman base (6)
        joy: analysis.emotions.joy || 0,
        sadness: analysis.emotions.sadness || 0,
        anger: analysis.emotions.anger || 0,
        fear: analysis.emotions.fear || 0,
        apathy: analysis.emotions.apathy || 0,
        disgust: analysis.emotions.disgust || null,
        surprise: analysis.emotions.surprise || null,
        // Secondary emotions (5)
        shame: analysis.emotions.shame || null,
        jealousy: analysis.emotions.jealousy || null,
        hope: analysis.emotions.hope || null,
        frustration: analysis.emotions.frustration || null,
        nostalgia: analysis.emotions.nostalgia || null,
        // Extended emotions (4)
        nervousness: analysis.emotions.nervousness || null,
        overwhelm: analysis.emotions.overwhelm || null,
        excitement: analysis.emotions.excitement || null,
        disappointment: analysis.emotions.disappointment || null,
        // NEW: Extended positive emotions (4)
        serenity: analysis.emotions.serenity || null,
        pride: analysis.emotions.pride || null,
        affection: analysis.emotions.affection || null,
        curiosity: analysis.emotions.curiosity || null,
        source: 'session',
        session_id: session_id
      }, { onConflict: 'user_id,date,source' });

    if (emotionsError) {
      console.error(`[process-session] Failed to save daily_emotions for session ${session_id}:`, emotionsError.message);
      dbErrors.push({ table: 'daily_emotions', error: emotionsError.message });
    }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[process-session] Failed to save daily_emotions for session ${session_id}:`, msg);
      dbErrors.push({ table: 'daily_emotions', error: msg });
    }

    // 3. SAVE TO daily_life_areas (upsert) - 9 areas
    try {
    const hasLifeAreas = Object.values(analysis.life_areas).some(v => v !== null);
    if (hasLifeAreas) {
      console.log('[process-session] Saving to daily_life_areas...');
      const { error: lifeAreasError } = await supabase
        .from('daily_life_areas')
        .upsert({
          user_id: user_id,
          date: today,
          work: analysis.life_areas.work,
          school: analysis.life_areas.school,
          love: analysis.life_areas.love,
          family: analysis.life_areas.family || null,
          health: analysis.life_areas.health,
          social: analysis.life_areas.social,
          growth: analysis.life_areas.growth,
          leisure: analysis.life_areas.leisure || null,
          finances: analysis.life_areas.finances || null,
          source: 'session',
          session_id: session_id
        }, { onConflict: 'user_id,date,source' });

      if (lifeAreasError) {
        console.error(`[process-session] Failed to save daily_life_areas for session ${session_id}:`, lifeAreasError.message);
        dbErrors.push({ table: 'daily_life_areas', error: lifeAreasError.message });
      }
    }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[process-session] Failed to save daily_life_areas for session ${session_id}:`, msg);
      dbErrors.push({ table: 'daily_life_areas', error: msg });
    }

    // 4. SAVE TO daily_psychology (upsert) - ~32 parameters including safety indicators
    try {
    const hasDeepPsychology = Object.values(analysis.deep_psychology).some(v => v !== null);
    if (hasDeepPsychology) {
      console.log('[process-session] Saving to daily_psychology with all ~32 parameters...');
      const { error: psychologyError } = await supabase
        .from('daily_psychology')
        .upsert({
          user_id: user_id,
          date: today,
          // Cognitive (6)
          rumination: analysis.deep_psychology.rumination,
          self_efficacy: analysis.deep_psychology.self_efficacy,
          mental_clarity: analysis.deep_psychology.mental_clarity,
          concentration: analysis.deep_psychology.concentration,
          dissociation: analysis.deep_psychology.dissociation || null,
          confusion: analysis.deep_psychology.confusion || null,
          // Activation (4)
          burnout_level: analysis.deep_psychology.burnout_level,
          irritability: analysis.deep_psychology.irritability,
          racing_thoughts: analysis.deep_psychology.racing_thoughts || null,
          emotional_regulation: analysis.deep_psychology.emotional_regulation || null,
          // Behavioral (4)
          avoidance: analysis.deep_psychology.avoidance || null,
          social_withdrawal: analysis.deep_psychology.social_withdrawal || null,
          compulsive_urges: analysis.deep_psychology.compulsive_urges || null,
          procrastination: analysis.deep_psychology.procrastination || null,
          // Somatic (3)
          somatic_tension: analysis.deep_psychology.somatic_tension,
          appetite_changes: analysis.deep_psychology.appetite_changes,
          sunlight_exposure: analysis.deep_psychology.sunlight_exposure,
          // Resources (11)
          coping_ability: analysis.deep_psychology.coping_ability,
          loneliness_perceived: analysis.deep_psychology.loneliness_perceived,
          guilt: analysis.deep_psychology.guilt,
          gratitude: analysis.deep_psychology.gratitude,
          motivation: analysis.deep_psychology.motivation,
          intrusive_thoughts: analysis.deep_psychology.intrusive_thoughts,
          self_worth: analysis.deep_psychology.self_worth,
          sense_of_purpose: analysis.deep_psychology.sense_of_purpose || null,
          life_satisfaction: analysis.deep_psychology.life_satisfaction || null,
          perceived_social_support: analysis.deep_psychology.perceived_social_support || null,
          resilience: analysis.deep_psychology.resilience || null,
          mindfulness: analysis.deep_psychology.mindfulness || null,
          // SAFETY INDICATORS (3) - CRITICAL
          suicidal_ideation: analysis.deep_psychology.suicidal_ideation || null,
          hopelessness: analysis.deep_psychology.hopelessness || null,
          self_harm_urges: analysis.deep_psychology.self_harm_urges || null,
          // Metadata
          source: 'session',
          session_id: session_id
        }, { onConflict: 'user_id,date,source' });

      if (psychologyError) {
        console.error(`[process-session] Failed to save daily_psychology for session ${session_id}:`, psychologyError.message);
        dbErrors.push({ table: 'daily_psychology', error: psychologyError.message });
      } else {
        console.log('[process-session] Deep psychology metrics saved successfully');
      }
    }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[process-session] Failed to save daily_psychology for session ${session_id}:`, msg);
      dbErrors.push({ table: 'daily_psychology', error: msg });
    }

    // 5. Update user's profile
    console.log('[process-session] Updating user profile...');
    
    // 🔍 DEBUG: Log key_facts e personal_details estratti dall'AI
    console.log('[process-session] 📝 KEY_FACTS EXTRACTED:', JSON.stringify(analysis.key_facts || []));
    console.log('[process-session] 📝 PERSONAL_DETAILS EXTRACTED:', JSON.stringify((analysis as any).personal_details || {}));
    console.log('[process-session] 📝 KEY_EVENTS EXTRACTED:', JSON.stringify(analysis.key_events || []));
    
    // Merge life balance scores
    const mergedLifeScores = { ...currentLifeScores };
    if (analysis.life_areas.love !== null) mergedLifeScores.love = analysis.life_areas.love;
    if (analysis.life_areas.work !== null) mergedLifeScores.work = analysis.life_areas.work;
    if (analysis.life_areas.social !== null) mergedLifeScores.friendship = analysis.life_areas.social;
    if (analysis.life_areas.health !== null) mergedLifeScores.wellness = analysis.life_areas.health;
    if (analysis.life_areas.growth !== null) mergedLifeScores.growth = analysis.life_areas.growth;

    // ═══════════════════════════════════════════════════════════════════════════
    // 🧠 STRUCTURED MEMORY SYSTEM - Save to user_memories table
    // ═══════════════════════════════════════════════════════════════════════════
    try {
    console.log('[process-session] 📝 Processing structured memories...');

    // Extract personal details from analysis if present
    const personalDetails = (analysis as any).personal_details || {};

    // Helper to determine category and importance for a memory
    const categorizeMemory = (fact: string, source: 'key_fact' | 'persona' | 'hobby' | 'piace' | 'evento'): { category: string; importance: number } => {
      const lowerFact = fact.toLowerCase();

      // High importance patterns
      const highImportancePatterns = /partner|fidanzat|marit|moglie|figli|genitor|famiglia|lavoro|professione|malattia|trauma|obiettivo|sogno/i;
      const mediumImportancePatterns = /amici|hobby|sport|viaggio|vacanza|studio|università|scuola/i;

      let importance = 5; // Default medium
      if (highImportancePatterns.test(lowerFact)) importance = 8;
      else if (mediumImportancePatterns.test(lowerFact)) importance = 6;

      // Determine category based on source and content
      let category = 'generale';
      if (source === 'persona') category = 'persona';
      else if (source === 'hobby') category = 'hobby';
      else if (source === 'piace') category = 'preferenza';
      else if (source === 'evento') category = 'evento';
      else {
        // Infer from content
        if (/lavoro|ufficio|carriera|professione|azienda/i.test(lowerFact)) category = 'lavoro';
        else if (/viaggio|vacanza|destinazione|volo|partenza/i.test(lowerFact)) category = 'viaggio';
        else if (/famiglia|genitor|figli|frat|sorell/i.test(lowerFact)) category = 'famiglia';
        else if (/salute|medico|malattia|farmac/i.test(lowerFact)) category = 'salute';
        else if (/obiettivo|goal|voglio|desider/i.test(lowerFact)) category = 'obiettivo';
      }

      return { category, importance };
    };

    // Collect all new memories to insert
    const newMemoriesToInsert: Array<{ fact: string; category: string; importance: number }> = [];

    // Add key_facts from AI analysis
    const filteredKeyFacts = analysis.key_facts.filter((fact: string) => {
      const corrections = analysis.corrections || [];
      return !corrections.some((c: MemoryCorrection) =>
        c.wrong_fact?.toLowerCase().includes(fact.toLowerCase()) ||
        fact.toLowerCase().includes(c.wrong_fact?.toLowerCase() || '')
      );
    });

    for (const fact of filteredKeyFacts) {
      const { category, importance } = categorizeMemory(fact, 'key_fact');
      newMemoriesToInsert.push({ fact, category, importance });
    }

    // Add mentioned names
    if (personalDetails.mentioned_names?.length > 0) {
      for (const name of personalDetails.mentioned_names) {
        if (name) {
          newMemoriesToInsert.push({ fact: name, category: 'persona', importance: 7 });
        }
      }
    }

    // Add hobbies/interests
    if (personalDetails.hobbies_interests?.length > 0) {
      for (const hobby of personalDetails.hobbies_interests) {
        if (hobby) {
          newMemoriesToInsert.push({ fact: hobby, category: 'hobby', importance: 6 });
        }
      }
    }

    // Add likes
    if (personalDetails.likes?.length > 0) {
      for (const like of personalDetails.likes) {
        if (like) {
          newMemoriesToInsert.push({ fact: like, category: 'preferenza', importance: 5 });
        }
      }
    }

    // Add life events
    if (personalDetails.life_events?.length > 0) {
      for (const event of personalDetails.life_events) {
        if (event) {
          newMemoriesToInsert.push({ fact: event, category: 'evento', importance: 7 });
        }
      }
    }

    // 🔄 Handle corrections - deactivate wrong memories
    const corrections = analysis.corrections || [];
    if (corrections.length > 0) {
      console.log('[process-session] 🔄 Processing', corrections.length, 'memory corrections');

      for (const correction of corrections) {
        if (correction.keywords_to_remove?.length > 0) {
          // Deactivate memories matching these keywords
          for (const keyword of correction.keywords_to_remove) {
            const { error: deactivateError } = await supabase
              .from('user_memories')
              .update({ is_active: false })
              .eq('user_id', user_id)
              .ilike('fact', `%${keyword}%`);

            if (deactivateError) {
              console.error('[process-session] Error deactivating memory:', deactivateError);
            } else {
              console.log('[process-session] 🔄 Deactivated memories containing:', keyword);
            }
          }
        }
      }
    }

    // Insert new memories (avoid duplicates)
    let insertedCount = 0;
    for (const memory of newMemoriesToInsert) {
      // Check if similar memory already exists
      const { data: existing } = await supabase
        .from('user_memories')
        .select('id')
        .eq('user_id', user_id)
        .eq('is_active', true)
        .ilike('fact', `%${memory.fact.substring(0, 30)}%`)
        .maybeSingle();

      if (!existing) {
        const { error: insertError } = await supabase
          .from('user_memories')
          .insert({
            user_id: user_id,
            category: memory.category,
            fact: memory.fact,
            importance: memory.importance,
            source_session_id: session_id
          });

        if (insertError) {
          console.error('[process-session] Error inserting memory:', insertError);
        } else {
          insertedCount++;
        }
      }
    }

    console.log(`[process-session] 📝 Inserted ${insertedCount} new structured memories`);
    console.log('[process-session] 📝 NEW_MEMORIES_TOTAL:', newMemoriesToInsert.length);
    console.log('[process-session] 📝 CORRECTIONS_PROCESSED:', corrections.length);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[process-session] Failed to save user_memories for session ${session_id}:`, msg);
      dbErrors.push({ table: 'user_memories', error: msg });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 📸 SESSION CONTEXT SNAPSHOT - Save for continuity between sessions
    // ═══════════════════════════════════════════════════════════════════════════
    try {
    console.log('[process-session] 📸 Creating session context snapshot...');

    // Determine dominant emotion
    const emotionScores = Object.entries(analysis.emotions || {})
      .filter(([k, v]) => v !== null && (v as number) > 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number));
    const dominantEmotion = emotionScores[0]?.[0] || null;

    // Calculate session quality score (1-10)
    const qualityFactors = [
      analysis.vitals.mood ? analysis.vitals.mood : 5,
      analysis.deep_psychology?.mental_clarity || 5,
      10 - (analysis.vitals.anxiety || 5),
    ];
    const sessionQualityScore = Math.round(
      qualityFactors.reduce((a, b) => a + b, 0) / qualityFactors.length
    );

    // Determine if follow-up is needed
    const needsFollowUp =
      analysis.crisis_risk !== 'low' ||
      (analysis.key_events?.length || 0) > 0 ||
      (analysis.deep_psychology?.hopelessness || 0) >= 6 ||
      (analysis.deep_psychology?.suicidal_ideation || 0) >= 3;

    // Extract unresolved issues (problems mentioned but not solved)
    const problemPatterns = /problem|difficolt|crisi|stress|ansia|preoccup|paur|triste|male|dolore|non riesco/i;
    const unresolvedIssues = (analysis.key_events || []).filter((e: string) =>
      problemPatterns.test(e)
    ).slice(0, 5);

    // Extract action items (things the user wants to do)
    const actionPatterns = /devo|dovrei|voglio|vorrei|obiettivo|farò|proverò|inizier/i;
    const actionItems = (analysis.key_events || []).filter((e: string) =>
      actionPatterns.test(e)
    ).slice(0, 5);

    const snapshot = {
      session_id: session_id,
      user_id: user_id,
      key_topics: (analysis.emotion_tags || []).slice(0, 5),
      emotional_state: {
        mood: analysis.vitals.mood,
        anxiety: analysis.vitals.anxiety,
        energy: analysis.vitals.energy,
        dominant_emotion: dominantEmotion,
        crisis_risk: analysis.crisis_risk
      },
      unresolved_issues: unresolvedIssues,
      action_items: actionItems,
      follow_up_needed: needsFollowUp,
      context_summary: analysis.summary,
      dominant_emotion: dominantEmotion,
      session_quality_score: sessionQualityScore
    };

    const { error: snapshotError } = await supabase
      .from('session_context_snapshots')
      .insert(snapshot);

    if (snapshotError) {
      console.error(`[process-session] Failed to save session_context_snapshots for session ${session_id}:`, snapshotError.message);
      dbErrors.push({ table: 'session_context_snapshots', error: snapshotError.message });
    } else {
      console.log('[process-session] 📸 Session context snapshot saved successfully');
    }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[process-session] Failed to save session_context_snapshots for session ${session_id}:`, msg);
      dbErrors.push({ table: 'session_context_snapshots', error: msg });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🏷️ CONVERSATION TOPICS TRACKING - Track and learn topic patterns
    // ═══════════════════════════════════════════════════════════════════════════
    try {
    console.log('[process-session] 🏷️ Tracking conversation topics...');

    const topics = (analysis.emotion_tags || []) as string[];
    const sensitivePatterns = /trauma|abuso|lutto|morte|suicid|autolesion|violenza|stupro|molest/i;

    let topicsTracked = 0;
    for (const topic of topics) {
      if (!topic || topic.length < 2) continue;

      const topicLower = topic.toLowerCase().trim();
      const isSensitive = sensitivePatterns.test(topicLower);

      // Check if topic already exists for user
      const { data: existingTopic } = await supabase
        .from('conversation_topics')
        .select('id, mention_count, session_ids, is_sensitive')
        .eq('user_id', user_id)
        .eq('topic', topicLower)
        .maybeSingle();

      if (existingTopic) {
        // Update existing topic
        const currentSessionIds = (existingTopic.session_ids as string[]) || [];
        if (!currentSessionIds.includes(session_id)) {
          const { error: updateError } = await supabase
            .from('conversation_topics')
            .update({
              mention_count: existingTopic.mention_count + 1,
              last_mentioned_at: new Date().toISOString(),
              session_ids: [...currentSessionIds, session_id],
              is_sensitive: isSensitive || existingTopic.is_sensitive,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingTopic.id);

          if (!updateError) topicsTracked++;
        }
      } else {
        // Insert new topic
        const { error: insertError } = await supabase
          .from('conversation_topics')
          .insert({
            user_id: user_id,
            topic: topicLower,
            session_ids: [session_id],
            is_sensitive: isSensitive,
            mention_count: 1,
            avoid_unless_introduced: isSensitive
          });

        if (!insertError) topicsTracked++;
      }
    }

    console.log(`[process-session] 🏷️ Tracked ${topicsTracked} conversation topics`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[process-session] Failed to save conversation_topics for session ${session_id}:`, msg);
      dbErrors.push({ table: 'conversation_topics', error: msg });
    }

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
    try {
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
          
          // Handle finance-specific fields
          const financeTrackingType = correctedCategory === 'finance' ? (obj.finance_tracking_type || null) : null;
          const trackingPeriod = obj.tracking_period || null;
          const needsClarification = obj.needs_clarification === true || 
            (correctedCategory === 'finance' && !financeTrackingType);
          
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
              progress_history: [],
              // NEW: Finance-specific fields
              finance_tracking_type: financeTrackingType,
              tracking_period: trackingPeriod,
              needs_clarification: needsClarification
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

    // 🌟 NEW: Update milestone/qualitative objectives with AI-generated content
    const milestoneObjectiveUpdates = (analysis as any).milestone_objective_updates || [];
    if (milestoneObjectiveUpdates.length > 0) {
      console.log('[process-session] AI detected milestone objective updates:', milestoneObjectiveUpdates);
      
      for (const update of milestoneObjectiveUpdates) {
        if (!update.objective_id) continue;
        
        // Get the existing milestone objective
        const { data: existingObj } = await supabase
          .from('user_objectives')
          .select('id, ai_milestones, ai_progress_estimate, ai_custom_description')
          .eq('id', update.objective_id)
          .eq('user_id', user_id)
          .maybeSingle();
        
        if (existingObj) {
          const updateData: Record<string, any> = {
            updated_at: new Date().toISOString()
          };
          
          // Update custom description if provided
          if (update.ai_custom_description) {
            updateData.ai_custom_description = update.ai_custom_description;
            console.log(`[process-session] 📝 Updated description for ${update.objective_id}: ${update.ai_custom_description}`);
          }
          
          // Update progress estimate if provided
          if (update.ai_progress_estimate !== undefined && update.ai_progress_estimate !== null) {
            updateData.ai_progress_estimate = Math.min(100, Math.max(0, update.ai_progress_estimate));
            console.log(`[process-session] 📊 Updated progress for ${update.objective_id}: ${update.ai_progress_estimate}%`);
            
            // If progress reaches 100%, mark as achieved
            if (update.ai_progress_estimate >= 100) {
              updateData.status = 'achieved';
              console.log(`[process-session] 🎉 Milestone objective achieved!`);
            }
          }
          
          // Add new milestone if provided
          if (update.new_milestone && update.new_milestone.milestone) {
            const currentMilestones = Array.isArray(existingObj.ai_milestones) 
              ? (existingObj.ai_milestones as any[]) 
              : [];
            
            // Check if milestone already exists (avoid duplicates)
            const milestoneExists = currentMilestones.some(
              (m: any) => m.milestone?.toLowerCase() === update.new_milestone.milestone.toLowerCase()
            );
            
            if (!milestoneExists) {
              const newMilestone = {
                milestone: update.new_milestone.milestone,
                achieved_at: new Date().toISOString(),
                note: update.new_milestone.note || null
              };
              updateData.ai_milestones = [...currentMilestones, newMilestone];
              console.log(`[process-session] ✅ Added milestone: ${update.new_milestone.milestone}`);
            }
          }
          
          // Only update if we have changes
          if (Object.keys(updateData).length > 1) { // More than just updated_at
            const { error: milestoneUpdateError } = await supabase
              .from('user_objectives')
              .update(updateData)
              .eq('id', update.objective_id)
              .eq('user_id', user_id);
            
            if (milestoneUpdateError) {
              console.error('[process-session] Error updating milestone objective:', milestoneUpdateError);
            } else {
              console.log(`[process-session] ✨ Updated milestone objective ${update.objective_id}`);
            }
          }
        }
      }
    }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[process-session] Failed to save user_objectives for session ${session_id}:`, msg);
      dbErrors.push({ table: 'user_objectives', error: msg });
    }

    // 📅 NEW: Save events detected by AI to user_events table
    try {
    const eventsDetected = (analysis as any).events_detected || [];
    if (eventsDetected.length > 0) {
      console.log('[process-session] AI detected events:', eventsDetected);

      for (const event of eventsDetected) {
        if (!event.title || !event.event_date) continue;

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(event.event_date)) {
          console.log(`[process-session] Skipping event with invalid date: ${event.event_date}`);
          continue;
        }

        // Check if event is in the future (or today)
        const eventDate = new Date(event.event_date);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        if (eventDate < todayDate) {
          console.log(`[process-session] Skipping past event: ${event.title} on ${event.event_date}`);
          continue;
        }

        // Check if similar event already exists (avoid duplicates)
        const { data: existingEvent } = await supabase
          .from('user_events')
          .select('id')
          .eq('user_id', user_id)
          .eq('event_date', event.event_date)
          .ilike('title', `%${event.title.substring(0, 20)}%`)
          .maybeSingle();

        if (!existingEvent) {
          const { error: eventError } = await supabase
            .from('user_events')
            .insert({
              user_id: user_id,
              title: event.title,
              event_type: event.event_type || 'generic',
              event_date: event.event_date,
              event_time: event.event_time || null,
              end_date: event.end_date || null,
              is_all_day: event.is_all_day ?? (event.event_time === null),
              location: event.location || null,
              description: event.description || null,
              tags: event.tags || [],
              extracted_from_text: event.extracted_from_text || null,
              source_session_id: session_id,
              status: 'upcoming',
              follow_up_done: false
            });

          if (eventError) {
            console.error('[process-session] Error creating event:', eventError);
          } else {
            console.log(`[process-session] 📅 Created event: ${event.title} on ${event.event_date}`);
          }
        } else {
          console.log(`[process-session] Event already exists: ${event.title} on ${event.event_date}`);
        }
      }
    }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[process-session] Failed to save user_events for session ${session_id}:`, msg);
      dbErrors.push({ table: 'user_events', error: msg });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔄 HABITS: Save new habits and progress updates detected by AI
    // ═══════════════════════════════════════════════════════════════════════════
    try {

    // 1. Save newly detected habits to user_habits_config + initial daily_habits entry
    const habitsDetected = (analysis as any).habits_detected || [];
    if (habitsDetected.length > 0) {
      console.log('[process-session] 🔄 AI detected new habits:', habitsDetected);

      for (const habit of habitsDetected) {
        if (!habit.habit_type) continue;

        // Ensure habit config exists (upsert to user_habits_config)
        const { error: configError } = await supabase
          .from('user_habits_config')
          .upsert({
            user_id: user_id,
            habit_type: habit.habit_type,
            is_active: true,
            daily_target: habit.daily_target || null,
            unit: habit.unit || null,
            streak_type: habit.streak_type || 'daily'
          }, { onConflict: 'user_id,habit_type' });

        if (configError) {
          console.error(`[process-session] Failed to save user_habits_config for habit ${habit.habit_type}:`, configError.message);
        } else {
          console.log(`[process-session] 🔄 Saved habit config: ${habit.habit_type} (${habit.label || habit.habit_type})`);
        }
      }
    }

    // 2. Save habit progress updates to daily_habits
    const habitProgressUpdates = (analysis as any).habit_progress_updates || [];
    if (habitProgressUpdates.length > 0) {
      console.log('[process-session] 🔄 AI detected habit progress updates:', habitProgressUpdates);

      for (const update of habitProgressUpdates) {
        if (!update.habit_type || update.value === undefined) continue;

        const habitDate = update.date || today; // today is already defined as YYYY-MM-DD

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(habitDate)) {
          console.log(`[process-session] Skipping habit update with invalid date: ${habitDate}`);
          continue;
        }

        // Lookup target_value from user_habits_config if available
        const { data: habitConfig } = await supabase
          .from('user_habits_config')
          .select('daily_target, unit')
          .eq('user_id', user_id)
          .eq('habit_type', update.habit_type)
          .maybeSingle();

        const { error: habitError } = await supabase
          .from('daily_habits')
          .upsert({
            user_id: user_id,
            habit_type: update.habit_type,
            date: habitDate,
            value: update.value,
            target_value: habitConfig?.daily_target || null,
            unit: habitConfig?.unit || null,
            notes: update.note || null
          }, { onConflict: 'user_id,habit_type,date', ignoreDuplicates: false });

        if (habitError) {
          console.error(`[process-session] Failed to save daily_habits for ${update.habit_type}:`, habitError.message);
        } else {
          console.log(`[process-session] 🔄 Saved habit progress: ${update.habit_type} = ${update.value} on ${habitDate}`);
        }
      }
    }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[process-session] Failed to save daily_habits for session ${session_id}:`, msg);
      dbErrors.push({ table: 'daily_habits', error: msg });
    }

    // Update user profile
    try {
    const { error: profileUpdateError } = await supabase
      .from('user_profiles')
      .update({
        // NOTE: long_term_memory is now deprecated - memories are stored in user_memories table
        life_areas_scores: mergedLifeScores,
        active_dashboard_metrics: validFinalMetrics,
        selected_goals: updatedGoals // 🎯 Save AI-updated goals
      })
      .eq('user_id', user_id);

    if (profileUpdateError) {
      console.error(`[process-session] Failed to save user_profiles for session ${session_id}:`, profileUpdateError.message);
      dbErrors.push({ table: 'user_profiles', error: profileUpdateError.message });
    } else {
      console.log('[process-session] Profile updated. Memories now stored in user_memories table.');
      if (suggestedNewGoals.length > 0) {
        console.log('[process-session] Added', suggestedNewGoals.length, 'new AI-detected goals');
      }
    }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[process-session] Failed to save user_profiles for session ${session_id}:`, msg);
      dbErrors.push({ table: 'user_profiles', error: msg });
    }

    // ═══════════════════════════════════════════════
    // STEP: GENERAZIONE/AGGIORNAMENTO PROFILO ADATTIVO
    // -- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS adaptive_profile jsonb DEFAULT NULL;
    // ═══════════════════════════════════════════════
    try {
      // Carica profilo adattivo attuale (se esiste)
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('adaptive_profile, name, gender, birth_date')
        .eq('user_id', user_id)
        .single();

      const existingProfile = currentProfile?.adaptive_profile
        ? JSON.stringify(currentProfile.adaptive_profile)
        : 'NESSUN PROFILO PRECEDENTE — Crea da zero basandoti su questa sessione.';

      // Contesto per la generazione del profilo
      const apSessionSummary = analysis.summary || '';
      const apEmotionTags = analysis.emotion_tags || [];
      const apMoodScore = analysis.vitals.mood;
      const apAnxietyScore = analysis.vitals.anxiety;
      const apKeyTopics = (analysis.emotion_tags || []).slice(0, 5);
      const apUnresolvedIssues = (analysis.key_events || []).filter((e: string) =>
        /problem|difficolt|crisi|stress|ansia|preoccup|paur|triste|male|dolore|non riesco/i.test(e)
      ).slice(0, 5);

      // Profilo utente di base
      const apUserAge = currentProfile?.birth_date
        ? Math.floor((Date.now() - new Date(currentProfile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null;
      const apUserGender = currentProfile?.gender || 'non specificato';
      const apUserName = currentProfile?.name || 'utente';

      const adaptivePrompt = `Sei un supervisore clinico che costruisce profili psicologici strutturati.

PROFILO ADATTIVO ATTUALE:
${existingProfile}

SESSIONE APPENA CONCLUSA:
- Riassunto: ${apSessionSummary}
- Emozioni rilevate: ${apEmotionTags.join(', ')}
- Umore: ${apMoodScore || '?'}/10, Ansia: ${apAnxietyScore || '?'}/10
- Temi chiave: ${apKeyTopics.join(', ')}
- Temi irrisolti: ${apUnresolvedIssues.join(', ')}
- Utente: ${apUserName}, ${apUserGender}, ${apUserAge ? apUserAge + ' anni' : 'età sconosciuta'}

TRANSCRIPT SESSIONE:
${transcript.substring(0, 3000)}

VALUTAZIONE SESSIONE — Rispondi a queste domande internamente prima di aggiornare il profilo:
1. APERTURA: L'utente si è aperto progressivamente durante la sessione? (buon segno = Aria ha usato il tono giusto)
2. CHIUSURA: L'utente si è chiuso, ha cambiato argomento bruscamente, o ha detto "lascia stare"? (Aria ha sbagliato approccio)
3. INSIGHT: L'utente ha avuto un momento di realizzazione? ("hai ragione", "non ci avevo pensato", "è vero")
4. RESISTENZA: L'utente ha resistito a un approccio? ("non è così", "non mi capisci", "non voglio parlarne")
5. TECNICA: Se Aria ha proposto una tecnica (respirazione, grounding, registro pensieri), l'utente l'ha accettata o rifiutata?
6. TONO: Il tono di Aria era appropriato? L'utente ha reagito positivamente o negativamente al modo in cui Aria ha comunicato?
7. DIPENDENZA: L'utente ha mostrato segni di dipendenza da Aria? ("sei l'unica che mi capisce", "non so cosa farei senza di te")

USA QUESTE VALUTAZIONI per aggiornare il profilo:
- Se l'utente si è aperto → il tono usato funziona → conferma communication_style
- Se l'utente si è chiuso → qualcosa non ha funzionato → aggiorna responds_badly_to
- Se una tecnica ha funzionato → aggiungi a techniques_effective
- Se una tecnica è stata rifiutata → aggiungi a techniques_ineffective
- Se l'utente ha mostrato un nuovo trigger → aggiungi a known_triggers
- Se l'utente ha mostrato progresso → aggiorna journey_phase e progress_summary
- Se ci sono segni di dipendenza → aggiorna relationship_with_aria con nota di monitoraggio

ISTRUZIONI:
Genera un profilo adattivo JSON aggiornato. Se esiste già un profilo, AGGIORNA SOLO i campi che questa sessione ha rivelato qualcosa di nuovo. Non cancellare informazioni precedenti a meno che non siano state corrette.

Se è il primo profilo (nessun profilo precedente), crealo da zero con quello che sai.

Il profilo deve avere ESATTAMENTE questa struttura JSON (rispondi SOLO con il JSON, niente altro):

{
    "communication_style": {
        "preferred_tone": "descrizione del tono che l'utente preferisce (es: diretto, gentile, informale)",
        "responds_well_to": ["lista di approcci che funzionano"],
        "responds_badly_to": ["lista di approcci da evitare"],
        "message_length_preference": "breve|medio|lungo",
        "formality_level": "informale|semi-formale|formale"
    },
    "psychological_profile": {
        "defense_mechanisms": ["meccanismi di difesa osservati"],
        "attachment_hints": "descrizione breve dello stile relazionale osservato",
        "core_beliefs_observed": ["credenze profonde emerse"],
        "strengths": ["punti di forza psicologici"],
        "growth_areas": ["aree di crescita identificate"]
    },
    "triggers_and_patterns": {
        "known_triggers": ["situazioni/temi che provocano reazioni forti"],
        "mood_boosters": ["cosa migliora l'umore"],
        "temporal_patterns": ["pattern temporali osservati, es: peggiora la sera"],
        "recurring_topics": ["argomenti che tornano spesso"]
    },
    "therapeutic_context": {
        "journey_phase": "esplorazione|comprensione|applicazione|mantenimento",
        "techniques_effective": ["tecniche che hanno funzionato"],
        "techniques_ineffective": ["tecniche che non hanno funzionato"],
        "unresolved_themes": ["temi ancora aperti"],
        "progress_summary": "breve descrizione del progresso generale"
    },
    "relationship_with_aria": {
        "trust_level": "basso|medio|alto",
        "notable_moments": ["momenti significativi nella relazione con Aria"],
        "communication_preferences": ["preferenze specifiche emerse"]
    },
    "last_updated": "${new Date().toISOString().split('T')[0]}",
    "sessions_analyzed": 0,
    "confidence": "basso|medio|alto",
    "last_session_feedback": {
        "date": "${new Date().toISOString().split('T')[0]}",
        "user_opened_up": true/false,
        "user_resisted": true/false,
        "technique_used": "nome tecnica o null",
        "technique_accepted": true/false/null,
        "tone_appropriate": true/false,
        "key_learning": "una frase su cosa hai imparato di questo utente in questa sessione"
    }
}

REGOLE:
- Se è un aggiornamento, incrementa sessions_analyzed di 1
- confidence sale con più sessioni: 1-3 = basso, 4-10 = medio, 11+ = alto
- NON inventare informazioni — scrivi solo quello che è EVIDENZIATO dalla sessione
- Per i campi dove non hai informazioni, usa array vuoti [] o "da determinare"
- Sii specifico e concreto, non generico (es: "usa umorismo per evitare vulnerabilità" non "ha meccanismi di difesa")`;

      const adaptiveResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${Deno.env.get('GOOGLE_API_KEY')}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: adaptivePrompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2000 }
          })
        }
      );

      if (adaptiveResponse.ok) {
        const adaptiveData = await adaptiveResponse.json();
        const adaptiveText = adaptiveData.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse JSON dal testo
        const jsonMatch = adaptiveText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const adaptiveProfile = JSON.parse(jsonMatch[0]);

            // Salva nel DB
            await supabase
              .from('user_profiles')
              .update({ adaptive_profile: adaptiveProfile })
              .eq('user_id', user_id);

            console.log('[process-session] Adaptive profile updated');
          } catch (parseErr) {
            console.error('[process-session] Adaptive profile parse error:', parseErr);
          }
        }
      }
    } catch (adaptiveErr) {
      console.error('[process-session] Adaptive profile generation error:', adaptiveErr);
      // Non blocca il flusso principale — il profilo adattivo è un bonus
    }

    // Log summary of all DB write errors (graceful degradation)
    if (dbErrors.length > 0) {
      console.error(`[process-session] ⚠️ ${dbErrors.length} DB write(s) failed for session ${session_id}:`, JSON.stringify(dbErrors));
    } else {
      console.log('[process-session] ✅ All DB writes completed successfully');
    }

    // === RIGENERA MESSAGGIO HOME ARIA (V5) ===
    // Fire-and-forget: invalidate cache so home-context regenerates on next app open
    try {
      await supabase
        .from('user_profiles')
        .update({
          aria_home_message: null,
          aria_home_message_at: null
        })
        .eq('user_id', user_id);
    } catch (err) {
      console.error('[process-session] Failed to invalidate aria home message cache:', err);
    }

    console.log('[process-session] Session processing complete!');

    return new Response(JSON.stringify({
      success: true,
      crisis_alert: isCrisisAlert,
      db_errors: dbErrors.length > 0 ? dbErrors : undefined,
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
