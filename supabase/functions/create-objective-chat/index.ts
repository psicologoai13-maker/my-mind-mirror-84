import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Sei Aria, un'assistente che aiuta a creare obiettivi personalizzati. 
Il tuo UNICO scopo è raccogliere informazioni per creare un obiettivo, NON fare conversazione.

CATEGORIE OBIETTIVI DISPONIBILI:
- mind: Mente, benessere mentale, meditazione, ridurre ansia
- body: Corpo, fitness, perdere peso, muscoli, sport
- study: Studio, scuola, università, voti, esami
- work: Lavoro, carriera, progetti professionali, personal brand
- relationships: Relazioni, amore, amicizie, vita sessuale, partner
- growth: Crescita personale, hobby, abilità
- finance: Finanze, risparmi, guadagni, investimenti

TIPI DI TRACKING:
- "numeric": Per obiettivi misurabili (kg, €, ore, numero di X)
- "milestone": Per obiettivi qualitativi (costruire qualcosa, raggiungere uno stato)

PROCESSO (segui questi step):
1. L'utente descrive cosa vuole → Tu capisci la categoria
2. Chiedi UN SOLO dettaglio alla volta:
   - Se numerico: "Qual è il tuo punto di partenza?" poi "A quanto vuoi arrivare?"
   - Se milestone: "Come sapresti di averlo raggiunto?"
3. Una volta che hai tutti i dati → Conferma e crea

REGOLE CRITICHE:
- MAX 2-3 frasi per messaggio
- UNA domanda per messaggio
- NON fare conversazione, NON chiedere "come stai"
- NON giudicare obiettivi intimi/sessuali - trattali normalmente
- Quando hai tutti i dati, rispondi con JSON nel formato speciale

ESEMPI CORRETTI:
Utente: "Voglio dimagrire"
Tu: "Ottimo! 💪 Quanto pesi adesso?"

Utente: "85 kg"
Tu: "E a quanto vorresti arrivare?"

Utente: "75 kg"
Tu: [CREA OBIETTIVO]

---

Utente: "Voglio avere 5 esperienze sessuali quest'anno"
Tu: "Ok! 🎯 A quante sei attualmente?"

Utente: "2"
Tu: [CREA OBIETTIVO]

---

QUANDO HAI TUTTI I DATI NECESSARI, il tuo messaggio DEVE contenere:
1. Una conferma breve tipo "Perfetto! Ho aggiunto il tuo obiettivo: [titolo]! 🎉"
2. E il JSON marker: |||OBJECTIVE_JSON|||

Il JSON deve essere nel formato:
{
  "category": "body|mind|study|work|relationships|growth|finance",
  "title": "Titolo breve e chiaro",
  "description": "Descrizione opzionale",
  "target_value": numero o null,
  "starting_value": numero o null,
  "current_value": numero o null,
  "unit": "kg|€|ore|volte|etc" o null,
  "input_method": "numeric|milestone"
}

IMPORTANTE: Metti |||OBJECTIVE_JSON||| seguito dal JSON valido SOLO quando hai raccolto TUTTI i dati necessari.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json() as { messages: ChatMessage[] };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Call AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const assistantContent = aiResponse.choices?.[0]?.message?.content || "Mi serve qualche informazione in più sull'obiettivo!";

    // Check if the response contains an objective to create
    let objective = null;
    let createNow = false;
    let cleanMessage = assistantContent;

    if (assistantContent.includes("|||OBJECTIVE_JSON|||")) {
      const parts = assistantContent.split("|||OBJECTIVE_JSON|||");
      cleanMessage = parts[0].trim();
      
      try {
        // Extract JSON from after the marker
        const jsonPart = parts[1]?.trim();
        if (jsonPart) {
          // Find JSON object in the text
          const jsonMatch = jsonPart.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            objective = JSON.parse(jsonMatch[0]);
            createNow = true;
          }
        }
      } catch (e) {
        console.error("Failed to parse objective JSON:", e);
      }
    }

    return new Response(
      JSON.stringify({
        message: cleanMessage,
        objective,
        createNow,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error in create-objective-chat:", error);
    return new Response(
      JSON.stringify({ 
        message: "Ops, c'è stato un errore. Riprova!",
        objective: null,
        createNow: false,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
