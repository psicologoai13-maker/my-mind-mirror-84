 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
    const { text, stream = true } = await req.json();
     
     if (!text || typeof text !== 'string') {
       return new Response(JSON.stringify({ error: "Text is required" }), {
         status: 400,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
     if (!ELEVENLABS_API_KEY) {
       throw new Error("ELEVENLABS_API_KEY not configured");
     }
 
     // Use Carla voice (Italian female) - configured in memory
     const voiceId = "litDcG1avVppv4R90BLu";
     
     console.log('[elevenlabs-tts] Generating speech for:', text.substring(0, 50) + '...');
 
    // Use streaming endpoint for faster time-to-first-audio
    const endpoint = stream 
      ? `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`
      : `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

     const response = await fetch(
      endpoint,
       {
         method: "POST",
         headers: {
           "xi-api-key": ELEVENLABS_API_KEY,
           "Content-Type": "application/json",
         },
         body: JSON.stringify({
           text,
          model_id: "eleven_turbo_v2_5", // Faster model for lower latency
           voice_settings: {
             stability: 0.5,
             similarity_boost: 0.75,
             style: 0.3,
             use_speaker_boost: true,
           },
         }),
       }
     );
 
     if (!response.ok) {
       const errorText = await response.text();
       console.error('[elevenlabs-tts] API error:', response.status, errorText);
       throw new Error(`ElevenLabs API error: ${response.status}`);
     }
 
    // For streaming, pass through the stream directly
    if (stream && response.body) {
      console.log('[elevenlabs-tts] Streaming audio response');
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Transfer-Encoding": "chunked",
        },
      });
    }
 
    // Non-streaming fallback
    const audioBuffer = await response.arrayBuffer();
    console.log('[elevenlabs-tts] Audio generated, size:', audioBuffer.byteLength);
    
     return new Response(audioBuffer, {
       headers: {
         ...corsHeaders,
         "Content-Type": "audio/mpeg",
       },
     });
 
   } catch (error) {
     console.error('[elevenlabs-tts] Error:', error);
     return new Response(JSON.stringify({ 
       error: error instanceof Error ? error.message : "Unknown error" 
     }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });