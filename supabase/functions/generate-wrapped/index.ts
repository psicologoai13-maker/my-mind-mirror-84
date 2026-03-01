import { authenticateUser, handleCors, corsHeaders, checkRateLimit } from '../_shared/auth.ts';

const EMOTION_COLUMNS = [
  "joy", "sadness", "anger", "fear", "apathy", "shame", "jealousy", "hope",
  "frustration", "nostalgia", "nervousness", "overwhelm", "excitement",
  "disappointment", "disgust", "surprise", "serenity", "pride", "affection",
  "curiosity",
] as const;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId, supabaseAdmin } = await authenticateUser(req);

    // Rate limit: max 5 richieste/ora (chiama Gemini, pesante)
    await checkRateLimit(supabaseAdmin, userId, 'generate-wrapped', 5, 60);

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

    // Validazione input wrapped
    const validPeriodTypes = ['monthly', 'yearly'];
    if (!validPeriodTypes.includes(period_type)) {
      return new Response(JSON.stringify({ error: 'period_type must be monthly or yearly' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!/^\d{4}(-\d{2})?$/.test(period_key)) {
      return new Response(JSON.stringify({ error: 'period_key must be YYYY or YYYY-MM format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");

    // Build date range from period_type and period_key
    let dateStart: string;
    let dateEnd: string;
    if (period_type === "monthly") {
      dateStart = `${period_key}-01`;
      const [y, m] = period_key.split("-").map(Number);
      const nextMonth = new Date(y, m, 1);
      dateEnd = nextMonth.toISOString().split("T")[0];
    } else {
      dateStart = `${period_key}-01-01`;
      dateEnd = `${Number(period_key) + 1}-01-01`;
    }

    console.log(`[generate-wrapped] Period: ${period_type} ${period_key} (${dateStart} → ${dateEnd})`);

    // 1. total_sessions & 2. total_minutes
    const { data: sessionsData } = await supabaseAdmin
      .from("sessions")
      .select("id, duration, mood_score_detected, start_time")
      .eq("user_id", userId)
      .gte("start_time", dateStart)
      .lt("start_time", dateEnd);

    const totalSessions = sessionsData?.length ?? 0;
    const totalMinutes = Math.round(
      (sessionsData ?? [])
        .filter((s: any) => s.duration != null)
        .reduce((sum: number, s: any) => sum + s.duration, 0) / 60
    );

    // 3. total_checkins
    const { count: totalCheckins } = await supabaseAdmin
      .from("daily_checkins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", dateStart)
      .lt("created_at", dateEnd);

    // 4. dominant_emotion
    const { data: emotionsData } = await supabaseAdmin
      .from("daily_emotions")
      .select(EMOTION_COLUMNS.join(", "))
      .eq("user_id", userId)
      .gte("created_at", dateStart)
      .lt("created_at", dateEnd);

    let dominantEmotion = "serenity";
    if (emotionsData && emotionsData.length > 0) {
      const averages: Record<string, number> = {};
      for (const col of EMOTION_COLUMNS) {
        const values = emotionsData
          .map((row: any) => row[col])
          .filter((v: any) => v != null && typeof v === "number");
        averages[col] = values.length > 0
          ? values.reduce((a: number, b: number) => a + b, 0) / values.length
          : 0;
      }
      let maxAvg = -1;
      for (const [emotion, avg] of Object.entries(averages)) {
        if (avg > maxAvg) {
          maxAvg = avg;
          dominantEmotion = emotion;
        }
      }
    }

    // 5. longest_streak
    const { data: streakData } = await supabaseAdmin
      .from("habit_streaks")
      .select("current_streak")
      .eq("user_id", userId)
      .order("current_streak", { ascending: false })
      .limit(1);

    const longestStreak = streakData?.[0]?.current_streak ?? 0;

    // 6. top_topics
    const { data: topicsData } = await supabaseAdmin
      .from("conversation_topics")
      .select("topic")
      .eq("user_id", userId)
      .order("mention_count", { ascending: false })
      .limit(5);

    const topTopics = (topicsData ?? []).map((t: any) => t.topic);

    // 7. wellness_start & wellness_end
    const sortedSessions = (sessionsData ?? [])
      .filter((s: any) => s.mood_score_detected != null)
      .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    let wellnessStart: number | null = null;
    let wellnessEnd: number | null = null;
    if (sortedSessions.length >= 2) {
      const first2 = sortedSessions.slice(0, 2);
      wellnessStart = Math.round(
        first2.reduce((sum: number, s: any) => sum + s.mood_score_detected, 0) / first2.length
      );
      const last2 = sortedSessions.slice(-2);
      wellnessEnd = Math.round(
        last2.reduce((sum: number, s: any) => sum + s.mood_score_detected, 0) / last2.length
      );
    } else if (sortedSessions.length === 1) {
      wellnessStart = sortedSessions[0].mood_score_detected;
      wellnessEnd = sortedSessions[0].mood_score_detected;
    }

    // 8. hardest_week & 9. best_week
    const weekMap: Record<number, number[]> = {};
    for (const s of sortedSessions) {
      const d = new Date(s.start_time);
      const jan4 = new Date(d.getFullYear(), 0, 4);
      const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1;
      const weekNum = Math.ceil((dayOfYear + jan4.getDay()) / 7);
      if (!weekMap[weekNum]) weekMap[weekNum] = [];
      weekMap[weekNum].push(s.mood_score_detected);
    }

    let hardestWeek: number | null = null;
    let bestWeek: number | null = null;
    let minAvg = Infinity;
    let maxAvg2 = -Infinity;
    for (const [week, moods] of Object.entries(weekMap)) {
      const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
      if (avg < minAvg) {
        minAvg = avg;
        hardestWeek = Number(week);
      }
      if (avg > maxAvg2) {
        maxAvg2 = avg;
        bestWeek = Number(week);
      }
    }

    // 10. badges_unlocked
    const { data: badgesData } = await supabaseAdmin
      .from("user_achievements")
      .select("badge")
      .eq("user_id", userId)
      .gte("unlocked_at", dateStart)
      .lt("unlocked_at", dateEnd);

    const badgesUnlocked = (badgesData ?? []).map((b: any) => b.badge);

    // 11. points_earned
    const { data: pointsData } = await supabaseAdmin
      .from("reward_transactions")
      .select("points")
      .eq("user_id", userId)
      .gt("points", 0)
      .gte("created_at", dateStart)
      .lt("created_at", dateEnd);

    const pointsEarned = (pointsData ?? []).reduce((sum: number, r: any) => sum + r.points, 0);

    // Get user name for Gemini prompt
    const { data: profileData } = await supabaseAdmin
      .from("user_profiles")
      .select("name")
      .eq("user_id", userId)
      .maybeSingle();

    const userName = profileData?.name || "utente";

    // 12. aria_message — call Gemini
    let ariaMessage = "";
    if (googleApiKey) {
      try {
        const geminiPrompt = `Sei Aria, companion di benessere psicologico. Genera un messaggio di 2-3 frasi caldo e personale per ${userName} basato su questi dati del periodo ${period_key}: sessioni: ${totalSessions}, emozione dominante: ${dominantEmotion}, streak più lungo: ${longestStreak} giorni. Incoraggialo per il prossimo periodo. Solo il messaggio, niente altro.`;

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

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          ariaMessage = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        } else {
          console.error("[generate-wrapped] Gemini API error:", await geminiResponse.text());
        }
      } catch (e) {
        console.error("[generate-wrapped] Gemini call failed:", (e as Error).message);
      }
    } else {
      console.log("[generate-wrapped] GOOGLE_API_KEY not set, skipping aria_message");
    }

    // Build wrapped data object
    const wrappedData = {
      total_sessions: totalSessions,
      total_minutes: totalMinutes,
      total_checkins: totalCheckins ?? 0,
      dominant_emotion: dominantEmotion,
      longest_streak: longestStreak,
      top_topics: topTopics,
      wellness_start: wellnessStart,
      wellness_end: wellnessEnd,
      hardest_week: hardestWeek,
      best_week: bestWeek,
      badges_unlocked: badgesUnlocked,
      points_earned: pointsEarned,
      aria_message: ariaMessage,
    };

    // UPSERT into aria_wrapped_data
    const { error: upsertError } = await supabaseAdmin
      .from("aria_wrapped_data")
      .upsert(
        {
          user_id: userId,
          period_type,
          period_key,
          data: wrappedData,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,period_type,period_key" }
      );

    if (upsertError) {
      console.error("[generate-wrapped] Upsert error:", upsertError);
      throw new Error(`Upsert failed: ${upsertError.message}`);
    }

    console.log("[generate-wrapped] Wrapped data saved successfully");

    return new Response(
      JSON.stringify({ success: true, data: wrappedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[generate-wrapped] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
