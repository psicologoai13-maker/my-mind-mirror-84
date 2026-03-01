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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find and delete expired challenges that were never completed
    const { data: expired, error: deleteError } = await adminClient
      .from("user_challenges")
      .delete()
      .is("completed_at", null)
      .lt("expires_at", new Date().toISOString())
      .select("id, user_id, challenge_slug");

    if (deleteError) {
      console.error("[cron-expire-challenges] Delete error:", deleteError.message);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const count = expired?.length ?? 0;
    console.log(`[cron-expire-challenges] Removed ${count} expired challenges`);

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: count,
        expired_challenges: expired,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[cron-expire-challenges] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
