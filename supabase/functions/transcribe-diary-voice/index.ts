import { authenticateUser, handleCors, corsHeaders, checkRateLimit } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId, supabaseAdmin } = await authenticateUser(req);

    // Rate limit: max 10 richieste/ora (chiama OpenAI Whisper, costoso)
    await checkRateLimit(supabaseAdmin, userId, 'transcribe-diary-voice', 10, 60);

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Read form data
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

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
    if (error instanceof Response) return error;
    console.error("[transcribe-diary-voice] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
