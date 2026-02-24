import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════
// ARIA PROACTIVE PUSH NOTIFICATIONS
// Generates contextual messages and sends via APNs
// ═══════════════════════════════════════════════════════════════

interface PushPayload {
  userId?: string;       // Send to specific user
  triggerType?: string;  // "scheduled" | "event_based" | "mood_check" | "streak" | "insight"
}

// Build JWT for APNs authentication
async function buildApnsJwt(): Promise<string> {
  const teamId = Deno.env.get("APNS_TEAM_ID");
  const keyId = Deno.env.get("APNS_KEY_ID");
  const privateKeyPem = Deno.env.get("APNS_PRIVATE_KEY");

  if (!teamId || !keyId || !privateKeyPem) {
    throw new Error("APNs credentials not configured");
  }

  // JWT Header
  const header = { alg: "ES256", kid: keyId };
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: teamId, iat: now };

  const encodePart = (obj: Record<string, unknown>) => {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const headerB64 = encodePart(header);
  const claimsB64 = encodePart(claims);
  const signingInput = `${headerB64}.${claimsB64}`;

  // Import the P8 private key
  const pemBody = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8", keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false, ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput)
  );

  // Convert DER signature to raw r||s format for JWT
  const sigBytes = new Uint8Array(signature);
  const sigB64 = btoa(String.fromCharCode(...sigBytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `${signingInput}.${sigB64}`;
}

// Send push notification via APNs
async function sendApnsPush(
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<boolean> {
  try {
    const jwt = await buildApnsJwt();
    const bundleId = Deno.env.get("APP_BUNDLE_ID") || "com.aria.app";
    const apnsEnv = Deno.env.get("APNS_ENVIRONMENT") || "production"; // "development" or "production"
    const apnsHost = apnsEnv === "development" 
      ? "https://api.development.push.apple.com" 
      : "https://api.push.apple.com";

    const payload = {
      aps: {
        alert: { title, body },
        sound: "default",
        badge: 1,
        "mutable-content": 1,
        "thread-id": "aria-messages",
        "category": "ARIA_MESSAGE"
      },
      ...data
    };

    const response = await fetch(
      `${apnsHost}/3/device/${deviceToken}`,
      {
        method: "POST",
        headers: {
          "authorization": `bearer ${jwt}`,
          "apns-topic": bundleId,
          "apns-push-type": "alert",
          "apns-priority": "10",
          "apns-expiration": "0",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[aria-push] APNs error ${response.status}:`, errorText);
      
      // If token is invalid, deactivate it
      if (response.status === 410 || response.status === 400) {
        return false; // Signal to deactivate token
      }
    }

    return response.ok;
  } catch (error) {
    console.error("[aria-push] Send error:", error);
    return false;
  }
}

// Generate contextual message using AI
async function generateProactiveMessage(
  userName: string,
  context: {
    lastSessionDaysAgo: number;
    currentStreak: number;
    lastMood: number | null;
    recentTopics: string[];
    timeOfDay: string;
    pendingEvents: string[];
  }
): Promise<{ title: string; body: string; triggerType: string } | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  const name = userName?.split(" ")[0] || "amico/a";
  const hour = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome", hour: "numeric" });

  const prompt = `Sei Aria, la migliore amica dell'utente ${name}. 
Devi scrivere UN SINGOLO messaggio push notification proattivo.

CONTESTO:
- Ultimo check-in: ${context.lastSessionDaysAgo} giorni fa
- Streak attuale: ${context.currentStreak} giorni
- Ultimo umore: ${context.lastMood || "sconosciuto"}/10
- Argomenti recenti: ${context.recentTopics.join(", ") || "nessuno"}
- Ora: ${hour}
- Eventi in arrivo: ${context.pendingEvents.join(", ") || "nessuno"}

REGOLE:
- Max 50 caratteri per il titolo
- Max 100 caratteri per il body
- Tono da AMICA, non da app/robot
- Deve sembrare un messaggio WhatsApp da un'amica vera
- USA il nome dell'utente
- Se è passato tempo, mostra che ti mancava
- Se c'è un evento, fai riferimento
- NO emoji eccessivi (max 1)
- NO frasi da terapeuta

ESEMPI BUONI:
Titolo: "Ehi ${name}! 💭"  Body: "Mi è venuta in mente una cosa su quello che mi dicevi..."
Titolo: "${name}!"  Body: "Tutto bene? Non ti sento da un po', raccontami!"
Titolo: "Psst ${name}"  Body: "Ho pensato a te oggi. Come va con il lavoro?"

Rispondi SOLO in JSON: {"title": "...", "body": "...", "triggerType": "..."}
triggerType: "missing_you" | "streak_motivation" | "event_reminder" | "mood_check" | "random_thinking"`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
      }),
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("[aria-push] AI generation error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { userId, triggerType = "scheduled" } = await req.json() as PushPayload;

    // Get target users (specific or all with active tokens)
    let usersQuery = supabase
      .from("device_push_tokens")
      .select("user_id, device_token")
      .eq("is_active", true)
      .eq("platform", "ios");

    if (userId) {
      usersQuery = usersQuery.eq("user_id", userId);
    }

    const { data: tokens, error: tokensError } = await usersQuery;
    if (tokensError || !tokens?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No active tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group tokens by user
    const userTokens = new Map<string, string[]>();
    for (const t of tokens) {
      const existing = userTokens.get(t.user_id) || [];
      existing.push(t.device_token);
      userTokens.set(t.user_id, existing);
    }

    let sentCount = 0;

    for (const [uid, deviceTokens] of userTokens) {
      // Fetch user context
      const [profileResult, sessionResult, streakResult, eventsResult, topicsResult] = await Promise.all([
        supabase.from("user_profiles").select("name, notification_settings").eq("user_id", uid).single(),
        supabase.from("sessions").select("start_time, mood_score_detected").eq("user_id", uid).eq("status", "completed").order("start_time", { ascending: false }).limit(1),
        supabase.from("habit_streaks").select("current_streak").eq("user_id", uid).eq("habit_type", "checkin").single(),
        supabase.from("user_events").select("title").eq("user_id", uid).eq("status", "upcoming").gte("event_date", new Date().toISOString().split("T")[0]).limit(3),
        supabase.from("conversation_topics").select("topic").eq("user_id", uid).order("last_mentioned_at", { ascending: false }).limit(5),
      ]);

      const profile = profileResult.data;
      if (!profile?.name) continue;

      // Check notification preferences
      const notifSettings = profile.notification_settings as Record<string, unknown> | null;
      if (notifSettings && notifSettings.daily_insights === false) continue;

      // Calculate context
      const lastSession = sessionResult.data?.[0];
      const lastSessionDaysAgo = lastSession
        ? Math.floor((Date.now() - new Date(lastSession.start_time).getTime()) / 86400000)
        : 999;

      const context = {
        lastSessionDaysAgo,
        currentStreak: streakResult.data?.current_streak || 0,
        lastMood: lastSession?.mood_score_detected || null,
        recentTopics: (topicsResult.data || []).map(t => t.topic),
        timeOfDay: new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome", hour: "numeric" }),
        pendingEvents: (eventsResult.data || []).map(e => e.title),
      };

      // Generate contextual message
      const message = await generateProactiveMessage(profile.name, context);
      if (!message) continue;

      // Send to all user devices
      for (const token of deviceTokens) {
        const success = await sendApnsPush(token, message.title, message.body, {
          action: "open_chat",
          triggerType: message.triggerType,
        });

        if (success) {
          sentCount++;
        } else {
          // Deactivate invalid token
          await supabase
            .from("device_push_tokens")
            .update({ is_active: false })
            .eq("device_token", token);
        }
      }

      // Log notification in smart_notifications
      await supabase.from("smart_notifications").insert({
        user_id: uid,
        trigger_type: message.triggerType,
        content: message.body,
        title: message.title,
        priority: "medium",
        scheduled_for: new Date().toISOString(),
        sent_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[aria-push] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
