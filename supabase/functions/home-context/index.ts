import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    ] = await Promise.all([
      // 3. PROFILE
      supabase
        .from("user_profiles")
        .select("name, current_level, active_dashboard_metrics")
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

      // 5. SUGGESTED_EXERCISE - last session anxiety
      supabase
        .from("sessions")
        .select("anxiety_score_detected")
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
    ]);

    // ─────────────────────────────────────────────
    // 3. PROFILE
    // ─────────────────────────────────────────────
    const profile = profileResult.data ?? {
      name: null,
      current_level: 1,
      active_dashboard_metrics: ["mood", "anxiety", "energy", "sleep"],
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
    // 9. GREETING
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
