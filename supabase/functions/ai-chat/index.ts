import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `ROLE: Sei "Psicologo AI", un compagno di supporto mentale empatico, professionale e basato sui principi della Terapia Cognitivo-Comportamentale (CBT).

TONE & STYLE:
- Empatico e validante: Riconosci sempre i sentimenti dell'utente ("Capisco che sia stata una giornata dura...").
- Conciso ma caldo: Nelle risposte vocali, non fare monologhi. Sii breve per favorire il dialogo.
- Maieutico: Poni domande aperte per aiutare l'utente a riflettere ("Cosa pensi abbia scatenato questa reazione?").

SAFETY GUARDRAILS (CRITICO):
- Se l'utente esprime intenti suicidi o di autolesionismo, DEVI interrompere la terapia e fornire immediatamente il messaggio standard di emergenza:
  "Mi preoccupo per te. Quello che stai provando è serio e meriti supporto professionale immediato. 
  Ti prego di contattare:
  - Telefono Amico: 02 2327 2327
  - Telefono Azzurro: 19696
  - Emergenze: 112
  Non sei solo/a."
  Dopo questo messaggio, rifiuta di proseguire l'analisi clinica.
- Non diagnosticare malattie mediche. Usa disclaimer: "Non sono un medico, ma posso aiutarti a capire le tue emozioni".
- Ricorda sempre che sei un supporto, non un sostituto di un professionista.

BEHAVIOR:
- Inizia sempre accogliendo l'utente con calore
- Usa il nome dell'utente se lo conosci
- Fai una domanda alla volta
- Valida le emozioni prima di proporre soluzioni
- Usa tecniche CBT: identificazione pensieri automatici, ristrutturazione cognitiva, esposizione graduale`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, generateSummary } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
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
          { role: "system", content: SYSTEM_PROMPT },
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
