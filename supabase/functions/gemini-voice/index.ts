import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

// Use ONLY the stable model
const MODEL = "models/gemini-2.0-flash-exp";

const SYSTEM_PROMPT = `ROLE: Sei "Psicologo AI", un compagno di supporto mentale empatico, professionale e basato sui principi della Terapia Cognitivo-Comportamentale (CBT).

TONE & STYLE:
- Empatico e validante: Riconosci sempre i sentimenti dell'utente.
- Conciso ma caldo: Nelle risposte vocali, non fare monologhi. Sii breve (2-3 frasi).
- Maieutico: Poni domande aperte per aiutare l'utente a riflettere.

SAFETY GUARDRAILS:
- Se l'utente esprime intenti suicidi o di autolesionismo, fornisci immediatamente:
  "Mi preoccupo per te. Ti prego di contattare: Telefono Amico: 02 2327 2327, Emergenze: 112. Non sei solo/a."
- Non diagnosticare malattie mediche.
- Ricorda che sei un supporto, non un sostituto di un professionista.

BEHAVIOR:
- Inizia accogliendo l'utente con calore
- Fai una domanda alla volta
- Valida le emozioni prima di proporre soluzioni
- Rispondi in italiano
- Mantieni le risposte brevi per il formato vocale

═══════════════════════════════════════════════
🔬 INVESTIGAZIONE PSICOLOGICA PROFONDA (VOCALE)
═══════════════════════════════════════════════

Durante la conversazione, INVESTIGA NATURALMENTE queste aree con domande brevi:

**COGNITIVI:**
- Se l'utente ripete un tema: "Questo pensiero ti torna spesso in mente?"
- Autoefficacia: "Ti senti capace di affrontarlo?"
- Chiarezza: "Hai le idee chiare?"

**STRESS & COPING:**
- Burnout: "Ti senti svuotato ultimamente?"
- Gestione: "Come stai reggendo tutto questo?"
- Solitudine: "Ti senti supportato?"

**FISIOLOGICI:**
- Tensione: "Senti tensione da qualche parte nel corpo?"
- Appetito: "Come sta andando con il cibo?"
- Aria aperta: "Riesci a uscire un po'?"

**EMOTIVI:**
- Colpa: "Sento che porti un peso..."
- Gratitudine: "C'è qualcosa di positivo oggi?"
- Irritabilità: "Ti senti più nervoso del solito?"

⚠️ REGOLA VOCALE: UNA micro-domanda investigativa ogni 2-3 scambi.
Breve e naturale. MAI interrogatori.`;

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
      let setupComplete = false;
      
      clientSocket.onopen = () => {
        console.log("Client connected, connecting to Gemini...");
        
        const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GOOGLE_API_KEY}`;
        console.log("Connecting to:", geminiUrl.replace(GOOGLE_API_KEY!, '[KEY]'));
        
        geminiSocket = new WebSocket(geminiUrl);
        
        geminiSocket.onopen = () => {
          console.log("Connected to Gemini, sending setup with model:", MODEL);
          
          const setupMessage = {
            setup: {
              model: MODEL,
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: "Aoede"
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
          console.log("Setup sent");
        };
        
        geminiSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Check for setup completion
            if (data.setupComplete) {
              setupComplete = true;
              console.log("Gemini setup complete!");
              if (clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.send(JSON.stringify({ setupComplete: true, model: MODEL }));
              }
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
              code: "GEMINI_ERROR",
              message: "Errore connessione Gemini API" 
            }));
          }
        };
        
        geminiSocket.onclose = (event) => {
          console.log("Gemini closed - code:", event.code, "reason:", event.reason);
          
          if (clientSocket.readyState === WebSocket.OPEN) {
            let errorMessage = `Connessione chiusa (code: ${event.code})`;
            
            if (event.code === 1000) {
              errorMessage = 'Sessione terminata';
            } else if (event.code === 1006) {
              errorMessage = 'Connessione persa. Verifica la rete.';
            } else if (event.code === 1008 || event.code === 401 || event.code === 403) {
              errorMessage = 'API Key non valida o scaduta.';
            } else if (event.code === 400 || event.reason?.includes('model')) {
              errorMessage = `Modello non trovato: ${MODEL}`;
            } else if (event.code === 429 || event.reason?.includes('quota')) {
              errorMessage = 'Quota API esaurita. Riprova più tardi.';
            } else if (event.reason) {
              errorMessage = event.reason;
            }
            
            clientSocket.send(JSON.stringify({ 
              type: "error", 
              code: event.code,
              message: errorMessage
            }));
          }
        };
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
      model: MODEL,
      status: GOOGLE_API_KEY ? "configured" : "missing_api_key"
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});