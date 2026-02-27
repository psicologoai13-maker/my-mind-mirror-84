import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 INTERFACES & HELPERS (dynamic context only)
// ═══════════════════════════════════════════════════════════════════════════════

interface OnboardingAnswers {
  goal?: string;
  primaryGoals?: string[];
  mood?: number;
  sleepIssues?: string;
  mainChallenge?: string;
  lifeSituation?: string;
  supportType?: string;
  anxietyLevel?: number;
  ageRange?: string;
  motivations?: string[];
}

interface DashboardConfig {
  priority_metrics?: string[];
  secondary_metrics?: string[];
  hidden_metrics?: string[];
  theme?: string;
}

interface VoiceContext {
  profile: {
    name: string | null;
    long_term_memory: string[];
    selected_goals: string[];
    occupation_context: string | null;
    gender: string | null;
    birth_date: string | null;
    height: number | null;
    therapy_status: string | null;
    onboarding_answers: any;
    dashboard_config: DashboardConfig | null;
    life_areas_scores: Record<string, number | null> | null;
  } | null;
  interests: any;
  objectives: Array<{ title: string; category: string; target_value: number | null; current_value: number | null; starting_value: number | null; unit: string | null }>;
  dailyMetrics: any;
  recentSessions: Array<{ start_time: string; end_time: string | null; ai_summary: string | null; transcript: string | null; mood_score_detected: number | null; emotion_tags: string[] | null }>;
  todayHabits: Array<{ habit_type: string; value: number; target_value: number | null }>;
  bodyMetrics: { weight: number | null; sleep_hours: number | null; steps: number | null; active_minutes: number | null; resting_heart_rate: number | null } | null;
  userEvents: Array<{ id: string; title: string; event_type: string; location: string | null; event_date: string; event_time: string | null; status: string; follow_up_done: boolean }>;
}

// Persona style based on onboarding preferences
const getPersonaStyle = (goals: string[], onboardingAnswers: OnboardingAnswers | null): string => {
  const supportType = onboardingAnswers?.supportType;
  
  if (supportType === 'listener') return `STILE: ASCOLTATORE ATTIVO - Lascia parlare, feedback minimi, no consigli non richiesti.`;
  if (supportType === 'advisor') return `STILE: CONSULENTE PRATICO - Suggerimenti concreti, problem-solving, tecniche CBT.`;
  if (supportType === 'challenger') return `STILE: SFIDA COSTRUTTIVA - Domande riflessione, sfida convinzioni limitanti.`;
  if (supportType === 'comforter') return `STILE: SUPPORTO EMOTIVO - Validazione, rassicurazione, tono caldo.`;

  if (goals.includes('reduce_anxiety') || onboardingAnswers?.goal === 'anxiety' || onboardingAnswers?.mainChallenge === 'general_anxiety') {
    return `STILE: CALMO & RASSICURANTE (Focus Ansia)`;
  }
  if (goals.includes('boost_energy') || goals.includes('growth') || onboardingAnswers?.goal === 'growth') {
    return `STILE: ENERGICO & ORIENTATO ALL'AZIONE`;
  }
  if (goals.includes('express_feelings') || goals.includes('find_love') || onboardingAnswers?.mainChallenge === 'relationships') {
    return `STILE: EMPATICO`;
  }
  if (goals.includes('improve_sleep') || onboardingAnswers?.goal === 'sleep') {
    return `STILE: RILASSANTE & GUIDATO`;
  }
  if (onboardingAnswers?.mainChallenge === 'work_stress') return `STILE: FOCUS BURNOUT`;
  if (onboardingAnswers?.mainChallenge === 'self_esteem') return `STILE: FOCUS AUTOSTIMA`;
  if (onboardingAnswers?.mainChallenge === 'loneliness') return `STILE: FOCUS SOLITUDINE`;
  
  return `STILE: BILANCIATO`;
};

const getPriorityFocusDescription = (metrics: string[]): string => {
  const labels: Record<string, string> = {
    mood: 'umore', anxiety: 'ansia', energy: 'energia', sleep: 'sonno',
    love: 'relazioni', social: 'vita sociale', work: 'lavoro', growth: 'crescita',
    stress: 'stress', loneliness: 'solitudine',
  };
  return metrics.slice(0, 4).map(m => labels[m] || m).join(', ');
};

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  return Math.floor((today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function formatTimeSince(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "oggi";
  if (diffDays === 1) return "ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`;
  return `${Math.floor(diffDays / 30)} mesi fa`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 BUILD DYNAMIC USER CONTEXT (compact, max 800 chars for WebRTC)
// ═══════════════════════════════════════════════════════════════════════════════

function buildDynamicContext(ctx: VoiceContext): string {
  const parts: string[] = [];
  const now = new Date();

  // ── 4. ORA E GIORNO (Aria-format) ──
  const giorni = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const hh = now.getHours();
  const mm = String(now.getMinutes()).padStart(2, '0');
  const periodo = hh >= 5 && hh < 12 ? 'mattina' : hh < 18 ? 'pomeriggio' : hh < 22 ? 'sera' : 'notte';
  const tono = hh >= 5 && hh < 12 ? 'energico' : hh < 18 ? 'bilanciato' : hh < 22 ? 'riflessivo' : 'calmo';
  parts.push(`⏰ ${giorni[now.getDay()]} ${now.getDate()}/${now.getMonth() + 1} ore ${hh}:${mm} (${periodo}) - tono ${tono}`);

  // ── 1. TEMPO DALL'ULTIMA SESSIONE (usa end_time se disponibile) ──
  if (ctx.recentSessions?.length > 0) {
    const last = ctx.recentSessions[0];
    const refTime = last.end_time ? new Date(last.end_time) : new Date(last.start_time);
    const diffMs = now.getTime() - refTime.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    let ago: string;
    if (diffMin < 60) ago = `${diffMin}min fa`;
    else if (diffH < 24) ago = `${diffH}h fa`;
    else ago = `${diffD}gg fa`;

    let note = '';
    if (diffMin < 30) note = ' → appena sentiti, NO saluto iniziale';
    else if (diffD > 3 && diffD <= 14) note = ' → accenna assenza naturalmente';
    else if (diffD > 14) note = ' → lunga assenza, "Che bello risentirti!"';
    parts.push(`🕐 Ultima conv: ${ago}${note}`);

    // ── 2. STATO EMOTIVO ULTIMA SESSIONE ──
    const mood = last.mood_score_detected;
    const emo = last.emotion_tags?.slice(0, 3);
    const emoParts: string[] = [];
    if (mood) emoParts.push(`umore ${mood}/10`);
    if (emo?.length) emoParts.push(emo.join(', '));
    if (emoParts.length > 0) parts.push(`💭 Stato prec: ${emoParts.join(' | ')}`);
  } else {
    parts.push(`🌟 PRIMA CONVERSAZIONE - presentati, UNA domanda per turno`);
  }

  // ── 3. EVENTI IMMINENTI (±12h) + follow-up prioritario ──
  if (ctx.userEvents?.length > 0) {
    const evLines: string[] = [];
    const ms12h = 12 * 3600000;
    for (const ev of ctx.userEvents.slice(0, 8)) {
      const evTime = ev.event_time
        ? new Date(`${ev.event_date}T${ev.event_time}`)
        : new Date(ev.event_date + 'T12:00:00');
      const diff = evTime.getTime() - now.getTime();

      if (diff >= -ms12h && diff < 0 && !ev.follow_up_done) {
        const hAgo = Math.max(1, Math.floor(Math.abs(diff) / 3600000));
        evLines.push(`📋 ${ev.title} (${hAgo}h fa) - CHIEDI COM'È ANDATA`);
      } else if (diff >= 0 && diff <= ms12h) {
        const hLeft = Math.max(1, Math.floor(diff / 3600000));
        const loc = ev.location ? ` a ${ev.location}` : '';
        evLines.push(`📅 ${ev.title}${loc} tra ${hLeft}h`);
      }
    }
    if (evLines.length > 0) parts.push(evLines.slice(0, 3).join('\n'));
  }

  // ── UTENTE (compact) ──
  if (ctx.profile) {
    const name = ctx.interests?.nickname || ctx.profile.name?.split(' ')[0] || '?';
    let info = name;
    if (ctx.profile.birth_date) info += `, ${calculateAge(ctx.profile.birth_date)}a`;
    if (ctx.profile.gender) info += `, ${ctx.profile.gender}`;
    const occMap: Record<string, string> = { student: 'stud', worker: 'lav', both: 'stud+lav' };
    if (ctx.profile.occupation_context) info += `, ${occMap[ctx.profile.occupation_context] || ctx.profile.occupation_context}`;
    const ageRange = ctx.profile.onboarding_answers?.ageRange;
    const age = ctx.profile.birth_date ? calculateAge(ctx.profile.birth_date) : null;
    if (ageRange === '<18' || (age !== null && age < 18)) info += ' ⚠️MINORE';
    parts.push(`👤 ${info}`);
  }

  // ── STILE PERSONA ──
  parts.push(getPersonaStyle(ctx.profile?.selected_goals || [], ctx.profile?.onboarding_answers as OnboardingAnswers | null));

  // ── OBIETTIVI (compact) ──
  if (ctx.profile?.selected_goals?.length > 0) {
    const gl: Record<string, string> = { reduce_anxiety: 'ansia', improve_sleep: 'sonno', find_love: 'relazioni', boost_energy: 'energia', express_feelings: 'emozioni' };
    parts.push(`🎯 ${ctx.profile.selected_goals.map(g => gl[g] || g).join(', ')}`);
  }

  // ── MEMORIE CHIAVE (compact, prioritarie) ──
  if (ctx.profile?.long_term_memory?.length > 0) {
    const memory = ctx.profile.long_term_memory;
    const priorityTags = ['[EVENTO]', '[PERSONA]', '[HOBBY]', '[PIACE]', '[LAVORO]'];
    const priority = memory.filter(m => priorityTags.some(tag => m.includes(tag)));
    const selected = (priority.length > 0 ? priority : memory).slice(0, 5);
    const mems = selected.map(m => m.length > 50 ? m.slice(0, 47) + '...' : m);
    parts.push(`🧠 ${mems.join(' | ')}`);
  }

  // ── STATO OGGI (if available, ultra-compact) ──
  if (ctx.dailyMetrics) {
    const v = ctx.dailyMetrics.vitals;
    if (v.mood > 0 || v.anxiety > 0 || v.energy > 0) {
      const items: string[] = [];
      if (v.mood > 0) items.push(`U:${v.mood}`);
      if (v.anxiety > 0) items.push(`A:${v.anxiety}`);
      if (v.energy > 0) items.push(`E:${v.energy}`);
      if (v.sleep > 0) items.push(`S:${v.sleep}`);
      parts.push(`📊 Oggi ${items.join(' ')}/10`);
    }
  }

  // Enforce 800 char limit for WebRTC
  let result = parts.join('\n');
  if (result.length > 800) {
    result = result.slice(0, 797) + '...';
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 DATA FETCHING (12 parallel queries)
// ═══════════════════════════════════════════════════════════════════════════════

async function getUserVoiceContext(authHeader: string): Promise<VoiceContext> {
  const defaultContext: VoiceContext = {
    profile: null, interests: null, objectives: [], dailyMetrics: null,
    recentSessions: [], todayHabits: [], bodyMetrics: null, userEvents: []
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return defaultContext;

    const today = new Date().toISOString().split("T")[0];
    const pastDate = new Date(); pastDate.setDate(pastDate.getDate() - 7);
    const futureDate = new Date(); futureDate.setDate(futureDate.getDate() + 30);

    const [
      profileResult, interestsResult, objectivesResult, dailyMetricsResult,
      recentSessionsResult, todayHabitsResult, bodyMetricsResult, userEventsResult,
      userMemoriesResult, sessionSnapshotsResult, conversationTopicsResult, habitStreaksResult,
    ] = await Promise.all([
      supabase.from('user_profiles').select('name, long_term_memory, selected_goals, occupation_context, gender, birth_date, height, therapy_status, onboarding_answers, dashboard_config, life_areas_scores').eq('user_id', user.id).single(),
      supabase.from('user_interests').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_objectives').select('title, category, target_value, current_value, starting_value, unit').eq('user_id', user.id).eq('status', 'active'),
      supabase.rpc('get_daily_metrics', { p_user_id: user.id, p_date: today }),
      supabase.from('sessions').select('start_time, end_time, ai_summary, transcript, mood_score_detected, emotion_tags').eq('user_id', user.id).eq('status', 'completed').order('start_time', { ascending: false }).limit(5),
      supabase.from('daily_habits').select('habit_type, value, target_value').eq('user_id', user.id).eq('date', today),
      supabase.from('body_metrics').select('weight, sleep_hours, steps, active_minutes, resting_heart_rate').eq('user_id', user.id).order('date', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('user_events').select('id, title, event_type, location, event_date, event_time, status, follow_up_done').eq('user_id', user.id).gte('event_date', pastDate.toISOString().split('T')[0]).lte('event_date', futureDate.toISOString().split('T')[0]).in('status', ['upcoming', 'happening', 'passed']).order('event_date', { ascending: true }).limit(20),
      supabase.from('user_memories').select('id, category, fact, importance, last_referenced_at').eq('user_id', user.id).eq('is_active', true).order('importance', { ascending: false }).order('last_referenced_at', { ascending: false }).limit(80),
      supabase.from('session_context_snapshots').select('key_topics, unresolved_issues, action_items, context_summary, dominant_emotion, follow_up_needed, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('conversation_topics').select('topic, mention_count, is_sensitive, avoid_unless_introduced').eq('user_id', user.id).order('mention_count', { ascending: false }).limit(30),
      supabase.from('habit_streaks').select('habit_type, current_streak, longest_streak').eq('user_id', user.id),
    ]);

    const profile = profileResult.data;
    const userMemories = userMemoriesResult.data || [];
    const sessionSnapshots = sessionSnapshotsResult.data || [];
    const conversationTopics = conversationTopicsResult.data || [];
    const habitStreaks = habitStreaksResult.data || [];

    // Format structured memories
    const memoryByCategory: Record<string, string[]> = {};
    for (const mem of userMemories) {
      const cat = mem.category || 'generale';
      if (!memoryByCategory[cat]) memoryByCategory[cat] = [];
      memoryByCategory[cat].push(mem.fact);
    }
    const categoryLabels: Record<string, string> = {
      persona: '[PERSONA]', hobby: '[HOBBY]', viaggio: '[VIAGGIO]', lavoro: '[LAVORO]',
      evento: '[EVENTO]', preferenza: '[PIACE]', famiglia: '[FAMIGLIA]', salute: '[SALUTE]',
      obiettivo: '[OBIETTIVO]', generale: ''
    };
    const structuredMemory: string[] = [];
    for (const [category, facts] of Object.entries(memoryByCategory)) {
      const prefix = categoryLabels[category] || `[${category.toUpperCase()}]`;
      for (const fact of facts) structuredMemory.push(prefix ? `${prefix} ${fact}` : fact);
    }

    // Merge legacy + structured
    const legacyMemory: string[] = profile?.long_term_memory || [];
    const structuredFacts = new Set(structuredMemory.map(m => m.toLowerCase()));
    const dedupedLegacy = legacyMemory.filter(m => !structuredFacts.has(m.toLowerCase()));
    const formattedMemory: string[] = [...structuredMemory, ...dedupedLegacy].slice(0, 60);

    // Session context for narrative continuity
    if (sessionSnapshots.length > 0) {
      let block = '📝 SESSIONI PRECEDENTI:\n';
      sessionSnapshots.slice(0, 3).forEach((s: any, i: number) => {
        const sessionDate = new Date(s.created_at).toLocaleDateString('it-IT');
        block += `${i + 1}. (${sessionDate}): ${(s.key_topics || []).join(', ') || 'N/A'}`;
        if (s.unresolved_issues?.length > 0) block += ` | Aperti: ${s.unresolved_issues.join('; ')}`;
        if (s.follow_up_needed) block += ' ⚠️FOLLOW-UP';
        block += '\n';
      });
      formattedMemory.push(block);
    }

    // Sensitive topics
    const sensTopics = conversationTopics.filter((t: any) => t.is_sensitive || t.avoid_unless_introduced);
    if (sensTopics.length > 0) {
      formattedMemory.push(`⚠️ ARGOMENTI SENSIBILI (NON introdurre MAI per primo): ${sensTopics.map((t: any) => t.topic).join(', ')}`);
    }

    // Habit streaks
    const significantStreaks = habitStreaks.filter((s: any) => s.current_streak >= 3);
    if (significantStreaks.length > 0) {
      formattedMemory.push(`🔥 STREAK: ${significantStreaks.map((s: any) => `${s.habit_type}: ${s.current_streak}gg${s.current_streak === s.longest_streak && s.current_streak > 1 ? ' (Record!)' : ''}`).join(', ')}`);
    }

    console.log(`[elevenlabs-context] Context: memories=${userMemories.length}, snapshots=${sessionSnapshots.length}, topics=${conversationTopics.length}, streaks=${habitStreaks.length}`);

    return {
      profile: profile ? {
        name: profile.name, long_term_memory: formattedMemory,
        selected_goals: profile.selected_goals || [], occupation_context: profile.occupation_context,
        gender: profile.gender, birth_date: profile.birth_date,
        height: profile.height,
        therapy_status: profile.therapy_status, onboarding_answers: profile.onboarding_answers,
        dashboard_config: profile.dashboard_config as DashboardConfig | null,
        life_areas_scores: profile.life_areas_scores as Record<string, number | null> | null,
      } : null,
      interests: interestsResult.data,
      objectives: (objectivesResult.data || []).map((o: any) => ({ title: o.title, category: o.category, target_value: o.target_value, current_value: o.current_value, starting_value: o.starting_value, unit: o.unit })),
      dailyMetrics: dailyMetricsResult.data,
      recentSessions: (recentSessionsResult.data || []) as any,
      todayHabits: (todayHabitsResult.data || []).map((h: any) => ({ habit_type: h.habit_type, value: h.value, target_value: h.target_value })),
      bodyMetrics: bodyMetricsResult.data,
      userEvents: (userEventsResult.data || []).map((e: any) => ({ id: e.id, title: e.title, event_type: e.event_type, location: e.location, event_date: e.event_date, event_time: e.event_time, status: e.status, follow_up_done: e.follow_up_done })),
    };
  } catch (error) {
    console.error("[elevenlabs-context] Error fetching context:", error);
    return defaultContext;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER - Returns ONLY dynamic user context (static prompt lives in ElevenLabs dashboard)
// ═══════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = await getUserVoiceContext(authHeader);
    const dynamicContext = buildDynamicContext(ctx);

    // Build first message
    const userName = ctx.interests?.nickname || ctx.profile?.name?.split(' ')[0] || 'Utente';
    
    let firstMessage = `Ciao${userName !== 'Utente' ? ' ' + userName : ''}! Come stai?`;
    
    if (ctx.recentSessions?.length > 0) {
      const lastSession = ctx.recentSessions[0];
      const refTime = lastSession.end_time ? new Date(lastSession.end_time) : new Date(lastSession.start_time);
      const diffMs = new Date().getTime() - refTime.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 30) {
        firstMessage = `Ehi${userName !== 'Utente' ? ' ' + userName : ''}! Rieccoci! Tutto ok?`;
      } else if (diffMinutes < 180) {
        firstMessage = `Ehi${userName !== 'Utente' ? ' ' + userName : ''}! Bentornato! Come va?`;
      }
    } else {
      firstMessage = `Ciao${userName !== 'Utente' ? ' ' + userName : ''}! Sono Aria, piacere di sentirti! Come stai oggi?`;
    }

    console.log(`[elevenlabs-context] Dynamic context for ${userName}: ${dynamicContext.length}/800 chars`);

    return new Response(
      JSON.stringify({
        user_name: userName,
        dynamic_context: dynamicContext,
        first_message: firstMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[elevenlabs-context] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        user_name: "Utente",
        dynamic_context: "",
        first_message: "Ciao! Sono Aria, come stai?",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
