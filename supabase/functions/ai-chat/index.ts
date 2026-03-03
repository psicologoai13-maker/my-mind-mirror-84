// ═══════════════════════════════════════════════════════════════════════════════
// 💬 AI-CHAT — Refactored to use shared Aria Brain
// All prompt/personality logic lives in _shared/aria-brain.ts
// This file handles: HTTP, auth, Gemini API, streaming, crisis, summary
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildAriaBrain } from '../_shared/aria-brain.ts';
import type { UserProfile } from '../_shared/aria-brain.ts';
import { corsHeaders } from '../_shared/auth.ts';

// ═══════════════════════════════════════════════
// CRISIS DETECTION
// ═══════════════════════════════════════════════

const CRISIS_PATTERNS = [
  /voglio morire/i, /farla finita/i, /suicid(io|armi|arsi)/i,
  /non ce la faccio più/i, /uccidermi/i, /togliermi la vita/i,
  /non voglio più vivere/i, /meglio se non ci fossi/i,
  /autolesion/i, /tagliarmi/i, /farmi del male/i,
];

function detectCrisis(messages: Array<{ role: string; content: string }>): boolean {
  const lastUserMessages = messages.filter(m => m.role === 'user').slice(-3).map(m => m.content);
  return lastUserMessages.some(content => CRISIS_PATTERNS.some(pattern => pattern.test(content)));
}

// ═══════════════════════════════════════════════
// AUTHENTICATION (triple fallback)
// ═══════════════════════════════════════════════

async function resolveAuth(
  authHeader: string | null,
  bodyAccessToken?: string,
  bodyUserId?: string
): Promise<{ userId: string; supabaseClient: any; supabaseAdmin: any } | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.log('[ai-chat] Missing Supabase config');
    return null;
  }

  const supabaseAdmin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;
  let authenticatedUserId: string | null = null;
  let supabaseClient: any = null;

  // === AUTH METHOD 1: Authorization header JWT ===
  if (authHeader) {
    const anonKeyPrefix = supabaseKey.substring(0, 30);
    const headerTokenPrefix = authHeader.replace('Bearer ', '').substring(0, 30);
    const isAnonKey = headerTokenPrefix === anonKeyPrefix;

    if (!isAnonKey) {
      try {
        supabaseClient = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } }
        });
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (!userError && user) {
          authenticatedUserId = user.id;
          console.log('[ai-chat] Auth Method 1 (header JWT): User', user.id);
        } else {
          console.log('[ai-chat] Auth Method 1 failed:', userError?.message);
        }
      } catch (e) {
        console.log('[ai-chat] Auth Method 1 error:', (e as Error).message);
      }
    } else {
      console.log('[ai-chat] Authorization header contains ANON KEY (not user JWT) - trying fallbacks');
    }
  }

  // === AUTH METHOD 2: accessToken in request body ===
  if (!authenticatedUserId && bodyAccessToken) {
    try {
      const tokenAuthHeader = bodyAccessToken.startsWith('Bearer ') ? bodyAccessToken : `Bearer ${bodyAccessToken}`;
      supabaseClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: tokenAuthHeader } }
      });
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (!userError && user) {
        authenticatedUserId = user.id;
        console.log('[ai-chat] Auth Method 2 (body accessToken): User', user.id);
      } else {
        console.log('[ai-chat] Auth Method 2 failed:', userError?.message);
      }
    } catch (e) {
      console.log('[ai-chat] Auth Method 2 error:', (e as Error).message);
    }
  }

  // === AUTH METHOD 3: userId in body + service role (last resort) ===
  if (!authenticatedUserId && bodyUserId && serviceRoleKey) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(bodyUserId)) {
      authenticatedUserId = bodyUserId;
      supabaseClient = createClient(supabaseUrl, serviceRoleKey);
      console.log('[ai-chat] Auth Method 3 (body userId + service role): User', bodyUserId);
    } else {
      console.log('[ai-chat] Auth Method 3: Invalid userId format');
    }
  }

  if (!authenticatedUserId) {
    console.log('[ai-chat] ALL auth methods failed');
    return null;
  }

  return {
    userId: authenticatedUserId,
    supabaseClient: supabaseClient || supabaseAdmin,
    supabaseAdmin: supabaseAdmin || supabaseClient,
  };
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Support both "messages" (web) and "conversationHistory" (iOS) field names
    const messages: Array<{ role: string; content: string }> = Array.isArray(body.messages)
      ? body.messages
      : Array.isArray(body.conversationHistory)
        ? body.conversationHistory
        : [];
    const { generateSummary, userId, realTimeContext, accessToken, stream: clientStream } = body;
    // Default to streaming (web), but allow iOS to request non-streaming with stream: false
    const useStreaming = clientStream !== false;
    const authHeader = req.headers.get("Authorization");

    console.log(`[ai-chat] Request received - hasAuthHeader: ${!!authHeader}, hasBodyAccessToken: ${!!accessToken}, hasBodyUserId: ${!!userId}`);

    const isCrisis = detectCrisis(messages);
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");

    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not configured");
    }

    // Resolve authentication
    const auth = await resolveAuth(authHeader, accessToken, userId);

    // ═══════════════════════════════════════════════
    // GENERATE SUMMARY (early return)
    // ═══════════════════════════════════════════════
    if (generateSummary) {
      const summaryPrompt = `Analizza la seguente conversazione e genera un JSON con questo formato esatto:
{
  "summary": "Breve riassunto di 2 frasi della conversazione",
  "mood_score": (numero intero da 1 a 10),
  "anxiety_score": (numero intero da 1 a 10),
  "tags": ["Tag1", "Tag2", "Tag3"]
}

Rispondi SOLO con il JSON.

Conversazione:
${messages.map((m: any) => `${m.role}: ${m.content}`).join('\n')}`;

      const summaryResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: summaryPrompt }] }],
        }),
      });

      if (!summaryResponse.ok) {
        throw new Error("Failed to generate summary");
      }

      const summaryData = await summaryResponse.json();
      const summaryContent = summaryData.candidates?.[0]?.content?.parts?.[0]?.text || "";

      try {
        const jsonMatch = summaryContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return new Response(JSON.stringify({ summary: parsed }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (parseError) {
        console.error("Failed to parse summary JSON:", parseError);
      }

      return new Response(JSON.stringify({
        summary: { summary: "Sessione completata", mood_score: 5, anxiety_score: 5, tags: ["Generale"] }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════
    // BUILD SYSTEM PROMPT via shared Aria Brain
    // ═══════════════════════════════════════════════
    let systemPrompt: string;
    let userProfile: UserProfile | null = null;

    if (auth) {
      const brainResult = await buildAriaBrain(
        auth.userId,
        auth.supabaseClient,
        auth.supabaseAdmin,
        'chat',
        messages,
        realTimeContext
      );
      systemPrompt = brainResult.systemPrompt;
      userProfile = brainResult.userProfile;
      console.log(`[ai-chat] User: ${userProfile.name || 'Anonymous'}, Goals: ${userProfile.selected_goals.join(',')}, Memory: ${userProfile.long_term_memory.length}`);
    } else {
      systemPrompt = "Sei Aria, un'assistente AI empatica e premurosa. Rispondi in italiano con calore e supporto.";
      console.log('[ai-chat] No auth - using minimal system prompt');
    }

    // ═══════════════════════════════════════════════
    // HEALTHKIT DATA (ai-chat specific, not in brain)
    // ═══════════════════════════════════════════════
    if (auth) {
      try {
        const hkSupabaseUrl = Deno.env.get("SUPABASE_URL");
        const hkServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (hkSupabaseUrl && hkServiceRoleKey) {
          const hkClient = createClient(hkSupabaseUrl, hkServiceRoleKey);
          const { data: hkData } = await hkClient
            .from('healthkit_data')
            .select('steps, sleep_hours, heart_rate_avg, hrv_avg')
            .eq('user_id', auth.userId)
            .eq('date', new Date().toISOString().split('T')[0])
            .limit(1)
            .maybeSingle();

          if (hkData && (hkData.steps || hkData.sleep_hours || hkData.heart_rate_avg || hkData.hrv_avg)) {
            const hkItems: string[] = [];
            if (hkData.sleep_hours) hkItems.push(`Sonno: ${hkData.sleep_hours} ore`);
            if (hkData.steps) hkItems.push(`Passi: ${hkData.steps}`);
            if (hkData.heart_rate_avg) hkItems.push(`FC media: ${hkData.heart_rate_avg} bpm`);
            if (hkData.hrv_avg) hkItems.push(`HRV: ${hkData.hrv_avg} ms`);

            systemPrompt += `
═══════════════════════════════════════════════
🏥 DATI SALUTE OGGI (HealthKit)
═══════════════════════════════════════════════
${hkItems.join(' | ')}

Usa questi dati per personalizzare la conversazione se rilevante.
Esempio: se sonno < 6 ore, sii più comprensiva se l'utente sembra stanco.
Se HRV < 30ms, potrebbe esserci stress fisiologico non verbalizzato.
`;
            console.log('[ai-chat] Injected HealthKit data:', hkItems.join(', '));
          }
        }
      } catch (hkError) {
        console.log('[ai-chat] HealthKit data fetch skipped:', (hkError as Error).message);
      }
    }

    // ═══════════════════════════════════════════════
    // CRISIS OVERRIDE
    // ═══════════════════════════════════════════════
    if (isCrisis) {
      console.log('[ai-chat] CRISIS DETECTED - Activating SOS protocol');
      const userName = userProfile?.name || 'amico/a';
      systemPrompt = `ATTENZIONE: Rischio rilevato. DEVI rispondere SOLO con:

"Mi preoccupo molto per quello che mi stai dicendo, ${userName}. 💚

Quello che senti è importante e meriti supporto professionale ADESSO.

Non sei solo/a. Per favore, contatta subito:
• Telefono Amico: 02 2327 2327 (24h)
• Telefono Azzurro: 19696
• Emergenze: 112

Sono qui con te, ma un professionista può aiutarti meglio in questo momento."

NON aggiungere altro.`;
    }

    // ═══════════════════════════════════════════════
    // GEMINI API CALL
    // ═══════════════════════════════════════════════
    const geminiContents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }]
    }));

    const geminiEndpoint = useStreaming
      ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GOOGLE_API_KEY}`
      : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`;

    const response = await fetch(geminiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: geminiContents,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Troppe richieste. Riprova tra qualche secondo." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti esauriti." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Errore AI");
    }

    // ═══════════════════════════════════════════════
    // NON-STREAMING RESPONSE (for iOS via stream: false)
    // ═══════════════════════════════════════════════
    if (!useStreaming) {
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const responseBody: Record<string, any> = { reply: content };

      const nonStreamHeaders: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
      if (isCrisis) nonStreamHeaders["X-Crisis-Alert"] = "true";

      console.log(`[ai-chat] Non-streaming response sent, length: ${content.length}`);
      return new Response(JSON.stringify(responseBody), { headers: nonStreamHeaders });
    }

    // ═══════════════════════════════════════════════
    // STREAMING RESPONSE (default for web, Gemini SSE → OpenAI SSE)
    // ═══════════════════════════════════════════════
    const responseHeaders: Record<string, string> = { ...corsHeaders, "Content-Type": "text/event-stream" };
    if (isCrisis) responseHeaders["X-Crisis-Alert"] = "true";

    let sseBuffer = '';
    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        sseBuffer += new TextDecoder().decode(chunk);
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (!data) continue;
            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) {
                const out = { choices: [{ delta: { content: text }, finish_reason: null }] };
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(out)}\n\n`));
              }
            } catch { /* ignore parse errors */ }
          }
        }
      },
      flush(controller) {
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
      }
    });

    return new Response(response.body!.pipeThrough(transformStream), { headers: responseHeaders });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
