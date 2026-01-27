import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// All available check-in items
const ALL_CHECKIN_ITEMS = [
  { key: "mood", label: "Umore", question: "Come ti senti emotivamente?", type: "vital", responseType: "emoji" },
  { key: "anxiety", label: "Ansia", question: "Quanta ansia senti?", type: "vital", responseType: "intensity" },
  { key: "energy", label: "Energia", question: "Quanta energia hai?", type: "vital", responseType: "slider" },
  { key: "sleep", label: "Sonno", question: "Come hai dormito?", type: "vital", responseType: "emoji" },
  { key: "love", label: "Amore", question: "Come va la tua vita sentimentale?", type: "life_area", responseType: "emoji" },
  { key: "work", label: "Lavoro", question: "Come va il lavoro/studio?", type: "life_area", responseType: "emoji" },
  { key: "social", label: "Socialità", question: "Come vanno le relazioni sociali?", type: "life_area", responseType: "emoji" },
  { key: "growth", label: "Crescita", question: "Ti senti in crescita personale?", type: "life_area", responseType: "yesno" },
  { key: "health", label: "Salute", question: "Come sta il tuo corpo?", type: "life_area", responseType: "emoji" },
  { key: "sadness", label: "Tristezza", question: "Ti senti triste oggi?", type: "emotion", responseType: "yesno" },
  { key: "anger", label: "Rabbia", question: "Senti frustrazione o rabbia?", type: "emotion", responseType: "yesno" },
  { key: "fear", label: "Paura", question: "Hai paure o preoccupazioni?", type: "emotion", responseType: "yesno" },
  { key: "joy", label: "Gioia", question: "Quanta gioia senti?", type: "emotion", responseType: "intensity" },
  { key: "rumination", label: "Pensieri", question: "Stai rimuginando su qualcosa?", type: "psychology", responseType: "yesno" },
  { key: "burnout_level", label: "Burnout", question: "Ti senti esausto/a?", type: "psychology", responseType: "yesno" },
  { key: "loneliness_perceived", label: "Solitudine", question: "Ti senti solo/a?", type: "psychology", responseType: "yesno" },
  { key: "gratitude", label: "Gratitudine", question: "Sei grato/a per qualcosa oggi?", type: "psychology", responseType: "yesno" },
  { key: "mental_clarity", label: "Chiarezza", question: "Hai chiarezza mentale?", type: "psychology", responseType: "slider" },
  { key: "somatic_tension", label: "Tensione", question: "Senti tensione nel corpo?", type: "psychology", responseType: "yesno" },
  { key: "coping_ability", label: "Resilienza", question: "Ti senti capace di affrontare le sfide?", type: "psychology", responseType: "yesno" },
  { key: "sunlight_exposure", label: "Luce solare", question: "Hai preso abbastanza sole?", type: "psychology", responseType: "yesno" },
];

// Generate objective check-in items dynamically
interface ObjectiveCheckin {
  key: string;
  label: string;
  question: string;
  type: string;
  responseType: string;
  objectiveId: string;
  unit?: string;
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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
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
    
    // Use Rome timezone (UTC+1 in winter, UTC+2 in summer)
    const now = new Date();
    const romeTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
    const today = romeTime.toISOString().split("T")[0];

    // Get user profile and goals
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("selected_goals, onboarding_answers")
      .eq("user_id", userId)
      .maybeSingle();

    // 🎯 NEW: Get active objectives for personalized check-ins
    const { data: activeObjectives } = await supabase
      .from("user_objectives")
      .select("id, title, category, target_value, current_value, unit")
      .eq("user_id", userId)
      .eq("status", "active");

    // Generate dynamic objective check-ins
    const objectiveCheckins: ObjectiveCheckin[] = (activeObjectives || []).map((obj: any) => {
      const unitLabel = obj.unit ? ` (${obj.unit})` : '';
      let question = `Com'è andato il progresso su "${obj.title}"?`;
      let responseType = 'slider';
      
      // Customize question based on category
      if (obj.category === 'body' && obj.unit === 'Kg') {
        question = `Quanto pesi oggi${unitLabel}?`;
        responseType = 'slider'; // Will be interpreted as 1-5 progress scale
      } else if (obj.category === 'study') {
        question = `Quanto hai studiato oggi per "${obj.title}"?`;
      } else if (obj.category === 'finance') {
        question = `Hai risparmiato oggi per "${obj.title}"?`;
        responseType = 'yesno';
      }
      
      return {
        key: `objective_${obj.id}`,
        label: obj.title,
        question,
        type: 'objective',
        responseType,
        objectiveId: obj.id,
        unit: obj.unit,
      };
    });

    // Get today's completed data from all sources
    const [lifeAreasRes, emotionsRes, psychologyRes, checkinRes] = await Promise.all([
      supabase.from("daily_life_areas").select("*").eq("user_id", userId).eq("date", today),
      supabase.from("daily_emotions").select("*").eq("user_id", userId).eq("date", today),
      supabase.from("daily_psychology").select("*").eq("user_id", userId).eq("date", today),
      supabase.from("daily_checkins").select("*").eq("user_id", userId).gte("created_at", `${today}T00:00:00`),
    ]);

    // Build set of completed keys
    const completedKeys = new Set<string>();

    // From checkins - also check for objective updates
    if (checkinRes.data && checkinRes.data.length > 0) {
      completedKeys.add("mood");
      const notes = checkinRes.data[0]?.notes;
      if (notes) {
        try {
          const parsed = JSON.parse(notes);
          Object.keys(parsed).forEach(k => completedKeys.add(k));
        } catch {}
      }
    }

    // From life areas
    lifeAreasRes.data?.forEach((record: any) => {
      ["love", "work", "social", "growth", "health"].forEach(k => {
        if (record[k]) completedKeys.add(k);
      });
    });

    // From emotions
    emotionsRes.data?.forEach((record: any) => {
      ["joy", "sadness", "anger", "fear", "apathy"].forEach(k => {
        if (record[k]) completedKeys.add(k);
      });
    });

    // From psychology
    psychologyRes.data?.forEach((record: any) => {
      Object.keys(record).forEach(k => {
        if (record[k] && !["id", "user_id", "date", "session_id", "source", "created_at", "updated_at"].includes(k)) {
          completedKeys.add(k);
        }
      });
    });

    // Filter available items (standard + objectives)
    const availableStandardItems = ALL_CHECKIN_ITEMS.filter(item => !completedKeys.has(item.key));
    const availableObjectiveItems = objectiveCheckins.filter(item => !completedKeys.has(item.key));
    
    // 🎯 FORCE: Objectives are ALWAYS included first, then AI selects the rest
    // This ensures user objectives like "Prendere kg" always appear
    const forcedObjectives = availableObjectiveItems.slice(0, 4); // Max 4 objectives at top
    const remainingSlots = 8 - forcedObjectives.length;
    
    // AI will only select from standard items (not objectives)
    const allAvailableItems = availableStandardItems;

    if (forcedObjectives.length === 0 && allAvailableItems.length === 0) {
      return new Response(JSON.stringify({ checkins: [], allCompleted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recent sessions for context
    const { data: recentSessions } = await supabase
      .from("sessions")
      .select("ai_summary, emotion_tags")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("start_time", { ascending: false })
      .limit(3);

    const goals = profile?.selected_goals || [];
    const sessionContext = recentSessions?.map((s: any) => s.ai_summary || "").filter(Boolean).join(" ") || "";
    const emotionTags = recentSessions?.flatMap((s: any) => s.emotion_tags || []) || [];

    const systemPrompt = `Sei uno psicologo clinico esperto che sceglie quali domande fare a un utente per il suo check-in giornaliero.

Obiettivo: Scegli le ${remainingSlots} domande PIÙ RILEVANTI da porre oggi, ORDINATE per importanza, basandoti su:
1. Gli obiettivi dell'utente (priorità massima)
2. I temi emersi nelle sessioni recenti e pattern emotivi
3. Le emozioni rilevate di recente
4. La varietà (mescola vitali, aree vita, emozioni e psicologia profonda)
5. L'urgenza clinica (es. ansia alta o burnout vanno chiesti prima)

REGOLE:
- Scegli ESATTAMENTE ${remainingSlots} domande dalla lista disponibile
- ORDINA per importanza: le prime sono le più urgenti/rilevanti
- Fornisci una breve motivazione (max 5 parole) per ogni scelta
- Rispondi SOLO con JSON valido, senza markdown

Formato risposta:
[
  {"key": "...", "reason": "..."},
  {"key": "...", "reason": "..."},
  {"key": "...", "reason": "..."},
  {"key": "...", "reason": "..."},
  {"key": "...", "reason": "..."},
  {"key": "...", "reason": "..."},
  {"key": "...", "reason": "..."},
  {"key": "...", "reason": "..."}
]`;

    const availableItemsText = allAvailableItems.map((i: any) => `- ${i.key}: "${i.question}" (${i.type})`).join("\n");

    const userPrompt = `Obiettivi utente: ${goals.length > 0 ? goals.join(", ") : "Non specificati"}

Contesto sessioni recenti: ${sessionContext || "Nessuna sessione recente"}

Emozioni recenti: ${emotionTags.length > 0 ? emotionTags.join(", ") : "Non rilevate"}

Domande disponibili (non ancora risposte oggi):
${availableItemsText}

Scegli le ${remainingSlots} domande più rilevanti IN ORDINE DI IMPORTANZA:`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 300,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[ai-checkins] AI gateway error:", aiResponse.status, errorText);
      
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
      
      // Fallback to first items
      const fallbackCheckins = [
        ...forcedObjectives.map((item: any) => ({ ...item, reason: "Obiettivo personale" })),
        ...allAvailableItems.slice(0, remainingSlots).map((item: any) => ({
          ...item,
          reason: "Suggerimento automatico",
        })),
      ];
      
      return new Response(JSON.stringify({ checkins: fallbackCheckins, aiGenerated: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    // Parse AI response
    let aiSelection: Array<{ key: string; reason: string }> = [];
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      aiSelection = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("[ai-checkins] Failed to parse AI response:", content);
      // Fallback - return first items
      aiSelection = allAvailableItems.slice(0, remainingSlots).map((item: any) => ({ key: item.key, reason: "Suggerimento" }));
    }

    // Build final checkins: FORCED objectives first, then AI-selected standard items
    const aiSelectedCheckins = aiSelection
      .slice(0, remainingSlots)
      .map(sel => {
        const item = allAvailableItems.find((i: any) => i.key === sel.key);
        if (!item) return null;
        return {
          ...item,
          reason: sel.reason,
        };
      })
      .filter(Boolean);

    // Fill remaining slots if AI didn't return enough
    while (aiSelectedCheckins.length < remainingSlots && allAvailableItems.length > aiSelectedCheckins.length) {
      const nextItem = allAvailableItems.find((i: any) => !aiSelectedCheckins.some((s: any) => s.key === i.key));
      if (nextItem) {
        aiSelectedCheckins.push({ ...nextItem, reason: "Suggerimento" });
      } else {
        break;
      }
    }

    // 🎯 FINAL: Objectives FIRST, then AI-selected
    const selectedCheckins = [
      ...forcedObjectives.map((item: any) => ({ ...item, reason: "Obiettivo personale" })),
      ...aiSelectedCheckins,
    ];

    return new Response(JSON.stringify({ checkins: selectedCheckins, aiGenerated: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[ai-checkins] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
