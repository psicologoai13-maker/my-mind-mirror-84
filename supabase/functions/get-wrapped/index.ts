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

    const body = await req.json();
    const { period_type, period_key } = body as {
      period_type: "monthly" | "yearly";
      period_key: string;
    };

    if (!period_type || !period_key) {
      return new Response(
        JSON.stringify({ error: "period_type and period_key are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    const bodyAccessToken = body.accessToken;
    const bodyUserId = body.userId;

    // --- Triple fallback auth ---
    let authenticatedUserId: string | null = null;
    let supabase: ReturnType<typeof createClient> | null = null;

    // AUTH METHOD 1: Authorization header JWT
    if (authHeader) {
      const anonKeyPrefix = supabaseKey.substring(0, 30);
      const headerTokenPrefix = authHeader.replace("Bearer ", "").substring(0, 30);
      if (headerTokenPrefix !== anonKeyPrefix) {
        try {
          supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } },
          });
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (!userError && user) {
            authenticatedUserId = user.id;
            console.log("[get-wrapped] Auth Method 1: User", user.id);
          }
        } catch (e) {
          console.log("[get-wrapped] Auth Method 1 error:", (e as Error).message);
        }
      }
    }

    // AUTH METHOD 2: accessToken in body
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
          console.log("[get-wrapped] Auth Method 2: User", user.id);
        }
      } catch (e) {
        console.log("[get-wrapped] Auth Method 2 error:", (e as Error).message);
      }
    }

    // AUTH METHOD 3: userId in body + service role
    if (!authenticatedUserId && bodyUserId && serviceRoleKey) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(bodyUserId)) {
        authenticatedUserId = bodyUserId;
        supabase = createClient(supabaseUrl, serviceRoleKey);
        console.log("[get-wrapped] Auth Method 3: User", bodyUserId);
      }
    }

    if (!authenticatedUserId || !supabase) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if wrapped data exists and is fresh (< 24h)
    const { data: existing } = await adminClient
      .from("aria_wrapped_data")
      .select("data, generated_at")
      .eq("user_id", authenticatedUserId)
      .eq("period_type", period_type)
      .eq("period_key", period_key)
      .maybeSingle();

    if (existing?.generated_at) {
      const generatedAt = new Date(existing.generated_at);
      const ageMs = Date.now() - generatedAt.getTime();
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;

      if (ageMs < twentyFourHoursMs) {
        console.log("[get-wrapped] Returning cached data (age:", Math.round(ageMs / 60000), "min)");
        return new Response(
          JSON.stringify({ success: true, data: existing.data, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Data doesn't exist or is stale — call generate-wrapped internally
    console.log("[get-wrapped] Generating fresh wrapped data...");

    const generateUrl = `${supabaseUrl}/functions/v1/generate-wrapped`;
    const generatePayload: Record<string, string> = {
      period_type,
      period_key,
    };

    // Forward auth context
    if (bodyUserId) {
      generatePayload.userId = bodyUserId;
    }
    if (bodyAccessToken) {
      generatePayload.accessToken = bodyAccessToken;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "apikey": supabaseKey,
    };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const generateResponse = await fetch(generateUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(generatePayload),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error("[get-wrapped] generate-wrapped call failed:", errorText);
      throw new Error(`generate-wrapped failed: ${generateResponse.status}`);
    }

    const result = await generateResponse.json();

    return new Response(
      JSON.stringify({ success: true, data: result.data, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[get-wrapped] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
