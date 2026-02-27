import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    const {
      exercise_id,
      duration_actual,
      mood_before,
      mood_after,
      triggered_by,
      session_id,
      accessToken,
      userId,
    } = body as {
      exercise_id: string;
      duration_actual: number;
      mood_before?: number;
      mood_after?: number;
      triggered_by: string;
      session_id?: string;
      accessToken?: string;
      userId?: string;
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
              "[log-exercise] Auth Method 1 (header JWT): User",
              user.id
            );
          }
        } catch (e) {
          console.log("[log-exercise] Auth Method 1 error:", (e as Error).message);
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
            "[log-exercise] Auth Method 2 (body accessToken): User",
            user.id
          );
        }
      } catch (e) {
        console.log("[log-exercise] Auth Method 2 error:", (e as Error).message);
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
          "[log-exercise] Auth Method 3 (body userId + service role): User",
          userId
        );
      }
    }

    if (!authenticatedUserId || !supabase) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // --- Use service role client for DB operations that need elevated privileges ---
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Read points_reward from exercise
    const { data: exercise, error: exerciseError } = await adminClient
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
    //    The DB trigger award_exercise_points will auto-set points_awarded
    //    and call add_reward_points
    const { data: sessionData, error: insertError } = await adminClient
      .from("user_exercise_sessions")
      .insert({
        user_id: authenticatedUserId,
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
      await adminClient.rpc("update_challenge_progress", {
        p_user_id: authenticatedUserId,
        p_slug: exercise.slug,
      });
      console.log(
        "[log-exercise] Challenge progress updated for slug:",
        exercise.slug
      );
    } catch (e) {
      // Non-fatal: challenges may not exist
      console.log(
        "[log-exercise] Challenge update skipped:",
        (e as Error).message
      );
    }

    // 4. Update user_profiles.last_data_change_at
    await adminClient
      .from("user_profiles")
      .update({ last_data_change_at: new Date().toISOString() })
      .eq("user_id", authenticatedUserId);

    // 5. Read current total_points
    const { data: rewardData } = await adminClient
      .from("user_reward_points")
      .select("total_points")
      .eq("user_id", authenticatedUserId)
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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[log-exercise] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
