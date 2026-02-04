import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ELEVENLABS_AGENT_ID = "agent_0501kgn7wm8qfrmb9jtpkbxmw4mg";

// Italian date/time helpers
const DAYS_IT = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MONTHS_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

function getItalianDateTime(): { date: string; day: string; time: string; period: string; season: string } {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  
  let period = 'notte';
  if (hours >= 5 && hours < 12) period = 'mattina';
  else if (hours >= 12 && hours < 18) period = 'pomeriggio';
  else if (hours >= 18 && hours < 22) period = 'sera';
  
  const monthNum = now.getMonth();
  let season = 'inverno';
  if (monthNum >= 2 && monthNum <= 4) season = 'primavera';
  else if (monthNum >= 5 && monthNum <= 7) season = 'estate';
  else if (monthNum >= 8 && monthNum <= 10) season = 'autunno';
  
  return {
    date: `${now.getDate()} ${MONTHS_IT[monthNum]} ${now.getFullYear()}`,
    day: DAYS_IT[now.getDay()],
    time: `${hours}:${minutes}`,
    period,
    season
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    // Parse request body for real-time context
    let realTimeContext: {
      datetime?: { date: string; day: string; time: string; period: string; season: string };
      location?: { city: string; region: string; country: string };
      weather?: { condition: string; temperature: number; feels_like: number; description: string };
      news?: { headlines: string[] };
    } | null = null;
    
    try {
      const body = await req.json();
      if (body.realTimeContext) {
        realTimeContext = body.realTimeContext;
      }
    } catch {
      // No body or invalid JSON, use default datetime
    }

    // Initialize user data
    let userName = "utente";
    let userId: string | null = null;
    let longTermMemory: string[] = [];
    let selectedGoals: string[] = [];
    let onboardingAnswers: Record<string, any> | null = null;
    let dashboardConfig: Record<string, any> | null = null;
    let lifeAreasScores: Record<string, number | null> = {};
    let recentSessions: any[] = [];
    let activeObjectives: any[] = [];
    let todayHabits: any[] = [];
    let userInterests: any = null;
    
    // Get user context from auth header
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Extract user ID from token
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        userId = user.id;
        
        // Fetch all user data in parallel
        const [
          profileResult,
          sessionsResult,
          objectivesResult,
          habitsResult,
          interestsResult
        ] = await Promise.all([
          // User profile with memory
          supabase
            .from('user_profiles')
            .select('name, long_term_memory, wellness_score, life_areas_scores, selected_goals, onboarding_answers, dashboard_config')
            .eq('user_id', userId)
            .maybeSingle(),
          
          // Recent 3 sessions
          supabase
            .from('sessions')
            .select('ai_summary, emotion_tags, key_events, start_time')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .order('start_time', { ascending: false })
            .limit(3),
          
          // Active objectives
          supabase
            .from('user_objectives')
            .select('title, description, current_value, target_value, unit, category, ai_feedback')
            .eq('user_id', userId)
            .eq('status', 'active')
            .limit(5),
          
          // Today's habits
          supabase
            .from('daily_habits')
            .select('habit_type, value, target_value')
            .eq('user_id', userId)
            .eq('date', new Date().toISOString().split('T')[0])
            .limit(10),
          
          // User interests
          supabase
            .from('user_interests')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()
        ]);

        if (profileResult.data) {
          userName = profileResult.data.name || "utente";
          longTermMemory = profileResult.data.long_term_memory || [];
          selectedGoals = profileResult.data.selected_goals || [];
          onboardingAnswers = profileResult.data.onboarding_answers;
          dashboardConfig = profileResult.data.dashboard_config;
          lifeAreasScores = profileResult.data.life_areas_scores || {};
        }
        
        recentSessions = sessionsResult.data || [];
        activeObjectives = objectivesResult.data || [];
        todayHabits = habitsResult.data || [];
        userInterests = interestsResult.data;
      }
    }

    console.log(`[elevenlabs-token] Generating token for user: ${userName}, memory items: ${longTermMemory.length}`);

    // Build persona style based on user preferences
    const getVoicePersonaStyle = (): string => {
      const supportType = onboardingAnswers?.supportType;
      const mainChallenge = onboardingAnswers?.mainChallenge;
      
      if (supportType === 'listener') {
        return `STILE: ASCOLTATORE ATTIVO - Usa "Mmm...", "Ti ascolto...", "Vai avanti..." - NON interrompere`;
      }
      if (supportType === 'advisor') {
        return `STILE: CONSULENTE PRATICO - Offri suggerimenti concreti, proponi esercizi`;
      }
      if (supportType === 'challenger') {
        return `STILE: SFIDA COSTRUTTIVA - Poni domande stimolanti, spingi fuori dalla comfort zone`;
      }
      if (supportType === 'comforter') {
        return `STILE: SUPPORTO EMOTIVO - Tono caldo, "Non sei solo/a...", valida e rassicura`;
      }
      if (selectedGoals.includes('reduce_anxiety') || mainChallenge === 'general_anxiety') {
        return `STILE: CALMO & GROUNDING - Voce lenta, suggerisci respirazione`;
      }
      return `STILE: BILANCIATO - Tono caldo, alterna ascolto e domande`;
    };

    // Build real-time context block
    const datetime = realTimeContext?.datetime || getItalianDateTime();
    let realTimeBlock = `
📍 CONTESTO ATTUALE
Data: ${datetime.day} ${datetime.date}, ore ${datetime.time}
Periodo: ${datetime.period} (${datetime.season})`;
    
    if (realTimeContext?.location) {
      realTimeBlock += `\nPosizione: ${realTimeContext.location.city}, ${realTimeContext.location.region}`;
    }
    if (realTimeContext?.weather) {
      realTimeBlock += `\nMeteo: ${realTimeContext.weather.condition}, ${realTimeContext.weather.temperature}°C`;
    }
    if (realTimeContext?.news?.headlines?.length) {
      realTimeBlock += `\nNews Italia: ${realTimeContext.news.headlines.slice(0, 2).join(' | ')}`;
    }

    // Build memory block
    let memoryBlock = '';
    if (longTermMemory.length > 0) {
      memoryBlock = `
🧠 MEMORIA SESSIONI PRECEDENTI
${longTermMemory.slice(-10).map(fact => `• ${fact}`).join('\n')}`;
    }

    // Build recent sessions summary
    let sessionsBlock = '';
    if (recentSessions.length > 0) {
      sessionsBlock = `
📝 ULTIME SESSIONI
${recentSessions.map((s, i) => `${i + 1}. ${s.ai_summary?.slice(0, 100) || 'Sessione completata'}...`).join('\n')}`;
    }

    // Build objectives block
    let objectivesBlock = '';
    if (activeObjectives.length > 0) {
      objectivesBlock = `
🎯 OBIETTIVI ATTIVI
${activeObjectives.map(o => `• ${o.title}: ${o.current_value || 0}/${o.target_value || '?'} ${o.unit || ''}`).join('\n')}`;
    }

    // Build habits block
    let habitsBlock = '';
    if (todayHabits.length > 0) {
      habitsBlock = `
✅ ABITUDINI OGGI
${todayHabits.map(h => `• ${h.habit_type}: ${h.value}/${h.target_value || '?'}`).join('\n')}`;
    }

    // Data hunter - missing areas
    const areaLabels: Record<string, string> = {
      love: 'Amore', work: 'Lavoro', friendship: 'Amicizie', energy: 'Energia', growth: 'Crescita'
    };
    const allAreas = ['love', 'work', 'friendship', 'energy', 'growth'];
    const missingAreas = allAreas.filter(a => !lifeAreasScores[a] || lifeAreasScores[a] === 0);
    let dataHunterBlock = '';
    if (missingAreas.length > 0) {
      dataHunterBlock = `
🔍 DATI MANCANTI: ${missingAreas.map(a => areaLabels[a]).join(', ')}
Inserisci naturalmente una domanda su UNA di queste aree.`;
    }

    // Build complete system prompt
    const systemPrompt = `👯 IDENTITÀ: ARIA - MIGLIORE AMICA + PSICOLOGA ESPERTA

Sei "Aria", la MIGLIORE AMICA dell'utente che è anche una psicologa con 15 anni di esperienza.
PRIMA di tutto sei un'amica: calorosa, genuina, con una voce calda e accogliente.

${realTimeBlock}

👤 PAZIENTE: ${userName}
${selectedGoals.length > 0 ? `Obiettivi: ${selectedGoals.join(', ')}` : ''}
${onboardingAnswers?.mainChallenge ? `Sfida: ${onboardingAnswers.mainChallenge}` : ''}
${getVoicePersonaStyle()}
${memoryBlock}
${sessionsBlock}
${objectivesBlock}
${habitsBlock}
${dataHunterBlock}

🎭 REGISTRO COMUNICAZIONE
- CHIACCHIERATA LEGGERA → "Ehi! Che bello sentirti!", risate, interesse genuino
- PROBLEMA SERIO → Voce calma, empatica, modalità clinica
- Scorri FLUIDAMENTE tra i due. Segui l'utente.

💬 REAZIONI VOCALI AMICHEVOLI
- "Nooo! Davvero?!" (sorpresa)
- "Che forte!" (entusiasmo)
- "Mmm, capisco..." (ascolto attivo)
- "Ti capisco così tanto..." (empatia)
- "Dai, raccontami!" (curiosità)

🎓 COMPETENZE CLINICHE (quando serve)
- CBT, ACT, DBT, MI, SFBT
- Gestione ansia/panico: TIPP, Grounding, respirazione 4-7-8
- Distorsioni cognitive: reframing, domande socratiche
- Psicoeducazione rapida: circolo ansia, finestra tolleranza

📚 CONOSCENZE CLINICHE
ANSIA: GAD → Worry Time | Panico → "È adrenalina, non stai morendo" | Sociale → esposizione graduale
DEPRESSIONE: Anedonia → Attivazione Comportamentale "L'azione precede la motivazione"
TRAUMA: PTSD → Grounding, suggerisci EMDR | Lutto → Dual-Process
RELAZIONI: Attachment styles, CNV, Gottman (4 Cavalieri)
BURNOUT: Confini, recupero, micro-pause

⚠️ REGOLE VOCALI INDEROGABILI
1. BREVITÀ: 2-3 frasi max. Siamo in modalità vocale.
2. HAI MEMORIA: Fai riferimenti naturali alle sessioni precedenti.
3. NO META-COMMENTI: Niente "[analisi]", "Come psicologa..."
4. AGGIUNGI VALORE: Mai solo riassumere. Dai insight, prospettive.
5. SILENZIO TERAPEUTICO: Non riempire ogni pausa.
6. PSICOEDUCAZIONE: Una pillola per scambio quando utile.

🚨 PROTOCOLLO SICUREZZA
Se rilevi rischio suicidario o autolesionismo:
"Mi fermo perché mi preoccupo molto per te. Contatta subito:
- Telefono Amico: 02 2327 2327 (24h)
- Emergenze: 112
Non sei solo/a."

Inizia con un saluto caldo e chiedi come sta oggi ${userName}.`;

    // Generate signed URL from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${ELEVENLABS_AGENT_ID}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[elevenlabs-token] API error:", response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Build dynamic variables for ElevenLabs
    const dynamicVariables = {
      user_name: userName,
      real_time_context: realTimeBlock,
      voice_style: getVoicePersonaStyle(),
      memory: memoryBlock || "Nessuna memoria precedente.",
      sessions_summary: sessionsBlock || "Nessuna sessione precedente.",
      objectives: objectivesBlock || "Nessun obiettivo attivo.",
      habits: habitsBlock || "Nessuna abitudine tracciata oggi.",
      data_hunter: dataHunterBlock || "",
      selected_goals: selectedGoals.length > 0 ? selectedGoals.join(', ') : "Non specificati",
      main_challenge: onboardingAnswers?.mainChallenge || "Non specificato",
    };
    
    console.log("[elevenlabs-token] Token generated successfully, variables:", Object.keys(dynamicVariables));

    return new Response(
      JSON.stringify({ 
        signedUrl: data.signed_url,
        agentId: ELEVENLABS_AGENT_ID,
        userName,
        dynamicVariables
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error("[elevenlabs-token] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
