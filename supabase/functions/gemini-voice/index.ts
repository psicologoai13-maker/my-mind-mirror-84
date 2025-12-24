import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

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
- Inizia accogliendo l'utente con calore e chiedendo come sta
- Fai una domanda alla volta
- Valida le emozioni prima di proporre soluzioni
- Usa tecniche CBT: identificazione pensieri automatici, ristrutturazione cognitiva
- Rispondi in italiano
- Mantieni le risposte brevi e conversazionali per il formato vocale`;

// Models to try in order
const MODELS = [
  "models/gemini-2.0-flash-live-001",
  "models/gemini-2.0-flash-exp"
];

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (upgradeHeader.toLowerCase() === "websocket") {
    if (!GOOGLE_API_KEY) {
      console.error("GOOGLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
      
      let geminiSocket: WebSocket | null = null;
      let currentModelIndex = 0;
      let setupComplete = false;
      
      const connectToGemini = (modelIndex: number) => {
        const model = MODELS[modelIndex];
        console.log(`Attempting connection with model: ${model}`);
        
        const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GOOGLE_API_KEY}`;
        console.log("Connecting to Gemini...");
        
        geminiSocket = new WebSocket(geminiUrl);
        
        geminiSocket.onopen = () => {
          console.log("Connected to Gemini API, sending setup...");
          
          // Send setup with current model - audio at 24kHz PCM16
          const setupMessage = {
            setup: {
              model: model,
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: "Kore" // Clear Italian-friendly voice
                    }
                  }
                }
              },
              systemInstruction: {
                parts: [{ text: SYSTEM_PROMPT }]
              }
            }
          };
          
          geminiSocket!.send(JSON.stringify(setupMessage));
          console.log("Setup message sent with model:", model);
        };
        
        geminiSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Check for setup completion
            if (data.setupComplete) {
              setupComplete = true;
              console.log("Gemini setup complete!");
              if (clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.send(JSON.stringify({ setupComplete: true, model: model }));
              }
              return;
            }
            
            // Check for model not found error - try fallback
            if (data.error && !setupComplete && currentModelIndex < MODELS.length - 1) {
              console.log("Model error, trying fallback...", data.error);
              currentModelIndex++;
              geminiSocket?.close();
              connectToGemini(currentModelIndex);
              return;
            }
            
            // Forward all other messages to client
            if (clientSocket.readyState === WebSocket.OPEN) {
              clientSocket.send(event.data);
            }
          } catch {
            // Non-JSON message, forward as-is
            if (clientSocket.readyState === WebSocket.OPEN) {
              clientSocket.send(event.data);
            }
          }
        };
        
        geminiSocket.onerror = (error) => {
          console.error("Gemini socket error:", error);
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({ 
              type: "error", 
              message: "Errore connessione al servizio AI" 
            }));
          }
        };
        
        geminiSocket.onclose = (event) => {
          console.log("Gemini closed:", event.code, event.reason);
          
          // Try fallback model if setup wasn't complete
          if (!setupComplete && currentModelIndex < MODELS.length - 1) {
            console.log("Trying fallback model...");
            currentModelIndex++;
            connectToGemini(currentModelIndex);
            return;
          }
          
          if (clientSocket.readyState === WebSocket.OPEN) {
            let errorMessage = event.reason || `Connessione chiusa (${event.code})`;
            
            if (event.reason?.includes('quota') || event.code === 429) {
              errorMessage = 'Quota API esaurita. Riprova più tardi.';
            } else if (event.code === 1006) {
              errorMessage = 'Connessione persa. Verifica la rete.';
            } else if (event.code === 1008 || event.code === 401) {
              errorMessage = 'API Key non valida.';
            } else if (event.code === 400) {
              errorMessage = 'Modello non disponibile.';
            }
            
            clientSocket.send(JSON.stringify({ 
              type: "error", 
              code: event.code,
              message: errorMessage
            }));
          }
        };
      };
      
      clientSocket.onopen = () => {
        console.log("Client connected, establishing Gemini connection...");
        connectToGemini(currentModelIndex);
      };
      
      clientSocket.onmessage = (event) => {
        if (geminiSocket && geminiSocket.readyState === WebSocket.OPEN) {
          geminiSocket.send(event.data);
        }
      };
      
      clientSocket.onerror = (error) => {
        console.error("Client socket error:", error);
      };
      
      clientSocket.onclose = () => {
        console.log("Client disconnected");
        geminiSocket?.close();
      };
      
      return response;
    } catch (error) {
      console.error("WebSocket upgrade error:", error);
      return new Response(JSON.stringify({ error: "WebSocket upgrade failed" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(
    JSON.stringify({ 
      message: "Gemini Voice API",
      status: GOOGLE_API_KEY ? "configured" : "missing_api_key"
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
