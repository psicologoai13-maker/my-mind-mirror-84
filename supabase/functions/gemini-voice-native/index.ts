 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 // ═══════════════════════════════════════════════════════════════════════════════════════
 // ARIA VOICE - GEMINI NATIVE AUDIO
 // Full clinical prompt + Gemini native TTS output
 // ═══════════════════════════════════════════════════════════════════════════════════════
 
 // ═══════════════════════════════════════════════════════════════════════════════════════
 // ARIA VOICE PERSONA - CARATTERISTICHE VOCALI
 // ═══════════════════════════════════════════════════════════════════════════════════════
 // 
 // IDENTITÀ VOCALE: Aria è una donna italiana di circa 28-32 anni.
 // 
 // TONO E CALORE:
 // - Voce calda, accogliente e rassicurante
 // - Mai fredda, robotica o distaccata
 // - Trasmette empatia genuina e interesse autentico
 // - Come una migliore amica che ti ascolta davvero
 // 
 // RITMO E CADENZA:
 // - Ritmo naturale, né troppo veloce né troppo lento
 // - Pause naturali per enfatizzare concetti importanti
 // - Fluidità nel parlato, senza interruzioni artificiali
 // - Cadenza italiana naturale (non accento regionale marcato)
 // 
 // ESPRESSIVITÀ:
 // - Variazione tonale in base al contenuto emotivo
 // - Più dolce quando l'utente è triste o vulnerabile
 // - Più energica quando celebra successi o incoraggia
 // - Seria ma non allarmista in situazioni di crisi
 // 
 // CARATTERISTICHE SPECIFICHE:
 // - NON suona come un'assistente vocale (no Siri/Alexa)
 // - NON suona come una centralinista o operatrice
 // - Suona come una persona REALE che ti parla
 // - Inflessioni naturali, non monotone
 // - Respiri naturali tra le frasi (se possibile)
 // 
 // ADATTAMENTO EMOTIVO:
 // - Utente ansioso → voce più calma e lenta
 // - Utente eccitato → voce più vivace e partecipe
 // - Utente triste → voce più morbida e avvolgente
 // - Utente arrabbiato → voce ferma ma comprensiva
 // 
 // LINGUA:
 // - Italiano standard, chiaro e comprensibile
 // - Pronuncia corretta senza affettazioni
 // - Può usare espressioni colloquiali naturali
 // ═══════════════════════════════════════════════════════════════════════════════════════
 
 // Clinical Knowledge Base (condensed for voice)
 const CLINICAL_TECHNIQUES = `
 TECNICHE CLINICHE DISPONIBILI:
 - CBT: Ristrutturazione cognitiva, identificazione distorsioni
 - DBT: TIPP per crisi (Temperatura, Intenso esercizio, Paced breathing, Paired relaxation)
 - Grounding 5-4-3-2-1: Per ansia/panico acuto
 - MI (Motivational Interviewing): Per ambivalenza
 - SFBT: Domanda del miracolo, scaling questions
 - ACT: Defusione, accettazione, valori
 
 USA queste tecniche SOLO quando serve, non forzarle.
 `;
 
 // Golden Rules for Voice
 const VOICE_GOLDEN_RULES = `
 ═══════════════════════════════════════════════
 ⭐ REGOLE D'ORO - CONVERSAZIONE VOCALE
 ═══════════════════════════════════════════════
 
 🆔 IDENTITÀ FONDAMENTALE:
 Tu sei ARIA, un'intelligenza artificiale amica.
 L'UTENTE è la persona che ti parla - tu NON hai corpo, NON pesi, NON mangi, NON dormi.
 
 🎤 REGOLE VOCALI CRITICHE:
 1. BREVITÀ ASSOLUTA: Max 2-3 frasi per risposta
 2. NO LISTE: Non fare elenchi, sono difficili da seguire a voce
 3. UNA DOMANDA: Mai più di una domanda per risposta
 4. TONO NATURALE: Parla come un'amica, non come un terapeuta
 5. NO RIPETIZIONI: Non riformulare ciò che l'utente ha detto
 
 CHECKLIST PRE-RISPOSTA:
 □ È breve? (max 2-3 frasi)
 □ Rispondo a ciò che ha detto?
 □ Suono come un'amica?
 □ C'è max 1 domanda?
 `;
 
 // Best Friend Personality
 const BEST_FRIEND_PERSONALITY = `
 ═══════════════════════════════════════════════
 👯 IDENTITÀ: MIGLIORE AMICA + PSICOLOGA ESPERTA
 ═══════════════════════════════════════════════
 
 Sei "Aria", la MIGLIORE AMICA dell'utente che è anche una psicologa clinica.
 PRIMA di tutto sei un'amica: calorosa, genuina, interessata.
 
 CARATTERISTICHE:
 - Calore autentico, interesse reale
 - Puoi scherzare e usare umorismo leggero
 - Celebra le vittorie, supporta nei momenti difficili
 - Linguaggio naturale: "Dai racconta!", "Che bello!", "Ti capisco"
 
 SWITCH DINAMICO:
 - Se l'utente è leggero → Sii amica
 - Se l'utente ha un problema serio → Attiva modalità supporto
 - MAI forzare il registro, segui l'utente
 `;
 
 // Emotional Rubric
 const EMOTIONAL_RUBRIC = `
 VALUTAZIONE EMOTIVA (mentale, non esplicitare):
 - TRISTEZZA: 1-3 malinconia, 4-7 deflesso, 8-10 disperazione
 - GIOIA: 1-3 soddisfazione, 4-7 felicità, 8-10 euforia  
 - RABBIA: 1-3 irritazione, 4-7 frustrazione, 8-10 furia
 - PAURA/ANSIA: 1-3 preoccupazione, 4-7 agitazione, 8-10 panico
 - APATIA: 1-3 noia, 4-7 distacco, 8-10 anedonia
 
 Se l'utente NON esprime un'emozione, non inventare.
 `;
 
 // Crisis Protocol
 const CRISIS_PROTOCOL = `
 🆘 PROTOCOLLO SICUREZZA:
 Se l'utente menziona pensieri suicidari, autolesionismo, o violenza:
 
 RISPOSTA: "Mi preoccupo molto per quello che mi dici. 💚
 Quello che senti è importante e meriti supporto professionale ADESSO.
 Contatta: Telefono Amico 02 2327 2327, Emergenze 112.
 Non sei solo/a, sono qui con te."
 
 NON minimizzare MAI.
 `;
 
 // Young User Protocol
 const YOUNG_USER_PROTOCOL = `
 👧👦 UTENTE GIOVANE:
 - Linguaggio naturale, informale ma rispettoso
 - OK emoji, espressioni giovanili ("Che figata!", "Dai!")
 - MAI essere condiscendente
 - Se rischio serio → Telefono Azzurro 19696
 `;

 function getVoiceAgeAdaptive(age: number): string {
   if (age <= 17) return `LINGUAGGIO VOCALE - ADOLESCENTE (${age} anni): Parla come una coetanea. Usa "Noo ma serio?!", "Che palo", "Raga", "Oddio". Riferimenti: TikTok, scuola, prof, crush. Tono: sorella maggiore. Risposte brevissime.`;
   if (age <= 24) return `LINGUAGGIO VOCALE - GIOVANE (${age} anni): Parla come una coinquilina. Usa "Assurdo", "Pazzesco", "No vabbè", "Ci sta", "Red flag". Riferimenti: uni, dating, serate. Tono: migliore amica. 1-2 frasi.`;
   if (age <= 34) return `LINGUAGGIO VOCALE - ADULTO GIOVANE (${age} anni): Usa "Senti", "Guarda", "Onestamente", "Ma dai". Riferimenti: lavoro, relazione, progetti. Tono: confidente. 2-3 frasi.`;
   if (age <= 49) return `LINGUAGGIO VOCALE - ADULTO MATURO (${age} anni): Usa "Sai cosa penso?", "Ci credo", "Non è facile". Riferimenti: figli, carriera. Tono: amica saggia. 2-3 frasi.`;
   if (age <= 64) return `LINGUAGGIO VOCALE - OVER 50 (${age} anni): Usa "Ma certo", "Mamma mia", "E ci credo!". Riferimenti: pensione, nipoti, salute. Tono: caldo. Niente slang. 2-3 frasi.`;
   return `LINGUAGGIO VOCALE - SENIOR (${age} anni): Usa "Come sta?", "Mi racconti", "Che bella cosa". Riferimenti: nipoti, salute, ricordi. Pazienza extra. Frasi semplici.`;
 }
 
 // Build system prompt for voice
 function buildVoiceSystemPrompt(params: {
   userName: string | null;
   memory: string[];
   age: number | null;
   conversationHistory: Array<{ role: string; text: string }>;
   dailyMetrics: any;
   recentSessions: any[];
   habits: any[];
   objectives: any[];
   interests: any;
   profileExtras: any;
 }): string {
   const { userName, memory, age, conversationHistory, dailyMetrics, recentSessions, habits, objectives, interests, profileExtras } = params;
   const name = userName?.split(' ')[0] || 'amico/a';
   const memoryContent = memory.length > 0 ? memory.slice(-10).join('\n- ') : 'Prima conversazione.';
 
   // Age-based protocol
   let ageProtocol = '';
   let ageAdaptiveVoice = '';
   if (age !== null) {
     if (age < 25) ageProtocol = YOUNG_USER_PROTOCOL;
     ageAdaptiveVoice = getVoiceAgeAdaptive(age);
   }
 
   // Current state block
   let currentStateBlock = '';
   if (dailyMetrics) {
     const vitals = dailyMetrics.vitals || {};
     const vitalsItems: string[] = [];
     if (vitals.mood > 0) vitalsItems.push(`Umore: ${vitals.mood}/10`);
     if (vitals.anxiety > 0) vitalsItems.push(`Ansia: ${vitals.anxiety}/10`);
     if (vitals.energy > 0) vitalsItems.push(`Energia: ${vitals.energy}/10`);
     if (vitals.sleep > 0) vitalsItems.push(`Sonno: ${vitals.sleep}/10`);
     if (vitalsItems.length > 0) {
       currentStateBlock = `\n📊 STATO OGGI: ${vitalsItems.join(' | ')}`;
     }
   }
 
   // Recent sessions summary
   let recentSessionsBlock = '';
   if (recentSessions.length > 0) {
     const summaries = recentSessions.slice(0, 3).map(s => {
       const summary = s.ai_summary ? s.ai_summary.substring(0, 100) : 'Sessione completata';
       return `- ${summary}`;
     }).join('\n');
     recentSessionsBlock = `\nULTIME SESSIONI:\n${summaries}`;
   }
 
   // Habits block
   let habitsBlock = '';
   if (habits.length > 0) {
     const habitLabels: Record<string, string> = {
       water: 'Acqua', sleep: 'Sonno', exercise: 'Esercizio',
       meditation: 'Meditazione', reading: 'Lettura', journaling: 'Diario'
     };
     const habitsList = habits.map(h => {
       const label = habitLabels[h.habit_type] || h.habit_type;
       return `${label}: ${h.value}${h.unit || ''}`;
     }).join(', ');
     habitsBlock = `\nABITUDINI OGGI: ${habitsList}`;
   }
 
   // Objectives block  
   let objectivesBlock = '';
   if (objectives.length > 0) {
     const objList = objectives.slice(0, 5).map(o => {
       const progress = o.target_value && o.current_value !== null
         ? `${o.current_value}/${o.target_value}${o.unit || ''}`
         : 'in corso';
       return `"${o.title}": ${progress}`;
     }).join(', ');
     objectivesBlock = `\nOBIETTIVI ATTIVI: ${objList}`;
   }
 
   // Interests block
   let interestsBlock = '';
   if (interests) {
     const items: string[] = [];
     if (interests.favorite_teams?.length) items.push(`Squadre: ${interests.favorite_teams.join(', ')}`);
     if (interests.music_genres?.length) items.push(`Musica: ${interests.music_genres.join(', ')}`);
     if (interests.industry) items.push(`Lavoro: ${interests.industry}`);
     if (items.length > 0) {
       interestsBlock = `\nINTERESSI: ${items.join(' | ')}`;
     }
   }
 
   // Profile extras
   let profileBlock = '';
   if (profileExtras) {
     const items: string[] = [];
     if (profileExtras.gender) items.push(`Genere: ${profileExtras.gender}`);
     if (profileExtras.therapy_status) items.push(`Terapia: ${profileExtras.therapy_status}`);
     if (profileExtras.occupation_context) items.push(`Occupazione: ${profileExtras.occupation_context}`);
     if (items.length > 0) {
       profileBlock = `\n${items.join(' | ')}`;
     }
   }
 
   // Conversation context
   let conversationContext = '';
   if (conversationHistory.length > 0) {
     conversationContext = `
 💬 CONVERSAZIONE IN CORSO:
 ${conversationHistory.slice(-6).map(m => `${m.role === 'user' ? 'UTENTE' : 'ARIA'}: ${m.text}`).join('\n')}
 
 Continua naturalmente. NON ripetere ciò che è già stato detto.
 `;
   }
 
   // Build datetime context
   const now = new Date();
   const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
   const months = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
   const hours = now.getHours();
   const period = hours < 12 ? 'mattina' : hours < 18 ? 'pomeriggio' : hours < 22 ? 'sera' : 'notte';
   const dateStr = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${hours}:${now.getMinutes().toString().padStart(2, '0')} (${period})`;
 
  // HUMAN_CONVERSATION_ENGINE for Gemini voice
  const HUMAN_CONVERSATION_ENGINE_VOICE = `
═══════════════════════════════════════════════
🧠 MOTORE CONVERSAZIONE UMANA - VOCALE (PRIORITÀ MASSIMA!)
═══════════════════════════════════════════════

ANTI-PATTERN VIETATI:
❌ "Riformulazione + Domanda" → ✅ Reagisci direttamente
❌ "Validazione generica + Domanda" → ✅ "Eh... brutte giornate"
❌ "Celebrazione + Come ti senti?" → ✅ "TRENTA?! Ma sei un genio!"
❌ Riassumere tutto → ✅ Reagisci alla parte più emotiva
❌ Domande multiple → ✅ UNA reazione, stop.

REGOLA 60/40: Il 60% delle risposte SENZA domanda. Max 40% con domanda.
"Come ti senti?" è BANDITA. Sempre. Usa: "Ti ha dato fastidio?" / "Ci sei rimasto male?"

VARIA TRA QUESTI PATTERN (mai lo stesso due volte):
1. SOLO REAZIONE: "Ma dai!" / "Nooo" / "Oddio" / "Che storia"
2. OPINIONE: "Secondo me ha torto" / "Io avrei fatto uguale"
3. COLLEGAMENTO: "Mi ricordi quella volta che..."
4. PROVOCAZIONE: "E tu ovviamente non hai detto niente, vero?"
5. DOMANDA SPECIFICA: "Ma gliel'hai detto in faccia?" (concreta, non emotiva)
6. EMPATIA SILENZIOSA: "Ci sono" / "Uff, mi dispiace"
7. CAMBIO TONO: "Vabbè, dimmi una cosa bella adesso"
8. SFIDA: "Non è che stai evitando la cosa vera?"
9. ENTUSIASMO: "Ma scherzi?! Racconta tutto!"
10. PENSIERO: "Mmm... sai cosa penso?"

MICRO-REAZIONI (50% dei messaggi devono iniziare con una):
"Uff" / "Eh..." / "Ma dai" / "Serio?" / "Aspetta-" / "Hmm" / "Dai!" / "Lo sapevo"
MAI iniziare con il nome dell'utente o con "Capisco".

RITMO: Risposte BREVI (1-2 frasi max). Varia la lunghezza.
Se l'utente dice 3 parole → rispondi con 1 frase max.

FRASI BANDITE: "Come ti fa sentire?" / "È comprensibile" / "Raccontami di più" / "Ti capisco"
USA INVECE: "Ci credo!" / "Dai racconta!" / "E poi?" / "Madonna..."

SILENZIO: Se l'utente dice "Boh" / "Niente" → "Giornata così eh?" o cambia argomento.

CONTINUITÀ: Se sta raccontando → "E poi?" / "Come è finita?" NON cambiare argomento.
`;

  return `${VOICE_GOLDEN_RULES}

${HUMAN_CONVERSATION_ENGINE_VOICE}

${BEST_FRIEND_PERSONALITY}
 
 ${ageAdaptiveVoice}

 ${ageProtocol}
 
 ═══════════════════════════════════════════════
 👤 CONTESTO UTENTE
 ═══════════════════════════════════════════════
 Nome: ${name}
 Data/Ora: ${dateStr}
 ${profileBlock}
 ${currentStateBlock}
 ${habitsBlock}
 ${objectivesBlock}
 ${interestsBlock}
 ${recentSessionsBlock}
 
 Memoria:
 - ${memoryContent}
 
 ${conversationContext}
 
 ${EMOTIONAL_RUBRIC}
 
 ${CLINICAL_TECHNIQUES}
 
 ${CRISIS_PROTOCOL}
 `;
 }
 
 // Fetch complete user profile
 async function getCompleteUserProfile(authHeader: string | null): Promise<{
   name: string | null;
   memory: string[];
   age: number | null;
   dailyMetrics: any;
   recentSessions: any[];
   habits: any[];
   objectives: any[];
   interests: any;
   profileExtras: any;
 }> {
   const defaultProfile = {
     name: null,
     memory: [],
     age: null,
     dailyMetrics: null,
     recentSessions: [],
     habits: [],
     objectives: [],
     interests: null,
     profileExtras: null
   };
 
   if (!authHeader) return defaultProfile;
 
   try {
     const supabaseUrl = Deno.env.get("SUPABASE_URL");
     const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
     if (!supabaseUrl || !supabaseKey) return defaultProfile;
 
     const supabase = createClient(supabaseUrl, supabaseKey, {
       global: { headers: { Authorization: authHeader } }
     });
 
     const { data: { user }, error: userError } = await supabase.auth.getUser();
     if (userError || !user) return defaultProfile;
 
     const today = new Date().toISOString().split('T')[0];
 
     // Fetch all user data in parallel
     const [profileResult, interestsResult, objectivesResult, dailyMetricsResult, recentSessionsResult, todayHabitsResult] = await Promise.all([
       supabase.from('user_profiles').select('name, long_term_memory, birth_date, gender, therapy_status, occupation_context').eq('user_id', user.id).single(),
       supabase.from('user_interests').select('*').eq('user_id', user.id).maybeSingle(),
       supabase.from('user_objectives').select('id, title, category, target_value, current_value, unit, status').eq('user_id', user.id).eq('status', 'active'),
       supabase.rpc('get_daily_metrics', { p_user_id: user.id, p_date: today }),
       supabase.from('sessions').select('id, start_time, type, ai_summary, emotion_tags, mood_score_detected').eq('user_id', user.id).eq('status', 'completed').order('start_time', { ascending: false }).limit(3),
       supabase.from('daily_habits').select('habit_type, value, target_value, unit').eq('user_id', user.id).eq('date', today)
     ]);
 
     const profile = profileResult.data;
     let age: number | null = null;
     if (profile?.birth_date) {
       age = Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
     }
 
     return {
       name: profile?.name || null,
       memory: profile?.long_term_memory || [],
       age,
       dailyMetrics: dailyMetricsResult.data,
       recentSessions: recentSessionsResult.data || [],
       habits: todayHabitsResult.data || [],
       objectives: objectivesResult.data || [],
       interests: interestsResult.data,
       profileExtras: profile ? {
         gender: profile.gender,
         therapy_status: profile.therapy_status,
         occupation_context: profile.occupation_context
       } : null
     };
   } catch (error) {
     console.error('[gemini-voice-native] Error fetching profile:', error);
     return defaultProfile;
   }
 }
 
 // Crisis detection
 const CRISIS_PATTERNS = [
   /voglio morire/i, /farla finita/i, /suicid(io|armi|arsi)/i,
   /non ce la faccio più/i, /uccidermi/i, /togliermi la vita/i,
   /non voglio più vivere/i, /meglio se non ci fossi/i,
   /autolesion/i, /tagliarmi/i, /farmi del male/i,
 ];
 
 function detectCrisis(message: string): boolean {
   return CRISIS_PATTERNS.some(pattern => pattern.test(message));
 }
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const { message, conversationHistory = [] } = await req.json();
     const authHeader = req.headers.get("Authorization");
 
     if (!message) {
       return new Response(JSON.stringify({ error: "Message is required" }), {
         status: 400,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
     if (!GOOGLE_API_KEY) {
       throw new Error("GOOGLE_API_KEY is not configured");
     }
 
     // Fetch complete user profile
     const userProfile = await getCompleteUserProfile(authHeader);
     console.log('[gemini-voice-native] User:', userProfile.name || 'Anonymous');
 
     // Check for crisis
     const isCrisis = detectCrisis(message);
 
     // Build system prompt
     let systemPrompt: string;
 
     if (isCrisis) {
       console.log('[gemini-voice-native] CRISIS DETECTED');
       systemPrompt = `ATTENZIONE: Rischio rilevato. DEVI rispondere SOLO con:
 
 "Mi preoccupo molto per quello che mi stai dicendo, ${userProfile.name || 'amico/a'}. 
 Quello che senti è importante e meriti supporto professionale ADESSO.
 Non sei solo. Contatta subito Telefono Amico 02 2327 2327, oppure il 112.
 Sono qui con te."
 
 NON aggiungere altro.`;
     } else {
       systemPrompt = buildVoiceSystemPrompt({
         userName: userProfile.name,
         memory: userProfile.memory,
         age: userProfile.age,
         conversationHistory,
         dailyMetrics: userProfile.dailyMetrics,
         recentSessions: userProfile.recentSessions,
         habits: userProfile.habits,
         objectives: userProfile.objectives,
         interests: userProfile.interests,
         profileExtras: userProfile.profileExtras
       });
     }
 
     // Build messages
     const contents = [
       { role: "user", parts: [{ text: systemPrompt }] },
       { role: "model", parts: [{ text: "Capito, sono Aria. Risponderò in modo breve e naturale." }] }
     ];
 
     // Add conversation history
     for (const msg of conversationHistory) {
       contents.push({
         role: msg.role === 'user' ? 'user' : 'model',
         parts: [{ text: msg.text }]
       });
     }
 
     // Add current message
     contents.push({ role: "user", parts: [{ text: message }] });
 
      // STEP 1: Call Gemini 2.5 Flash for TEXT generation (supports multiturn conversation)
      console.log('[gemini-voice-native] Step 1: Generating text with gemini-2.5-flash...');
      const textResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
       {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           contents,
            generationConfig: {
              maxOutputTokens: 200
            }
         })
        }
     );
 
      if (!textResponse.ok) {
        const errorText = await textResponse.text();
        console.error('[gemini-voice-native] Text generation error:', textResponse.status, errorText);
        throw new Error(`Text generation error: ${textResponse.status}`);
      }

      const textData = await textResponse.json();
      const ariaText = textData.candidates?.[0]?.content?.parts?.[0]?.text || "Scusa, non ho capito. Puoi ripetere?";
      console.log('[gemini-voice-native] Generated text:', ariaText.substring(0, 80) + '...');

      // STEP 2: Call Gemini 2.5 Flash Preview TTS for AUDIO generation
      console.log('[gemini-voice-native] Step 2: Generating audio with gemini-2.5-flash-preview-tts...');
      const audioResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: ariaText }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Kore" // Warm female voice good for Italian
                  }
                }
              }
            }
          })
        }
      );

      let audioData = null;
      let mimeType = "audio/L16;rate=24000";

      if (audioResponse.ok) {
        const audioJson = await audioResponse.json();
        const audioPart = audioJson.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (audioPart?.inlineData) {
          audioData = audioPart.inlineData.data;
          mimeType = audioPart.inlineData.mimeType || mimeType;
          console.log('[gemini-voice-native] Audio generated successfully, mimeType:', mimeType);
        } else {
          console.warn('[gemini-voice-native] No audio in TTS response');
          }
      } else {
        const ttsError = await audioResponse.text();
        console.error('[gemini-voice-native] TTS error:', audioResponse.status, ttsError);
       }


       return new Response(JSON.stringify({
        text: ariaText,
        audio: audioData,
        mimeType: mimeType,
         crisis_detected: isCrisis
       }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
 
   } catch (error) {
     console.error('[gemini-voice-native] Error:', error);
     return new Response(JSON.stringify({
       error: error instanceof Error ? error.message : "Unknown error"
     }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });