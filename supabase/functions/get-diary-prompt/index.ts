import { authenticateUser, handleCors, corsHeaders, checkRateLimit } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId, supabaseAdmin } = await authenticateUser(req);

    // Rate limit: max 20 richieste/ora (chiama Gemini)
    await checkRateLimit(supabaseAdmin, userId, 'get-diary-prompt', 20, 60);

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

    // Load last 5 diary entries for this diary
    const { data: recentEntries } = await supabaseAdmin
      .from("diary_entries")
      .select("content_text, entry_date, created_at")
      .eq("diary_id", diary_id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Load diary name if not provided
    let diaryName = diary_name;
    if (!diaryName) {
      const { data: diaryData } = await supabaseAdmin
        .from("diaries")
        .select("name")
        .eq("id", diary_id)
        .maybeSingle();
      diaryName = diaryData?.name || "il mio diario";
    }

    // Load latest session_context_snapshot for the user
    const { data: snapshotData } = await supabaseAdmin
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
    if (error instanceof Response) return error;
    console.error("[get-diary-prompt] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
