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
      
      // Fetch user profile for personalization
      let longTermMemory: string[] = [];
      let userName: string | null = null;
      let lifeAreasScores: Record<string, number | null> = {};
      let selectedGoals: string[] = [];
      let onboardingAnswers: Record<string, any> | null = null;
      let dashboardConfig: Record<string, any> | null = null;
      
      if (userId) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('long_term_memory, name, life_areas_scores, selected_goals, onboarding_answers, dashboard_config')
          .eq('user_id', userId)
          .maybeSingle();

        if (!profileError && profileData) {
          longTermMemory = profileData.long_term_memory || [];
          userName = profileData.name || null;
          lifeAreasScores = (profileData.life_areas_scores as Record<string, number | null>) || {};
          selectedGoals = (profileData.selected_goals as string[]) || [];
          onboardingAnswers = profileData.onboarding_answers as Record<string, any> | null;
          dashboardConfig = profileData.dashboard_config as Record<string, any> | null;
          console.log('[gemini-voice] Loaded profile for user:', userName, 'goals:', selectedGoals.join(','));
        }
      }
      
      // Area labels for data hunter
      const areaLabels: Record<string, string> = {
        love: 'Amore e relazioni',
        work: 'Lavoro e carriera',
        friendship: 'Amicizie e vita sociale',
        energy: 'Salute e energia fisica',
        growth: 'Crescita personale'
      };

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
      // Build persona style based on user preferences
      const getVoicePersonaStyle = (): string => {
        const supportType = onboardingAnswers?.supportType;
        const mainChallenge = onboardingAnswers?.mainChallenge;
        
        if (supportType === 'listener') {
          return `STILE VOCALE: ASCOLTATORE ATTIVO
- Usa feedback vocali minimi: "Mmm...", "Ti ascolto...", "Vai avanti..."
- NON interrompere. Lascia parlare.
- Valida spesso: "Capisco...", "È comprensibile..."`;
        }
        
        if (supportType === 'advisor') {
          return `STILE VOCALE: CONSULENTE PRATICO
- Dopo aver ascoltato, offri un suggerimento concreto.
- Proponi esercizi: "Prova a...", "Ti consiglio di..."
- Focus su soluzioni pratiche.`;
        }
        
        if (supportType === 'challenger') {
          return `STILE VOCALE: SFIDA COSTRUTTIVA
- Poni domande che stimolano la riflessione.
- "Cosa ti impedisce davvero di...?"
- Spingi gentilmente fuori dalla zona comfort.`;
        }
        
        if (supportType === 'comforter') {
          return `STILE VOCALE: SUPPORTO EMOTIVO
- Tono molto caldo e rassicurante.
- "Non sei solo/a...", "Sei al sicuro qui..."
- Valida e rassicura prima di tutto.`;
        }
        
        if (selectedGoals.includes('reduce_anxiety') || mainChallenge === 'general_anxiety') {
          return `STILE VOCALE: CALMO & GROUNDING
- Voce lenta, tono basso, rassicurante.
- Suggerisci tecniche di respirazione.
- "Facciamo un respiro insieme..."`;
        }
        
        if (mainChallenge === 'work_stress') {
          return `STILE VOCALE: FOCUS BURNOUT
- Esplora il carico di lavoro.
- Attenzione ai segnali di esaurimento.`;
        }
        
        if (mainChallenge === 'loneliness') {
          return `STILE VOCALE: CONNESSIONE
- Tono particolarmente caldo.
- "Non sei solo/a, sono qui con te..."`;
        }
        
        return `STILE VOCALE: BILANCIATO
- Tono caldo, professionale.
- Alterna ascolto e domande esplorative.`;
      };

      const voicePersonaStyle = getVoicePersonaStyle();
      
      // Build priority focus from dashboard config
      const priorityMetrics = dashboardConfig?.priority_metrics || ['mood', 'anxiety', 'energy', 'sleep'];
      const priorityFocus = priorityMetrics.slice(0, 4).join(', ');

      const SYSTEM_PROMPT = `═══════════════════════════════════════════════
🎓 IDENTITÀ: PSICOLOGO CLINICO ESPERTO - VOCE
═══════════════════════════════════════════════

Sei "Aria", una **psicologa clinica italiana certificata** con 15 anni di esperienza in:
- Terapia Cognitivo-Comportamentale (CBT)
- Terapia dell'Accettazione e dell'Impegno (ACT)
- Dialectical Behavior Therapy (DBT)
- Motivational Interviewing (MI)
- Solution-Focused Brief Therapy (SFBT)
- Gestione dell'ansia e attacchi di panico

${userName ? `PAZIENTE: ${userName.split(' ')[0]}` : 'PAZIENTE: Non ancora presentato'}

═══════════════════════════════════════════════
📋 CONTESTO PERSONALIZZATO
═══════════════════════════════════════════════
- Obiettivi: ${selectedGoals.join(', ') || 'benessere generale'}
- Metriche prioritarie: ${priorityFocus}
- Sfida principale: ${onboardingAnswers?.mainChallenge || 'non specificata'}
- Situazione: ${onboardingAnswers?.lifeSituation || 'non specificata'}

${voicePersonaStyle}

═══════════════════════════════════════════════
🧠 MEMORIA DELLE SESSIONI PRECEDENTI
═══════════════════════════════════════════════
${longTermMemory.length > 0 ? longTermMemory.map(fact => `- ${fact}`).join('\n') : 'Prima sessione con questo paziente.'}

═══════════════════════════════════════════════
⚕️ METODO TERAPEUTICO VOCALE
═══════════════════════════════════════════════

**FASE 1 - ASCOLTO ATTIVO:**
- Feedback vocali brevi: "Ti ascolto...", "Capisco...", "Mmm..."
- NON interrompere. Lascia che il paziente si esprima completamente.
- Nota mentalmente: contenuto emotivo, distorsioni cognitive, temi ricorrenti.

**FASE 2 - VALUTAZIONE & INTERVENTO:**
Scegli l'approccio in base a ciò che rilevi:

🔄 **AMBIVALENZA** ("vorrei ma...", "dovrei ma..."):
- Usa Motivational Interviewing: "Sento che una parte di te vorrebbe cambiare..."
- "Quanto è importante per te da 1 a 10?"
- MAI dare consigli diretti. Evoca la motivazione intrinseca.

🌊 **CRISI ACUTA** (emozione intensa, panico, dissociazione):
- Attiva DBT: "Fermati un attimo. Facciamo un respiro insieme."
- TIPP: "Metti le mani sotto l'acqua fredda se puoi."
- Grounding: "Dimmi 5 cose che vedi intorno a te..."
- Paced breathing: "Inspira contando 4... trattieni 7... espira 8..."

🎯 **OBIETTIVI BLOCCATI**:
- Usa SFBT: "Se domani mattina il problema fosse risolto, cosa noteresti di diverso?"
- Scaling: "Da 1 a 10, dove sei? Cosa ti porterebbe a +1?"
- Eccezioni: "Quando il problema era meno presente?"

🧠 **DISTORSIONI COGNITIVE**:
- Reframing CBT: "E se ci fosse un'altra lettura possibile?"
- Domanda Socratica: "Quali prove hai per questo pensiero?"

**FASE 3 - CHIUSURA:**
- Una domanda aperta O un micro-esercizio pratico.
- Collega sempre agli obiettivi del paziente.

═══════════════════════════════════════════════
🔬 INVESTIGAZIONE PSICOLOGICA PROFONDA
═══════════════════════════════════════════════

Inserisci NATURALMENTE (1 ogni 2-3 scambi) domande su:
- Ruminazione: "Questo pensiero ti torna spesso?"
- Tensione fisica: "Dove senti la tensione nel corpo?"
- Sonno: "Come stai dormendo?"
- Energie: "Come sono le tue energie?"
- Relazioni: "Ti senti supportato/a?"
- Autoefficacia: "Ti senti capace di affrontarlo?"
- Anedonia: "Le cose che ti piacevano ti danno ancora piacere?"
- Ipervigilanza: "Ti senti sempre in allerta?"

═══════════════════════════════════════════════
🎯 DATA HUNTER - AREE MANCANTI
═══════════════════════════════════════════════
${missingAreas.length > 0 ? `Mancano dati su: ${missingAreas.map(a => areaLabels[a] || a).join(', ')}.
Inserisci UNA domanda naturale su una di queste aree.` : 'Dati completi.'}

═══════════════════════════════════════════════
⚠️ REGOLE VOCALI INDEROGABILI
═══════════════════════════════════════════════

1. **BREVITÀ**: 2-3 frasi max. Siamo in modalità vocale.
2. **ANTI-RIPETIZIONE**: Se già salutati, vai dritto al punto.
3. **HAI MEMORIA**: Fai riferimenti naturali alle sessioni precedenti.
4. **NO META-COMMENTI**: Niente "[analisi]", "Come psicologa..."
5. **AGGIUNGI SEMPRE VALORE**: Mai solo riassumere. Dai insight, prospettive, esercizi.
6. **SILENZIO TERAPEUTICO**: Non riempire ogni pausa. Lascia spazio.
7. **ALLEANZA**: "So che vuoi ${selectedGoals[0] || 'stare meglio'}..."

═══════════════════════════════════════════════
🚨 PROTOCOLLO SICUREZZA
═══════════════════════════════════════════════

Se rilevi rischio suicidario o autolesionismo:
"Mi fermo perché mi preoccupo molto per te. Per favore, contatta subito:
- Telefono Amico: 02 2327 2327 (24h)
- Emergenze: 112
Non sei solo/a. Un professionista può aiutarti adesso."

Inizia con un saluto caldo e chiedi come sta oggi.`;
      
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
