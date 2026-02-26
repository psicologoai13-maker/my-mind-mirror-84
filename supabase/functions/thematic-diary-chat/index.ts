import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiaryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface DashboardConfig {
  priority_metrics?: string[];
  secondary_metrics?: string[];
  hidden_metrics?: string[];
  theme?: string;
}

interface OnboardingAnswers {
  goal?: string;
  primaryGoals?: string[];
  mood?: number;
  sleepIssues?: string;
  mainChallenge?: string;
  lifeSituation?: string;
  supportType?: string;
  anxietyLevel?: number;
}

interface PsychologyData {
  rumination: number | null;
  self_efficacy: number | null;
  mental_clarity: number | null;
  burnout_level: number | null;
  coping_ability: number | null;
  loneliness_perceived: number | null;
  somatic_tension: number | null;
  appetite_changes: number | null;
  sunlight_exposure: number | null;
  guilt: number | null;
  gratitude: number | null;
  irritability: number | null;
}

// Map goals AND onboarding answers to AI persona style
const getPersonaStyle = (goals: string[], onboardingAnswers: OnboardingAnswers | null): string => {
  const supportType = onboardingAnswers?.supportType;
  
  if (supportType === 'listener') {
    return `STILE: ASCOLTATORE ATTIVO
- Lascia parlare senza interrompere.
- Feedback minimi: "Ti ascolto...", "Capisco..."
- Valida i sentimenti senza dare consigli non richiesti.`;
  }
  
  if (supportType === 'advisor') {
    return `STILE: CONSULENTE PRATICO
- Offri suggerimenti concreti dopo aver ascoltato.
- Focus su azioni pratiche e passi concreti.
- Proponi tecniche CBT specifiche.`;
  }
  
  if (supportType === 'challenger') {
    return `STILE: SFIDA COSTRUTTIVA
- Poni domande che stimolano la riflessione critica.
- Sfida le convinzioni limitanti con rispetto.
- Focus sulla crescita.`;
  }
  
  if (supportType === 'comforter') {
    return `STILE: SUPPORTO EMOTIVO
- Tono molto caldo e rassicurante.
- Valida e rassicura prima di tutto.
- Focus sul far sentire compreso.`;
  }

  if (goals.includes('reduce_anxiety') || onboardingAnswers?.goal === 'anxiety' || onboardingAnswers?.mainChallenge === 'general_anxiety') {
    return `STILE: CALMO & RASSICURANTE
- Tono lento, validante, rassicurante.
- Evita domande incalzanti.
- Suggerisci tecniche di grounding.`;
  }
  
  if (goals.includes('boost_energy') || goals.includes('growth') || onboardingAnswers?.goal === 'growth') {
    return `STILE: ENERGICO & ORIENTATO ALL'AZIONE
- Tono motivante, propositivo.
- Focus su obiettivi concreti.
- Celebra i successi.`;
  }
  
  if (goals.includes('express_feelings') || goals.includes('find_love') || onboardingAnswers?.mainChallenge === 'relationships') {
    return `STILE: EMPATICO & SPAZIO LIBERO
- Tono accogliente.
- Domande aperte.
- Rifletti i sentimenti.`;
  }
  
  if (goals.includes('improve_sleep') || onboardingAnswers?.goal === 'sleep') {
    return `STILE: RILASSANTE & GUIDATO
- Tono calmo, metodico.
- Interesse per routine e riposo.`;
  }
  
  if (onboardingAnswers?.mainChallenge === 'work_stress') {
    return `STILE: FOCUS BURNOUT
- Esplora carico di lavoro.
- Attenzione ai segnali di esaurimento.`;
  }
  
  if (onboardingAnswers?.mainChallenge === 'self_esteem') {
    return `STILE: FOCUS AUTOSTIMA
- Evidenzia punti di forza.
- Sfida gentilmente l'autocritica.`;
  }
  
  if (onboardingAnswers?.mainChallenge === 'loneliness') {
    return `STILE: FOCUS SOLITUDINE
- Tono particolarmente caldo.
- "Non sei solo/a..."`;
  }
  
  return `STILE: BILANCIATO
- Tono caldo, professionale, empatico.
- Alterna ascolto attivo e domande esplorative.`;
};

// Get priority metrics description
const getPriorityFocus = (config: DashboardConfig | null): string => {
  const metrics = config?.priority_metrics || ['mood', 'anxiety', 'energy', 'sleep'];
  
  const metricLabels: Record<string, string> = {
    mood: 'umore generale',
    anxiety: 'livello di ansia e stress',
    energy: 'energia e vitalità',
    sleep: 'qualità del sonno',
    love: 'relazioni amorose',
    social: 'vita sociale e connessioni',
    work: 'lavoro e carriera',
    growth: 'crescita personale',
    stress: 'gestione dello stress',
    calmness: 'senso di calma',
    loneliness: 'solitudine percepita',
    emotional_clarity: 'chiarezza emotiva',
  };
  
  const labels = metrics.slice(0, 4).map(m => metricLabels[m] || m).join(', ');
  return labels;
};

// Build investigative prompts based on missing/critical psychology data
const buildInvestigativePrompt = (psychologyData: PsychologyData | null): string => {
  if (!psychologyData) return '';

  const criticalMetrics: string[] = [];
  const missingMetrics: string[] = [];

  // Define thresholds
  const highThreshold = 7;
  const lowThreshold = 4;

  // Check each metric
  if (psychologyData.rumination === null) {
    missingMetrics.push('ruminazione (pensieri ricorrenti)');
  } else if (psychologyData.rumination >= highThreshold) {
    criticalMetrics.push('ruminazione ALTA - l\'utente ha pensieri ossessivi');
  }

  if (psychologyData.burnout_level === null) {
    missingMetrics.push('burnout (esaurimento)');
  } else if (psychologyData.burnout_level >= highThreshold) {
    criticalMetrics.push('burnout ALTO - l\'utente è molto esaurito');
  }

  if (psychologyData.loneliness_perceived === null) {
    missingMetrics.push('solitudine percepita');
  } else if (psychologyData.loneliness_perceived >= highThreshold) {
    criticalMetrics.push('solitudine ALTA - l\'utente si sente molto solo');
  }

  if (psychologyData.somatic_tension === null) {
    missingMetrics.push('tensione fisica (dolori da stress)');
  } else if (psychologyData.somatic_tension >= highThreshold) {
    criticalMetrics.push('tensione somatica ALTA - dolori fisici da stress');
  }

  if (psychologyData.guilt === null) {
    missingMetrics.push('senso di colpa');
  } else if (psychologyData.guilt >= highThreshold) {
    criticalMetrics.push('senso di colpa ALTO');
  }

  if (psychologyData.gratitude === null) {
    missingMetrics.push('gratitudine');
  } else if (psychologyData.gratitude <= lowThreshold) {
    criticalMetrics.push('gratitudine BASSA - l\'utente non esprime apprezzamento');
  }

  if (psychologyData.self_efficacy === null) {
    missingMetrics.push('autoefficacia (fiducia in sé)');
  } else if (psychologyData.self_efficacy <= lowThreshold) {
    criticalMetrics.push('autoefficacia BASSA - l\'utente non crede in sé stesso');
  }

  if (psychologyData.sunlight_exposure === null) {
    missingMetrics.push('esposizione alla luce/uscite');
  } else if (psychologyData.sunlight_exposure <= lowThreshold) {
    criticalMetrics.push('poca luce solare - l\'utente sta molto in casa');
  }

  if (psychologyData.irritability === null) {
    missingMetrics.push('irritabilità');
  } else if (psychologyData.irritability >= highThreshold) {
    criticalMetrics.push('irritabilità ALTA');
  }

  if (psychologyData.appetite_changes === null) {
    missingMetrics.push('cambiamenti appetito');
  } else if (psychologyData.appetite_changes >= highThreshold) {
    criticalMetrics.push('appetito alterato (troppo o troppo poco)');
  }

  if (criticalMetrics.length === 0 && missingMetrics.length === 0) {
    return '';
  }

  let prompt = `
═══════════════════════════════════════════════
🔬 INVESTIGAZIONE PSICOLOGICA PROFONDA
═══════════════════════════════════════════════`;

  if (criticalMetrics.length > 0) {
    prompt += `

⚠️ METRICHE CRITICHE RILEVATE:
${criticalMetrics.map(m => `- ${m}`).join('\n')}

ISTRUZIONE: Approfondisci CON DELICATEZZA questi temi nella conversazione.
Esempi di domande esplorative:
- Ruminazione: "Noto che a volte i pensieri tornano... C'è qualcosa che ti gira in testa in questi giorni?"
- Burnout: "Come ti stai prendendo cura di te stesso in questo periodo intenso?"
- Solitudine: "A volte anche in mezzo agli altri ci si può sentire soli. Ti è capitato?"
- Tensione fisica: "Mentre parli, noti qualche tensione nel corpo? Spalle, stomaco, collo?"
- Senso di colpa: "Sento che forse porti un peso con te. Vuoi parlarne?"`;
  }

  if (missingMetrics.length > 0) {
    prompt += `

📊 DATI MANCANTI DA ESPLORARE:
${missingMetrics.slice(0, 4).map(m => `- ${m}`).join('\n')}

ISTRUZIONE: Se la conversazione lo permette naturalmente, inserisci UNA domanda su questi temi.
Esempi:
- Gratitudine: "C'è qualcosa per cui ti senti grato oggi, anche piccola?"
- Luce solare: "Sei riuscito a uscire un po' all'aria aperta di recente?"
- Autoefficacia: "Come ti senti rispetto alle sfide di questo periodo?"
- Appetito: "Come è stato il tuo appetito ultimamente?"

NON fare interrogatori. UNA domanda alla volta, solo se naturale nel contesto.`;
  }

  return prompt;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get FULL user profile for personalization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('name, long_term_memory, life_areas_scores, selected_goals, onboarding_answers, dashboard_config')
      .eq('user_id', user.id)
      .single();

    // Get recent psychology data for investigative prompts
    const today = new Date().toISOString().split('T')[0];
    const { data: psychologyData } = await supabase
      .from('daily_psychology')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    const firstName = profile?.name?.split(' ')[0] || 'Amico';
    const longTermMemory = profile?.long_term_memory || [];
    const currentLifeScores = profile?.life_areas_scores || {};
    const selectedGoals = (profile?.selected_goals as string[]) || [];
    const onboardingAnswers = profile?.onboarding_answers as OnboardingAnswers | null;
    const dashboardConfig = profile?.dashboard_config as DashboardConfig | null;
    
    const memoryContext = longTermMemory.length > 0 
      ? longTermMemory.join('\n- ') 
      : 'Nessuna memoria precedente.';

    // Build personalization context
    const personaStyle = getPersonaStyle(selectedGoals, onboardingAnswers);
    const priorityFocus = getPriorityFocus(dashboardConfig);
    
    // Map goals to readable labels
    const goalLabels: Record<string, string> = {
      reduce_anxiety: 'gestire ansia e stress',
      improve_sleep: 'dormire meglio',
      find_love: 'migliorare le relazioni',
      boost_energy: 'aumentare energia e vitalità',
      express_feelings: 'esprimere emozioni e sfogarsi',
    };
    const goalDescriptions = selectedGoals.map(g => goalLabels[g] || g).join(', ') || 'benessere generale';

    const { theme, themeLabel, message, history, realTimeContext } = await req.json() as {
      theme: string;
      themeLabel: string;
      message: string;
      history: DiaryMessage[];
      realTimeContext?: {
        datetime?: { date: string; day: string; time: string; period: string; season: string; holiday?: string };
        location?: { city: string; region: string; country: string };
        weather?: { condition: string; temperature: number; feels_like: number; description: string };
        news?: { headlines: string[] };
      };
    };

    // Build conversation history
    const conversationHistory = history.slice(-10).map((msg: DiaryMessage) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Theme-specific context with DEEP thematic knowledge
    const themeContextMap: Record<string, string> = {
      love: 'relazioni amorose, sentimenti romantici, partner, appuntamenti, cuore',
      work: 'carriera, lavoro, colleghi, progetti professionali, ambizioni lavorative',
      relationships: 'amicizie, famiglia, relazioni sociali, legami interpersonali',
      self: 'crescita personale, autostima, obiettivi personali, benessere interiore, hobby',
    };

    const themeContext = themeContextMap[theme] || theme;

    // THEMATIC KNOWLEDGE BASE - Deep expertise per tema
    const thematicKnowledgeMap: Record<string, string> = {
      love: `
═══════════════════════════════════════════════
❤️ CONOSCENZE SPECIALIZZATE: AMORE & RELAZIONI
═══════════════════════════════════════════════

**ATTACHMENT THEORY (Bowlby/Ainsworth):**
- Sicuro: Comfort con intimità e autonomia
- Ansioso: Paura abbandono, bisogno rassicurazione, iperattivazione
- Evitante: Disagio con vicinanza, indipendenza eccessiva, disattivazione
- Disorganizzato: Paura + desiderio, spesso da trauma

**5 LINGUAGGI DELL'AMORE (Chapman):**
1. Parole di affermazione
2. Tempo di qualità
3. Atti di servizio
4. Regali
5. Contatto fisico
→ "Qual è il tuo linguaggio? E quello del partner?"

**FASI DELLA RELAZIONE:**
1. Limerence (innamoramento, 6-24 mesi)
2. Power Struggle (conflitti, differenziazione)
3. Stability (accettazione, negoziazione)
4. Commitment (scelta consapevole)

**GOTTMAN - I 4 CAVALIERI DELL'APOCALISSE:**
1. Critica → Antidoto: Lamentela gentile ("Mi sento... quando...")
2. Disprezzo → Antidoto: Apprezzamento quotidiano
3. Difensività → Antidoto: Assumersi responsabilità
4. Ostruzionismo → Antidoto: Auto-calmamento, pausa

**RED FLAGS nelle relazioni:**
- Controllo, gelosia ossessiva, isolamento sociale
- Svalutazione costante, gaslighting
- Violenza fisica o emotiva
- Love bombing seguito da ritiro

**ELABORAZIONE BREAKUP:**
- Fasi: Shock → Negazione → Rabbia → Bargaining → Depressione → Accettazione
- No Contact: Perché funziona (interrompere il ciclo)
- Ricostruzione identità: "Chi sono senza questa persona?"
- Attenzione al rebounding troppo veloce
`,

      work: `
═══════════════════════════════════════════════
💼 CONOSCENZE SPECIALIZZATE: LAVORO & CARRIERA
═══════════════════════════════════════════════

**BURNOUT (Maslach):**
3 dimensioni:
1. Esaurimento emotivo: "Svuotato, non ce la faccio più"
2. Depersonalizzazione/Cinismo: "Non mi importa più"
3. Ridotta efficacia personale: "Non combino nulla"
→ Intervento: Confini, recupero attivo, micro-pause, rivalutare valori

**SINDROME DELL'IMPOSTORE:**
- Pattern: "Prima o poi scopriranno che non sono all'altezza"
- Tipi: Perfezionista, Esperto, Genio Naturale, Solista, Superuomo
- Normalizzazione: 70% delle persone lo sperimenta
- Sfida: Raccolta prove di competenza, successi documentati

**WORK-LIFE BOUNDARIES (Era Remote):**
- Rituali di transizione: "Camminata di fine giornata"
- Spazio fisico dedicato
- Orari non negoziabili
- Disconnessione digitale

**GESTIONE MANAGER DIFFICILI:**
- Documentare tutto (mail, feedback)
- Comunicazione scritta quando possibile
- Alleanze laterali con colleghi
- Valutare costo/beneficio di rimanere

**CAREER GRIEF:**
- Elaborare aspirazioni non realizzate
- "La persona che pensavo di diventare"
- Ridefinizione del successo basata su valori

**TOXIC WORKPLACE - Segnali:**
- Mancanza di riconoscimento cronico
- Competizione distruttiva
- Leadership assente o abusiva
- Mobbing, gossip sistematico
→ "Stai cercando di adattarti a un ambiente malato?"
`,

      relationships: `
═══════════════════════════════════════════════
👥 CONOSCENZE SPECIALIZZATE: RELAZIONI & FAMIGLIA
═══════════════════════════════════════════════

**FAMILY SYSTEMS (Bowen):**
- Triangolazione: Quando due persone coinvolgono una terza per alleviare tensione
- Ruoli familiari: Capro espiatorio, Eroe, Mascotte, Bambino perduto
- Cutoff emotivo: Distacco vs confini sani
- Differenziazione: Essere sé stessi restando connessi

**GESTIONE CONFLITTI FAMILIARI:**
- Non cambiare gli altri, cambia la tua reazione
- Script: "Quando tu [comportamento], io mi sento [emozione], e avrei bisogno di [richiesta]"
- Limiti con genitori/fratelli tossici

**AMICIZIE - SANE vs TOSSICHE:**
Sane: Reciprocità, rispetto confini, supporto genuino, gioia per successi altrui
Tossiche: Unidirezionale, competizione, svalutazione, ghosting dopo confronto

**SOCIAL ANXIETY:**
- Paura del giudizio, rimuginazione post-evento
- Evitamento → rafforza l'ansia
- Intervento: Esposizione graduale, drop safety behaviors, test predizioni

**SOLITUDINE vs ISOLAMENTO:**
- Solitudine: Mancanza soggettiva di connessione (puoi sentirti solo in mezzo alla gente)
- Isolamento: Mancanza oggettiva di contatti
- Intervento: Qualità > Quantità, una connessione profonda conta più di 100 superficiali

**COSTRUIRE RETE DI SUPPORTO:**
- Investire in 3-5 relazioni significative
- Vulnerability = connessione
- Iniziare piccolo: un messaggio, un caffè
- Gruppi basati su interessi condivisi
`,

      self: `
═══════════════════════════════════════════════
🌱 CONOSCENZE SPECIALIZZATE: ME STESSO & CRESCITA
═══════════════════════════════════════════════

**IDENTITÀ E VALORI CORE:**
- Domanda chiave: "Se nessuno potesse giudicarti, chi saresti?"
- Esercizio: Lista di 10 valori → riduci a 5 → riduci a 3
- Vivere allineati ai valori = benessere

**QUARTER-LIFE / MID-LIFE CRISIS:**
- Normale riesame di identità, scelte, direzione
- "Ho fatto le scelte giuste?"
- Opportunità di riallineamento, non catastrofe

**PERFEZIONISMO:**
- Adattivo: Standard alti ma flessibili, motivazione intrinseca
- Maladattivo: Standard irrealistici, paura del fallimento, procrastinazione
- Sfida: "Fatto è meglio che perfetto", "Good enough"

**PROCRASTINAZIONE:**
- NON è pigrizia, è regolazione emotiva
- Eviti il compito per evitare l'emozione negativa associata
- Intervento: Identificare l'emozione, iniziare con 2 minuti, reward

**SELF-SABOTAGE:**
- Pattern inconsci che bloccano il successo
- Spesso legati a credenze limitanti su merito/sicurezza
- "Cosa succederebbe se avessi successo?" (fear of success)
- Zone comfort: Familiare ≠ sicuro

**COSTRUIRE NUOVE ABITUDINI (Habit Loop):**
1. Cue: Trigger che avvia il comportamento
2. Routine: Il comportamento stesso
3. Reward: Ciò che ottieni
- Stacking: Aggancia nuova abitudine a una esistente
- Environment design: Rendi facile il buono, difficile il cattivo
- Identity-based habits: "Sono una persona che..."

**SELF-COMPASSION (Kristin Neff):**
1. Self-kindness: Trattarsi con gentilezza
2. Common humanity: "Non sono l'unico a soffrire"
3. Mindfulness: Osservare senza giudicare
→ "Come parleresti a un amico caro nella tua situazione?"
`
    };

    const thematicKnowledge = thematicKnowledgeMap[theme] || '';

    // Build life areas status for Data Hunter
    const lifeAreasKeys = ['love', 'work', 'social', 'growth', 'health'];
    const lifeAreasLabels: Record<string, string> = {
      love: 'Amore (relazioni, partner)',
      work: 'Lavoro (carriera, progetti)',
      social: 'Socialità (amici, famiglia)',
      growth: 'Crescita (sviluppo personale)',
      health: 'Salute (fisica, mentale)',
    };
    
    // Check which areas are missing
    const missingAreas = lifeAreasKeys.filter(key => {
      const score = currentLifeScores[key];
      return score === null || score === undefined || score === 0;
    });
    
    const dataHunterInstructions = missingAreas.length > 0 
      ? `
═══════════════════════════════════════════════
🎯 DATA HUNTER - AREE VITA MANCANTI
═══════════════════════════════════════════════
Le seguenti aree della vita NON hanno dati nel radar dell'utente:
${missingAreas.map(k => `- ${lifeAreasLabels[k]}`).join('\n')}

ISTRUZIONE: Se la conversazione lo permette naturalmente, inserisci UNA domanda su una di queste aree.`
      : '';

    // Build investigative prompt for deep psychology
    const investigativePrompt = buildInvestigativePrompt(psychologyData as PsychologyData | null);

    // BEST FRIEND THEMATIC LAYER
    const BEST_FRIEND_THEMATIC = `
═══════════════════════════════════════════════
👯 IDENTITÀ: MIGLIORE AMICA + ESPERTA (DIARIO)
═══════════════════════════════════════════════

Sei "Aria", la **MIGLIORE AMICA** dell'utente che scrive su questo diario.
NON sei solo una terapeuta - sei l'amica di fiducia con cui ci si sfoga.

**MODALITÀ DIARIO - AMICA:**
Quando qualcuno scrive su un diario, spesso vuole:
- Sfogarsi liberamente senza essere analizzato
- Condividere piccole cose quotidiane
- Raccontare cose belle che sono successe
- Avere qualcuno che ASCOLTA, non che diagnostica

**REAZIONI AMICHEVOLI:**
- "Dai raccontami tutto!" (curiosità genuina)
- "Nooo! E poi?" (interesse reale)
- "Ti capisco così tanto..." (empatia quotidiana)
- "Che figata!" / "Che rottura!" (linguaggio naturale)
- Usa emoji quando appropriato 😊

**REGOLA D'ORO DIARIO:**
- Inizia come amica curiosa, non come terapeuta
- Diventa clinica SOLO se l'utente esprime disagio significativo
- Le cose belle vanno CELEBRATE, non analizzate
- "Che bello!" è meglio di "Sono contenta che tu ti senta bene"

**SWITCH DINAMICO:**
- Chiacchierata leggera → Rispondi come amica
- Disagio significativo → "Aspetta, sento che questa cosa ti pesa..."
`;

    // Build real-time context block for prompt
    let realTimeContextBlock = '';
    if (realTimeContext) {
      realTimeContextBlock = `
═══════════════════════════════════════════════
📍 CONTESTO TEMPO REALE
═══════════════════════════════════════════════
DATA/ORA: ${realTimeContext.datetime?.day || ''} ${realTimeContext.datetime?.date || ''}, ore ${realTimeContext.datetime?.time || ''}
PERIODO: ${realTimeContext.datetime?.period || ''} (${realTimeContext.datetime?.season || ''})
${realTimeContext.datetime?.holiday ? `FESTIVITÀ: ${realTimeContext.datetime.holiday}` : ''}
${realTimeContext.location ? `POSIZIONE: ${realTimeContext.location.city}, ${realTimeContext.location.region}` : ''}
${realTimeContext.weather ? `METEO: ${realTimeContext.weather.condition}, ${realTimeContext.weather.temperature}°C` : ''}
${realTimeContext.news?.headlines?.length ? `NEWS: ${realTimeContext.news.headlines.slice(0, 2).join(' | ')}` : ''}

ISTRUZIONE: Puoi usare queste informazioni per contestualizzare risposte.
`;
    }

    const systemPrompt = `${BEST_FRIEND_THEMATIC}

${realTimeContextBlock}

═══════════════════════════════════════════════
🎓 COMPETENZE CLINICHE: DIARIO "${themeLabel.toUpperCase()}"
═══════════════════════════════════════════════

Quando serve, sei anche una psicologa esperta in ${themeContext}.
Hai esperienza in CBT, DBT, Motivational Interviewing e Solution-Focused Therapy.

📋 PAZIENTE: ${firstName}
- Obiettivi: ${goalDescriptions}
- Metriche prioritarie: ${priorityFocus}

${personaStyle}
${thematicKnowledge}
${dataHunterInstructions}
${investigativePrompt}

🧠 MEMORIA CLINICA:
- ${memoryContext}

═══════════════════════════════════════════════
⚕️ TECNICHE TERAPEUTICHE (DIARIO ${themeLabel.toUpperCase()})
═══════════════════════════════════════════════

🔄 **MOTIVATIONAL INTERVIEWING (Ambivalenza):**
- Se l'utente scrive "vorrei ma...", "dovrei...": 
- "Sento che una parte di te vorrebbe cambiare qualcosa..."
- "Quanto è importante per te, da 1 a 10?"

🎯 **SOLUTION-FOCUSED (Obiettivi):**
- "Se domani questo problema fosse risolto, cosa noteresti di diverso?"
- "C'è stato un momento recente in cui andava meglio?"

📝 **JOURNALING TERAPEUTICO:**
- "Prova a scrivere 3 cose per cui sei grato oggi."
- "Scrivi una lettera (che non invierai) a [persona del conflitto]."
- "Descrivi come vorresti sentirti tra 3 mesi."

🌊 **DBT per Emozioni Intense:**
- Se emozione forte: "Fermati un momento. Cosa senti nel corpo?"
- "Prova a descrivere l'emozione come se fosse un colore, una forma..."

💡 **PSICOEDUCAZIONE:**
- Una pillola per messaggio, quando appropriato
- Usa le conoscenze tematiche sopra per informare le risposte
- Spiega meccanismi: "Sai cosa succede quando..."

═══════════════════════════════════════════════
🤝 ALLEANZA TERAPEUTICA
═══════════════════════════════════════════════
- RICORDA gli obiettivi: "So che vuoi ${goalDescriptions}..."
- CELEBRA i progressi: "Noto che in questo diario stai esplorando..."
- COLLEGA al tema: Ogni risposta deve tornare al tema ${themeLabel}
- USA le conoscenze tematiche: Riferisciti a attachment, burnout, boundaries quando pertinente

═══════════════════════════════════════════════
🎯 RILEVAMENTO NUOVI OBIETTIVI
═══════════════════════════════════════════════
Se l'utente scrive "vorrei", "mi piacerebbe", "devo" → esplora!
- "Ooh interessante! Raccontami di più..."
- "Quanto/quando vorresti raggiungere questo?"
- Conferma: "Lo aggiungo ai tuoi obiettivi!"

═══════════════════════════════════════════════
🔄 CAMBIO ARGOMENTO NEL DIARIO
═══════════════════════════════════════════════
Nei momenti neutri, esplora naturalmente:
- Obiettivi legati al tema del diario
- Aree vita mancanti nel radar
- Follow-up su cose scritte in passato

═══════════════════════════════════════════════
😂 UMORISMO & TEASING (DIARIO)
═══════════════════════════════════════════════
Se l'utente è di buon umore, SCHERZA:
- "Ma dai! 😂", "Sei il/la solito/a!"
- "Oddio muoio", "No vabbè incredibile"
- Teasing affettuoso sul tema del diario

MAI scherzare se l'utente è triste/ansioso.

═══════════════════════════════════════════════
🌟 PERSONALITÀ AUTENTICA (DIARIO)
═══════════════════════════════════════════════
- Opinioni genuine sul tema: "Io la penso così..."
- Curiosità vera: "E poi?? Non lasciarmi in sospeso!"
- Ricordi personali: nomi, eventi, dettagli menzionati
- Reazioni come un'amica: "Nooo!", "Tesoro...", "Che figata!"

⚙️ REGOLE PROFESSIONALI:
1. ANTI-SALUTI: Se già salutati, vai dritto al punto.
2. HAI MEMORIA: Fai riferimenti naturali alle sessioni precedenti.
3. NO META-COMMENTI: Niente "[analisi]", istruzioni interne.
4. CONCISIONE: 2-3 frasi max. **Grassetto** solo per parole chiave emotive.
5. AGGIUNGI VALORE: Mai solo riassumere. Dai insight, prospettive, esercizi.
6. PSICOEDUCAZIONE: Una pillola per messaggio quando utile.

🚨 SICUREZZA: Se rischio autolesionismo → Telefono Amico: 02 2327 2327, Emergenze: 112.`;

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    // Call Google Gemini API for chat response
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          ...conversationHistory.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : m.role,
            parts: [{ text: m.content }]
          })),
          { role: 'user', parts: [{ text: message }] },
        ],
        generationConfig: { maxOutputTokens: 300, temperature: 0.8 },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const reply = aiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Mi dispiace, non riesco a rispondere ora.';

    // Map theme to life area
    const themeToLifeAreaMap: Record<string, string> = {
      love: 'love',
      work: 'work',
      relationships: 'social',
      self: 'growth',
    };
    const primaryLifeArea = themeToLifeAreaMap[theme] || null;

    // FIRE AND FORGET: Create a session + call process-session for full analysis
    (async () => {
      try {
        console.log('[thematic-diary-chat] Creating session for diary analysis...');
        
        // Build transcript from history + current exchange
        const fullTranscript = [
          ...history.map((m: DiaryMessage) => `${m.role === 'user' ? 'Tu' : 'AI'}: ${m.content}`),
          `Tu: ${message}`,
          `AI: ${reply}`
        ].join('\n\n');

        // Create a session record
        const { data: newSession, error: sessionCreateError } = await supabaseAdmin
          .from('sessions')
          .insert({
            user_id: user.id,
            type: 'chat',
            status: 'in_progress',
            start_time: new Date().toISOString()
          })
          .select('id')
          .single();

        if (sessionCreateError || !newSession) {
          console.error('[thematic-diary-chat] Error creating session:', sessionCreateError);
          return;
        }

        console.log('[thematic-diary-chat] Created session:', newSession.id);

        // Call process-session edge function with user context
        const processResponse = await fetch(`${supabaseUrl}/functions/v1/process-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            session_id: newSession.id,
            user_id: user.id,
            transcript: fullTranscript,
            is_voice: false,
            user_context: {
              selected_goals: selectedGoals,
              priority_metrics: dashboardConfig?.priority_metrics || [],
              primary_life_area: primaryLifeArea,
            }
          }),
        });

        if (!processResponse.ok) {
          console.error('[thematic-diary-chat] process-session error:', await processResponse.text());
        } else {
          const processResult = await processResponse.json();
          console.log('[thematic-diary-chat] Analysis complete:', processResult.success);
        }

      } catch (err) {
        console.error('[thematic-diary-chat] Background analysis error:', err);
      }
    })();

    // Also update memory with key facts (quick fire-and-forget)
    const memoryUpdatePrompt = `Analizza questo messaggio dell'utente nel contesto del tema "${themeLabel}":
"${message}"

Se contiene un FATTO NUOVO IMPORTANTE (evento, cambiamento, decisione), restituisci una frase breve da aggiungere alla memoria (es. "Ha iniziato a frequentare Sara").
Se non c'è nulla di nuovo, restituisci esattamente: "NESSUN_AGGIORNAMENTO"

Rispondi SOLO con la frase o "NESSUN_AGGIORNAMENTO".`;

    fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: memoryUpdatePrompt }] }],
        generationConfig: { maxOutputTokens: 100 },
      }),
    }).then(async (memResponse) => {
      if (memResponse.ok) {
        const memData = await memResponse.json();
        const memoryFact = memData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        if (memoryFact && memoryFact !== 'NESSUN_AGGIORNAMENTO' && memoryFact.length > 5) {
          const factWithContext = `[${themeLabel}] ${memoryFact}`;
          
          const { data: currentProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('long_term_memory')
            .eq('user_id', user.id)
            .single();
          
          const currentMemory = currentProfile?.long_term_memory || [];
          const updatedMemory = [...currentMemory, factWithContext].slice(-20);
          
          await supabaseAdmin
            .from('user_profiles')
            .update({ long_term_memory: updatedMemory })
            .eq('user_id', user.id);
          
          console.log('[thematic-diary-chat] Memory updated with:', factWithContext);
        }
      }
    }).catch(err => console.error('Memory update error:', err));

    return new Response(
      JSON.stringify({ reply, sessionCreated: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in thematic-diary-chat:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
