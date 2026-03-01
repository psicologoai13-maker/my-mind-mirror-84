import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChallengeDefinition {
  title: string;
  target: number;
  expires_days: number;
  points_reward: number;
  badge_id: string;
}

const CHALLENGES: Record<string, ChallengeDefinition> = {
  "breathing-7days": {
    title: "7 giorni di respirazione",
    target: 7,
    expires_days: 30,
    points_reward: 100,
    badge_id: "challenge_breathing",
  },
  "checkin-30days": {
    title: "30 check-in in un mese",
    target: 30,
    expires_days: 30,
    points_reward: 150,
    badge_id: "challenge_checkin",
  },
  "sessions-10": {
    title: "10 sessioni con Aria",
    target: 10,
    expires_days: 30,
    points_reward: 100,
    badge_id: "challenge_sessions",
  },
  "diary-7days": {
    title: "7 voci di diario",
    target: 7,
    expires_days: 30,
    points_reward: 80,
    badge_id: "challenge_diary",
  },
  "exercises-5": {
    title: "5 esercizi completati",
    target: 5,
    expires_days: 30,
    points_reward: 60,
    badge_id: "challenge_exercises",
  },
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
    const { challenge_slug, accessToken, userId } = body as {
      challenge_slug: string;
      accessToken?: string;
      userId?: string;
    };

    if (!challenge_slug || typeof challenge_slug !== 'string') {
      return new Response(
        JSON.stringify({ error: "challenge_slug is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const challengeDef = CHALLENGES[challenge_slug];
    if (!challengeDef) {
      return new Response(
        JSON.stringify({ error: "Challenge not found" }),
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
              "[start-challenge] Auth Method 1 (header JWT): User",
              user.id
            );
          }
        } catch (e) {
          console.log(
            "[start-challenge] Auth Method 1 error:",
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
            "[start-challenge] Auth Method 2 (body accessToken): User",
            user.id
          );
        }
      } catch (e) {
        console.log(
          "[start-challenge] Auth Method 2 error:",
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
          "[start-challenge] Auth Method 3 (body userId + service role): User",
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

    // Check if user already has this challenge active (not completed and not expired)
    const { data: existingChallenge } = await adminClient
      .from("user_challenges")
      .select("id")
      .eq("user_id", authenticatedUserId)
      .eq("challenge_slug", challenge_slug)
      .is("completed_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .single();

    if (existingChallenge) {
      return new Response(
        JSON.stringify({ error: "Challenge già attiva" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + challengeDef.expires_days);

    // Insert new challenge
    const { data: newChallenge, error: insertError } = await adminClient
      .from("user_challenges")
      .insert({
        user_id: authenticatedUserId,
        challenge_slug,
        challenge_title: challengeDef.title,
        target_count: challengeDef.target,
        current_count: 0,
        expires_at: expiresAt.toISOString(),
        points_reward: challengeDef.points_reward,
        badge_id: challengeDef.badge_id,
      })
      .select("id, expires_at")
      .single();

    if (insertError) {
      console.error("[start-challenge] Insert error:", insertError.message);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        challenge_id: newChallenge.id,
        expires_at: newChallenge.expires_at,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[start-challenge] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
