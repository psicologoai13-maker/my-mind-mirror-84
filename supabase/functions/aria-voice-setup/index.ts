// ═══════════════════════════════════════════════════════════════════════════════
// 🎙️ ARIA-VOICE-SETUP — Prepara il cervello unificato per sessioni vocali
// Gemini Live API (Architettura B): restituisce prompt, token, config
// Il client Swift si connette direttamente a Gemini Live API via WebSocket
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAriaBrain } from '../_shared/aria-brain.ts';
import type { UserProfile } from '../_shared/aria-brain.ts';
import { corsHeaders } from '../_shared/auth.ts';

// ═══════════════════════════════════════════════
// AUTHENTICATION (triple fallback — same as ai-chat)
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
    console.log('[aria-voice-setup] Missing Supabase config');
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
          console.log('[aria-voice-setup] Auth Method 1 (header JWT): User', user.id);
        } else {
          console.log('[aria-voice-setup] Auth Method 1 failed:', userError?.message);
        }
      } catch (e) {
        console.log('[aria-voice-setup] Auth Method 1 error:', (e as Error).message);
      }
    } else {
      console.log('[aria-voice-setup] Authorization header contains ANON KEY (not user JWT) - trying fallbacks');
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
        console.log('[aria-voice-setup] Auth Method 2 (body accessToken): User', user.id);
      } else {
        console.log('[aria-voice-setup] Auth Method 2 failed:', userError?.message);
      }
    } catch (e) {
      console.log('[aria-voice-setup] Auth Method 2 error:', (e as Error).message);
    }
  }

  // === AUTH METHOD 3: userId in body + service role (last resort) ===
  if (!authenticatedUserId && bodyUserId && serviceRoleKey) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(bodyUserId)) {
      authenticatedUserId = bodyUserId;
      supabaseClient = createClient(supabaseUrl, serviceRoleKey);
      console.log('[aria-voice-setup] Auth Method 3 (body userId + service role): User', bodyUserId);
    } else {
      console.log('[aria-voice-setup] Auth Method 3: Invalid userId format');
    }
  }

  if (!authenticatedUserId) {
    console.log('[aria-voice-setup] ALL auth methods failed');
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
    const { userId, accessToken, realTimeContext } = body;
    const authHeader = req.headers.get("Authorization");

    console.log(`[aria-voice-setup] Request received - hasAuthHeader: ${!!authHeader}, hasBodyAccessToken: ${!!accessToken}, hasBodyUserId: ${!!userId}`);

    // Resolve authentication
    const auth = await resolveAuth(authHeader, accessToken, userId);
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not configured");
    }

    // ═══════════════════════════════════════════════
    // A) BUILD SYSTEM PROMPT via shared Aria Brain
    // ═══════════════════════════════════════════════
    let systemPrompt: string;
    let userProfile: UserProfile | null = null;

    try {
      const brainResult = await buildAriaBrain(
        auth.userId,
        auth.supabaseClient,
        auth.supabaseAdmin,
        'voice',
        [],
        realTimeContext
      );
      systemPrompt = brainResult.systemPrompt;
      userProfile = brainResult.userProfile;
      console.log(`[aria-voice-setup] Brain built for: ${userProfile.name || 'Anonymous'}`);
    } catch (brainError) {
      console.error('[aria-voice-setup] buildAriaBrain failed, using fallback:', brainError);
      systemPrompt = "Sei Aria, un'intelligenza artificiale amica italiana. Parla in modo caldo e breve, come una migliore amica al telefono. Max 2 frasi per risposta.";
    }

    // ═══════════════════════════════════════════════
    // B) GENERATE FIRST MESSAGE (personalized greeting)
    // ═══════════════════════════════════════════════

    // Find user name: nickname > first name > fallback
    let userName = 'Utente';
    try {
      const { data: interestsData } = await auth.supabaseAdmin
        .from('user_interests')
        .select('nickname')
        .eq('user_id', auth.userId)
        .maybeSingle();

      if (interestsData?.nickname) {
        userName = interestsData.nickname;
      } else if (userProfile?.name) {
        userName = userProfile.name.split(' ')[0];
      }
    } catch (e) {
      console.log('[aria-voice-setup] Nickname lookup failed:', (e as Error).message);
      if (userProfile?.name) {
        userName = userProfile.name.split(' ')[0];
      }
    }

    // Query last session for greeting logic
    let firstMessage = `Ciao${userName !== 'Utente' ? ' ' + userName : ''}! Come stai?`;

    try {
      const { data: lastSessionData } = await auth.supabaseAdmin
        .from('sessions')
        .select('start_time')
        .eq('user_id', auth.userId)
        .order('start_time', { ascending: false })
        .limit(1);

      if (lastSessionData && lastSessionData.length > 0) {
        const lastSession = lastSessionData[0];
        const diffMs = new Date().getTime() - new Date(lastSession.start_time).getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        if (diffMinutes < 30) {
          firstMessage = `Ehi${userName !== 'Utente' ? ' ' + userName : ''}! Rieccoci! Tutto ok?`;
        } else if (diffMinutes < 180) {
          firstMessage = `Ehi${userName !== 'Utente' ? ' ' + userName : ''}! Bentornato! Come va?`;
        }
      } else {
        // First ever session
        firstMessage = `Ciao${userName !== 'Utente' ? ' ' + userName : ''}! Sono Aria, piacere di sentirti! Come stai oggi?`;
      }
    } catch (e) {
      console.log('[aria-voice-setup] Session lookup failed:', (e as Error).message);
    }

    // ═══════════════════════════════════════════════
    // C) GENERATE GEMINI EPHEMERAL TOKEN
    // ═══════════════════════════════════════════════
    let ephemeralToken: string | null = null;
    let authMethod = 'api_key';
    let apiKeyFallback: string | null = GOOGLE_API_KEY;

    try {
      const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');

      const tokenResponse = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/authTokens',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GOOGLE_API_KEY,
          },
          body: JSON.stringify({
            authToken: {
              expireTime,
              uses: 1,
              bidiGenerateContentSetup: {
                model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
                systemInstruction: {
                  parts: [{ text: systemPrompt }],
                },
                generationConfig: {
                  responseModalities: ['AUDIO'],
                  temperature: 0.8,
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                    languageCode: 'it-IT',
                  },
                },
                realtimeInputConfig: {
                  automaticActivityDetection: {
                    startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
                    endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
                    silenceDurationMs: 1000,
                  },
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
              },
            },
          }),
        }
      );

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        ephemeralToken = tokenData.authToken?.token || tokenData.token || null;
        if (ephemeralToken) {
          authMethod = 'ephemeral_token';
          apiKeyFallback = null;
          console.log('[aria-voice-setup] Ephemeral token generated successfully');
        } else {
          console.error('[aria-voice-setup] Ephemeral token response missing token field:', JSON.stringify(tokenData));
        }
      } else {
        const errorText = await tokenResponse.text();
        console.error(`[aria-voice-setup] Ephemeral token request failed (${tokenResponse.status}):`, errorText);
      }
    } catch (tokenError) {
      console.error('[aria-voice-setup] Ephemeral token generation error:', tokenError);
    }

    // ═══════════════════════════════════════════════
    // D) RETURN RESPONSE
    // ═══════════════════════════════════════════════
    const responseBody = {
      systemPrompt,
      firstMessage,
      ephemeralToken,
      authMethod,
      apiKey: apiKeyFallback,
      voiceConfig: {
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        voiceName: 'Kore',
        languageCode: 'it-IT',
        sampleRateInput: 16000,
        sampleRateOutput: 24000,
      },
      websocketUrl: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent',
    };

    console.log(`[aria-voice-setup] Response ready - authMethod: ${authMethod}, user: ${userName}, promptLength: ${systemPrompt.length}`);

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[aria-voice-setup] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
