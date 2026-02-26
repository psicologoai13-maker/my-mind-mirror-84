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
  recentSessions: Array<{ start_time: string; ai_summary: string | null; transcript: string | null; mood_score_detected: number | null }>;
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
// 📦 BUILD DYNAMIC USER CONTEXT (lightweight, ~5-10k chars)
// ═══════════════════════════════════════════════════════════════════════════════

function buildDynamicContext(ctx: VoiceContext): string {
  const blocks: string[] = [];
  const now = new Date();
  
  // Time context
  const hour = now.getHours();
  let timeGreeting = '';
  if (hour >= 5 && hour < 12) timeGreeting = 'È mattina - tono energico e positivo';
  else if (hour >= 12 && hour < 18) timeGreeting = 'È pomeriggio - tono bilanciato';
  else if (hour >= 18 && hour < 22) timeGreeting = 'È sera - tono più riflessivo e accogliente';
  else timeGreeting = 'È notte - tono calmo e rassicurante';
  blocks.push(`⏰ CONTESTO TEMPORALE: ${timeGreeting}`);
  
  // Age protocol hint
  if (ctx.profile) {
    const name = ctx.interests?.nickname || ctx.profile.name?.split(' ')[0] || null;
    let calculatedAge: number | null = null;
    if (ctx.profile.birth_date) calculatedAge = calculateAge(ctx.profile.birth_date);
    
    let ageInfo = '';
    if (calculatedAge) ageInfo = ` | Età: ${calculatedAge} anni`;
    
    let occupationInfo = '';
    if (ctx.profile.occupation_context === 'student') occupationInfo = ' | Studente';
    else if (ctx.profile.occupation_context === 'worker') occupationInfo = ' | Lavoratore';
    else if (ctx.profile.occupation_context === 'both') occupationInfo = ' | Studente-Lavoratore';
    
    let heightInfo = ctx.profile.height ? ` | Altezza: ${ctx.profile.height}cm` : '';
    let genderInfo = ctx.profile.gender ? ` | Genere: ${ctx.profile.gender}` : '';
    
    const ageRange = ctx.profile.onboarding_answers?.ageRange;
    const isMinor = ageRange === '<18' || (calculatedAge !== null && calculatedAge < 18);
    
    blocks.push(`👤 UTENTE: ${name || 'Non specificato'}${ageInfo}${genderInfo}${occupationInfo}${heightInfo}${isMinor ? ' | ⚠️ MINORE - protocollo giovani attivo' : ''}\nTerapia: ${ctx.profile.therapy_status === 'in_therapy' || ctx.profile.therapy_status === 'active' ? 'Segue già un percorso' : ctx.profile.therapy_status === 'seeking' ? 'Sta cercando supporto' : ctx.profile.therapy_status === 'past' ? 'Ha fatto terapia in passato' : 'Non in terapia'}`);

    // Occupation clarification
    if (!ctx.profile.occupation_context) {
      const isYoungAdultAge = calculatedAge !== null && calculatedAge >= 18 && calculatedAge <= 27;
      const isYoungByRange = ageRange === '18-24';
      if (isYoungAdultAge || isYoungByRange) {
        blocks.push(`🎓💼 OCCUPAZIONE DA CHIARIRE: Chiedi naturalmente: "A proposito, cosa fai nella vita?"`);
      }
    }

    if (ctx.profile.long_term_memory?.length > 0) {
      const memory = ctx.profile.long_term_memory;
      const priorityTags = ['[EVENTO]', '[PERSONA]', '[HOBBY]', '[PIACE]', '[NON PIACE]', '[VIAGGIO]', '[LAVORO]'];
      const priorityItems = memory.filter(m => priorityTags.some(tag => m.includes(tag)));
      const recentItems = memory.slice(-25);
      const combined = [...new Set([...priorityItems, ...recentItems])];
      const selectedMemory = combined.slice(0, 50);
      blocks.push(`🧠 MEMORIA PERSONALE:\n- ${selectedMemory.join('\n- ')}

⚠️ REGOLE MEMORIA: Se l'utente chiede "ti ricordi?" → consulta la memoria. USA la tua conoscenza! NON chiedere cose che già sai.`);
    }
    
    if (ctx.profile.selected_goals?.length > 0) {
      const goalLabels: Record<string, string> = { reduce_anxiety: 'Gestire ansia', improve_sleep: 'Dormire meglio', find_love: 'Migliorare relazioni', boost_energy: 'Aumentare energia', express_feelings: 'Esprimere emozioni' };
      blocks.push(`🎯 Obiettivi dichiarati: ${ctx.profile.selected_goals.map(g => goalLabels[g] || g).join(', ')}`);
    }
    
    blocks.push(getPersonaStyle(ctx.profile.selected_goals || [], ctx.profile.onboarding_answers as OnboardingAnswers | null));

    const priorityMetrics = ctx.profile.dashboard_config?.priority_metrics || ['mood', 'anxiety', 'energy', 'sleep'];
    blocks.push(`FOCUS: ${getPriorityFocusDescription(priorityMetrics)}`);
  }
  
  // Daily metrics
  if (ctx.dailyMetrics) {
    const v = ctx.dailyMetrics.vitals;
    if (v.mood > 0 || v.anxiety > 0 || v.energy > 0 || v.sleep > 0) {
      blocks.push(`📊 STATO OGGI: Umore: ${v.mood || '?'}/10 | Ansia: ${v.anxiety || '?'}/10 | Energia: ${v.energy || '?'}/10 | Sonno: ${v.sleep || '?'}/10`);
    }
    
    const emotions = ctx.dailyMetrics.emotions || {};
    const emotionLabels: Record<string, string> = { joy: 'Gioia', sadness: 'Tristezza', anger: 'Rabbia', fear: 'Paura', apathy: 'Apatia' };
    const emotionItems: string[] = [];
    Object.entries(emotionLabels).forEach(([key, label]) => {
      if (emotions[key] && (emotions[key] as number) > 20) emotionItems.push(`${label} ${emotions[key]}%`);
    });
    if (emotionItems.length > 0) blocks.push(`💭 Emozioni: ${emotionItems.join(', ')}`);
    
    const la = ctx.dailyMetrics.life_areas || {};
    const areaLabels: Record<string, string> = { love: 'Amore', work: 'Lavoro', health: 'Salute', social: 'Sociale', growth: 'Crescita', family: 'Famiglia', school: 'Scuola', leisure: 'Tempo Libero', finances: 'Finanze' };
    const areaItems: string[] = [];
    Object.entries(areaLabels).forEach(([key, label]) => {
      if (la[key] && la[key] > 0) areaItems.push(`${label}: ${la[key]}/10`);
    });
    if (areaItems.length > 0) blocks.push(`🎯 Aree vita: ${areaItems.join(' | ')}`);
    
    const psychology = ctx.dailyMetrics.deep_psychology || {};
    const psychLabels: Record<string, string> = {
      rumination: 'Ruminazione', burnout_level: 'Burnout', motivation: 'Motivazione',
      self_efficacy: 'Autoefficacia', mental_clarity: 'Chiarezza'
    };
    const psychItems: string[] = [];
    Object.entries(psychLabels).forEach(([key, label]) => {
      const val = psychology[key];
      if (val !== null && val !== undefined && (val >= 7 || val <= 3)) {
        psychItems.push(`${label}: ${val >= 7 ? 'ALTO' : 'BASSO'}`);
      }
    });
    if (psychItems.length > 0) blocks.push(`🧠 Segnali: ${psychItems.join(', ')}`);
  }
  
  // Objectives
  if (ctx.objectives?.length > 0) {
    const objList = ctx.objectives.map(o => {
      const currVal = o.current_value !== null ? `${o.current_value}${o.unit || ''}` : '-';
      const targetVal = o.target_value !== null ? `${o.target_value}${o.unit || ''}` : '⚠️ mancante';
      return `• "${o.title}": Attuale: ${currVal} | Target: ${targetVal}`;
    }).join('\n');
    blocks.push(`🎯 OBIETTIVI ATTIVI:\n${objList}`);
  }
  
  // Missing life areas
  if (ctx.dailyMetrics || ctx.profile?.life_areas_scores) {
    const la = ctx.dailyMetrics?.life_areas || {};
    const profileScores = ctx.profile?.life_areas_scores || {};
    const areaLabels: Record<string, string> = { love: 'Amore', work: 'Lavoro', social: 'Amici', health: 'Salute', growth: 'Crescita' };
    const missing = Object.entries(areaLabels).filter(([k]) => {
      const dailyVal = la[k];
      const profileVal = profileScores[k];
      return (!dailyVal || dailyVal === 0) && (!profileVal || profileVal === 0);
    }).map(([, v]) => v);
    if (missing.length > 0) blocks.push(`📊 AREE MANCANTI: ${missing.join(', ')}`);
  }
  
  // Interests (compact)
  if (ctx.interests) {
    const parts: string[] = [];
    if (ctx.interests.favorite_teams?.length) parts.push(`🏆 ${ctx.interests.favorite_teams.join(', ')}`);
    if (ctx.interests.music_genres?.length || ctx.interests.favorite_artists?.length)
      parts.push(`🎵 ${[...(ctx.interests.music_genres || []), ...(ctx.interests.favorite_artists || [])].join(', ')}`);
    if (ctx.interests.current_shows?.length) parts.push(`📺 ${ctx.interests.current_shows.join(', ')}`);
    const allHobbies = [...(ctx.interests.creative_hobbies || []), ...(ctx.interests.outdoor_activities || []), ...(ctx.interests.indoor_activities || [])];
    if (allHobbies.length > 0) parts.push(`🎨 ${allHobbies.join(', ')}`);
    if (ctx.interests.pet_owner && ctx.interests.pets?.length)
      parts.push(`🐾 ${ctx.interests.pets.map((p: any) => `${p.name} (${p.type})`).join(', ')}`);
    if (ctx.interests.nickname) parts.push(`💬 Chiamami: ${ctx.interests.nickname}`);
    if (ctx.interests.sensitive_topics?.length) parts.push(`⚠️ Evita: ${ctx.interests.sensitive_topics.join(', ')}`);
    if (ctx.interests.relationship_status) parts.push(`❤️ ${ctx.interests.relationship_status}`);
    if (parts.length > 0) blocks.push(`💫 INTERESSI:\n${parts.join('\n')}`);
  }
  
  // Recent sessions + time since last
  if (ctx.recentSessions?.length > 0) {
    const sessionsInfo = ctx.recentSessions.slice(0, 3).map(s => {
      const timeAgo = formatTimeSince(s.start_time);
      let summary = s.ai_summary?.slice(0, 100);
      return `• ${timeAgo}: ${summary || 'conversazione breve'}`;
    }).join('\n');
    blocks.push(`⏰ RECENTI:\n${sessionsInfo}`);
    
    // Time since last session
    const lastSession = ctx.recentSessions[0];
    const diffMs = now.getTime() - new Date(lastSession.start_time).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 30) {
      blocks.push(`⏰ CI SIAMO APPENA SENTITI (${diffMinutes}min fa)! NON salutare come prima volta!`);
    } else if (diffDays >= 14) {
      blocks.push(`⏰ LUNGA ASSENZA (${diffDays} giorni!) - "Che bello risentirti!"`);
    }
    
    // Events follow-up
    if (ctx.userEvents?.length > 0) {
      const todayStr = now.toISOString().split('T')[0];
      const eventsNow: string[] = [];
      for (const event of ctx.userEvents.slice(0, 5)) {
        const diffEventDays = Math.floor((new Date(event.event_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isSameDay = event.event_date === todayStr;
        const loc = event.location ? ` a ${event.location}` : '';
        
        if (isSameDay) eventsNow.push(`🎉 OGGI: ${event.title}${loc}!`);
        else if (diffEventDays >= -3 && diffEventDays < 0 && !event.follow_up_done) eventsNow.push(`📋 ${event.title} (${Math.abs(diffEventDays)}gg fa) - CHIEDI!`);
        else if (diffEventDays > 0 && diffEventDays <= 3) eventsNow.push(`📅 ${event.title}${loc} - ${diffEventDays === 1 ? 'domani' : `tra ${diffEventDays}gg`}`);
      }
      if (eventsNow.length > 0) blocks.push(`🔄 EVENTI:\n${eventsNow.join('\n')}`);
    }
  }
  
  // First conversation
  const isFirstConversation = !ctx.recentSessions || ctx.recentSessions.length === 0;
  if (isFirstConversation) {
    const name = ctx.interests?.nickname || ctx.profile?.name?.split(' ')[0] || '';
    blocks.push(`🌟 PRIMA CONVERSAZIONE! Obiettivo: farti conoscere. UNA domanda per turno. Mostra interesse genuino.`);
  }
  
  // Habits
  if (ctx.todayHabits?.length > 0) {
    const habitLabels: Record<string, string> = {
      water: '💧Acqua', exercise: '🏃Esercizio', meditation: '🧘Meditazione',
      reading: '📚Lettura', sleep: '😴Sonno'
    };
    blocks.push(`📋 Abitudini: ${ctx.todayHabits.map(h => {
      const label = habitLabels[h.habit_type] || h.habit_type;
      return `${label}: ${h.target_value ? `${h.value}/${h.target_value}` : h.value}`;
    }).join(', ')}`);
  }
  
  // Body metrics
  if (ctx.bodyMetrics && (ctx.bodyMetrics.weight || ctx.bodyMetrics.sleep_hours || ctx.bodyMetrics.steps)) {
    const parts: string[] = [];
    if (ctx.bodyMetrics.weight) parts.push(`Peso: ${ctx.bodyMetrics.weight}kg`);
    if (ctx.bodyMetrics.sleep_hours) parts.push(`Sonno: ${ctx.bodyMetrics.sleep_hours}h`);
    if (ctx.bodyMetrics.steps) parts.push(`Passi: ${ctx.bodyMetrics.steps}`);
    if (parts.length > 0) blocks.push(`📊 Corpo: ${parts.join(' | ')}`);
  }
  
  return blocks.join('\n\n');
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
      supabase.from('sessions').select('start_time, ai_summary, transcript, mood_score_detected').eq('user_id', user.id).eq('status', 'completed').order('start_time', { ascending: false }).limit(5),
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
      const diffMs = new Date().getTime() - new Date(lastSession.start_time).getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 30) {
        firstMessage = `Ehi${userName !== 'Utente' ? ' ' + userName : ''}! Rieccoci! Tutto ok?`;
      } else if (diffMinutes < 180) {
        firstMessage = `Ehi${userName !== 'Utente' ? ' ' + userName : ''}! Bentornato! Come va?`;
      }
    } else {
      firstMessage = `Ciao${userName !== 'Utente' ? ' ' + userName : ''}! Sono Aria, piacere di sentirti! Come stai oggi?`;
    }

    console.log(`[elevenlabs-context] Dynamic context for ${userName}: ${dynamicContext.length} chars (was ~72k, now lightweight)`);

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
