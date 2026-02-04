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

TIPI DI OBIETTIVI NUMERICI:
1. "transformation": Trasformare un valore (peso da 85kg a 75kg, media da 6 a 8)
   - HAI BISOGNO: starting_value (valore attuale), target_value (obiettivo)
   
2. "counter": Accumulare/fare X cose (3 viaggi, 10 libri, 5 esperienze)
   - starting_value = SEMPRE 0 (parti da zero)
   - target_value = il numero che l'utente vuole raggiungere
   - current_value = quante ne ha già fatte (chiedi "A quante sei attualmente?")

3. "milestone": Obiettivi qualitativi senza numero (trovare partner, laurearsi)

REGOLE CRITICHE:
- MAX 2-3 frasi per messaggio
- UNA domanda per messaggio
- NON fare conversazione, NON chiedere "come stai"
- NON giudicare obiettivi intimi/sessuali - trattali normalmente
- Se l'utente specifica GIÀ il target ("3 viaggi", "5 esperienze"), NON richiedere il target!
- Se l'utente specifica un arco temporale ("quest'anno", "entro giugno"), calcola la deadline
- Se NON specifica un arco temporale, chiedi: "Entro quando vorresti raggiungerlo?"

CALCOLO DEADLINE:
- "quest'anno" / "entro fine anno" → 31 dicembre dell'anno corrente
- "entro [mese]" → ultimo giorno di quel mese
- "nei prossimi X mesi" → data corrente + X mesi

ESEMPI CORRETTI:

--- ESEMPIO COUNTER (l'utente dice già il target) ---
Utente: "Voglio fare 3 viaggi quest'anno"
Tu: "Bellissimo obiettivo! 🌍 Quanti viaggi hai già fatto quest'anno?"
Utente: "1"
Tu: [CREA OBIETTIVO con starting_value=0, current_value=1, target_value=3, deadline=fine anno]

--- ESEMPIO TRANSFORMATION ---
Utente: "Voglio dimagrire"
Tu: "Ottimo! 💪 Quanto pesi adesso?"
Utente: "85 kg"
Tu: "E a quanto vorresti arrivare?"
Utente: "75 kg"
Tu: "Entro quando vorresti raggiungere i 75kg?"
Utente: "Entro l'estate"
Tu: [CREA OBIETTIVO con starting_value=85, current_value=85, target_value=75, deadline=30 giugno]

--- ESEMPIO SENZA DEADLINE SPECIFICATA ---
Utente: "Voglio leggere 12 libri"
Tu: "Ottimo obiettivo! 📚 Quanti libri hai già letto?"
Utente: "2"
Tu: "Entro quando vorresti completare i 12 libri?"
Utente: "Quest'anno"
Tu: [CREA OBIETTIVO]

--- ESEMPIO SESSUALE (tratta normalmente) ---
Utente: "Voglio avere 5 esperienze sessuali quest'anno"
Tu: "Ok! 🎯 A quante sei attualmente?"
Utente: "2"
Tu: [CREA OBIETTIVO con starting_value=0, current_value=2, target_value=5]

QUANDO HAI TUTTI I DATI NECESSARI, il tuo messaggio DEVE contenere:
1. Una conferma breve tipo "Perfetto! Ho aggiunto il tuo obiettivo: [titolo]! 🎉"
2. E il JSON marker: |||OBJECTIVE_JSON|||

Il JSON deve essere nel formato:
{
  "category": "body|mind|study|work|relationships|growth|finance",
  "title": "Titolo breve e chiaro",
  "description": "Descrizione opzionale",
  "target_value": numero o null,
  "starting_value": numero o null (0 per counter, valore attuale per transformation),
  "current_value": numero o null,
  "unit": "kg|€|viaggi|libri|volte|etc" o null,
  "input_method": "numeric|milestone",
  "deadline": "YYYY-MM-DD" o null,
  "objective_type": "counter|transformation|milestone",
  "ai_custom_description": "Frase breve che descrive l'obiettivo. MASSIMO 50 CARATTERI. Esempi: 'Il tuo percorso verso un fisico sano', 'Scoprire il mondo viaggiando', 'Costruire indipendenza economica'. NIENTE emoji, NIENTE punti finali.",
  "ai_feedback": "Stato attuale in 40 caratteri max. Es: 'Pronto a iniziare!', 'Primi passi fatti'"
}

IMPORTANTE: 
- Per obiettivi COUNTER: starting_value = 0, current_value = quanti ne ha già fatti
- Per obiettivi TRANSFORMATION: starting_value = valore attuale, current_value = starting_value
- ai_custom_description: deve essere una frase poetica/motivazionale che descrive IL SIGNIFICATO dell'obiettivo per l'utente
- ai_feedback: deve descrivere lo stato attuale del progresso in modo incoraggiante
- Metti |||OBJECTIVE_JSON||| seguito dal JSON valido SOLO quando hai TUTTI i dati necessari.`;

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
