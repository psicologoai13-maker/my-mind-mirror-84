import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Refresh Global Context Cache
 * 
 * This function is called by cron (2x/day) to refresh the global news cache.
 * All users share the same news data to minimize API calls.
 * 
 * World News API: 50 points/day limit → 2 calls/day = 4% usage
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const worldNewsApiKey = Deno.env.get('WORLDNEWS_API_KEY');
    
    if (!worldNewsApiKey) {
      console.log('[refresh-global-context] No WORLDNEWS_API_KEY configured, skipping news refresh');
      return new Response(JSON.stringify({ 
        success: false, 
        reason: 'No API key configured' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('[refresh-global-context] Fetching Italian news headlines...');
    
    // Fetch top Italian news headlines
    const newsResponse = await fetch(
      `https://api.worldnewsapi.com/search-news?source-countries=it&language=it&number=5&api-key=${worldNewsApiKey}`
    );
    
    if (!newsResponse.ok) {
      console.error('[refresh-global-context] WorldNews API error:', newsResponse.status);
      return new Response(JSON.stringify({ 
        success: false, 
        reason: `API error: ${newsResponse.status}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const newsData = await newsResponse.json();
    const headlines = newsData.news?.slice(0, 5).map((article: any) => article.title) || [];
    
    console.log('[refresh-global-context] Got', headlines.length, 'headlines');
    
    // Calculate expiration (12 hours for 2 refreshes/day)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    
    // Upsert into global cache
    const { error: upsertError } = await supabase
      .from('global_context_cache')
      .upsert({
        cache_key: 'italy_news',
        data: { headlines },
        fetched_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'cache_key'
      });
    
    if (upsertError) {
      console.error('[refresh-global-context] Error saving cache:', upsertError);
      return new Response(JSON.stringify({ 
        success: false, 
        reason: upsertError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[refresh-global-context] Cache updated successfully');
    
    return new Response(JSON.stringify({ 
      success: true, 
      headlines_count: headlines.length,
      expires_at: expiresAt.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[refresh-global-context] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      reason: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
