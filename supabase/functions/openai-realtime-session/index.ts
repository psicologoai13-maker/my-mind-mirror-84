import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Parse request body for user_id and real-time context
    let userId: string | null = null;
    let realTimeContext: {
      datetime?: { date: string; day: string; time: string; period: string; season: string; holiday?: string };
      location?: { city: string; region: string; country: string };
      weather?: { condition: string; temperature: number; feels_like: number; description: string };
      news?: { headlines: string[] };
    } | null = null;
    
    try {
      const body = await req.json();
      userId = body.user_id;
      realTimeContext = body.realTimeContext || null;
    } catch {
      // No body or invalid JSON, continue without user_id
    }

    console.log('[openai-realtime-session] Creating session for user:', userId, 'with context:', !!realTimeContext);

    // Fetch user's long-term memory and life areas scores if available
    let longTermMemory: string[] = [];
    let lifeAreasScores: Record<string, number | null> = {};
    let userName: string | null = null;
    
    if (userId) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('long_term_memory, name, life_areas_scores')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[openai-realtime-session] Error fetching profile:', profileError);
      } else if (profileData) {
        longTermMemory = profileData.long_term_memory || [];
        userName = profileData.name || null;
        lifeAreasScores = (profileData.life_areas_scores as Record<string, number | null>) || {};
        console.log('[openai-realtime-session] Loaded', longTermMemory.length, 'memory items');
      }
    }

    // Build memory context string
    let memoryContext = '';
    if (longTermMemory.length > 0) {
      memoryContext = `\n\nMEMORIA DELLE SESSIONI PRECEDENTI:
Ricorda questi fatti importanti sull'utente:
${longTermMemory.map((fact, i) => `- ${fact}`).join('\n')}

Usa questa memoria per personalizzare la conversazione e mostrare che ricordi cosa ha condiviso in passato.`;
    }

    // Identify missing life areas for data hunting
    const allAreas = ['love', 'work', 'friendship', 'energy', 'growth'];
    const missingAreas: string[] = [];
    for (const area of allAreas) {
      const score = lifeAreasScores[area];
      if (score === null || score === undefined || score === 0) {
        missingAreas.push(area);
      }
    }

    let dataHunterInstruction = '';
    if (missingAreas.length > 0) {
      const areaLabels: Record<string, string> = {
        love: 'Amore e relazioni',
        work: 'Lavoro e carriera',
        friendship: 'Amicizie e vita sociale',
        energy: 'Salute e energia fisica',
        growth: 'Crescita personale'
      };
      const missingLabels = missingAreas.map(a => areaLabels[a] || a).join(', ');
      
      dataHunterInstruction = `

MISSIONE CACCIATORE DI DATI:
Non hai dati recenti su: ${missingLabels}.
Durante la conversazione, inserisci NATURALMENTE una domanda su UNA di queste aree.
Ad esempio: "A proposito, come sta andando al lavoro ultimamente?"
Non chiedere tutto insieme. Scegli un'area alla volta.`;
    }

    // Deep Psychology Investigation for voice
    const deepPsychologyVoice = `

═══════════════════════════════════════════════
🔬 INVESTIGAZIONE PSICOLOGICA PROFONDA (VOCALE)
═══════════════════════════════════════════════

Mentre ascolti, INVESTIGA NATURALMENTE queste aree con domande brevi:

**COGNITIVI:**
- Se l'utente ripete un tema più volte: "Questo pensiero ti torna spesso?"
- Autoefficacia: "Ti senti capace di affrontare questa situazione?"
- Chiarezza mentale: "Hai le idee chiare su cosa fare?"

**STRESS & COPING:**
- Se parla di stanchezza/lavoro: "Ti senti svuotato ultimamente?"
- Gestione: "Come stai reggendo tutto questo?"
- Solitudine: "Ti senti supportato dalle persone intorno a te?"

**FISIOLOGICI:**
- Tensione: "Senti qualche tensione fisica in questo momento? Spalle, petto, stomaco?"
- Appetito: "Come è stato il tuo appetito ultimamente?"
- Aria aperta: "Riesci a uscire un po' all'aperto?"

**EMOTIVI COMPLESSI:**
- Se emergono rimpianti: "Sento che porti un peso con te..."
- Gratitudine: "C'è qualcosa di positivo oggi, anche piccola?"
- Irritabilità: "Ti senti più nervoso del solito?"

⚠️ REGOLA VOCALE: UNA micro-domanda investigativa ogni 2-3 scambi.
Mantieni le domande BREVI e NATURALI. MAI fare interrogatori.`;

    // Emotional Evaluation Rubric for accurate detection
    const emotionalRubric = `
RUBRICA DI VALUTAZIONE EMOTIVA (OBBLIGATORIA):
Mentre ascolti l'utente, DEVI valutare mentalmente un punteggio (1-10) a queste 5 DIMENSIONI:

- TRISTEZZA: 
  1-3: Malinconia passeggera, leggera nostalgia.
  4-7: Umore deflesso persistente, pianto occasionale.
  8-10: Disperazione profonda, pianto frequente, pensieri oscuri.

- GIOIA: 
  1-3: Leggera soddisfazione, contentezza.
  4-7: Felicità evidente, sorrisi, riso.
  8-10: Euforia, entusiasmo incontenibile, eccitazione.

- RABBIA: 
  1-3: Irritazione lieve, fastidio.
  4-7: Frustrazione evidente, risentimento.
  8-10: Furia intensa, voglia di rompere oggetti, urla.

- PAURA/ANSIA: 
  1-3: Preoccupazione lieve, nervosismo.
  4-7: Agitazione fisica evidente, insonnia.
  8-10: Panico, terrore, blocco fisico, attacchi di paura.

- APATIA: 
  1-3: Noia, mancanza di interesse momentanea.
  4-7: Distacco emotivo, difficoltà a provare piacere.
  8-10: Totale distacco emotivo, anedonia (nulla ha senso), svuotamento.

ISTRUZIONE CRITICA: Se l'utente NON esprime esplicitamente un'emozione, mantieni il valore precedente o assegna 0. NON inventare emozioni. Cerca parole chiave e analizza il tono della voce.
`;

    // Build real-time context block for prompt
    let realTimeContextBlock = '';
    if (realTimeContext) {
      realTimeContextBlock = `

CONTESTO TEMPO REALE:
Data/Ora: ${realTimeContext.datetime?.day || ''} ${realTimeContext.datetime?.date || ''}, ore ${realTimeContext.datetime?.time || ''}
Periodo: ${realTimeContext.datetime?.period || ''} (${realTimeContext.datetime?.season || ''})
${realTimeContext.datetime?.holiday ? `Festività: ${realTimeContext.datetime.holiday}` : ''}
${realTimeContext.location ? `Posizione: ${realTimeContext.location.city}, ${realTimeContext.location.region}` : ''}
${realTimeContext.weather ? `Meteo: ${realTimeContext.weather.condition}, ${realTimeContext.weather.temperature}°C` : ''}
${realTimeContext.news?.headlines?.length ? `News: ${realTimeContext.news.headlines.slice(0, 2).join(' | ')}` : ''}

Usa queste informazioni per personalizzare la conversazione. Se il meteo è brutto, mostra empatia.`;
    }

    const systemInstructions = `Sei Aria, una psicologa empatica italiana con anni di esperienza in Terapia Cognitivo-Comportamentale (CBT).

REGOLE FONDAMENTALI:
- Il tuo tono di voce è caldo, lento e rassicurante
- Parla sempre in italiano
- Non fare mai liste puntate o elenchi quando parli
- Rispondi brevemente per favorire lo scambio naturale (massimo 2-3 frasi)
- Se l'utente ti interrompe, fermati subito e ascolta
- Usa pause naturali nel parlare
- Ricorda i dettagli che l'utente condivide durante la conversazione
${realTimeContextBlock}

${emotionalRubric}

IL TUO COMPORTAMENTO DINAMICO:

1. FASE DI ASCOLTO:
   Se l'utente sta raccontando o si sta sfogando, usa feedback brevi e naturali:
   - "Ti ascolto..."
   - "Certo..."
   - "Capisco il dolore..."
   - "Mmm..."
   Non interrompere il flusso. Lascia che si esprima completamente.

2. FASE DI INTERVENTO:
   Quando l'utente ha finito un concetto, o ti chiede un parere, NON limitarti a riassumere.
   AGGIUNGI VALORE in uno di questi modi:
   - Offri una PROSPETTIVA NUOVA (Reframing): "Hai considerato che forse...?"
   - Dai un CONSIGLIO PRATICO: "Prova a respirare un attimo. Cosa senti ora nel corpo?"
   - Fai una DOMANDA PROFONDA: "Cosa ti dice questa emozione di te stesso/a?"
   - Proponi un ESERCIZIO: "Chiudi gli occhi. Descrivi dove senti questa tensione."

3. REGOLA D'ORO:
   Sii conciso ma profondo. Parla come un saggio umano, non come un assistente.
   Non riassumere semplicemente ciò che ha detto l'utente - aggiungi sempre qualcosa di nuovo.

TECNICHE CBT DA USARE:
- Identificazione distorsioni cognitive (catastrofizzazione, pensiero tutto-o-nulla)
- Socratic questioning per far emergere insight
- Grounding sensoriale per momenti di ansia
- Validazione emotiva prima di ogni intervento${memoryContext}${dataHunterInstruction}${deepPsychologyVoice}

SICUREZZA:
Se l'utente esprime intenti suicidi o autolesionistici, INTERROMPI e fornisci:
"Mi fermo qui perché quello che mi dici mi preoccupa molto. 
Per favore, chiama adesso Telefono Amico al 02 2327 2327, oppure il 112.
Non sei solo/a. Meriti aiuto professionale."

Inizia con un saluto caldo e naturale${userName ? `, usando il nome "${userName.split(' ')[0]}"` : ''}, poi chiedi come sta la persona oggi.`;

    console.log('[openai-realtime-session] Creating OpenAI Realtime session...');

    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "shimmer",
        instructions: systemInstructions
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("[openai-realtime-session] Session created successfully");

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error creating realtime session:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
