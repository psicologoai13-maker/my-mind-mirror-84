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
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");

    if (!googleApiKey) {
      throw new Error("GOOGLE_API_KEY is not configured");
    }

    const body = await req.json();
    const { diary_id, diary_name } = body as {
      diary_id: string;
      diary_name?: string;
    };

    if (!diary_id) {
      return new Response(
        JSON.stringify({ error: "diary_id is required" }),
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
            console.log("[get-diary-prompt] Auth Method 1: User", user.id);
          }
        } catch (e) {
          console.log("[get-diary-prompt] Auth Method 1 error:", (e as Error).message);
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
          console.log("[get-diary-prompt] Auth Method 2: User", user.id);
        }
      } catch (e) {
        console.log("[get-diary-prompt] Auth Method 2 error:", (e as Error).message);
      }
    }

    // AUTH METHOD 3: userId in body + service role
    if (!authenticatedUserId && bodyUserId && serviceRoleKey) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(bodyUserId)) {
        authenticatedUserId = bodyUserId;
        supabase = createClient(supabaseUrl, serviceRoleKey);
        console.log("[get-diary-prompt] Auth Method 3: User", bodyUserId);
      }
    }

    if (!authenticatedUserId || !supabase) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const userId = authenticatedUserId;

    // Load last 5 diary entries for this diary
    const { data: recentEntries } = await adminClient
      .from("diary_entries")
      .select("content_text, entry_date, created_at")
      .eq("diary_id", diary_id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Load diary name if not provided
    let diaryName = diary_name;
    if (!diaryName) {
      const { data: diaryData } = await adminClient
        .from("diaries")
        .select("name")
        .eq("id", diary_id)
        .maybeSingle();
      diaryName = diaryData?.name || "il mio diario";
    }

    // Load latest session_context_snapshot for the user
    const { data: snapshotData } = await adminClient
      .from("session_context_snapshots")
      .select("key_topics, unresolved_issues")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build context for Gemini
    let recentContext = "";
    if (snapshotData) {
      const topics = snapshotData.key_topics;
      const issues = snapshotData.unresolved_issues;
      const contextParts: string[] = [];
      if (Array.isArray(topics) && topics.length > 0) {
        contextParts.push(`Temi recenti: ${topics.slice(0, 5).join(", ")}`);
      }
      if (Array.isArray(issues) && issues.length > 0) {
        contextParts.push(`Questioni aperte: ${issues.slice(0, 3).join(", ")}`);
      }
      if (contextParts.length > 0) {
        recentContext = contextParts.join(". ");
      }
    }

    const contextLine = recentContext
      ? `Contesto recente: ${recentContext}.`
      : "Nessun contesto recente disponibile.";

    // Include recent diary entries for personalization
    let entriesContext = "";
    if (recentEntries && recentEntries.length > 0) {
      const entriesSummary = recentEntries
        .map((e: any) => `- ${e.entry_date}: "${e.content_text?.substring(0, 200)}"`)
        .join('\n');
      entriesContext = ` Ultime voci scritte dall'utente in questo diario:\n${entriesSummary}`;
    }

    const geminiPrompt = `Sei Aria. Genera UNA domanda aperta di massimo 15 parole come spunto per scrivere nel diario "${diaryName}". ${contextLine}${entriesContext} La domanda deve essere calda, non invasiva, invitare la riflessione. Rispondi solo con la domanda, niente altro.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: geminiPrompt }] }],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("[get-diary-prompt] Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const prompt = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    console.log("[get-diary-prompt] Generated prompt:", prompt);

    return new Response(
      JSON.stringify({ prompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[get-diary-prompt] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
