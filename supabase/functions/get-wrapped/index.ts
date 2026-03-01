import { authenticateUser, handleCors, corsHeaders } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId, supabaseAdmin } = await authenticateUser(req);

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

    // Check if wrapped data exists and is fresh (< 24h)
    const { data: existing } = await supabaseAdmin
      .from("aria_wrapped_data")
      .select("data, generated_at")
      .eq("user_id", userId)
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const generateUrl = `${supabaseUrl}/functions/v1/generate-wrapped`;

    // Forward auth header
    const authHeader = req.headers.get("Authorization");
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
      body: JSON.stringify({ period_type, period_key }),
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
    if (error instanceof Response) return error;
    console.error("[get-wrapped] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
