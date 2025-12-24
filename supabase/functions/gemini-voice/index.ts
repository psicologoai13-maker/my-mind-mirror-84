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

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if it's a WebSocket upgrade request
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
      
      clientSocket.onopen = () => {
        console.log("Client connected, establishing Gemini connection...");
        
        // Connect to Gemini Multimodal Live API
        const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GOOGLE_API_KEY}`;
        
        geminiSocket = new WebSocket(geminiUrl);
        
        geminiSocket.onopen = () => {
          console.log("Connected to Gemini API");
          
          // Send setup message with system instruction
          const setupMessage = {
            setup: {
              model: "models/gemini-2.0-flash-exp",
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: "Aoede" // Female Italian-friendly voice
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
          console.log("Sent setup message to Gemini");
        };
        
        geminiSocket.onmessage = (event) => {
          // Forward Gemini responses to client
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(event.data);
          }
        };
        
        geminiSocket.onerror = (error) => {
          console.error("Gemini socket error:", error);
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({ 
              type: "error", 
              message: "Connection to AI service failed" 
            }));
          }
        };
        
        geminiSocket.onclose = (event) => {
          console.log("Gemini connection closed:", event.code, event.reason);
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({ 
              type: "gemini_closed", 
              code: event.code 
            }));
          }
        };
      };
      
      clientSocket.onmessage = (event) => {
        // Forward client messages to Gemini
        if (geminiSocket && geminiSocket.readyState === WebSocket.OPEN) {
          geminiSocket.send(event.data);
        }
      };
      
      clientSocket.onerror = (error) => {
        console.error("Client socket error:", error);
      };
      
      clientSocket.onclose = () => {
        console.log("Client disconnected");
        if (geminiSocket) {
          geminiSocket.close();
        }
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

  // Non-WebSocket request - return API info
  return new Response(
    JSON.stringify({ 
      message: "Gemini Voice API - Use WebSocket connection",
      status: GOOGLE_API_KEY ? "configured" : "missing_api_key"
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
