import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Gemini 2.5 Flash Native Audio - optimized for real-time voice
const MODEL = "models/gemini-2.5-flash-preview-native-audio-dialog";

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
      // Extract user_id from query params if provided
      const url = new URL(req.url);
      const userId = url.searchParams.get('user_id');
      
      // Fetch user memory if userId provided
      let longTermMemory: string[] = [];
      let userName: string | null = null;
      let lifeAreasScores: Record<string, number | null> = {};
      
      if (userId) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('long_term_memory, name, life_areas_scores')
          .eq('user_id', userId)
          .maybeSingle();

        if (!profileError && profileData) {
          longTermMemory = profileData.long_term_memory || [];
          userName = profileData.name || null;
          lifeAreasScores = (profileData.life_areas_scores as Record<string, number | null>) || {};
          console.log('[gemini-voice] Loaded', longTermMemory.length, 'memory items for user');
        }
      }

      // Build memory context
      let memoryContext = '';
      if (longTermMemory.length > 0) {
        memoryContext = `\n\nMEMORIA DELLE SESSIONI PRECEDENTI:
Ricorda questi fatti importanti sull'utente:
${longTermMemory.map(fact => `- ${fact}`).join('\n')}

Usa questa memoria per personalizzare la conversazione.`;
      }

      // Data hunter instruction
      const allAreas = ['love', 'work', 'friendship', 'energy', 'growth'];
      const missingAreas: string[] = [];
      for (const area of allAreas) {
        const score = lifeAreasScores[area];
        if (score === null || score === undefined || score === 0) {
          missingAreas.push(area);
        }
      }

      let dataHunterInstruction = '';
      if (missingAreas.length > 0) {
        const areaLabels: Record<string, string> = {
          love: 'Amore e relazioni',
          work: 'Lavoro e carriera',
          friendship: 'Amicizie e vita sociale',
          energy: 'Salute e energia fisica',
          growth: 'Crescita personale'
        };
        const missingLabels = missingAreas.map(a => areaLabels[a] || a).join(', ');
        
        dataHunterInstruction = `\n\nMISSIONE CACCIATORE DI DATI:
Non hai dati recenti su: ${missingLabels}.
Durante la conversazione, inserisci NATURALMENTE una domanda su UNA di queste aree.
Non chiedere tutto insieme. Scegli un'area alla volta.`;
      }

      // Deep Psychology Investigation
      const deepPsychology = `

═══════════════════════════════════════════════
🔬 INVESTIGAZIONE PSICOLOGICA PROFONDA (VOCALE)
═══════════════════════════════════════════════

Mentre ascolti, INVESTIGA NATURALMENTE queste aree con domande brevi:

**COGNITIVI:**
- Se l'utente ripete un tema: "Questo pensiero ti torna spesso?"
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

      const SYSTEM_PROMPT = `ROLE: Sei "Aria", una psicologa empatica italiana con esperienza in Terapia Cognitivo-Comportamentale (CBT).

TONE & STYLE:
- Empatico e validante: Riconosci sempre i sentimenti dell'utente.
- Conciso ma profondo: Nelle risposte vocali, sii breve (2-3 frasi) ma incisivo.
- Maieutico: Poni domande aperte per aiutare l'utente a riflettere.
- Voce calda, lenta e rassicurante.

IL TUO COMPORTAMENTO:

1. FASE DI ASCOLTO:
   Se l'utente sta raccontando, usa feedback brevi:
   "Ti ascolto...", "Capisco...", "Mmm..."
   Non interrompere. Lascia che si esprima.

2. FASE DI INTERVENTO:
   Quando ha finito, AGGIUNGI VALORE:
   - Offri una PROSPETTIVA NUOVA: "Hai considerato che forse...?"
   - Dai un CONSIGLIO PRATICO: "Prova a respirare. Cosa senti ora?"
   - Fai una DOMANDA PROFONDA: "Cosa ti dice questa emozione?"
   - Proponi un ESERCIZIO: "Chiudi gli occhi. Dove senti la tensione?"

3. REGOLA D'ORO:
   Non riassumere ciò che ha detto - aggiungi sempre qualcosa di nuovo.

TECNICHE CBT:
- Identificazione distorsioni cognitive
- Socratic questioning per insight
- Grounding sensoriale per ansia
- Validazione emotiva prima di intervenire

SAFETY GUARDRAILS:
Se l'utente esprime intenti suicidi o autolesionismo:
"Mi fermo qui perché mi preoccupo per te. Per favore chiama Telefono Amico al 02 2327 2327, oppure il 112. Non sei solo/a."${memoryContext}${dataHunterInstruction}${deepPsychology}

${userName ? `Il nome dell'utente è "${userName.split(' ')[0]}". Usalo con naturalezza.` : ''}

Inizia con un saluto caldo e naturale, poi chiedi come sta oggi.`;

      const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
      
      let geminiSocket: WebSocket | null = null;
      let setupComplete = false;
      
      clientSocket.onopen = () => {
        console.log("[gemini-voice] Client connected, connecting to Gemini 2.5 Flash Native Audio...");
        
        const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GOOGLE_API_KEY}`;
        
        geminiSocket = new WebSocket(geminiUrl);
        
        geminiSocket.onopen = () => {
          console.log("[gemini-voice] Connected to Gemini, sending setup with model:", MODEL);
          
          const setupMessage = {
            setup: {
              model: MODEL,
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: "Aoede" // Warm, empathetic female voice
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
          console.log("[gemini-voice] Setup message sent");
        };
        
        geminiSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Check for setup completion
            if (data.setupComplete) {
              setupComplete = true;
              console.log("[gemini-voice] Gemini setup complete!");
              if (clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.send(JSON.stringify({ type: 'setup_complete', model: MODEL }));
              }
              return;
            }
            
            // Forward all messages to client
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
          console.error("[gemini-voice] Gemini socket error:", error);
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({ 
              type: "error", 
              code: "GEMINI_ERROR",
              message: "Errore connessione Gemini API" 
            }));
          }
        };
        
        geminiSocket.onclose = (event) => {
          console.log("[gemini-voice] Gemini closed - code:", event.code, "reason:", event.reason);
          
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
        console.error("[gemini-voice] Client socket error:", error);
      };
      
      clientSocket.onclose = () => {
        console.log("[gemini-voice] Client disconnected");
        geminiSocket?.close();
      };
      
      return response;
    } catch (error) {
      console.error("[gemini-voice] WebSocket upgrade error:", error);
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
