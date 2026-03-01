import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function generateAriaHomeMessage(
  profile: any,
  timeSlot: string,
  healthkit: any,
  lastSession: any,
  memories: any[]
): Promise<string> {
  const apiKey = Deno.env.get('GOOGLE_API_KEY');
  if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');

  const userName = profile.name || 'amico';
  const goals = profile.selected_goals || [];

  // Build compact context
  const contextParts: string[] = [];

  if (healthkit?.sleep_hours) {
    contextParts.push(`Sonno stanotte: ${healthkit.sleep_hours}h`);
  }
  if (healthkit?.steps) {
    contextParts.push(`Passi oggi: ${healthkit.steps}`);
  }
  if (lastSession) {
    const daysAgo = Math.floor((Date.now() - new Date(lastSession.start_time).getTime()) / 86400000);
    const sessionInfo = daysAgo === 0 ? 'Ultima sessione: oggi'
      : daysAgo === 1 ? 'Ultima sessione: ieri'
      : `Ultima sessione: ${daysAgo} giorni fa`;
    contextParts.push(sessionInfo);
    if (lastSession.ai_summary) {
      contextParts.push(`Riassunto ultima sessione: ${lastSession.ai_summary.substring(0, 200)}`);
    }
  }
  if (memories && memories.length > 0) {
    const memTexts = memories.map((m: any) => m.fact).join('; ');
    contextParts.push(`Ricordi recenti: ${memTexts.substring(0, 300)}`);
  }
  if (goals.length > 0) {
    contextParts.push(`Obiettivi attivi: ${goals.join(', ')}`);
  }

  const prompt = `Sei Aria, assistente AI di benessere psicologico. Genera UN messaggio per ${userName} da mostrare nella Home dell'app.

CONTESTO:
- Fascia oraria: ${timeSlot}
${contextParts.map(c => `- ${c}`).join('\n')}

REGOLE:
- MASSIMO 120 caratteri
- Tono da migliore amica attenta, NON da terapeuta
- Fai riferimento a UN dato specifico del contesto (sonno, sessione, obiettivo, ricordo)
- Se è mattina: tono energico. Se è sera: tono riflessivo e caldo
- NON usare emoji
- NON fare domande retoriche generiche tipo "Come stai?"
- Se non ci sono dati specifici, fai un commento sulla giornata/momento
- Rispondi SOLO con il messaggio, nient'altro

ESEMPIO BUONO: "Ho visto che hai dormito poco stanotte. Prenditi un momento per te oggi."
ESEMPIO CATTIVO: "Ciao! Come stai oggi? Spero bene! 😊"`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 100,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

  // Truncate safety: max 150 chars
  return text.length > 150 ? text.substring(0, 147) + '...' : text;
}

function getFallbackMessage(timeSlot: string, name: string | null): string {
  const n = name || 'amico';
  switch (timeSlot) {
    case 'morning': return `Buongiorno ${n}. Oggi è un nuovo giorno, iniziamolo insieme.`;
    case 'afternoon': return `Ciao ${n}, come sta andando il pomeriggio?`;
    case 'evening': return `Buonasera ${n}. Prenditi un momento per respirare.`;
    case 'night': return `${n}, è tardi. Riposati bene stanotte.`;
    default: return `Ciao ${n}, sono qui quando vuoi.`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.log("[home-context] Missing Supabase config");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const authHeader = req.headers.get("Authorization");
    const bodyAccessToken = body.accessToken;
    const bodyUserId = body.userId;
    const timezoneOffset = body.offset ?? 0; // minutes offset from UTC (e.g. 60 for Rome CET)

    // ─────────────────────────────────────────────
    // 1. AUTHENTICATION (triple fallback from ai-chat)
    // ─────────────────────────────────────────────
    let authenticatedUserId: string | null = null;
    let supabase: any = null;

    // === AUTH METHOD 1: Authorization header JWT ===
    if (authHeader) {
      const anonKeyPrefix = supabaseKey.substring(0, 30);
      const headerTokenPrefix = authHeader.replace("Bearer ", "").substring(0, 30);
      const isAnonKey = headerTokenPrefix === anonKeyPrefix;

      if (isAnonKey) {
        console.log("[home-context] ⚠️ Authorization header contains ANON KEY - trying fallbacks");
      } else {
        try {
          supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } },
          });
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (!userError && user) {
            authenticatedUserId = user.id;
            console.log("[home-context] ✅ Auth Method 1 (header JWT): User", user.id);
          } else {
            console.log("[home-context] ❌ Auth Method 1 failed:", userError?.message);
          }
        } catch (e) {
          console.log("[home-context] ❌ Auth Method 1 error:", e.message);
        }
      }
    }

    // === AUTH METHOD 2: accessToken in request body ===
    if (!authenticatedUserId && bodyAccessToken) {
      try {
        const tokenAuthHeader = bodyAccessToken.startsWith("Bearer ")
          ? bodyAccessToken
          : `Bearer ${bodyAccessToken}`;
        supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: tokenAuthHeader } },
        });
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) {
          authenticatedUserId = user.id;
          console.log("[home-context] ✅ Auth Method 2 (body accessToken): User", user.id);
        } else {
          console.log("[home-context] ❌ Auth Method 2 failed:", userError?.message);
        }
      } catch (e) {
        console.log("[home-context] ❌ Auth Method 2 error:", e.message);
      }
    }

    // === AUTH METHOD 3: userId in body + service role (last resort) ===
    if (!authenticatedUserId && bodyUserId && serviceRoleKey) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(bodyUserId)) {
        authenticatedUserId = bodyUserId;
        supabase = createClient(supabaseUrl, serviceRoleKey);
        console.log("[home-context] ⚠️ Auth Method 3 (body userId + service role): User", bodyUserId);
      } else {
        console.log("[home-context] ❌ Auth Method 3: Invalid userId format");
      }
    }

    if (!authenticatedUserId || !supabase) {
      console.log("[home-context] ❌ ALL auth methods failed");
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────
    // 2. LOCAL TIME & TIME SLOT
    // ─────────────────────────────────────────────
    const nowUtc = new Date();
    const localMs = nowUtc.getTime() + timezoneOffset * 60 * 1000;
    const localDate = new Date(localMs);
    const localHour = localDate.getUTCHours();

    type TimeSlot = "night" | "morning" | "afternoon" | "evening";
    let timeSlot: TimeSlot;
    if (localHour >= 0 && localHour <= 5) timeSlot = "night";
    else if (localHour >= 6 && localHour <= 11) timeSlot = "morning";
    else if (localHour >= 12 && localHour <= 17) timeSlot = "afternoon";
    else timeSlot = "evening";

    const todayStr = localDate.toISOString().split("T")[0];

    // ─────────────────────────────────────────────
    // 3-8. PARALLEL DATA FETCH
    // ─────────────────────────────────────────────
    const fortyEightHoursAgo = new Date(nowUtc.getTime() - 48 * 60 * 60 * 1000).toISOString();

    const [
      profileResult,
      checkinResult,
      sessionsTodayResult,
      streakResult,
      lastSessionResult,
      followUpResult,
      healthkitResult,
      rewardPointsResult,
      levelsResult,
      userMemoriesResult,
    ] = await Promise.all([
      // 3. PROFILE
      supabase
        .from("user_profiles")
        .select("name, current_level, active_dashboard_metrics, aria_home_message, aria_home_message_at, selected_goals")
        .eq("user_id", authenticatedUserId)
        .single(),

      // 4a. STREAK - daily_checkins for today
      supabase
        .from("daily_checkins")
        .select("id")
        .eq("user_id", authenticatedUserId)
        .gte("created_at", `${todayStr}T00:00:00`)
        .lt("created_at", `${todayStr}T23:59:59.999`)
        .limit(1),

      // 4b. STREAK - sessions today
      supabase
        .from("sessions")
        .select("id")
        .eq("user_id", authenticatedUserId)
        .gte("start_time", `${todayStr}T00:00:00`)
        .lt("start_time", `${todayStr}T23:59:59.999`)
        .limit(1),

      // 4c. STREAK - longest active streak
      supabase
        .from("habit_streaks")
        .select("habit_type, current_streak, longest_streak")
        .eq("user_id", authenticatedUserId)
        .gt("current_streak", 0)
        .order("current_streak", { ascending: false })
        .limit(1),

      // 5. SUGGESTED_EXERCISE + ARIA MESSAGE - last completed session
      supabase
        .from("sessions")
        .select("anxiety_score_detected, start_time, ai_summary")
        .eq("user_id", authenticatedUserId)
        .eq("status", "completed")
        .order("start_time", { ascending: false })
        .limit(1),

      // 6. FOLLOW_UP - last unresolved snapshot
      supabase
        .from("session_context_snapshots")
        .select("key_topics, unresolved_issues, updated_at")
        .eq("user_id", authenticatedUserId)
        .eq("follow_up_needed", true)
        .gte("updated_at", fortyEightHoursAgo)
        .order("updated_at", { ascending: false })
        .limit(1),

      // 7. HEALTHKIT
      supabase
        .from("healthkit_data")
        .select("sleep_hours, steps, heart_rate_avg")
        .eq("user_id", authenticatedUserId)
        .eq("date", todayStr)
        .single(),

      // 8a. LEVEL_PROGRESS - reward points
      supabase
        .from("user_reward_points")
        .select("total_points")
        .eq("user_id", authenticatedUserId)
        .single(),

      // 8b. LEVEL_PROGRESS - all levels for lookup
      supabase
        .from("gamification_levels")
        .select("level, name, points_required")
        .order("level", { ascending: true }),

      // 9. USER_MEMORIES - last 3 memories for Aria home message context
      supabase
        .from("user_memories")
        .select("fact, category, extracted_at")
        .eq("user_id", authenticatedUserId)
        .eq("is_active", true)
        .order("extracted_at", { ascending: false })
        .limit(3),
    ]);

    // ─────────────────────────────────────────────
    // 3. PROFILE
    // ─────────────────────────────────────────────
    const profile = profileResult.data ?? {
      name: null,
      current_level: 1,
      active_dashboard_metrics: ["mood", "anxiety", "energy", "sleep"],
      aria_home_message: null,
      aria_home_message_at: null,
      selected_goals: [],
    };

    // ─────────────────────────────────────────────
    // 4. STREAK
    // ─────────────────────────────────────────────
    const hasCheckinToday = (checkinResult.data?.length ?? 0) > 0;
    const hasSessionToday = (sessionsTodayResult.data?.length ?? 0) > 0;
    const streakToday = hasCheckinToday || hasSessionToday;
    const bestActiveStreak = streakResult.data?.[0] ?? null;

    const streak = {
      streak_today: streakToday,
      best_active: bestActiveStreak
        ? {
            habit_type: bestActiveStreak.habit_type,
            current_streak: bestActiveStreak.current_streak,
            longest_streak: bestActiveStreak.longest_streak,
          }
        : null,
    };

    // ─────────────────────────────────────────────
    // 5. SUGGESTED EXERCISE
    // ─────────────────────────────────────────────
    const lastAnxiety = lastSessionResult.data?.[0]?.anxiety_score_detected ?? 0;
    let suggestedSlug: string;

    if (lastAnxiety > 6) {
      suggestedSlug = "breathing-478";
    } else if (timeSlot === "night" || timeSlot === "evening") {
      suggestedSlug = Math.random() < 0.5 ? "breathing-478" : "muscle-relaxation";
    } else if (timeSlot === "morning") {
      suggestedSlug = Math.random() < 0.5 ? "box-breathing" : "mindfulness-1min";
    } else {
      // afternoon or fallback: random beginner exercise
      suggestedSlug = "__random_beginner__";
    }

    let suggestedExercise: { slug: string; title: string } | null = null;

    if (suggestedSlug === "__random_beginner__") {
      const { data: beginnerExercises } = await supabase
        .from("exercises")
        .select("slug, title")
        .eq("difficulty", "beginner")
        .eq("is_active", true);

      if (beginnerExercises && beginnerExercises.length > 0) {
        const pick = beginnerExercises[Math.floor(Math.random() * beginnerExercises.length)];
        suggestedExercise = { slug: pick.slug, title: pick.title };
      }
    } else {
      const { data: exerciseRow } = await supabase
        .from("exercises")
        .select("slug, title")
        .eq("slug", suggestedSlug)
        .single();

      if (exerciseRow) {
        suggestedExercise = { slug: exerciseRow.slug, title: exerciseRow.title };
      }
    }

    // ─────────────────────────────────────────────
    // 6. FOLLOW-UP
    // ─────────────────────────────────────────────
    let followUp: { topic: string; unresolved_issue: string } | null = null;
    const snap = followUpResult.data?.[0];
    if (snap) {
      const topic =
        snap.key_topics && snap.key_topics.length > 0 ? snap.key_topics[0] : null;
      const issue =
        snap.unresolved_issues && snap.unresolved_issues.length > 0
          ? snap.unresolved_issues[0]
          : null;
      if (topic || issue) {
        followUp = {
          topic: topic ?? "",
          unresolved_issue: issue ?? "",
        };
      }
    }

    // ─────────────────────────────────────────────
    // 7. HEALTHKIT
    // ─────────────────────────────────────────────
    const healthkit = healthkitResult.data
      ? {
          sleep_hours: healthkitResult.data.sleep_hours,
          steps: healthkitResult.data.steps,
          heart_rate_avg: healthkitResult.data.heart_rate_avg,
        }
      : null;

    // ─────────────────────────────────────────────
    // 8. LEVEL PROGRESS
    // ─────────────────────────────────────────────
    const totalPoints = rewardPointsResult.data?.total_points ?? 0;
    const levels = levelsResult.data ?? [];

    // Find current level from points
    let currentLevel = 1;
    let levelName = "Esploratore";
    let nextLevelPoints: number | null = null;

    for (let i = levels.length - 1; i >= 0; i--) {
      if (totalPoints >= levels[i].points_required) {
        currentLevel = levels[i].level;
        levelName = levels[i].name;
        // next level points
        if (i + 1 < levels.length) {
          nextLevelPoints = levels[i + 1].points_required;
        }
        break;
      }
    }

    const levelProgress = {
      current_level: currentLevel,
      level_name: levelName,
      points: totalPoints,
      next_level_points: nextLevelPoints,
    };

    // ─────────────────────────────────────────────
    // 9. ARIA HOME MESSAGE (V5)
    // ─────────────────────────────────────────────
    const lastSession = lastSessionResult.data?.[0] ?? null;
    const userMemories = userMemoriesResult.data ?? [];
    const healthkitData = healthkit;

    let ariaMessage = profile.aria_home_message || null;
    let shouldGenerate = false;

    if (!ariaMessage) {
      shouldGenerate = true;
    } else if (profile.aria_home_message_at) {
      const messageAge = Date.now() - new Date(profile.aria_home_message_at).getTime();
      const FOUR_HOURS = 4 * 60 * 60 * 1000;
      if (messageAge > FOUR_HOURS) {
        shouldGenerate = true;
      }
    }

    if (shouldGenerate) {
      try {
        ariaMessage = await generateAriaHomeMessage(
          profile,
          timeSlot,
          healthkitData,
          lastSession,
          userMemories
        );

        // Save to cache
        await supabase
          .from('user_profiles')
          .update({
            aria_home_message: ariaMessage,
            aria_home_message_at: new Date().toISOString()
          })
          .eq('user_id', authenticatedUserId);
      } catch (err) {
        console.error('[home-context] Aria home message generation failed:', err);
        // Fallback: generic message based on time slot
        ariaMessage = getFallbackMessage(timeSlot, profile.name);
      }
    }

    // ─────────────────────────────────────────────
    // 10. GREETING
    // ─────────────────────────────────────────────
    const userName = profile.name ?? "amico";
    const greetings: Record<TimeSlot, string> = {
      night: `Ehi ${userName}, sei sveglio/a tardi...`,
      morning: `Buongiorno ${userName}! Come hai dormito?`,
      afternoon: `Ciao ${userName}! Com'è la giornata?`,
      evening: `Come è andata oggi, ${userName}?`,
    };
    const greeting = greetings[timeSlot];

    // ─────────────────────────────────────────────
    // RESPONSE
    // ─────────────────────────────────────────────
    const response = {
      time_slot: timeSlot,
      greeting,
      profile: {
        name: profile.name,
        current_level: profile.current_level,
        active_dashboard_metrics: profile.active_dashboard_metrics,
      },
      streak,
      suggested_exercise: suggestedExercise,
      follow_up: followUp,
      healthkit,
      level_progress: levelProgress,
      aria_message: ariaMessage,
    };

    console.log("[home-context] ✅ Response built for user", authenticatedUserId, "| slot:", timeSlot);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[home-context] ❌ Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
