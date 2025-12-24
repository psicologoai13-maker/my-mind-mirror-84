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

    const systemInstructions = `Sei uno psicologo empatico italiano. Il tuo nome è "Aria".

REGOLE FONDAMENTALI:
- Il tuo tono di voce è caldo, lento e rassicurante
- Parla sempre in italiano
- Non fare mai liste puntate o elenchi
- Rispondi brevemente per favorire lo scambio naturale
- Se l'utente ti interrompe, fermati subito e ascolta
- Fai domande aperte per capire meglio come si sente
- Mostra empatia genuina e comprensione
- Non dare consigli non richiesti, prima ascolta
- Usa pause naturali nel parlare
- Ricorda i dettagli che l'utente condivide durante la conversazione${memoryContext}

Inizia sempre con un saluto caldo e chiedi come sta la persona oggi.`;

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
