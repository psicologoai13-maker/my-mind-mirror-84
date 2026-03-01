import { authenticateUser, handleCors, corsHeaders } from '../_shared/auth.ts';

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

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId, supabaseAdmin } = await authenticateUser(req);

    // 1. Get user reward points
    const { data: rewardData } = await supabaseAdmin
      .from("user_reward_points")
      .select("total_points")
      .eq("user_id", userId)
      .single();

    const totalPoints = rewardData?.total_points ?? 0;

    // 2. Get user profile (current_level)
    const { data: profileData } = await supabaseAdmin
      .from("user_profiles")
      .select("current_level")
      .eq("user_id", userId)
      .single();

    const currentLevel = profileData?.current_level ?? 1;

    // 3. Get level info from gamification_levels
    const { data: currentLevelData } = await supabaseAdmin
      .from("gamification_levels")
      .select("name, emoji, points_required")
      .eq("level", currentLevel)
      .single();

    const { data: nextLevelData } = await supabaseAdmin
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
    const { data: badgesData } = await supabaseAdmin
      .from("user_achievements")
      .select("achievement_id, unlocked_at, metadata")
      .eq("user_id", userId)
      .order("unlocked_at", { ascending: false });

    const badges = (badgesData ?? []).map((b) => ({
      id: b.achievement_id,
      name: b.metadata?.name ?? b.achievement_id,
      emoji: b.metadata?.emoji ?? "🏅",
      description: b.metadata?.description ?? "",
      unlocked_at: b.unlocked_at,
    }));

    // 5. Get active challenges
    const { data: challengesData } = await supabaseAdmin
      .from("user_challenges")
      .select(
        "challenge_slug, challenge_title, current_count, target_count, expires_at, points_reward"
      )
      .eq("user_id", userId)
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
    const { data: streakData } = await supabaseAdmin
      .from("habit_streaks")
      .select("current_streak")
      .eq("user_id", userId)
      .order("current_streak", { ascending: false })
      .limit(1)
      .single();

    const streakDays = streakData?.current_streak ?? 0;

    // 7. Total sessions count
    const { count: totalSessions } = await supabaseAdmin
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    // 8. Total checkins count
    const { count: totalCheckins } = await supabaseAdmin
      .from("daily_checkins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

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
  } catch (error) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[get-gamification-status] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
