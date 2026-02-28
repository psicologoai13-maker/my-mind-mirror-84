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
      date,
      steps,
      sleep_hours,
      sleep_quality_hk,
      heart_rate_avg,
      hrv_avg,
      active_energy,
      exercise_minutes,
      weight_kg,
      body_fat_pct,
      menstrual_cycle_phase,
      accessToken,
      userId,
    } = body as {
      date: string;
      steps?: number;
      sleep_hours?: number;
      sleep_quality_hk?: string;
      heart_rate_avg?: number;
      hrv_avg?: number;
      active_energy?: number;
      exercise_minutes?: number;
      weight_kg?: number;
      body_fat_pct?: number;
      menstrual_cycle_phase?: string;
      accessToken?: string;
      userId?: string;
    };

    if (!date) {
      return new Response(
        JSON.stringify({ error: "date is required (YYYY-MM-DD)" }),
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
              "[sync-healthkit] ✅ Auth Method 1 (header JWT): User",
              user.id
            );
          }
        } catch (e) {
          console.log(
            "[sync-healthkit] ❌ Auth Method 1 error:",
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
            "[sync-healthkit] ✅ Auth Method 2 (body accessToken): User",
            user.id
          );
        }
      } catch (e) {
        console.log(
          "[sync-healthkit] ❌ Auth Method 2 error:",
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
          "[sync-healthkit] ⚠️ Auth Method 3 (body userId + service role): User",
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

    // Use admin client for all DB operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const synced_fields: string[] = [];

    // ─────────────────────────────────────────────
    // 1. UPSERT healthkit_data (only non-null fields)
    // ─────────────────────────────────────────────
    const healthkitPayload: Record<string, unknown> = {
      user_id: authenticatedUserId,
      date,
    };

    if (steps != null) { healthkitPayload.steps = steps; synced_fields.push("steps"); }
    if (sleep_hours != null) { healthkitPayload.sleep_hours = sleep_hours; synced_fields.push("sleep_hours"); }
    if (sleep_quality_hk != null) { healthkitPayload.sleep_quality_hk = sleep_quality_hk; synced_fields.push("sleep_quality_hk"); }
    if (heart_rate_avg != null) { healthkitPayload.heart_rate_avg = heart_rate_avg; synced_fields.push("heart_rate_avg"); }
    if (hrv_avg != null) { healthkitPayload.hrv_avg = hrv_avg; synced_fields.push("hrv_avg"); }
    if (active_energy != null) { healthkitPayload.active_energy = active_energy; synced_fields.push("active_energy"); }
    if (exercise_minutes != null) { healthkitPayload.exercise_minutes = exercise_minutes; synced_fields.push("exercise_minutes"); }
    if (weight_kg != null) { healthkitPayload.weight_kg = weight_kg; synced_fields.push("weight_kg"); }
    if (body_fat_pct != null) { healthkitPayload.body_fat_pct = body_fat_pct; synced_fields.push("body_fat_pct"); }
    if (menstrual_cycle_phase != null) { healthkitPayload.menstrual_cycle_phase = menstrual_cycle_phase; synced_fields.push("menstrual_cycle_phase"); }

    const { error: hkError } = await adminClient
      .from("healthkit_data")
      .upsert(healthkitPayload, {
        onConflict: "user_id,date",
        ignoreDuplicates: false,
      });

    if (hkError) {
      console.error("[sync-healthkit] healthkit_data upsert error:", hkError);
      throw new Error(`healthkit_data upsert failed: ${hkError.message}`);
    }

    console.log(
      `[sync-healthkit] Upserted healthkit_data for ${date}: ${synced_fields.join(", ")}`
    );

    // ─────────────────────────────────────────────
    // 2. UPSERT daily_habits for steps
    // ─────────────────────────────────────────────
    if (steps != null) {
      const { error } = await adminClient
        .from("daily_habits")
        .upsert(
          {
            user_id: authenticatedUserId,
            habit_type: "steps",
            date,
            value: steps,
            target_value: 10000,
            unit: "steps",
          },
          { onConflict: "user_id,habit_type,date", ignoreDuplicates: false }
        );
      if (error) {
        console.error("[sync-healthkit] daily_habits steps upsert error:", error);
      }
    }

    // ─────────────────────────────────────────────
    // 3. UPSERT daily_habits for sleep
    // ─────────────────────────────────────────────
    if (sleep_hours != null) {
      const { error } = await adminClient
        .from("daily_habits")
        .upsert(
          {
            user_id: authenticatedUserId,
            habit_type: "sleep",
            date,
            value: sleep_hours,
            target_value: 8,
            unit: "hours",
          },
          { onConflict: "user_id,habit_type,date", ignoreDuplicates: false }
        );
      if (error) {
        console.error("[sync-healthkit] daily_habits sleep upsert error:", error);
      }
    }

    // ─────────────────────────────────────────────
    // 4. UPSERT body_metrics for weight
    // ─────────────────────────────────────────────
    if (weight_kg != null) {
      const { error } = await adminClient
        .from("body_metrics")
        .upsert(
          {
            user_id: authenticatedUserId,
            weight: weight_kg,
            date,
          },
          { onConflict: "user_id,date", ignoreDuplicates: false }
        );
      if (error) {
        console.error("[sync-healthkit] body_metrics upsert error:", error);
      }
    }

    // ─────────────────────────────────────────────
    // 5. UPDATE user_profiles.last_data_change_at
    // ─────────────────────────────────────────────
    const { error: profileError } = await adminClient
      .from("user_profiles")
      .update({ last_data_change_at: new Date().toISOString() })
      .eq("user_id", authenticatedUserId);

    if (profileError) {
      console.error(
        "[sync-healthkit] user_profiles update error:",
        profileError
      );
    }

    console.log(
      `[sync-healthkit] ✅ Sync complete for user ${authenticatedUserId}, date ${date}, fields: ${synced_fields.join(", ")}`
    );

    return new Response(
      JSON.stringify({ success: true, synced_fields }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[sync-healthkit] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
