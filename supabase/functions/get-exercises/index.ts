import { authenticateUser, handleCors, corsHeaders } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId, supabaseAdmin } = await authenticateUser(req);

    const body = await req.json().catch(() => ({}));
    const { category, difficulty } = body as {
      category?: string;
      difficulty?: string;
    };

    // --- Query exercises ---
    let query = supabaseAdmin
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
  } catch (error) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[get-exercises] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
