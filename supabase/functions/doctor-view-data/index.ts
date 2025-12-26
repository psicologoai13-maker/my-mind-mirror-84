import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token mancante' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the shared access record
    const { data: accessRecord, error: accessError } = await supabase
      .from('shared_access')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (accessError || !accessRecord) {
      console.log('[doctor-view-data] Invalid or expired token:', token);
      return new Response(JSON.stringify({ error: 'Token non valido o scaduto' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = accessRecord.user_id;

    // Update access count
    await supabase
      .from('shared_access')
      .update({ 
        access_count: accessRecord.access_count + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', accessRecord.id);

    // Fetch user profile (anonymized - no email)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('name, wellness_score, life_areas_scores, created_at')
      .eq('user_id', userId)
      .single();

    // Fetch recent sessions (last 30 days, no transcripts)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, start_time, mood_score_detected, anxiety_score_detected, emotion_tags, ai_summary, life_balance_scores, key_events, status')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('start_time', thirtyDaysAgo.toISOString())
      .order('start_time', { ascending: false });

    // Fetch recent check-ins
    const { data: checkins } = await supabase
      .from('daily_checkins')
      .select('id, created_at, mood_value, mood_emoji, notes')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // Calculate aggregated metrics
    const completedSessions = sessions || [];
    const moodScores = completedSessions
      .filter(s => s.mood_score_detected)
      .map(s => s.mood_score_detected);
    const anxietyScores = completedSessions
      .filter(s => s.anxiety_score_detected)
      .map(s => s.anxiety_score_detected);

    const avgMood = moodScores.length > 0 
      ? (moodScores.reduce((a, b) => a + b, 0) / moodScores.length).toFixed(1)
      : null;
    const avgAnxiety = anxietyScores.length > 0 
      ? (anxietyScores.reduce((a, b) => a + b, 0) / anxietyScores.length).toFixed(1)
      : null;

    // Extract top themes/tags
    const allTags: string[] = [];
    completedSessions.forEach(s => {
      if (s.emotion_tags) allTags.push(...s.emotion_tags);
    });
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topThemes = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    // Extract key events
    const allEvents: string[] = [];
    completedSessions.forEach(s => {
      if (s.key_events) allEvents.push(...s.key_events);
    });
    const recentEvents = allEvents.slice(0, 10);

    // Build mood trend data (for chart)
    const moodTrend = completedSessions
      .filter(s => s.mood_score_detected && s.anxiety_score_detected)
      .slice(0, 14)
      .reverse()
      .map(s => ({
        date: new Date(s.start_time).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
        mood: s.mood_score_detected,
        anxiety: s.anxiety_score_detected,
      }));

    // Generate AI summary of current state
    const latestSummaries = completedSessions
      .slice(0, 3)
      .filter(s => s.ai_summary)
      .map(s => s.ai_summary);

    const responseData = {
      patient: {
        firstName: profile?.name?.split(' ')[0] || 'Anonimo',
        memberSince: profile?.created_at,
        wellnessScore: profile?.wellness_score || 0,
        lifeAreasScores: profile?.life_areas_scores || {},
      },
      metrics: {
        totalSessions: completedSessions.length,
        totalCheckins: (checkins || []).length,
        avgMood,
        avgAnxiety,
        periodDays: 30,
      },
      topThemes,
      recentEvents,
      moodTrend,
      recentSummaries: latestSummaries,
      accessInfo: {
        expiresAt: accessRecord.expires_at,
        accessCount: accessRecord.access_count + 1,
      },
    };

    console.log('[doctor-view-data] Data fetched for user:', userId);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[doctor-view-data] Error:', error);
    return new Response(JSON.stringify({ error: 'Errore interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
