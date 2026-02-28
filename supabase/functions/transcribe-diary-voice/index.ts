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
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");

    // --- Triple fallback auth ---
    // For multipart, we can't easily parse body for accessToken/userId before reading formData,
    // so we try header first, then parse formData and fallback.
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
            console.log("[transcribe-diary-voice] Auth Method 1: User", user.id);
          }
        } catch (e) {
          console.log("[transcribe-diary-voice] Auth Method 1 error:", (e as Error).message);
        }
      }
    }

    // Read form data
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    // AUTH METHOD 2: accessToken in form data
    if (!authenticatedUserId) {
      const bodyAccessToken = formData.get("accessToken") as string | null;
      if (bodyAccessToken) {
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
            console.log("[transcribe-diary-voice] Auth Method 2: User", user.id);
          }
        } catch (e) {
          console.log("[transcribe-diary-voice] Auth Method 2 error:", (e as Error).message);
        }
      }
    }

    // AUTH METHOD 3: userId in form data + service role
    if (!authenticatedUserId) {
      const bodyUserId = formData.get("userId") as string | null;
      if (bodyUserId && serviceRoleKey) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(bodyUserId)) {
          authenticatedUserId = bodyUserId;
          supabase = createClient(supabaseUrl, serviceRoleKey);
          console.log("[transcribe-diary-voice] Auth Method 3: User", bodyUserId);
        }
      }
    }

    if (!authenticatedUserId || !supabase) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate audio file
    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "audio file is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check file size (max 25MB)
    const maxSize = 25 * 1024 * 1024;
    if (audioFile.size > maxSize) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum 25MB allowed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[transcribe-diary-voice] Transcribing audio: ${audioFile.name} (${audioFile.size} bytes)`);

    // Send to OpenAI Whisper
    const whisperFormData = new FormData();
    whisperFormData.append("file", audioFile, audioFile.name || "audio.m4a");
    whisperFormData.append("model", "whisper-1");
    whisperFormData.append("language", "it");
    whisperFormData.append("response_format", "text");

    const whisperResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: whisperFormData,
      }
    );

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error("[transcribe-diary-voice] Whisper API error:", errorText);
      throw new Error(`Whisper API error: ${whisperResponse.status}`);
    }

    const transcript = await whisperResponse.text();
    console.log("[transcribe-diary-voice] Transcription complete, length:", transcript.length);

    return new Response(
      JSON.stringify({ transcript: transcript.trim() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[transcribe-diary-voice] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
