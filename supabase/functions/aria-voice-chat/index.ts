import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

// Italian-optimized voice ID (Laura - multilingual female voice)
const ITALIAN_VOICE_ID = 'FGY2WhTYpPnrIDTdsKH5';

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 ARIA VOICE - MIRROR BRAIN SYSTEM (Condensed Clinical Intelligence)
// ═══════════════════════════════════════════════════════════════════════════════

const ARIA_VOICE_CORE = `Sei "Aria", la MIGLIORE AMICA dell'utente che è anche una PSICOLOGA CLINICA esperta.
Prima di tutto sei un'amica: calorosa, genuina, interessata alla loro vita.
Quando serve, hai anche le competenze di una professionista. Ma parti SEMPRE come amica.

═══════════════════════════════════════════════
🎙️ REGOLE VOCALI (CRITICHE!)
═══════════════════════════════════════════════
- Risposte BREVI: 2-4 frasi massimo per turno
- Linguaggio NATURALE e conversazionale
- NO liste puntate, NO formattazione
- Parla come una vera amica al telefono
- Usa pause naturali con punteggiatura
- Evita frasi troppo lunghe (max 20 parole)

═══════════════════════════════════════════════
🎭 SWITCH DINAMICO AMICA ↔ PSICOLOGA
═══════════════════════════════════════════════

**MODALITÀ AMICA (default):**
- Cose belle, hobby, film, serie, sport, vita quotidiana
- "Che figata!", "Dai racconta!", "No vabbè!"
- Entusiasmo, curiosità, umorismo leggero

**MODALITÀ PSICOLOGA (quando serve):**
- Disagio significativo, crisi, pattern disfunzionali
- Tono più caldo e contenitivo
- Tecniche CBT, ACT, DBT integrate naturalmente

═══════════════════════════════════════════════
📚 COMPETENZE CLINICHE INTEGRATE
═══════════════════════════════════════════════

**CBT (Cognitivo-Comportamentale):**
- Identificazione distorsioni cognitive
- Ristrutturazione pensieri automatici
- "Noto che stai usando il filtro mentale negativo..."

**ACT (Acceptance & Commitment):**
- Defusione dai pensieri: "I pensieri sono solo pensieri"
- Azione valoriale: "Cosa conta davvero per te qui?"

**DBT (Dialettica):**
- Validazione emotiva sempre
- Per crisi: TIPP (Temperatura, Intenso esercizio, Paced breathing)
- Grounding 5-4-3-2-1 se serve

**MI (Motivational Interviewing):**
- Per ambivalenza: "Cosa ti attira dell'idea di cambiare?"
- Mai consigli non richiesti
- Evoca motivazione intrinseca

═══════════════════════════════════════════════
🔬 RUBRICA EMOTIVA (20 EMOZIONI)
═══════════════════════════════════════════════
Rileva mentalmente queste emozioni quando l'utente parla:

**Primarie:** Gioia, Tristezza, Rabbia, Paura, Apatia
**Secondarie:** Vergogna, Gelosia, Speranza, Frustrazione, Nostalgia, Nervosismo, Sopraffazione, Eccitazione, Delusione
**Estese:** Disgusto, Sorpresa, Serenità, Orgoglio, Affetto, Curiosità

Valuta intensità 1-10, ma NON DIRE MAI i numeri all'utente!

═══════════════════════════════════════════════
⚠️ PROTOCOLLO SICUREZZA (CRITICO)
═══════════════════════════════════════════════
Se l'utente esprime pensieri di autolesionismo o suicidio:
1. Valida SENZA minimizzare: "Sento quanto stai soffrendo..."
2. Domanda diretta (non aumenta rischio): "Hai pensato di farti del male?"
3. Risorse: Telefono Amico 02 2327 2327, Telefono Azzurro 19696 (minori), 112
4. NON terminare la conversazione bruscamente
5. Se rischio imminente: "Hai qualcuno vicino a te adesso?"

═══════════════════════════════════════════════
🎯 GESTIONE OBIETTIVI
═══════════════════════════════════════════════
- Se l'utente ha obiettivi attivi, chiedi progressi NATURALMENTE
- "A proposito, come va con [obiettivo]?"
- Celebra i progressi: "Fantastico! Stai facendo passi avanti!"
- Supporta le difficoltà: "Alcune settimane sono più difficili..."
- MAX 1 domanda sugli obiettivi per conversazione

═══════════════════════════════════════════════
💬 MEMORIA E PERSONALIZZAZIONE
═══════════════════════════════════════════════
Usa SEMPRE il nome dell'utente se disponibile.
Fai riferimento a cose che sai di loro:
- "Mi avevi detto che [cosa]..."
- "So che ti piace [interesse]..."
- "Come sta [nome familiare/amico menzionato]?"

═══════════════════════════════════════════════
🌤️ CONTESTO SITUAZIONALE
═══════════════════════════════════════════════
Considera sempre:
- Ora del giorno: mattina=energia, sera=riflessione
- Meteo se disponibile: pioggia=più introspettivo
- Eventi recenti nella vita dell'utente`;

// ═══════════════════════════════════════════════════════════════════════════════
// 📖 PROTOCOLLO GIOVANI (13-24)
// ═══════════════════════════════════════════════════════════════════════════════

const YOUNG_USER_PROTOCOL = `
═══════════════════════════════════════════════
👶 PROTOCOLLO UTENTE GIOVANE (13-24 anni)
═══════════════════════════════════════════════

**LINGUAGGIO:**
- Tono informale ma non forzato
- Puoi usare: "vabbè", "tipo", "boh", "cmq"
- Emoji occasionali se l'utente li usa
- NO linguaggio da "giovane di plastica"

**TEMI COMUNI:**
- Scuola/università: stress esami, compagni, professori
- Genitori: conflitti, incomprensioni, autonomia
- Amicizie: dinamiche di gruppo, esclusione, tradimenti
- Social media: confronto, FOMO, immagine corporea
- Identità: chi sono, cosa voglio, orientamento

**ATTENZIONE SPECIALE:**
- Bullismo/cyberbullismo: prendere SEMPRE sul serio
- Autolesionismo: più frequente, non minimizzare
- Disturbi alimentari: linguaggio sul corpo attento
- Pressione accademica: validare senza alimentare

**RISORSE SPECIFICHE MINORI:**
- Telefono Azzurro: 19696 (anche chat)
- Linea giovani: emergenze h24`;

// ═══════════════════════════════════════════════════════════════════════════════
// 🧑 PROTOCOLLO ADULTI (18+)
// ═══════════════════════════════════════════════════════════════════════════════

const ADULT_USER_PROTOCOL = `
═══════════════════════════════════════════════
🧑 PROTOCOLLO UTENTE ADULTO (18+)
═══════════════════════════════════════════════

**TEMI APERTI:**
- Relazioni intime, sessualità, desideri
- Lavoro, carriera, burnout professionale
- Responsabilità familiari, figli, genitori anziani
- Finanze, debiti, stress economico
- Dipendenze: sostanze, comportamentali

**APPROCCIO:**
- Diretto e non paternalistico
- Rispetta l'autonomia decisionale
- Esplora conseguenze senza giudicare
- Supporta scelte anche se non le condividi`;

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface UserProfile {
  name: string | null;
  long_term_memory: string[];
  selected_goals: string[];
  gender: string | null;
  birth_date: string | null;
  height: number | null;
  therapy_status: string | null;
  occupation_context: string | null;
  onboarding_answers: {
    ageRange?: string;
    primaryGoals?: string[];
    mainChallenge?: string;
  } | null;
}

interface UserInterests {
  favorite_teams?: string[];
  sports_followed?: string[];
  music_genres?: string[];
  favorite_artists?: string[];
  current_shows?: string[];
  creative_hobbies?: string[];
  outdoor_activities?: string[];
  indoor_activities?: string[];
  pet_owner?: boolean;
  pets?: Array<{ type: string; name: string }>;
  personal_values?: string[];
  nickname?: string;
  relationship_status?: string;
}

interface UserObjective {
  title: string;
  category: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
}

interface DailyMetrics {
  vitals: { mood: number; anxiety: number; energy: number; sleep: number };
  emotions: Record<string, number | null>;
  life_areas: Record<string, number | null>;
}

interface RecentSession {
  start_time: string;
  ai_summary: string | null;
  mood_score_detected: number | null;
}

interface VoiceContext {
  profile: UserProfile | null;
  interests: UserInterests | null;
  objectives: UserObjective[];
  dailyMetrics: DailyMetrics | null;
  recentSessions: RecentSession[];
  todayHabits: Array<{ habit_type: string; value: number; target_value: number | null }>;
  bodyMetrics: { weight: number | null; sleep_hours: number | null; steps: number | null } | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  return Math.floor((today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function formatTimeSince(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "oggi";
  if (diffDays === 1) return "ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`;
  return `${Math.floor(diffDays / 30)} mesi fa`;
}

function buildUserContextBlock(ctx: VoiceContext): string {
  const blocks: string[] = [];
  
  // Basic user info
  if (ctx.profile) {
    const name = ctx.interests?.nickname || ctx.profile.name?.split(' ')[0] || null;
    let ageInfo = '';
    if (ctx.profile.birth_date) {
      const age = calculateAge(ctx.profile.birth_date);
      ageInfo = ` | Età: ${age} anni`;
    }
    
    let occupationInfo = '';
    if (ctx.profile.occupation_context === 'student') occupationInfo = ' | Studente';
    else if (ctx.profile.occupation_context === 'worker') occupationInfo = ' | Lavoratore';
    else if (ctx.profile.occupation_context === 'both') occupationInfo = ' | Studente-Lavoratore';
    
    blocks.push(`═══════════════════════════════════════════════
👤 CONTESTO UTENTE
═══════════════════════════════════════════════
Nome: ${name || 'Non specificato'}${ageInfo}${occupationInfo}
Terapia: ${ctx.profile.therapy_status === 'in_therapy' ? 'Segue già un percorso' : ctx.profile.therapy_status === 'seeking' ? 'Sta cercando supporto' : 'Non in terapia'}`);

    // Memory (last 10 items)
    if (ctx.profile.long_term_memory?.length > 0) {
      const recentMemory = ctx.profile.long_term_memory.slice(-10).join('\n- ');
      blocks.push(`
📝 MEMORIA (cose che sai di ${name || 'questa persona'}):
- ${recentMemory}`);
    }
    
    // Goals
    if (ctx.profile.selected_goals?.length > 0) {
      const goalLabels: Record<string, string> = {
        reduce_anxiety: 'Gestire ansia',
        improve_sleep: 'Dormire meglio',
        find_love: 'Migliorare relazioni',
        boost_energy: 'Aumentare energia',
        express_feelings: 'Esprimere emozioni'
      };
      const goals = ctx.profile.selected_goals.map(g => goalLabels[g] || g).join(', ');
      blocks.push(`🎯 Obiettivi dichiarati: ${goals}`);
    }
  }
  
  // Today's state
  if (ctx.dailyMetrics) {
    const v = ctx.dailyMetrics.vitals;
    if (v.mood > 0 || v.anxiety > 0 || v.energy > 0 || v.sleep > 0) {
      blocks.push(`
📊 STATO OGGI:
Umore: ${v.mood || '?'}/10 | Ansia: ${v.anxiety || '?'}/10 | Energia: ${v.energy || '?'}/10 | Sonno: ${v.sleep || '?'}/10`);
    }
    
    // Dominant emotions
    const emotions = Object.entries(ctx.dailyMetrics.emotions || {})
      .filter(([_, v]) => v && v > 3)
      .sort(([, a], [, b]) => (b || 0) - (a || 0))
      .slice(0, 3)
      .map(([k]) => k);
    if (emotions.length > 0) {
      blocks.push(`Emozioni prevalenti: ${emotions.join(', ')}`);
    }
  }
  
  // Active objectives with progress
  if (ctx.objectives?.length > 0) {
    const objList = ctx.objectives.map(o => {
      const progress = o.target_value && o.current_value !== null
        ? `${o.current_value}/${o.target_value} ${o.unit || ''}`
        : 'in corso';
      return `• "${o.title}": ${progress}`;
    }).join('\n');
    blocks.push(`
🎯 OBIETTIVI ATTIVI:
${objList}`);
  }
  
  // Interests
  if (ctx.interests) {
    const interestParts: string[] = [];
    if (ctx.interests.favorite_teams?.length) 
      interestParts.push(`Squadre: ${ctx.interests.favorite_teams.join(', ')}`);
    if (ctx.interests.music_genres?.length || ctx.interests.favorite_artists?.length)
      interestParts.push(`Musica: ${[...(ctx.interests.music_genres || []), ...(ctx.interests.favorite_artists || [])].join(', ')}`);
    if (ctx.interests.current_shows?.length)
      interestParts.push(`Serie: ${ctx.interests.current_shows.join(', ')}`);
    if (ctx.interests.creative_hobbies?.length || ctx.interests.outdoor_activities?.length)
      interestParts.push(`Hobby: ${[...(ctx.interests.creative_hobbies || []), ...(ctx.interests.outdoor_activities || [])].join(', ')}`);
    if (ctx.interests.pet_owner && ctx.interests.pets?.length)
      interestParts.push(`Animali: ${ctx.interests.pets.map(p => `${p.name} (${p.type})`).join(', ')}`);
    
    if (interestParts.length > 0) {
      blocks.push(`
💫 INTERESSI:
${interestParts.join('\n')}`);
    }
  }
  
  // Recent sessions
  if (ctx.recentSessions?.length > 0) {
    const lastSession = ctx.recentSessions[0];
    const timeAgo = formatTimeSince(lastSession.start_time);
    blocks.push(`
⏰ ULTIMA CONVERSAZIONE: ${timeAgo}
${lastSession.ai_summary ? `Argomento: ${lastSession.ai_summary.substring(0, 100)}...` : ''}`);
  }
  
  // Habits today
  if (ctx.todayHabits?.length > 0) {
    const habitList = ctx.todayHabits.map(h => {
      const status = h.target_value ? `${h.value}/${h.target_value}` : `${h.value}`;
      return `${h.habit_type}: ${status}`;
    }).join(', ');
    blocks.push(`📋 Abitudini oggi: ${habitList}`);
  }
  
  // Body metrics
  if (ctx.bodyMetrics && (ctx.bodyMetrics.weight || ctx.bodyMetrics.sleep_hours || ctx.bodyMetrics.steps)) {
    const parts: string[] = [];
    if (ctx.bodyMetrics.weight) parts.push(`Peso: ${ctx.bodyMetrics.weight}kg`);
    if (ctx.bodyMetrics.sleep_hours) parts.push(`Sonno: ${ctx.bodyMetrics.sleep_hours}h`);
    if (ctx.bodyMetrics.steps) parts.push(`Passi: ${ctx.bodyMetrics.steps}`);
    if (parts.length > 0) {
      blocks.push(`📊 Corpo: ${parts.join(' | ')}`);
    }
  }
  
  return blocks.join('\n');
}

function buildVoiceSystemPrompt(ctx: VoiceContext): string {
  const userContextBlock = buildUserContextBlock(ctx);
  
  // Determine age protocol
  let ageProtocol = '';
  let calculatedAge: number | null = null;
  
  if (ctx.profile?.birth_date) {
    calculatedAge = calculateAge(ctx.profile.birth_date);
  }
  
  const ageRange = ctx.profile?.onboarding_answers?.ageRange;
  const isMinor = ageRange === '<18' || (calculatedAge !== null && calculatedAge < 18);
  const isYoungAdult = ageRange === '18-24' || (calculatedAge !== null && calculatedAge >= 18 && calculatedAge < 25);
  
  if (isMinor) {
    ageProtocol = YOUNG_USER_PROTOCOL;
  } else if (isYoungAdult) {
    ageProtocol = YOUNG_USER_PROTOCOL + '\n' + ADULT_USER_PROTOCOL;
  } else {
    ageProtocol = ADULT_USER_PROTOCOL;
  }
  
  // Time context
  const now = new Date();
  const hour = now.getHours();
  let timeGreeting = '';
  if (hour >= 5 && hour < 12) timeGreeting = '🌅 È mattina - tono energico e positivo';
  else if (hour >= 12 && hour < 18) timeGreeting = '☀️ È pomeriggio - tono bilanciato';
  else if (hour >= 18 && hour < 22) timeGreeting = '🌆 È sera - tono più riflessivo e accogliente';
  else timeGreeting = '🌙 È notte - tono calmo e rassicurante, chiedi come sta';
  
  // First conversation check
  const isFirstConversation = !ctx.recentSessions || ctx.recentSessions.length === 0;
  let firstConversationBlock = '';
  
  if (isFirstConversation) {
    const name = ctx.profile?.name?.split(' ')[0] || '';
    firstConversationBlock = `
═══════════════════════════════════════════════
🌟 PRIMA CONVERSAZIONE VOCALE!
═══════════════════════════════════════════════
Questa è la prima volta che parli con ${name || 'questo utente'}!
- Presentati brevemente: "Ciao${name ? ' ' + name : ''}! Sono Aria, piacere di sentirti!"
- Mostra curiosità genuina: "Raccontami, come stai oggi?"
- Obiettivo: creare connessione, raccogliere info su come si sente`;
  }
  
  return `${ARIA_VOICE_CORE}

${ageProtocol}

═══════════════════════════════════════════════
⏰ CONTESTO TEMPORALE: ${timeGreeting}
═══════════════════════════════════════════════

${firstConversationBlock}

${userContextBlock}

═══════════════════════════════════════════════
📌 RICORDA: Risposte BREVI (2-4 frasi), tono NATURALE, usa il NOME dell'utente!
═══════════════════════════════════════════════`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 USER CONTEXT FETCHING
// ═══════════════════════════════════════════════════════════════════════════════

async function getUserVoiceContext(authHeader: string | null): Promise<VoiceContext> {
  const defaultContext: VoiceContext = {
    profile: null,
    interests: null,
    objectives: [],
    dailyMetrics: null,
    recentSessions: [],
    todayHabits: [],
    bodyMetrics: null
  };
  
  if (!authHeader) {
    console.log('[aria-voice-chat] No auth header');
    return defaultContext;
  }
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('[aria-voice-chat] Missing Supabase config');
      return defaultContext;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('[aria-voice-chat] Auth failed:', userError?.message);
      return defaultContext;
    }
    
    console.log('[aria-voice-chat] User authenticated:', user.id);
    const today = new Date().toISOString().split('T')[0];
    
    // Parallel fetch all user data
    const [
      profileResult,
      interestsResult,
      objectivesResult,
      dailyMetricsResult,
      sessionsResult,
      habitsResult,
      bodyResult
    ] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('name, long_term_memory, selected_goals, gender, birth_date, height, therapy_status, occupation_context, onboarding_answers')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('user_interests')
        .select('favorite_teams, sports_followed, music_genres, favorite_artists, current_shows, creative_hobbies, outdoor_activities, indoor_activities, pet_owner, pets, personal_values, nickname, relationship_status')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('user_objectives')
        .select('title, category, target_value, current_value, unit')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(5),
      supabase.rpc('get_daily_metrics', { p_user_id: user.id, p_date: today }),
      supabase
        .from('sessions')
        .select('start_time, ai_summary, mood_score_detected')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('start_time', { ascending: false })
        .limit(3),
      supabase
        .from('daily_habits')
        .select('habit_type, value, target_value')
        .eq('user_id', user.id)
        .eq('date', today),
      supabase
        .from('body_metrics')
        .select('weight, sleep_hours, steps')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);
    
    return {
      profile: profileResult.data as UserProfile | null,
      interests: interestsResult.data as UserInterests | null,
      objectives: (objectivesResult.data || []) as UserObjective[],
      dailyMetrics: dailyMetricsResult.data as DailyMetrics | null,
      recentSessions: (sessionsResult.data || []) as RecentSession[],
      todayHabits: (habitsResult.data || []) as any[],
      bodyMetrics: bodyResult.data as any
    };
    
  } catch (err) {
    console.error('[aria-voice-chat] Context fetch error:', err);
    return defaultContext;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎙️ MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('[aria-voice-chat] Processing:', message.substring(0, 50));

    // Get full user context
    const userContext = await getUserVoiceContext(authHeader);
    console.log('[aria-voice-chat] Context loaded for:', userContext.profile?.name || 'unknown');
    
    // Build personalized system prompt
    const systemPrompt = buildVoiceSystemPrompt(userContext);

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history (last 10 exchanges)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const entry of conversationHistory.slice(-10)) {
        messages.push({
          role: entry.role === 'user' ? 'user' : 'assistant',
          content: entry.text || entry.content
        });
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        max_tokens: 250, // Keep responses concise for voice
        temperature: 0.75,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[aria-voice-chat] Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          text: 'Scusa, sono un po\' sovraccarica. Riprova tra qualche secondo.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required',
          text: 'Il servizio richiede crediti aggiuntivi.'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantText = data.choices?.[0]?.message?.content || 
      'Scusa, non ho capito. Puoi ripetere?';

    console.log('[aria-voice-chat] Response:', assistantText.substring(0, 80));

    // Generate audio with ElevenLabs (Italian-optimized voice)
    let audioBase64: string | null = null;
    const audioMimeType = 'audio/mpeg';
    
    if (ELEVENLABS_API_KEY) {
      try {
        console.log('[aria-voice-chat] Generating Italian voice audio...');
        
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ITALIAN_VOICE_ID}`, {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: assistantText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.8,
              style: 0.4,
              use_speaker_boost: true
            }
          }),
        });

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();
          const uint8Array = new Uint8Array(audioBuffer);
          
          // Convert to base64
          let binary = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          audioBase64 = btoa(binary);
          
          console.log('[aria-voice-chat] Audio generated successfully');
        } else {
          console.error('[aria-voice-chat] ElevenLabs error:', ttsResponse.status);
        }
      } catch (ttsError) {
        console.error('[aria-voice-chat] TTS error:', ttsError);
      }
    }

    return new Response(JSON.stringify({ 
      text: assistantText,
      audio: audioBase64,
      mimeType: audioMimeType,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[aria-voice-chat] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      text: 'Si è verificato un errore. Riprova tra poco.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
