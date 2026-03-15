import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const defaultDiaries = [
  { name: 'Diario della sera', icon_emoji: '🌙', color_hex: '#1E1B4B',
    description: 'Rifletti sulla tua giornata prima di dormire', sort_order: 1 },
  { name: 'Routine del mattino', icon_emoji: '🌅', color_hex: '#1E3A5F',
    description: 'Inizia la giornata con intenzione', sort_order: 2 },
  { name: 'Gratitudine', icon_emoji: '🙏', color_hex: '#052E16',
    description: '3 cose per cui sei grato ogni giorno', sort_order: 3 },
  { name: 'Pensieri liberi', icon_emoji: '💭', color_hex: '#1C1917',
    description: 'Scrivi quello che vuoi, senza regole', sort_order: 4 },
  { name: 'Percorso terapeutico', icon_emoji: '🧠', color_hex: '#3B0764',
    description: 'Prepara le tue sessioni e rifletti sul percorso', sort_order: 5 }
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    let userId: string;
    let body: any;

    // Triple-fallback auth
    if (token === serviceRoleKey) {
      // Service role auth: read userId from body
      body = await req.json();
      if (!body.userId) {
        return new Response(JSON.stringify({ error: 'Missing userId in body for service_role auth' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = body.userId;
    } else {
      // JWT auth
      body = await req.json();
      const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

      if (authError || !user) {
        // Fallback: accessToken in body
        if (body.accessToken) {
          const supabaseAuth2 = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: `Bearer ${body.accessToken}` } },
          });
          const { data: { user: user2 }, error: authError2 } = await supabaseAuth2.auth.getUser();
          if (authError2 || !user2) {
            // Last fallback: userId in body with service role
            if (body.userId) {
              userId = body.userId;
            } else {
              return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          } else {
            userId = user2.id;
          }
        } else if (body.userId) {
          userId = body.userId;
        } else {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        userId = user.id;
      }
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const results: Record<string, any> = {};

    console.log(`[post-onboarding] Starting for user ${userId}`);

    // 1. CREA DIARI DEFAULT
    try {
      const { data: diaries, error: diaryError } = await supabaseAdmin
        .from('diaries')
        .insert(defaultDiaries.map(d => ({ user_id: userId, ...d })))
        .select();

      if (diaryError) {
        console.error('[post-onboarding] Error creating diaries:', diaryError.message);
        results.diaries = { success: false, error: diaryError.message };
      } else {
        console.log(`[post-onboarding] Created ${diaries.length} default diaries`);
        results.diaries = { success: true, count: diaries.length };
      }
    } catch (err) {
      console.error('[post-onboarding] Diaries error:', err);
      results.diaries = { success: false, error: (err as Error).message };
    }

    // 2. GENERA PRIMA BOLLA ARIA (ai-dashboard)
    try {
      const dashResponse = await fetch(
        `${supabaseUrl}/functions/v1/ai-dashboard`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (dashResponse.ok) {
        const data = await dashResponse.json();
        if (data.ai_message) {
          await supabaseAdmin.from('user_profiles').update({
            aria_home_message: data.ai_message,
            aria_home_message_at: new Date().toISOString(),
            aria_home_message_read: false,
          }).eq('user_id', userId);

          console.log('[post-onboarding] Aria home message set');
          results.aria_message = { success: true };
        } else {
          results.aria_message = { success: false, error: 'No ai_message in response' };
        }
      } else {
        const errText = await dashResponse.text();
        console.error('[post-onboarding] ai-dashboard error:', errText);
        results.aria_message = { success: false, error: errText };
      }
    } catch (err) {
      console.error('[post-onboarding] Dashboard error:', err);
      results.aria_message = { success: false, error: (err as Error).message };
    }

    // 3. SALVA PRIMO MOOD
    if (body.initialMood) {
      try {
        const { error: moodError } = await supabaseAdmin
          .from('daily_checkins')
          .insert({
            user_id: userId,
            mood_value: body.initialMood,
            notes: JSON.stringify({ source: 'onboarding' }),
            created_at: new Date().toISOString(),
          });

        if (moodError) {
          console.error('[post-onboarding] Mood insert error:', moodError.message);
          results.mood = { success: false, error: moodError.message };
        } else {
          console.log(`[post-onboarding] Initial mood ${body.initialMood} saved`);
          results.mood = { success: true, value: body.initialMood };
        }
      } catch (err) {
        console.error('[post-onboarding] Mood error:', err);
        results.mood = { success: false, error: (err as Error).message };
      }
    }

    // 4. GENERA PRIMI CHECK-IN (invalidate cache)
    try {
      const { error: cacheError } = await supabaseAdmin
        .from('user_profiles')
        .update({ ai_checkins_cache: null })
        .eq('user_id', userId);

      if (cacheError) {
        console.error('[post-onboarding] Cache invalidation error:', cacheError.message);
        results.checkins_cache = { success: false, error: cacheError.message };
      } else {
        console.log('[post-onboarding] Check-in cache invalidated');
        results.checkins_cache = { success: true };
      }
    } catch (err) {
      console.error('[post-onboarding] Cache error:', err);
      results.checkins_cache = { success: false, error: (err as Error).message };
    }

    // 5. FORZA PRIMO CICLO ORCHESTRATORE
    try {
      const agentResponse = await fetch(
        `${supabaseUrl}/functions/v1/aria-agent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ user_id: userId }),
        }
      );

      if (agentResponse.ok) {
        console.log('[post-onboarding] Aria agent triggered');
        results.aria_agent = { success: true };
      } else {
        const errText = await agentResponse.text();
        console.error('[post-onboarding] aria-agent error:', errText);
        results.aria_agent = { success: false, error: errText };
      }
    } catch (err) {
      console.error('[post-onboarding] Agent error:', err);
      results.aria_agent = { success: false, error: (err as Error).message };
    }

    console.log(`[post-onboarding] Completed for user ${userId}`, results);

    return new Response(
      JSON.stringify({ success: true, userId, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[post-onboarding] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
