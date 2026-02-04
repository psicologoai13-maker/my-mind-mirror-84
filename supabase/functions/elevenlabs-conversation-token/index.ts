import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ELEVENLABS_AGENT_ID = "agent_0501kgn7wm8qfrmb9jtpkbxmw4mg";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    // Get user context for personalization (optional)
    let userName = "utente";
    let userContext = "";
    
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData } = await supabase.auth.getClaims(token);
      
      if (claimsData?.claims?.sub) {
        const userId = claimsData.claims.sub;
        
        // Get user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name, wellness_score, long_term_memory')
          .eq('user_id', userId)
          .single();

        if (profile) {
          userName = profile.name || "utente";
          
          // Build context from user data
          const contextParts: string[] = [];
          
          if (profile.wellness_score) {
            contextParts.push(`Punteggio benessere attuale: ${profile.wellness_score}/10`);
          }
          
          if (profile.long_term_memory && profile.long_term_memory.length > 0) {
            const recentMemories = profile.long_term_memory.slice(-3);
            contextParts.push(`Ricordi recenti: ${recentMemories.join(', ')}`);
          }
          
          if (contextParts.length > 0) {
            userContext = `\n\nContesto utente (${userName}):\n${contextParts.join('\n')}`;
          }
        }
      }
    }

    console.log(`Generating ElevenLabs token for user: ${userName}`);

    // Generate conversation token from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${ELEVENLABS_AGENT_ID}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log("ElevenLabs token generated successfully");

    return new Response(
      JSON.stringify({ 
        signedUrl: data.signed_url,
        agentId: ELEVENLABS_AGENT_ID,
        userName,
        userContext
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error("Error generating ElevenLabs token:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
