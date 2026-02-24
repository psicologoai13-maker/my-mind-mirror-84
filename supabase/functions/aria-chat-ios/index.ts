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

    // Fire-and-forget: trigger incremental processing to extract metrics
    // without waiting for it to complete (non-blocking)
    const sessionId = body.sessionId || body.session_id;
    const userId = body.userId || body.user_id;
    if (sessionId && userId && result.reply) {
      // Build transcript from messages + AI reply for analysis
      const messages = body.messages || body.conversationHistory || [];
      const transcriptLines = messages.map((m: any) => 
        `${m.role === 'user' ? 'Utente' : 'Aria'}: ${m.content}`
      ).join('\n');
      const fullTranscript = transcriptLines + `\nAria: ${result.reply}`;
      
      const processPayload = {
        session_id: sessionId,
        user_id: userId,
        transcript: fullTranscript,
        incremental: true, // Don't change session status to 'completed'
      };

      // Fire and forget - don't await
      fetch(`${supabaseUrl}/functions/v1/process-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''}`,
        },
        body: JSON.stringify(processPayload),
      }).then(r => {
        console.log(`[aria-chat-ios] Incremental process-session triggered, status: ${r.status}`);
      }).catch(err => {
        console.error('[aria-chat-ios] Incremental process-session failed:', err.message);
      });
    }

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
