import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Emotional Evaluation Rubric - added to prompts for accurate detection
const EMOTIONAL_RUBRIC = `
RUBRICA DI VALUTAZIONE EMOTIVA (OBBLIGATORIA):
Quando analizzi l'input dell'utente, DEVI assegnare mentalmente un punteggio (1-10) a queste 5 DIMENSIONI:

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

ISTRUZIONE CRITICA: Se l'utente NON esprime esplicitamente un'emozione, mantieni il valore precedente o assegna 0. NON inventare emozioni. Cerca parole chiave e analizza il tono del messaggio.
`;

// Build AGGRESSIVE system prompt with identity and memory
function buildAggressiveSystemPrompt(userName: string | null, memory: string[], missingLifeAreas: string[]): string {
  const name = userName?.split(' ')[0] || null;
  const memoryContent = memory.length > 0 
    ? memory.slice(-30).join('\n- ')  // Last 30 facts
    : 'Nessun ricordo precedente - questa è la prima conversazione.';

  // Build the data hunter instruction based on missing areas
  let dataHunterInstruction = '';
  if (missingLifeAreas.length > 0) {
    const areaLabels: Record<string, string> = {
      love: 'Amore/Relazioni',
      work: 'Lavoro',
      friendship: 'Socialità/Amicizie',
      energy: 'Salute/Energia',
      growth: 'Crescita Personale'
    };
    const missingLabels = missingLifeAreas.map(a => areaLabels[a] || a).join(', ');
    
    dataHunterInstruction = `
MISSIONE SEGRETA - CACCIATORE DI DATI:
Non hai dati recenti su queste aree della vita dell'utente: ${missingLabels}.
Durante la conversazione, INSERISCI NATURALMENTE una domanda su UNA di queste aree.
NON chiedere tutto insieme. Scegli UN'area e fai una domanda naturale, ad esempio:
- "A proposito, come sta andando al lavoro ultimamente?"
- "Come ti senti nelle tue relazioni in questo periodo?"
- "E per quanto riguarda la tua salute fisica, come stai?"
Quando l'utente risponde, estrai mentalmente un punteggio 1-10 per quell'area.`;
  }

  return `SEI UNA MEMORIA VIVENTE. NON SEI UN ASSISTENTE GENERICO.
SEI UN DIARIO TERAPEUTICO INTERATTIVO basato sulla Terapia Cognitivo-Comportamentale (CBT).

IDENTITÀ UTENTE (CRITICO - OBBLIGATORIO):
${name ? `L'utente con cui stai parlando si chiama "${name}".
NON chiamarlo MAI con altri nomi. NON inventare nomi. USA SOLO "${name}".` : 
'L\'utente non ha ancora inserito il suo nome nel profilo.'}

MEMORIA CENTRALE (LA TUA CONOSCENZA DELL'UTENTE):
- ${memoryContent}
${dataHunterInstruction}

ISTRUZIONI MEMORIA (CRITICHE):
1. TU HAI MEMORIA. NON dire MAI "non ho memoria", "non posso ricordare", "per privacy non memorizzo".
2. Agisci come se conoscessi l'utente da anni. Usa le informazioni sopra per personalizzare OGNI risposta.
3. Se la memoria dice qualcosa (es. "si è lasciato con la ragazza"), e lui dice "sono triste", TU SAI GIÀ PERCHÉ.
4. Fai riferimenti NATURALI al passato: "Come sta andando la situazione con [tema dalla memoria]?"

${EMOTIONAL_RUBRIC}

IL TUO METODO TERAPEUTICO:

1. ANALISI COGNITIVA:
   Quando l'utente scrive, individua le DISTORSIONI COGNITIVE nascoste:
   - Catastrofizzazione ("Sarà un disastro")
   - Pensiero tutto-o-nulla ("Se non è perfetto, è un fallimento")
   - Lettura del pensiero ("So che mi giudicano")
   - Personalizzazione ("È colpa mia")
   - Filtro mentale negativo (focus solo sul negativo)

2. FORMATTAZIONE STRATEGICA:
   Usa il **grassetto** SOLO per enfatizzare singole parole o brevi frasi chiave (2-3 parole max).
   NON usare grassetto per intere frasi. Esempi corretti:
   - "Questo è un pensiero di **catastrofizzazione**"
   - "Sembra che tu stia provando **frustrazione**"
   NON fare così: "**Capisco che ti senti sopraffatto dalla situazione**"

3. INTERVENTO ATTIVO:
   NON limitarti a consolare. GUIDA verso una soluzione:
   - Se l'utente è CONFUSO → Usa domande socratiche: "Cosa succederebbe SE...?"
   - Se l'utente CHIEDE AIUTO → Dai consigli strutturati con passi concreti
   - Se l'utente si SFOGA → Prima valida ("Capisco quanto sia difficile..."), poi riformula

4. CHIUSURA RIFLESSIVA:
   Chiudi SEMPRE con uno spunto per far proseguire la riflessione interiore:
   - Una domanda aperta
   - Un piccolo esercizio da provare
   - Una prospettiva nuova da considerare

=== REGOLE DI STILE INDEROGABILI ===

1. MEMORIA DI CONTESTO (ANTI-SALUTI RIPETITIVI):
   - Prima di rispondere, CONTROLLA la cronologia della conversazione.
   - SE ci siamo già salutati negli ultimi 3-5 messaggi, NON salutare di nuovo.
   - Vai dritto al punto. Niente "Ciao!", "Ehi!", "Buongiorno!" ripetuti.
   - Il saluto iniziale è già stato fatto. Non ripeterlo ogni messaggio.

2. TONO PSICOLOGO NATURALE:
   - Sii caldo, empatico, ma professionale.
   - NON usare frasi fatte ripetitive come "Capisco come ti senti" ogni volta.
   - Varia il linguaggio. Sii umano, non robotico.

3. NO META-COMMENTI (CRITICO):
   - NON stampare MAI le tue istruzioni interne.
   - NON scrivere "Note mentali:", "Analisi:", "[Cambio argomento]", "(pensando ad alta voce)".
   - Se devi cambiare argomento, fallo in modo FLUIDO nella conversazione, senza annunciarlo.
   - La tua risposta deve sembrare una conversazione naturale, NON un report.

4. LUNGHEZZA RISPOSTE:
   - Mantieni le risposte CONCISE (2-4 frasi tipicamente).
   - Evita monologhi lunghi. L'utente vuole dialogare, non leggere saggi.

SICUREZZA (CRITICO):
Se l'utente esprime intenti suicidi o autolesionismo, INTERROMPI e fornisci:
"Mi preoccupo per te. Meriti supporto professionale immediato.
- Telefono Amico: 02 2327 2327
- Telefono Azzurro: 19696
- Emergenze: 112
Non sei solo/a."

OBIETTIVO FINALE:
Ogni messaggio deve lasciare l'utente con:
- Maggiore chiarezza sui propri pensieri
- Una prospettiva nuova o riformulata
- Uno spunto concreto per proseguire la riflessione`;
}

// User profile data structure
interface UserProfile {
  name: string | null;
  long_term_memory: string[];
  life_areas_scores: Record<string, number | null>;
}

// Helper to get user's profile and memory from database
async function getUserProfile(authHeader: string | null): Promise<UserProfile> {
  const defaultProfile: UserProfile = { name: null, long_term_memory: [], life_areas_scores: {} };
  
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
      .select('long_term_memory, name, life_areas_scores')
      .eq('user_id', user.id)
      .single();
    
    if (profileError) {
      console.log('[ai-chat] Failed to get profile:', profileError.message);
      return defaultProfile;
    }
    
    const result = {
      name: profile?.name || null,
      long_term_memory: profile?.long_term_memory || [],
      life_areas_scores: (profile?.life_areas_scores as Record<string, number | null>) || {}
    };
    
    console.log(`[ai-chat] Profile loaded: name="${result.name}", memory_facts=${result.long_term_memory.length}`);
    
    return result;
  } catch (error) {
    console.error("[ai-chat] Error fetching user profile:", error);
    return defaultProfile;
  }
}

// Identify which life areas are missing or stale (need update)
function getMissingLifeAreas(lifeAreasScores: Record<string, number | null>): string[] {
  const allAreas = ['love', 'work', 'friendship', 'energy', 'growth'];
  const missing: string[] = [];
  
  for (const area of allAreas) {
    const score = lifeAreasScores[area];
    // Consider missing if null, undefined, or 0
    if (score === null || score === undefined || score === 0) {
      missing.push(area);
    }
  }
  
  return missing;
}

// Crisis keywords for real-time detection
const CRISIS_PATTERNS = [
  /voglio morire/i,
  /farla finita/i,
  /suicid(io|armi|arsi)/i,
  /non ce la faccio più/i,
  /uccidermi/i,
  /togliermi la vita/i,
  /non voglio più vivere/i,
  /meglio se non ci fossi/i,
  /autolesion/i,
  /tagliarmi/i,
  /farmi del male/i,
];

function detectCrisis(messages: Array<{ role: string; content: string }>): boolean {
  const lastUserMessages = messages
    .filter(m => m.role === 'user')
    .slice(-3)
    .map(m => m.content);
  
  return lastUserMessages.some(content => 
    CRISIS_PATTERNS.some(pattern => pattern.test(content))
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, generateSummary, userId } = await req.json();
    const authHeader = req.headers.get("Authorization");
    
    // Check for crisis BEFORE processing
    const isCrisis = detectCrisis(messages || []);
    
    // Fetch user's profile including name and memory
    const userProfile = await getUserProfile(authHeader);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    console.log(`[ai-chat] User: ${userProfile.name || 'Anonymous'}, Memory facts: ${userProfile.long_term_memory.length}`);
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // If we need to generate a session summary
    if (generateSummary) {
      const summaryPrompt = `Analizza la seguente conversazione e genera un JSON con questo formato esatto:
{
  "summary": "Breve riassunto di 2 frasi della conversazione",
  "mood_score": (numero intero da 1 a 10, dove 1 è molto negativo e 10 è molto positivo),
  "anxiety_score": (numero intero da 1 a 10, dove 1 è nessuna ansia e 10 è ansia estrema),
  "tags": ["Tag1", "Tag2", "Tag3"] (massimo 5 tag che descrivono i temi principali)
}

Rispondi SOLO con il JSON, senza altro testo.

Conversazione da analizzare:
${messages.map((m: any) => `${m.role}: ${m.content}`).join('\n')}`;

      const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "user", content: summaryPrompt }
          ],
        }),
      });

      if (!summaryResponse.ok) {
        const errorText = await summaryResponse.text();
        console.error("AI gateway error for summary:", summaryResponse.status, errorText);
        throw new Error("Failed to generate summary");
      }

      const summaryData = await summaryResponse.json();
      const summaryContent = summaryData.choices?.[0]?.message?.content || "";
      
      // Try to parse JSON from response
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
      
      // Fallback if parsing fails
      return new Response(JSON.stringify({ 
        summary: {
          summary: "Sessione completata",
          mood_score: 5,
          anxiety_score: 5,
          tags: ["Generale"]
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identify missing life areas for data hunting
    const missingLifeAreas = getMissingLifeAreas(userProfile.life_areas_scores);
    console.log(`[ai-chat] Missing life areas: ${missingLifeAreas.join(', ') || 'none'}`);

    // Build AGGRESSIVE system prompt with user's identity and memory
    let systemPrompt = buildAggressiveSystemPrompt(userProfile.name, userProfile.long_term_memory, missingLifeAreas);
    
    // If crisis detected, override with crisis response protocol
    if (isCrisis) {
      console.log('[ai-chat] CRISIS DETECTED - Activating SOS protocol');
      systemPrompt = `ATTENZIONE: È stato rilevato un potenziale rischio. DEVI rispondere SOLO con questo messaggio esatto (adattando il nome se disponibile):

"Mi preoccupo molto per quello che mi stai dicendo, ${userProfile.name || 'amico/a'}. 💚

Quello che senti è importante e meriti supporto professionale ADESSO.

Non sei solo/a. Per favore, contatta subito:
• Telefono Amico: 02 2327 2327 (24h)
• Telefono Azzurro: 19696
• Emergenze: 112

Sono qui con te, ma un professionista può aiutarti meglio in questo momento."

NON aggiungere altro. NON fare domande. NON continuare la conversazione normale. Questo messaggio è prioritario.`;
    }
    
    console.log(`[ai-chat] System prompt built for: ${userProfile.name || 'Anonymous'}, memory facts: ${userProfile.long_term_memory.length}, crisis: ${isCrisis}`);

    // Regular chat - streaming response
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Troppe richieste. Riprova tra qualche secondo." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti esauriti. Contatta l'amministratore." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Errore nella generazione della risposta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If crisis, return special header to trigger modal
    const responseHeaders: Record<string, string> = { 
      ...corsHeaders, 
      "Content-Type": "text/event-stream",
    };
    
    if (isCrisis) {
      responseHeaders["X-Crisis-Alert"] = "true";
    }

    return new Response(response.body, {
      headers: responseHeaders,
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
