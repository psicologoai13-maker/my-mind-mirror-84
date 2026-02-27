import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SHOP_ITEMS = [
  {
    slug: "trial-premium",
    points_cost: 150,
    reward_description: "3 giorni Premium",
    days_premium: 3,
  },
  {
    slug: "week-premium",
    points_cost: 300,
    reward_description: "1 settimana Premium",
    days_premium: 7,
  },
  {
    slug: "month-premium",
    points_cost: 1000,
    reward_description: "1 mese Premium",
    days_premium: 30,
  },
  {
    slug: "sixmonths-premium",
    points_cost: 5000,
    reward_description: "6 mesi Premium",
    days_premium: 180,
  },
  {
    slug: "year-premium",
    points_cost: 10000,
    reward_description: "1 anno Premium",
    days_premium: 365,
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // GET requests or empty body
    }
    const { accessToken, userId } = body as {
      accessToken?: string;
      userId?: string;
    };

    // --- Triple fallback auth ---
    let authenticatedUserId: string | null = null;
    let supabase: ReturnType<typeof createClient> | null = null;

    // AUTH METHOD 1: Authorization header JWT
    if (authHeader) {
      const anonKeyPrefix = supabaseKey.substring(0, 30);
      const headerTokenPrefix = authHeader
        .replace("Bearer ", "")
        .substring(0, 30);
      const isAnonKey = headerTokenPrefix === anonKeyPrefix;

      if (!isAnonKey) {
        try {
          supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } },
          });
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
          if (!userError && user) {
            authenticatedUserId = user.id;
            console.log(
              "[get-gamification-status] Auth Method 1 (header JWT): User",
              user.id
            );
          }
        } catch (e) {
          console.log(
            "[get-gamification-status] Auth Method 1 error:",
            (e as Error).message
          );
        }
      }
    }

    // AUTH METHOD 2: accessToken in request body
    if (!authenticatedUserId && accessToken) {
      try {
        const tokenAuthHeader = accessToken.startsWith("Bearer ")
          ? accessToken
          : `Bearer ${accessToken}`;
        supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: tokenAuthHeader } },
        });
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (!userError && user) {
          authenticatedUserId = user.id;
          console.log(
            "[get-gamification-status] Auth Method 2 (body accessToken): User",
            user.id
          );
        }
      } catch (e) {
        console.log(
          "[get-gamification-status] Auth Method 2 error:",
          (e as Error).message
        );
      }
    }

    // AUTH METHOD 3: userId in body + service role (last resort)
    if (!authenticatedUserId && userId && serviceRoleKey) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(userId)) {
        authenticatedUserId = userId;
        supabase = createClient(supabaseUrl, serviceRoleKey);
        console.log(
          "[get-gamification-status] Auth Method 3 (body userId + service role): User",
          userId
        );
      }
    }

    if (!authenticatedUserId || !supabase) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // --- Use service role client for DB operations ---
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Get user reward points
    const { data: rewardData } = await adminClient
      .from("user_reward_points")
      .select("total_points")
      .eq("user_id", authenticatedUserId)
      .single();

    const totalPoints = rewardData?.total_points ?? 0;

    // 2. Get user profile (current_level)
    const { data: profileData } = await adminClient
      .from("user_profiles")
      .select("current_level")
      .eq("user_id", authenticatedUserId)
      .single();

    const currentLevel = profileData?.current_level ?? 1;

    // 3. Get level info from gamification_levels
    const { data: currentLevelData } = await adminClient
      .from("gamification_levels")
      .select("name, emoji, points_required")
      .eq("level", currentLevel)
      .single();

    const { data: nextLevelData } = await adminClient
      .from("gamification_levels")
      .select("points_required")
      .eq("level", currentLevel + 1)
      .single();

    const levelName = currentLevelData?.name ?? "Esploratore";
    const levelEmoji = currentLevelData?.emoji ?? "🧭";
    const currentLevelPoints = currentLevelData?.points_required ?? 0;
    const nextLevelPoints = nextLevelData?.points_required ?? null;

    let pointsToNextLevel: number | null = null;
    let levelProgressPct = 100;

    if (nextLevelPoints !== null) {
      pointsToNextLevel = nextLevelPoints - totalPoints;
      if (pointsToNextLevel < 0) pointsToNextLevel = 0;
      const range = nextLevelPoints - currentLevelPoints;
      const progress = totalPoints - currentLevelPoints;
      levelProgressPct =
        range > 0 ? Math.min(100, Math.round((progress / range) * 100)) : 100;
    }

    // 4. Get badges (user_achievements)
    const { data: badgesData } = await adminClient
      .from("user_achievements")
      .select("achievement_id, unlocked_at, metadata")
      .eq("user_id", authenticatedUserId)
      .order("unlocked_at", { ascending: false });

    const badges = (badgesData ?? []).map((b) => ({
      id: b.achievement_id,
      name: b.metadata?.name ?? b.achievement_id,
      emoji: b.metadata?.emoji ?? "🏅",
      description: b.metadata?.description ?? "",
      unlocked_at: b.unlocked_at,
    }));

    // 5. Get active challenges
    const { data: challengesData } = await adminClient
      .from("user_challenges")
      .select(
        "challenge_slug, challenge_title, current_count, target_count, expires_at, points_reward"
      )
      .eq("user_id", authenticatedUserId)
      .is("completed_at", null)
      .gt("expires_at", new Date().toISOString());

    const activeChallenges = (challengesData ?? []).map((c) => ({
      slug: c.challenge_slug,
      title: c.challenge_title,
      current_count: c.current_count,
      target_count: c.target_count,
      expires_at: c.expires_at,
      points_reward: c.points_reward,
    }));

    // 6. Get streak days (max current_streak)
    const { data: streakData } = await adminClient
      .from("habit_streaks")
      .select("current_streak")
      .eq("user_id", authenticatedUserId)
      .order("current_streak", { ascending: false })
      .limit(1)
      .single();

    const streakDays = streakData?.current_streak ?? 0;

    // 7. Total sessions count
    const { count: totalSessions } = await adminClient
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", authenticatedUserId);

    // 8. Total checkins count
    const { count: totalCheckins } = await adminClient
      .from("daily_checkins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", authenticatedUserId);

    return new Response(
      JSON.stringify({
        total_points: totalPoints,
        current_level: currentLevel,
        level_name: levelName,
        level_emoji: levelEmoji,
        points_to_next_level: pointsToNextLevel,
        level_progress_pct: levelProgressPct,
        badges,
        active_challenges: activeChallenges,
        available_shop_items: SHOP_ITEMS,
        streak_days: streakDays,
        total_sessions: totalSessions ?? 0,
        total_checkins: totalCheckins ?? 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[get-gamification-status] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
