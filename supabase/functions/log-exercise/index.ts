import { authenticateUser, handleCors, corsHeaders } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId, supabaseAdmin } = await authenticateUser(req);

    const body = await req.json();
    const {
      exercise_id,
      duration_actual,
      mood_before,
      mood_after,
      triggered_by,
      session_id,
    } = body as {
      exercise_id: string;
      duration_actual: number;
      mood_before?: number;
      mood_after?: number;
      triggered_by: string;
      session_id?: string;
    };

    if (!exercise_id) {
      return new Response(
        JSON.stringify({ error: "exercise_id is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Validazione input
    if (mood_before !== undefined && (mood_before < 1 || mood_before > 10)) {
      return new Response(JSON.stringify({ error: 'mood_before must be between 1 and 10' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (mood_after !== undefined && (mood_after < 1 || mood_after > 10)) {
      return new Response(JSON.stringify({ error: 'mood_after must be between 1 and 10' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (duration_actual !== undefined && (duration_actual < 0 || duration_actual > 480)) {
      return new Response(JSON.stringify({ error: 'duration_actual must be between 0 and 480 minutes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const validTriggers = ['manual', 'scheduled', 'suggestion'];
    if (triggered_by && !validTriggers.includes(triggered_by)) {
      return new Response(JSON.stringify({ error: 'triggered_by must be manual, scheduled, or suggestion' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Read points_reward from exercise
    const { data: exercise, error: exerciseError } = await supabaseAdmin
      .from("exercises")
      .select("id, slug, points_reward")
      .eq("id", exercise_id)
      .single();

    if (exerciseError || !exercise) {
      return new Response(
        JSON.stringify({ error: "Exercise not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    const pointsReward = exercise.points_reward || 0;

    // 2. INSERT into user_exercise_sessions
    const { data: sessionData, error: insertError } = await supabaseAdmin
      .from("user_exercise_sessions")
      .insert({
        user_id: userId,
        exercise_id,
        duration_actual: duration_actual || null,
        mood_before: mood_before ?? null,
        mood_after: mood_after ?? null,
        triggered_by: triggered_by || "manual",
        session_id: session_id || null,
      })
      .select("id, points_awarded")
      .single();

    if (insertError) {
      console.error("[log-exercise] Insert error:", insertError.message);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // 3. Update challenge progress if active challenges exist for this exercise slug
    try {
      await supabaseAdmin.rpc("update_challenge_progress", {
        p_user_id: userId,
        p_slug: exercise.slug,
      });
      console.log(
        "[log-exercise] Challenge progress updated for slug:",
        exercise.slug
      );
    } catch (e) {
      console.log(
        "[log-exercise] Challenge update skipped:",
        (e as Error).message
      );
    }

    // 4. Update user_profiles.last_data_change_at
    await supabaseAdmin
      .from("user_profiles")
      .update({ last_data_change_at: new Date().toISOString() })
      .eq("user_id", userId);

    // 5. Read current total_points
    const { data: rewardData } = await supabaseAdmin
      .from("user_reward_points")
      .select("total_points")
      .eq("user_id", userId)
      .single();

    const totalPoints = rewardData?.total_points ?? pointsReward;

    return new Response(
      JSON.stringify({
        success: true,
        points_awarded: sessionData?.points_awarded ?? pointsReward,
        total_points: totalPoints,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[log-exercise] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
