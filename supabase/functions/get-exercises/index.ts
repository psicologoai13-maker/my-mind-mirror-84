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

    // --- Triple fallback auth ---
    const authHeader = req.headers.get("Authorization");
    const body = await req.json().catch(() => ({}));
    const { category, difficulty, accessToken, userId } = body as {
      category?: string;
      difficulty?: string;
      accessToken?: string;
      userId?: string;
    };

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
              "[get-exercises] Auth Method 1 (header JWT): User",
              user.id
            );
          }
        } catch (e) {
          console.log("[get-exercises] Auth Method 1 error:", (e as Error).message);
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
            "[get-exercises] Auth Method 2 (body accessToken): User",
            user.id
          );
        }
      } catch (e) {
        console.log("[get-exercises] Auth Method 2 error:", (e as Error).message);
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
          "[get-exercises] Auth Method 3 (body userId + service role): User",
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

    // --- Query exercises ---
    let query = supabase
      .from("exercises")
      .select("*")
      .eq("is_active", true)
      .order("difficulty", { ascending: true })
      .order("duration_minutes", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }
    if (difficulty) {
      query = query.eq("difficulty", difficulty);
    }

    const { data: exercises, error: queryError } = await query;

    if (queryError) {
      console.error("[get-exercises] Query error:", queryError.message);
      return new Response(
        JSON.stringify({ error: queryError.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    return new Response(JSON.stringify(exercises || []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[get-exercises] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
