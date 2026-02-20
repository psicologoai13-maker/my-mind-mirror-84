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

    console.log('[elevenlabs-token] Requesting signed URL (WebSocket) for agent:', agentId);

    // Primary: Signed URL (WebSocket) - more compatible with overrides
    const signedUrlResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (signedUrlResponse.ok) {
      const signedUrlData = await signedUrlResponse.json();
      console.log('[elevenlabs-token] Signed URL obtained successfully');

      // Also try to get WebRTC token as fallback
      let token = null;
      try {
        const tokenResponse = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
          {
            method: "GET",
            headers: { "xi-api-key": ELEVENLABS_API_KEY },
          }
        );
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          token = tokenData.token;
          console.log('[elevenlabs-token] WebRTC token also obtained (fallback)');
        } else {
          await tokenResponse.text(); // consume body
        }
      } catch (e) {
        console.log('[elevenlabs-token] WebRTC token fetch failed (non-critical):', e);
      }

      return new Response(JSON.stringify({ 
        signed_url: signedUrlData.signed_url,
        token, // WebRTC token as fallback (may be null)
        agent_id: agentId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: WebRTC token only
    console.log('[elevenlabs-token] Signed URL failed, trying WebRTC token');
    const tokenResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
      {
        method: "GET",
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[elevenlabs-token] Both methods failed:', tokenResponse.status, errorText);
      throw new Error(`ElevenLabs API error: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('[elevenlabs-token] WebRTC token obtained (fallback)');

    return new Response(JSON.stringify({ 
      token: tokenData.token,
      agent_id: agentId,
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
