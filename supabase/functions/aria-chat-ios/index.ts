import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * aria-chat-ios: Thin proxy for iOS chat compatibility.
 * 
 * iOS had issues with SSE streaming from ai-chat.
 * This function calls ai-chat internally with stream:false
 * and returns a simple JSON { reply: "..." } response,
 * identical to the pattern used by thematic-diary-chat (which works on iOS).
 * 
 * Request body:
 * {
 *   messages: [{ role: "user", content: "..." }],  // or conversationHistory
 *   accessToken?: string,
 *   userId?: string,
 *   realTimeContext?: object,
 *   generateSummary?: boolean
 * }
 * 
 * Response:
 * { reply: "...", crisisAlert?: boolean }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Forward everything to ai-chat, forcing stream: false
    const aiChatPayload = {
      ...body,
      stream: false,  // Force non-streaming
    };

    // Build headers to forward auth
    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
    };

    // Forward Authorization header if present
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      forwardHeaders['Authorization'] = authHeader;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL not configured');
    }

    console.log('[aria-chat-ios] Forwarding to ai-chat with stream:false');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(aiChatPayload),
    });

    console.log(`[aria-chat-ios] ai-chat response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[aria-chat-ios] ai-chat error: ${errorText}`);
      return new Response(
        JSON.stringify({ error: errorText, reply: '' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ai-chat with stream:false returns { reply: "..." }
    const data = await response.json();
    
    // Check crisis header
    const crisisAlert = response.headers.get('X-Crisis-Alert') === 'true';
    
    const result: Record<string, any> = {
      reply: data.reply || data.summary || '',
    };
    
    if (crisisAlert) {
      result.crisisAlert = true;
    }
    
    // Forward summary if it was a summary request
    if (data.summary) {
      result.summary = data.summary;
    }

    console.log(`[aria-chat-ios] Success, reply length: ${result.reply?.length || 0}`);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[aria-chat-ios] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, reply: '' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
