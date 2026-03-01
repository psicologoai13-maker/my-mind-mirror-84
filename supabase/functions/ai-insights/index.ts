import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserMetrics {
  vitals: {
    mood: number;
    anxiety: number;
    energy: number;
    sleep: number;
  };
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    apathy: number;
  };
  life_areas: {
    love: number | null;
    work: number | null;
    health: number | null;
    social: number | null;
    growth: number | null;
  };
  deep_psychology: Record<string, number | null>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");

    if (!googleApiKey) {
      throw new Error("GOOGLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;

    // Get user profile and goals
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("selected_goals, name, onboarding_answers")
      .eq("user_id", userId)
      .maybeSingle();

    // Get metrics for today
    const today = new Date().toISOString().split("T")[0];
    const { data: metricsData } = await supabase.rpc("get_daily_metrics", {
      p_user_id: userId,
      p_date: today,
    });

    // Get recent sessions for context
    const { data: recentSessions } = await supabase
      .from("sessions")
      .select("ai_summary, emotion_tags, start_time")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("start_time", { ascending: false })
      .limit(5);

    const metrics = metricsData as UserMetrics | null;
    const goals = profile?.selected_goals || [];
    const userName = profile?.name || "Utente";

    // Build context for AI
    const contextParts: string[] = [];
    
    if (metrics?.vitals) {
      // Anxiety uses inverted logic: high DB value = low actual anxiety
      const actualAnxiety = 10 - metrics.vitals.anxiety;
      contextParts.push(`Parametri vitali: Umore ${metrics.vitals.mood}/10, Ansia effettiva ${actualAnxiety.toFixed(1)}/10, Energia ${metrics.vitals.energy}/10, Sonno ${metrics.vitals.sleep}/10`);
    }

    if (metrics?.deep_psychology) {
      const psych = metrics.deep_psychology;
      const psychParts: string[] = [];
      if (psych.burnout_level) psychParts.push(`Burnout ${psych.burnout_level}/10`);
      if (psych.rumination) psychParts.push(`Ruminazione ${psych.rumination}/10`);
      if (psych.loneliness_perceived) psychParts.push(`Solitudine ${psych.loneliness_perceived}/10`);
      if (psych.somatic_tension) psychParts.push(`Tensione fisica ${psych.somatic_tension}/10`);
      if (psych.gratitude) psychParts.push(`Gratitudine ${psych.gratitude}/10`);
      if (psychParts.length > 0) {
        contextParts.push(`Psicologia profonda: ${psychParts.join(", ")}`);
      }
    }

    if (metrics?.life_areas) {
      const areas = metrics.life_areas;
      const areaParts: string[] = [];
      if (areas.work) areaParts.push(`Lavoro ${areas.work}/10`);
      if (areas.love) areaParts.push(`Amore ${areas.love}/10`);
      if (areas.health) areaParts.push(`Salute ${areas.health}/10`);
      if (areas.social) areaParts.push(`Socialità ${areas.social}/10`);
      if (areaParts.length > 0) {
        contextParts.push(`Aree della vita: ${areaParts.join(", ")}`);
      }
    }

    if (goals.length > 0) {
      contextParts.push(`Obiettivi dell'utente: ${goals.join(", ")}`);
    }

    if (recentSessions && recentSessions.length > 0) {
      const summaries = recentSessions
        .filter((s: any) => s.ai_summary)
        .map((s: any) => s.ai_summary)
        .slice(0, 2);
      if (summaries.length > 0) {
        contextParts.push(`Riassunti sessioni recenti: ${summaries.join(" | ")}`);
      }
    }

    const systemPrompt = `Sei uno psicologo clinico esperto che fornisce insight brevi e personalizzati. 
Genera esattamente 3 insight per l'utente basandoti sui suoi dati.

Regole CRITICHE:
1. Ogni insight deve essere BREVE (max 15 parole per il titolo, max 30 parole per il messaggio)
2. Usa SOLO i dati forniti - non inventare metriche
3. Prioritizza insight legati agli obiettivi dell'utente
4. Sii empatico ma diretto
5. Suggerisci azioni concrete quando possibile
6. Per metriche negative alte (ansia, burnout, rumination > 6) mostra alert
7. Per metriche positive alte (gratitudine, coping > 7) celebra il successo

Tipi di insight disponibili:
- "positive": Per celebrare progressi o stati positivi (colore verde)
- "alert": Per segnalare metriche critiche che richiedono attenzione (colore arancione)
- "suggestion": Per suggerimenti pratici (colore blu)
- "correlation": Per pattern rilevati tra metriche (colore viola)
- "goal": Per insight legati agli obiettivi dell'utente (colore teal)

Rispondi SOLO con un JSON array valido, senza markdown, senza spiegazioni.`;

    const userPrompt = `Dati utente "${userName}":
${contextParts.join("\n")}

Genera 3 insight personalizzati in formato JSON:
[
  {"type": "positive|alert|suggestion|correlation|goal", "title": "...", "message": "..."},
  ...
]`;

    // Call Google Gemini AI
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[ai-insights] AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    
    // Parse AI response
    let insights: Array<{ type: string; title: string; message: string }> = [];
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      insights = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("[ai-insights] Failed to parse AI response:", content);
      insights = [];
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[ai-insights] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
