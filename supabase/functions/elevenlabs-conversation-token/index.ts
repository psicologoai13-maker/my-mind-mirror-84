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
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    const body = await req.json().catch(() => ({}));
    const agentId = body.agentId || Deno.env.get("ELEVENLABS_AGENT_ID");
    
    if (!agentId) {
      throw new Error("ELEVENLABS_AGENT_ID not configured");
    }

    console.log('[elevenlabs-token] Requesting WebRTC token for agent:', agentId);

    // Try WebRTC token first (lower latency)
    const tokenResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      console.log('[elevenlabs-token] WebRTC token obtained successfully');

      return new Response(JSON.stringify({ 
        token: tokenData.token,
        agent_id: agentId,
        connection_type: 'webrtc',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback to signed URL (WebSocket)
    console.log('[elevenlabs-token] WebRTC token failed, falling back to signed URL');
    const signedUrlResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!signedUrlResponse.ok) {
      const errorText = await signedUrlResponse.text();
      console.error('[elevenlabs-token] Both methods failed:', signedUrlResponse.status, errorText);
      throw new Error(`ElevenLabs API error: ${signedUrlResponse.status} - ${errorText}`);
    }

    const signedUrlData = await signedUrlResponse.json();
    console.log('[elevenlabs-token] Signed URL obtained (fallback)');

    return new Response(JSON.stringify({ 
      signed_url: signedUrlData.signed_url,
      agent_id: agentId,
      connection_type: 'websocket',
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('[elevenlabs-token] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
