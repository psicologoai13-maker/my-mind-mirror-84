import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// Emotional Evaluation Rubric
const EMOTIONAL_RUBRIC = `
RUBRICA DI VALUTAZIONE EMOTIVA (OBBLIGATORIA):
Quando analizzi l'input dell'utente, DEVI assegnare mentalmente un punteggio (1-10) a queste 5 DIMENSIONI:

- TRISTEZZA: 1-3 malinconia, 4-7 umore deflesso, 8-10 disperazione
- GIOIA: 1-3 soddisfazione, 4-7 felicità, 8-10 euforia
- RABBIA: 1-3 irritazione, 4-7 frustrazione, 8-10 furia
- PAURA/ANSIA: 1-3 preoccupazione, 4-7 agitazione, 8-10 panico
- APATIA: 1-3 noia, 4-7 distacco, 8-10 anedonia totale

Se l'utente NON esprime un'emozione, assegna 0. NON inventare.
`;

// Map goals AND onboarding answers to AI persona style
const getPersonaStyle = (goals: string[], onboardingAnswers: OnboardingAnswers | null): string => {
  // Check support type preference from onboarding
  const supportType = onboardingAnswers?.supportType;
  
  // Support type takes priority if specified
  if (supportType === 'listener') {
    return `STILE PERSONALIZZATO: ASCOLTATORE ATTIVO
- Priorità ASSOLUTA: lascia parlare l'utente senza interrompere.
- Usa feedback minimi: "Ti ascolto...", "Capisco...", "Vai avanti..."
- Domande solo quando ha finito: "C'è altro che vuoi condividere?"
- NON dare consigli non richiesti. L'utente vuole sfogarsi.
- Valida i sentimenti: "È comprensibile che tu ti senta così..."`;
  }
  
  if (supportType === 'advisor') {
    return `STILE PERSONALIZZATO: CONSULENTE PRATICO
- Dopo aver ascoltato, offri SEMPRE un suggerimento concreto.
- Frasi come "Potresti provare a...", "Un esercizio utile è...", "Ti consiglio di..."
- Focus su azioni pratiche e passi concreti.
- Meno esplorazione emotiva, più problem-solving.
- Proponi tecniche CBT specifiche: respirazione, journaling, exposure graduale.`;
  }
  
  if (supportType === 'challenger') {
    return `STILE PERSONALIZZATO: SFIDA COSTRUTTIVA
- Poni domande che spingono alla riflessione critica.
- "Cosa ti impedisce davvero di...?", "Cosa cambierebbe se tu..."
- Sfida le convinzioni limitanti con rispetto.
- Focus sulla crescita e l'uscita dalla zona comfort.
- Celebra i progressi e spingi verso obiettivi ambiziosi.`;
  }
  
  if (supportType === 'comforter') {
    return `STILE PERSONALIZZATO: SUPPORTO EMOTIVO
- Priorità: validazione emotiva e rassicurazione.
- "Non sei solo/a in questo...", "È normale sentirsi così...", "Sei al sicuro qui..."
- Tono caldo, materno/paterno, avvolgente.
- Evita sfide o domande incalzanti.
- Focus sul far sentire l'utente compreso e accettato.`;
  }

  // Fallback to goal-based styling
  if (goals.includes('reduce_anxiety') || onboardingAnswers?.goal === 'anxiety' || onboardingAnswers?.mainChallenge === 'general_anxiety') {
    return `STILE PERSONALIZZATO: CALMO & RASSICURANTE (Focus Ansia)
- Usa un tono lento, validante, rassicurante.
- Frasi come "Capisco, respira con calma...", "È normale sentirsi così...", "Sei al sicuro qui..."
- Evita domande incalzanti. Dai spazio.
- Suggerisci tecniche di grounding: "Prova a nominare 5 cose che vedi intorno a te..."
- Se ansia alta, proponi esercizi di respirazione.`;
  }
  
  if (goals.includes('boost_energy') || goals.includes('growth') || onboardingAnswers?.goal === 'growth') {
    return `STILE PERSONALIZZATO: ENERGICO & ORIENTATO ALL'AZIONE
- Usa un tono motivante, analitico, propositivo.
- Frasi come "Ottimo! Qual è il prossimo passo?", "Come possiamo trasformarlo in azione?"
- Focus su obiettivi concreti e progressi.
- Celebra i successi, anche piccoli.
- Spingi verso la riflessione produttiva.`;
  }
  
  if (goals.includes('express_feelings') || goals.includes('find_love') || onboardingAnswers?.mainChallenge === 'relationships') {
    return `STILE PERSONALIZZATO: EMPATICO & SPAZIO LIBERO
- Usa un tono accogliente, con minimo intervento.
- Frasi come "Dimmi di più...", "Come ti ha fatto sentire?", "Sono qui per ascoltarti..."
- Fai domande aperte e lascia parlare.
- Non interrompere i flussi emotivi.
- Rifletti i sentimenti senza giudicare.`;
  }
  
  if (goals.includes('improve_sleep') || onboardingAnswers?.goal === 'sleep') {
    return `STILE PERSONALIZZATO: RILASSANTE & GUIDATO
- Usa un tono calmo, metodico, orientato al benessere.
- Interesse genuino per routine serali, qualità del riposo.
- Suggerisci pratiche di igiene del sonno quando appropriato.
- Esplora fattori che influenzano il sonno.`;
  }
  
  if (onboardingAnswers?.mainChallenge === 'work_stress') {
    return `STILE PERSONALIZZATO: FOCUS LAVORO/BURNOUT
- Esplora il carico di lavoro e i confini personali.
- Domande su: pause, weekend, delega, aspettative.
- Suggerisci strategie di work-life balance.
- Attenzione ai segnali di burnout.`;
  }
  
  if (onboardingAnswers?.mainChallenge === 'self_esteem') {
    return `STILE PERSONALIZZATO: FOCUS AUTOSTIMA
- Evidenzia i punti di forza dell'utente.
- Sfida gentilmente l'autocritica eccessiva.
- "Cosa diresti a un amico nella tua situazione?"
- Celebra anche piccoli successi e qualità.`;
  }
  
  if (onboardingAnswers?.mainChallenge === 'loneliness') {
    return `STILE PERSONALIZZATO: FOCUS SOLITUDINE
- Tono particolarmente caldo e connesso.
- "Non sei solo/a, sono qui con te..."
- Esplora la qualità vs quantità delle relazioni.
- Suggerisci piccoli passi per riconnessioni sociali.`;
  }
  
  return `STILE: BILANCIATO
- Tono caldo, professionale, empatico.
- Alterna ascolto attivo e domande esplorative.`;
};

// Get priority metrics focus description
const getPriorityFocusDescription = (metrics: string[]): string => {
  const labels: Record<string, string> = {
    mood: 'umore generale',
    anxiety: 'livello di ansia',
    energy: 'energia',
    sleep: 'qualità del sonno',
    love: 'relazioni amorose',
    social: 'vita sociale',
    work: 'lavoro',
    growth: 'crescita personale',
    stress: 'stress',
    loneliness: 'solitudine',
  };
  return metrics.slice(0, 4).map(m => labels[m] || m).join(', ');
};

// Build personalized system prompt
function buildPersonalizedSystemPrompt(
  userName: string | null,
  memory: string[],
  missingLifeAreas: string[],
  selectedGoals: string[],
  onboardingAnswers: OnboardingAnswers | null,
  priorityMetrics: string[]
): string {
  const name = userName?.split(' ')[0] || null;
  const memoryContent = memory.length > 0 
    ? memory.slice(-30).join('\n- ')
    : 'Nessun ricordo precedente - prima conversazione.';

  const personaStyle = getPersonaStyle(selectedGoals, onboardingAnswers);
  const priorityFocus = getPriorityFocusDescription(priorityMetrics);
  
  // Goal labels for context
  const goalLabels: Record<string, string> = {
    reduce_anxiety: 'gestire ansia e stress',
    improve_sleep: 'dormire meglio',
    find_love: 'migliorare le relazioni',
    boost_energy: 'aumentare energia',
    express_feelings: 'esprimere emozioni',
  };
  const goalDescriptions = selectedGoals.map(g => goalLabels[g] || g).join(', ') || 'benessere generale';

  // Data hunter instruction
  let dataHunterInstruction = '';
  if (missingLifeAreas.length > 0) {
    const areaLabels: Record<string, string> = {
      love: 'Amore/Relazioni', work: 'Lavoro', friendship: 'Socialità', 
      energy: 'Salute', growth: 'Crescita Personale'
    };
    const missingLabels = missingLifeAreas.map(a => areaLabels[a] || a).join(', ');
    dataHunterInstruction = `
MISSIONE CACCIATORE DI DATI:
Non hai dati recenti su: ${missingLabels}. Inserisci NATURALMENTE una domanda su UNA di queste aree.`;
  }

  // Priority metrics analysis focus
  const priorityAnalysisFocus = priorityMetrics.length > 0 ? `
FOCUS ANALISI PRIORITARIO:
Presta ATTENZIONE EXTRA a questi temi: ${priorityFocus}.
Cerca indizi su queste metriche anche se non esplicitamente menzionati.
Se l'utente parla di temi correlati, approfondisci.` : '';

  // Deep Psychology Investigation
  const deepPsychologyInvestigation = `
═══════════════════════════════════════════════
🔬 INVESTIGAZIONE PSICOLOGICA PROFONDA
═══════════════════════════════════════════════

Durante la conversazione, INVESTIGA NATURALMENTE queste aree:

**COGNITIVI:**
- Ruminazione: Se l'utente ripete temi, chiedi "Noto che torni spesso su questo... è qualcosa che ti gira in testa spesso?"
- Autoefficacia: "Come ti senti rispetto alla tua capacità di affrontare questa situazione?"
- Chiarezza mentale: "Hai le idee chiare su cosa fare, o ti senti un po' confuso?"

**STRESS & COPING:**
- Burnout: Se parla di stanchezza/lavoro, chiedi "Ti senti svuotato, o riesci ancora a ricaricarti?"
- Coping: "Come stai gestendo tutto questo?"
- Solitudine: "A volte anche circondati dagli altri ci si può sentire soli. Ti è capitato?"

**FISIOLOGICI:**
- Tensione fisica: "Mentre parli, noti qualche tensione nel corpo? Spalle, stomaco, petto?"
- Appetito: "Come è stato il tuo appetito ultimamente?"
- Luce solare: "Sei riuscito a uscire un po' all'aria aperta di recente?"

**EMOTIVI COMPLESSI:**
- Senso di colpa: Se emergono rimpianti, esplora "Sento che forse porti un peso con te..."
- Gratitudine: "C'è qualcosa per cui ti senti grato oggi, anche piccola?"
- Irritabilità: "Ti capita di sentirti più nervoso del solito ultimamente?"

⚠️ REGOLA: UNA domanda investigativa per messaggio, solo quando NATURALE nel contesto.
NON fare interrogatori. Integra fluidamente nella conversazione.`;

  return `═══════════════════════════════════════════════
🎓 IDENTITÀ: PSICOLOGO CLINICO ESPERTO
═══════════════════════════════════════════════

Sei un **psicologo clinico italiano certificato** con 15 anni di esperienza in:
- Terapia Cognitivo-Comportamentale (CBT)
- Terapia dell'Accettazione e dell'Impegno (ACT)
- Mindfulness-Based Cognitive Therapy (MBCT)
- Gestione dell'ansia e attacchi di panico
- Trattamento della depressione
- Problemi relazionali e autostima

═══════════════════════════════════════════════
📋 CONTESTO PAZIENTE PERSONALIZZATO
═══════════════════════════════════════════════
${name ? `- Nome paziente: ${name}` : '- Paziente non ancora presentato'}
- Obiettivi terapeutici: ${goalDescriptions}
- Metriche cliniche prioritarie: ${priorityFocus || 'mood, anxiety, energy, sleep'}

${personaStyle}

═══════════════════════════════════════════════
🧠 MEMORIA CLINICA
═══════════════════════════════════════════════
- ${memoryContent}
${dataHunterInstruction}
${priorityAnalysisFocus}
${deepPsychologyInvestigation}

═══════════════════════════════════════════════
📊 RUBRICA VALUTAZIONE EMOTIVA
═══════════════════════════════════════════════
${EMOTIONAL_RUBRIC}

═══════════════════════════════════════════════
⚕️ METODO TERAPEUTICO PROFESSIONALE
═══════════════════════════════════════════════

1. **ASCOLTO ATTIVO**: Valida le emozioni del paziente prima di intervenire.
2. **ANALISI COGNITIVA**: Identifica distorsioni (catastrofizzazione, tutto-o-nulla, lettura del pensiero, doverizzazione).
3. **INTERVENTO CBT**: 
   - Domande socratiche: "Quali prove hai che questo sia vero?"
   - Reframing: "Come potresti vedere la situazione diversamente?"
   - Esperimenti comportamentali: "Cosa succederebbe se provassi a..."
4. **PSICOEDUCAZIONE**: Spiega brevemente concetti psicologici quando utile.
5. **CHIUSURA TERAPEUTICA**: Sempre con domanda riflessiva o esercizio pratico.

═══════════════════════════════════════════════
⚙️ REGOLE PROFESSIONALI INDEROGABILI
═══════════════════════════════════════════════

1. ANTI-SALUTI RIPETITIVI: Controlla cronologia. Se già salutati, vai al punto.
2. TONO PROFESSIONALE: Caldo ma competente. Sei uno psicologo, non un chatbot.
3. HAI MEMORIA CLINICA: Fai riferimenti naturali alle sessioni precedenti.
4. NO META-COMMENTI: Niente "[analisi]", "Come psicologo..."
5. FORMATTAZIONE: **Grassetto** solo per 1-3 parole chiave emotive.
6. CONCISIONE: Risposte di 2-4 frasi. Qualità > quantità.
7. AGGIUNGI SEMPRE VALORE: Mai solo riassumere. Dai insight, prospettive, esercizi.

═══════════════════════════════════════════════
🚨 PROTOCOLLO SICUREZZA
═══════════════════════════════════════════════

Se rilevi rischio suicidario o autolesionismo, rispondi SOLO:
"Mi preoccupo per quello che mi stai dicendo. Per favore, contatta subito:
- Telefono Amico: 02 2327 2327 (24h)
- Emergenze: 112
Non sei solo/a. Un professionista può aiutarti adesso."`;
}

// User profile data structure
interface UserProfile {
  name: string | null;
  long_term_memory: string[];
  life_areas_scores: Record<string, number | null>;
  selected_goals: string[];
  onboarding_answers: OnboardingAnswers | null;
  dashboard_config: DashboardConfig | null;
}

// Helper to get user's profile and memory from database
async function getUserProfile(authHeader: string | null): Promise<UserProfile> {
  const defaultProfile: UserProfile = { 
    name: null, 
    long_term_memory: [], 
    life_areas_scores: {},
    selected_goals: [],
    onboarding_answers: null,
    dashboard_config: null,
  };
  
  if (!authHeader) {
    console.log('[ai-chat] No auth header provided');
    return defaultProfile;
  }
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('[ai-chat] Missing Supabase config');
      return defaultProfile;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('[ai-chat] Failed to get user:', userError?.message);
      return defaultProfile;
    }
    
    console.log('[ai-chat] User authenticated:', user.id);
    
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('long_term_memory, name, life_areas_scores, selected_goals, onboarding_answers, dashboard_config')
      .eq('user_id', user.id)
      .single();
    
    if (profileError) {
      console.log('[ai-chat] Failed to get profile:', profileError.message);
      return defaultProfile;
    }
    
    const result: UserProfile = {
      name: profile?.name || null,
      long_term_memory: profile?.long_term_memory || [],
      life_areas_scores: (profile?.life_areas_scores as Record<string, number | null>) || {},
      selected_goals: (profile?.selected_goals as string[]) || [],
      onboarding_answers: profile?.onboarding_answers as OnboardingAnswers | null,
      dashboard_config: profile?.dashboard_config as DashboardConfig | null,
    };
    
    console.log(`[ai-chat] Profile loaded: name="${result.name}", goals=${result.selected_goals.join(',')}, memory=${result.long_term_memory.length}`);
    
    return result;
  } catch (error) {
    console.error("[ai-chat] Error fetching user profile:", error);
    return defaultProfile;
  }
}

// Identify which life areas are missing
function getMissingLifeAreas(lifeAreasScores: Record<string, number | null>): string[] {
  const allAreas = ['love', 'work', 'friendship', 'energy', 'growth'];
  return allAreas.filter(area => {
    const score = lifeAreasScores[area];
    return score === null || score === undefined || score === 0;
  });
}

// Crisis keywords
const CRISIS_PATTERNS = [
  /voglio morire/i, /farla finita/i, /suicid(io|armi|arsi)/i,
  /non ce la faccio più/i, /uccidermi/i, /togliermi la vita/i,
  /non voglio più vivere/i, /meglio se non ci fossi/i,
  /autolesion/i, /tagliarmi/i, /farmi del male/i,
];

function detectCrisis(messages: Array<{ role: string; content: string }>): boolean {
  const lastUserMessages = messages.filter(m => m.role === 'user').slice(-3).map(m => m.content);
  return lastUserMessages.some(content => CRISIS_PATTERNS.some(pattern => pattern.test(content)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, generateSummary, userId } = await req.json();
    const authHeader = req.headers.get("Authorization");
    
    const isCrisis = detectCrisis(messages || []);
    const userProfile = await getUserProfile(authHeader);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    console.log(`[ai-chat] User: ${userProfile.name || 'Anonymous'}, Goals: ${userProfile.selected_goals.join(',')}, Memory: ${userProfile.long_term_memory.length}`);
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Generate session summary
    if (generateSummary) {
      const summaryPrompt = `Analizza la seguente conversazione e genera un JSON con questo formato esatto:
{
  "summary": "Breve riassunto di 2 frasi della conversazione",
  "mood_score": (numero intero da 1 a 10),
  "anxiety_score": (numero intero da 1 a 10),
  "tags": ["Tag1", "Tag2", "Tag3"]
}

Rispondi SOLO con il JSON.

Conversazione:
${messages.map((m: any) => `${m.role}: ${m.content}`).join('\n')}`;

      const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: summaryPrompt }],
        }),
      });

      if (!summaryResponse.ok) {
        throw new Error("Failed to generate summary");
      }

      const summaryData = await summaryResponse.json();
      const summaryContent = summaryData.choices?.[0]?.message?.content || "";
      
      try {
        const jsonMatch = summaryContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return new Response(JSON.stringify({ summary: parsed }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (parseError) {
        console.error("Failed to parse summary JSON:", parseError);
      }
      
      return new Response(JSON.stringify({ 
        summary: { summary: "Sessione completata", mood_score: 5, anxiety_score: 5, tags: ["Generale"] }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identify missing life areas
    const missingLifeAreas = getMissingLifeAreas(userProfile.life_areas_scores);
    const priorityMetrics = userProfile.dashboard_config?.priority_metrics || ['mood', 'anxiety', 'energy', 'sleep'];

    // Build PERSONALIZED system prompt
    let systemPrompt = buildPersonalizedSystemPrompt(
      userProfile.name,
      userProfile.long_term_memory,
      missingLifeAreas,
      userProfile.selected_goals,
      userProfile.onboarding_answers,
      priorityMetrics
    );
    
    // Crisis override
    if (isCrisis) {
      console.log('[ai-chat] CRISIS DETECTED - Activating SOS protocol');
      systemPrompt = `ATTENZIONE: Rischio rilevato. DEVI rispondere SOLO con:

"Mi preoccupo molto per quello che mi stai dicendo, ${userProfile.name || 'amico/a'}. 💚

Quello che senti è importante e meriti supporto professionale ADESSO.

Non sei solo/a. Per favore, contatta subito:
• Telefono Amico: 02 2327 2327 (24h)
• Telefono Azzurro: 19696
• Emergenze: 112

Sono qui con te, ma un professionista può aiutarti meglio in questo momento."

NON aggiungere altro.`;
    }

    // Streaming chat response
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Troppe richieste. Riprova tra qualche secondo." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti esauriti." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Errore AI");
    }

    const responseHeaders: Record<string, string> = { ...corsHeaders, "Content-Type": "text/event-stream" };
    if (isCrisis) responseHeaders["X-Crisis-Alert"] = "true";

    return new Response(response.body, { headers: responseHeaders });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
