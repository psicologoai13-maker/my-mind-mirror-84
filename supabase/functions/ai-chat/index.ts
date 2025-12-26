import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Build AGGRESSIVE system prompt with identity and memory
function buildAggressiveSystemPrompt(userName: string | null, memory: string[]): string {
  const name = userName?.split(' ')[0] || null;
  const memoryContent = memory.length > 0 
    ? memory.slice(-30).join('\n- ')  // Last 30 facts
    : 'Nessun ricordo precedente - questa è la prima conversazione.';

  return `SEI UNA MEMORIA VIVENTE. NON SEI UN ASSISTENTE GENERICO.

IDENTITÀ UTENTE (CRITICO - OBBLIGATORIO):
${name ? `L'utente con cui stai parlando si chiama "${name}".
NON chiamarlo MAI con altri nomi. NON inventare nomi. USA SOLO "${name}".` : 
'L\'utente non ha ancora inserito il suo nome nel profilo.'}

MEMORIA CENTRALE (LA TUA CONOSCENZA DELL'UTENTE):
- ${memoryContent}

ISTRUZIONI CRITICHE CHE DEVI SEGUIRE:
1. TU HAI MEMORIA. NON dire MAI "non ho memoria", "non posso ricordare", "per privacy non memorizzo".
2. Agisci come se conoscessi l'utente da anni. Usa le informazioni sopra per personalizzare OGNI risposta.
3. Se la memoria dice qualcosa (es. "si è lasciato con la ragazza"), e lui dice "sono triste", TU SAI GIÀ PERCHÉ.
4. Fai riferimenti NATURALI al passato: "Come sta andando la situazione con [tema dalla memoria]?"
5. Se non hai memoria specifica su un tema, chiedi gentilmente - ma NON dire che non puoi memorizzare.

RUOLO:
Sei "Psicologo AI", un compagno di supporto mentale empatico, basato sulla Terapia Cognitivo-Comportamentale (CBT).

STILE:
- Empatico e validante: Riconosci sempre i sentimenti ("Capisco che sia stata dura...")
- Conciso ma caldo: Risposte brevi per favorire il dialogo
- Maieutico: Poni domande aperte ("Cosa pensi abbia scatenato questa reazione?")

SICUREZZA (CRITICO):
Se l'utente esprime intenti suicidi o autolesionismo, INTERROMPI e fornisci:
"Mi preoccupo per te. Meriti supporto professionale immediato.
- Telefono Amico: 02 2327 2327
- Telefono Azzurro: 19696
- Emergenze: 112
Non sei solo/a."

COMPORTAMENTO:
${name ? `- Usa "${name}" quando ti rivolgi all'utente` : '- Chiedi il nome all\'utente se appropriato'}
- Fai una domanda alla volta
- Valida le emozioni prima di proporre soluzioni
- Se conosci il contesto dalla memoria, usalo nelle risposte`;
}

// User profile data structure
interface UserProfile {
  name: string | null;
  long_term_memory: string[];
}

// Helper to get user's profile and memory from database
async function getUserProfile(authHeader: string | null): Promise<UserProfile> {
  const defaultProfile: UserProfile = { name: null, long_term_memory: [] };
  
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
      .select('long_term_memory, name')
      .eq('user_id', user.id)
      .single();
    
    if (profileError) {
      console.log('[ai-chat] Failed to get profile:', profileError.message);
      return defaultProfile;
    }
    
    const result = {
      name: profile?.name || null,
      long_term_memory: profile?.long_term_memory || []
    };
    
    console.log(`[ai-chat] Profile loaded: name="${result.name}", memory_facts=${result.long_term_memory.length}`);
    
    return result;
  } catch (error) {
    console.error("[ai-chat] Error fetching user profile:", error);
    return defaultProfile;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, generateSummary, userId } = await req.json();
    const authHeader = req.headers.get("Authorization");
    
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

    // Build AGGRESSIVE system prompt with user's identity and memory
    const systemPrompt = buildAggressiveSystemPrompt(userProfile.name, userProfile.long_term_memory);
    
    console.log(`[ai-chat] System prompt built for: ${userProfile.name || 'Anonymous'}, memory facts: ${userProfile.long_term_memory.length}`);

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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
