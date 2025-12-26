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

    // Parse request body for user_id
    let userId: string | null = null;
    try {
      const body = await req.json();
      userId = body.user_id;
    } catch {
      // No body or invalid JSON, continue without user_id
    }

    console.log('[openai-realtime-session] Creating session for user:', userId);

    // Fetch user's long-term memory if available
    let longTermMemory: string[] = [];
    
    if (userId) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('long_term_memory, name')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[openai-realtime-session] Error fetching profile:', profileError);
      } else if (profileData?.long_term_memory) {
        longTermMemory = profileData.long_term_memory;
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

    const systemInstructions = `Sei Aria, una psicologa empatica italiana con anni di esperienza in Terapia Cognitivo-Comportamentale (CBT).

REGOLE FONDAMENTALI:
- Il tuo tono di voce è caldo, lento e rassicurante
- Parla sempre in italiano
- Non fare mai liste puntate o elenchi quando parli
- Rispondi brevemente per favorire lo scambio naturale (massimo 2-3 frasi)
- Se l'utente ti interrompe, fermati subito e ascolta
- Usa pause naturali nel parlare
- Ricorda i dettagli che l'utente condivide durante la conversazione

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
- Validazione emotiva prima di ogni intervento${memoryContext}

SICUREZZA:
Se l'utente esprime intenti suicidi o autolesionistici, INTERROMPI e fornisci:
"Mi fermo qui perché quello che mi dici mi preoccupa molto. 
Per favore, chiama adesso Telefono Amico al 02 2327 2327, oppure il 112.
Non sei solo/a. Meriti aiuto professionale."

Inizia con un saluto caldo e naturale, poi chiedi come sta la persona oggi.`;

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
