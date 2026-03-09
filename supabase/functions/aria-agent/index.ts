// =============================================================================
// aria-agent — Cervello strategico proattivo di Aria
// Gira periodicamente e decide quali azioni intraprendere per ogni utente.
// Le azioni vengono salvate nella tabella agent_actions come coda.
// =============================================================================
//
// TABELLA DB NECESSARIA:
// CREATE TABLE IF NOT EXISTS agent_actions (
//     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//     user_id uuid REFERENCES auth.users(id),
//     action_type text NOT NULL,
//     priority text DEFAULT 'low',
//     payload jsonb,
//     created_at timestamptz DEFAULT now(),
//     executed boolean DEFAULT false,
//     executed_at timestamptz
// );
// CREATE INDEX idx_agent_actions_user ON agent_actions(user_id, created_at);
// CREATE INDEX idx_agent_actions_type ON agent_actions(action_type, executed);
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentAction {
    user_id: string;
    action_type: 'push_notification' | 'prepare_checkins' | 'suggest_exercise' | 'update_bubble' | 'clinical_alert';
    priority: 'low' | 'medium' | 'high' | 'critical';
    payload: any;
    created_at: string;
    executed: boolean;
}

// Regole hardcoded — NON decide l'AI
const RULES = {
    MAX_PUSH_PER_DAY: 2,
    QUIET_HOURS_START: 23, // non mandare push dalle 23
    QUIET_HOURS_END: 7,    // alle 7
    INACTIVITY_THRESHOLD_HOURS: 48, // 2 giorni senza aprire app
    SAFETY_THRESHOLD: 7, // safety indicators >= 7 → sempre notifica
    TREND_ALERT_DAYS: 3, // trend negativo per 3+ giorni
    MIN_SESSIONS_FOR_ANALYSIS: 3, // minimo sessioni per analisi significativa
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );

        // Parametro opzionale: singolo utente o tutti
        const body = await req.json().catch(() => ({}));
        const targetUserId = body.user_id || null;

        // Carica utenti attivi (con almeno 1 sessione negli ultimi 30 giorni)
        let usersQuery = supabaseAdmin
            .from('user_profiles')
            .select('user_id, name, adaptive_profile, wellness_score, selected_goals, notification_settings, ai_dashboard_cache')
            .not('user_id', 'is', null);

        if (targetUserId) {
            usersQuery = usersQuery.eq('user_id', targetUserId);
        }

        const { data: users, error: usersError } = await usersQuery.limit(100);

        if (usersError || !users?.length) {
            return new Response(JSON.stringify({ error: 'No users found', detail: usersError }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }

        const actions: AgentAction[] = [];
        const now = new Date();
        const currentHour = now.getHours(); // UTC — potrebbe servire conversion Roma
        const todayISO = now.toISOString().split('T')[0];

        for (const user of users) {
            try {
                const userId = user.user_id;

                // === CARICA DATI UTENTE ===
                const [
                    { data: lastSession },
                    { data: recentCheckins },
                    { data: recentEmotions },
                    { data: recentPsychology },
                    { data: todayPushes },
                    { data: deviceTokens }
                ] = await Promise.all([
                    // Ultima sessione
                    supabaseAdmin
                        .from('sessions')
                        .select('start_time, status, mood_score_detected, anxiety_score_detected, ai_summary')
                        .eq('user_id', userId)
                        .eq('status', 'completed')
                        .order('start_time', { ascending: false })
                        .limit(1)
                        .single()
                        .then(r => ({ data: r.data }))
                        .catch(() => ({ data: null })),

                    // Check-in ultimi 3 giorni
                    supabaseAdmin
                        .from('daily_checkins')
                        .select('mood_value, notes, created_at')
                        .eq('user_id', userId)
                        .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
                        .order('created_at', { ascending: false }),

                    // Emozioni ultimi 7 giorni
                    supabaseAdmin
                        .from('daily_emotions')
                        .select('date, joy, sadness, anger, fear, hope')
                        .eq('user_id', userId)
                        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
                        .order('date', { ascending: true }),

                    // Psicologia ultimi 3 giorni (per safety)
                    supabaseAdmin
                        .from('daily_psychology')
                        .select('date, suicidal_ideation, self_harm_urges, hopelessness, burnout_level')
                        .eq('user_id', userId)
                        .gte('date', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
                        .order('date', { ascending: false }),

                    // Push già mandate oggi
                    supabaseAdmin
                        .from('agent_actions')
                        .select('id')
                        .eq('user_id', userId)
                        .eq('action_type', 'push_notification')
                        .gte('created_at', todayISO),

                    // Device tokens (per verificare se può ricevere push)
                    supabaseAdmin
                        .from('device_push_tokens')
                        .select('device_token')
                        .eq('user_id', userId)
                        .eq('is_active', true)
                        .limit(1)
                ]);

                const hasPushToken = deviceTokens?.length > 0;
                const pushesToday = todayPushes?.length || 0;
                const canSendPush = hasPushToken && pushesToday < RULES.MAX_PUSH_PER_DAY &&
                    (currentHour < RULES.QUIET_HOURS_START && currentHour >= RULES.QUIET_HOURS_END);

                // === ANALISI 1: SAFETY CHECK (PRIORITÀ MASSIMA) ===
                if (recentPsychology?.length > 0) {
                    const latest = recentPsychology[0];
                    const isCritical =
                        (latest.suicidal_ideation && latest.suicidal_ideation >= RULES.SAFETY_THRESHOLD) ||
                        (latest.self_harm_urges && latest.self_harm_urges >= RULES.SAFETY_THRESHOLD);

                    if (isCritical) {
                        actions.push({
                            user_id: userId,
                            action_type: 'clinical_alert',
                            priority: 'critical',
                            payload: {
                                reason: 'Safety indicators above threshold',
                                suicidal_ideation: latest.suicidal_ideation,
                                self_harm_urges: latest.self_harm_urges,
                                hopelessness: latest.hopelessness
                            },
                            created_at: now.toISOString(),
                            executed: false
                        });

                        // Push SEMPRE per safety, ignora limiti
                        if (hasPushToken) {
                            actions.push({
                                user_id: userId,
                                action_type: 'push_notification',
                                priority: 'critical',
                                payload: {
                                    title: 'Aria',
                                    body: `${user.name || 'Ehi'}, sono qui per te. Possiamo parlare quando vuoi. 💜`,
                                    reason: 'safety_alert'
                                },
                                created_at: now.toISOString(),
                                executed: false
                            });
                        }
                        continue; // Safety ha priorità, salta il resto per questo utente
                    }
                }

                // === ANALISI 2: INATTIVITÀ ===
                const lastSessionTime = lastSession?.start_time ? new Date(lastSession.start_time) : null;
                const hoursSinceLastSession = lastSessionTime
                    ? (now.getTime() - lastSessionTime.getTime()) / (1000 * 60 * 60)
                    : 999;

                if (hoursSinceLastSession >= RULES.INACTIVITY_THRESHOLD_HOURS && canSendPush) {
                    const daysInactive = Math.floor(hoursSinceLastSession / 24);
                    actions.push({
                        user_id: userId,
                        action_type: 'push_notification',
                        priority: 'medium',
                        payload: {
                            title: 'Aria',
                            body: daysInactive <= 3
                                ? `${user.name || 'Ehi'}, come stai? Non ci sentiamo da un po' 💭`
                                : `${user.name || 'Ehi'}, mi manchi! Quando vuoi sono qui per te 🌸`,
                            reason: 'inactivity',
                            days_inactive: daysInactive
                        },
                        created_at: now.toISOString(),
                        executed: false
                    });
                }

                // === ANALISI 3: TREND NEGATIVO ===
                if (recentCheckins && recentCheckins.length >= 3) {
                    const moods = recentCheckins
                        .filter(c => c.mood_value)
                        .map(c => c.mood_value);

                    if (moods.length >= 3) {
                        const allDecreasing = moods.every((m, i) => i === 0 || m <= moods[i-1]);
                        const avgMood = moods.reduce((a,b) => a+b, 0) / moods.length;

                        if (allDecreasing && avgMood <= 3 && canSendPush) {
                            actions.push({
                                user_id: userId,
                                action_type: 'push_notification',
                                priority: 'high',
                                payload: {
                                    title: 'Aria',
                                    body: `${user.name || 'Ehi'}, ho notato che non è un periodo facile. Vuoi parlarne insieme? 💜`,
                                    reason: 'negative_trend',
                                    trend_data: { moods, avg: avgMood }
                                },
                                created_at: now.toISOString(),
                                executed: false
                            });
                        }
                    }
                }

                // === ANALISI 4: EVENTO STRESSANTE DOMANI ===
                const { data: upcomingEvents } = await supabaseAdmin
                    .from('user_events')
                    .select('title, event_date, is_stressful')
                    .eq('user_id', userId)
                    .gte('event_date', todayISO)
                    .lte('event_date', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
                    .limit(3);

                if (upcomingEvents?.length > 0 && canSendPush) {
                    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    const tomorrowEvent = upcomingEvents.find(e => e.event_date === tomorrow);

                    if (tomorrowEvent) {
                        actions.push({
                            user_id: userId,
                            action_type: 'push_notification',
                            priority: 'low',
                            payload: {
                                title: 'Aria',
                                body: `In bocca al lupo per domani! Se vuoi, ne parliamo stasera 🍀`,
                                reason: 'upcoming_event',
                                event: tomorrowEvent.title
                            },
                            created_at: now.toISOString(),
                            executed: false
                        });
                    }
                }

                // === ANALISI 5: AGGIORNA BOLLA HOME ===
                const lastBubbleTime = user.aria_home_message_at ? new Date(user.aria_home_message_at) : null;
                const hoursSinceBubble = lastBubbleTime
                    ? (now.getTime() - lastBubbleTime.getTime()) / (1000 * 60 * 60)
                    : 999;

                if (hoursSinceBubble >= 6) {
                    const bubbleContext = {
                        name: user.name,
                        wellness: user.wellness_score,
                        lastMood: recentCheckins?.[0]?.mood_value,
                        profile: user.adaptive_profile?.therapeutic_context?.progress_summary,
                        hoursSinceSession: hoursSinceLastSession
                    };

                    actions.push({
                        user_id: userId,
                        action_type: 'update_bubble',
                        priority: 'low',
                        payload: { context: bubbleContext },
                        created_at: now.toISOString(),
                        executed: false
                    });
                }

            } catch (userErr) {
                console.error(`[AriaAgent] Error for user ${user.user_id}:`, userErr);
                // Continua con il prossimo utente
            }
        }

        // === SALVA AZIONI ===
        if (actions.length > 0) {
            const { error: insertError } = await supabaseAdmin
                .from('agent_actions')
                .insert(actions);

            if (insertError) {
                console.error('[AriaAgent] Error saving actions:', insertError);
            }
        }

        return new Response(JSON.stringify({
            users_processed: users.length,
            actions_generated: actions.length,
            actions_summary: actions.map(a => ({
                user: a.user_id.substring(0, 8),
                type: a.action_type,
                priority: a.priority,
                reason: a.payload?.reason
            }))
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (err) {
        console.error('[AriaAgent] Fatal error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
