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

// =============================================================================
// INTERFACES
// =============================================================================

interface AgentAction {
    user_id: string;
    action_type: 'push_notification' | 'prepare_checkins' | 'suggest_exercise' | 'update_bubble' | 'clinical_alert' | 'trigger_analysis';
    priority: 'low' | 'medium' | 'high' | 'critical';
    payload: any;
    created_at: string;
    executed: boolean;
}

interface UserData {
    userId: string;
    profile: any;
    lastSession: any;
    recentCheckins: any[];
    recentEmotions: any[];
    recentPsychology: any[];
    recentLifeAreas: any[];
    todayPushes: number;
    deviceTokens: any[];
    habits: any[];
    habitStreaks: any[];
    objectives: any[];
    events: any[];
    exerciseSessions: any[];
    diaryEntries: any[];
    correlations: any[];
    healthkitData: any[];
    // Calcolati:
    canSendPush: boolean;
    hoursSinceLastSession: number;
    isQuietHours: boolean;
    currentHour: number; // Europe/Rome
}

// =============================================================================
// DATA LOADING
// =============================================================================

async function loadUserData(userId: string, supabase: any, now: Date): Promise<UserData> {
    const todayISO = now.toISOString().split('T')[0];
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [
        profileResult,
        lastSessionResult,
        recentCheckinsResult,
        recentEmotionsResult,
        recentPsychResult,
        recentLifeAreasResult,
        todayPushesResult,
        deviceTokensResult,
        habitsResult,
        habitStreaksResult,
        objectivesResult,
        eventsResult,
        exerciseSessionsResult,
        diaryEntriesResult,
        correlationsResult,
        healthkitResult
    ] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', userId).single(),
        supabase.from('sessions').select('start_time, status, mood_score_detected, anxiety_score_detected, ai_summary, emotion_tags')
            .eq('user_id', userId).eq('status', 'completed').order('start_time', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('daily_checkins').select('mood_value, notes, created_at')
            .eq('user_id', userId).gte('created_at', sevenDaysAgo).order('created_at', { ascending: false }),
        supabase.from('daily_emotions').select('*')
            .eq('user_id', userId).gte('date', sevenDaysAgo.split('T')[0]).order('date', { ascending: true }),
        supabase.from('daily_psychology').select('*')
            .eq('user_id', userId).gte('date', threeDaysAgo.split('T')[0]).order('date', { ascending: false }),
        supabase.from('daily_life_areas').select('*')
            .eq('user_id', userId).gte('date', sevenDaysAgo.split('T')[0]).order('date', { ascending: false }),
        supabase.from('agent_actions').select('id')
            .eq('user_id', userId).eq('action_type', 'push_notification').gte('created_at', todayISO),
        supabase.from('device_push_tokens').select('device_token')
            .eq('user_id', userId).eq('is_active', true).limit(1),
        supabase.from('daily_habits').select('habit_type, value, date')
            .eq('user_id', userId).gte('date', threeDaysAgo.split('T')[0]),
        supabase.from('habit_streaks').select('habit_type, current_streak, longest_streak, last_completion_date')
            .eq('user_id', userId),
        supabase.from('user_objectives').select('id, title, category, target_value, current_value, status')
            .eq('user_id', userId).eq('status', 'active'),
        supabase.from('user_events').select('title, event_date, event_time, event_type')
            .eq('user_id', userId).gte('event_date', todayISO).limit(10),
        supabase.from('user_exercise_sessions').select('exercise_id, created_at')
            .eq('user_id', userId).gte('created_at', fourteenDaysAgo).order('created_at', { ascending: false }),
        supabase.from('diary_entries').select('created_at')
            .eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
        supabase.from('user_correlations').select('metric_a, metric_b, correlation_value, updated_at')
            .eq('user_id', userId).limit(1),
        supabase.from('healthkit_data').select('*')
            .eq('user_id', userId).gte('date', threeDaysAgo.split('T')[0]).order('date', { ascending: false })
    ]);

    const hasPushToken = (deviceTokensResult.data?.length || 0) > 0;
    const pushesToday = todayPushesResult.data?.length || 0;

    // Ora Europe/Rome
    const romeHour = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Rome' })).getHours();
    const isQuietHours = romeHour >= 23 || romeHour < 7;
    const canSendPush = hasPushToken && pushesToday < 2 && !isQuietHours;

    const lastSessionTime = lastSessionResult.data?.start_time
        ? new Date(lastSessionResult.data.start_time) : null;
    const hoursSinceLastSession = lastSessionTime
        ? (now.getTime() - lastSessionTime.getTime()) / (1000 * 60 * 60) : 999;

    return {
        userId,
        profile: profileResult.data,
        lastSession: lastSessionResult.data,
        recentCheckins: recentCheckinsResult.data || [],
        recentEmotions: recentEmotionsResult.data || [],
        recentPsychology: recentPsychResult.data || [],
        recentLifeAreas: recentLifeAreasResult.data || [],
        todayPushes: pushesToday,
        deviceTokens: deviceTokensResult.data || [],
        habits: habitsResult.data || [],
        habitStreaks: habitStreaksResult.data || [],
        objectives: objectivesResult.data || [],
        events: eventsResult.data || [],
        exerciseSessions: exerciseSessionsResult.data || [],
        diaryEntries: diaryEntriesResult.data || [],
        correlations: correlationsResult.data || [],
        healthkitData: healthkitResult.data || [],
        canSendPush,
        hoursSinceLastSession,
        isQuietHours,
        currentHour: romeHour
    };
}

// =============================================================================
// AREA 1: SAFETY (priorità massima)
// =============================================================================

function analyzeSafety(data: UserData, actions: AgentAction[]) {
    if (data.recentPsychology.length === 0) return;
    const latest = data.recentPsychology[0];

    const isCritical = (latest.suicidal_ideation >= 7) || (latest.self_harm_urges >= 7);
    if (isCritical) {
        actions.push({
            user_id: data.userId,
            action_type: 'clinical_alert',
            priority: 'critical',
            payload: {
                reason: 'safety_critical',
                suicidal_ideation: latest.suicidal_ideation,
                self_harm_urges: latest.self_harm_urges
            },
            created_at: new Date().toISOString(),
            executed: false
        });
        // Push SEMPRE per safety, ignora limiti
        if (data.deviceTokens.length > 0) {
            actions.push({
                user_id: data.userId,
                action_type: 'push_notification',
                priority: 'critical',
                payload: {
                    title: 'Aria',
                    body: `${data.profile?.name || 'Ehi'}, sono qui per te. Possiamo parlare quando vuoi. 💜`,
                    reason: 'safety_alert'
                },
                created_at: new Date().toISOString(),
                executed: false
            });
        }
    }

    // Hopelessness alto
    if (latest.hopelessness >= 6 && data.canSendPush) {
        actions.push({
            user_id: data.userId,
            action_type: 'push_notification',
            priority: 'high',
            payload: {
                title: 'Aria',
                body: `${data.profile?.name || 'Ehi'}, le giornate difficili passano. Sono qui. 💜`,
                reason: 'hopelessness_high'
            },
            created_at: new Date().toISOString(),
            executed: false
        });
    }
}

// =============================================================================
// AREA 2: PUSH NOTIFICATIONS
// =============================================================================

function analyzePushTriggers(data: UserData, actions: AgentAction[], now: Date) {
    const name = data.profile?.name || 'Ehi';
    const adaptiveProfile = data.profile?.adaptive_profile;

    // 2a. Inattività
    if (data.hoursSinceLastSession >= 48 && data.canSendPush) {
        const days = Math.floor(data.hoursSinceLastSession / 24);
        actions.push({
            user_id: data.userId,
            action_type: 'push_notification',
            priority: 'medium',
            payload: {
                title: 'Aria',
                body: days <= 3
                    ? `${name}, come stai? Non ci sentiamo da un po' 💭`
                    : `${name}, mi manchi! Quando vuoi sono qui 🌸`,
                reason: 'inactivity',
                days_inactive: days
            },
            created_at: new Date().toISOString(),
            executed: false
        });
    }

    // 2b. Trend negativo (3+ check-in con mood in calo, media <= 3)
    if (data.recentCheckins.length >= 3) {
        const moods = data.recentCheckins.filter(c => c.mood_value).map(c => c.mood_value);
        if (moods.length >= 3) {
            const avgMood = moods.reduce((a: number, b: number) => a + b, 0) / moods.length;
            const isDecreasing = moods.every((m: number, i: number) => i === 0 || m <= moods[i - 1]);
            if (isDecreasing && avgMood <= 3 && data.canSendPush) {
                actions.push({
                    user_id: data.userId,
                    action_type: 'push_notification',
                    priority: 'high',
                    payload: {
                        title: 'Aria',
                        body: `${name}, ho notato che non è un periodo facile. Vuoi parlarne? 💜`,
                        reason: 'negative_trend'
                    },
                    created_at: new Date().toISOString(),
                    executed: false
                });
            }
        }
    }

    // 2c. Evento domani
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tomorrowEvent = data.events.find(e => e.event_date === tomorrow);
    if (tomorrowEvent && data.canSendPush) {
        actions.push({
            user_id: data.userId,
            action_type: 'push_notification',
            priority: 'low',
            payload: {
                title: 'Aria',
                body: `In bocca al lupo per domani! Se vuoi ne parliamo 🍀`,
                reason: 'upcoming_event',
                event: tomorrowEvent.title
            },
            created_at: new Date().toISOString(),
            executed: false
        });
    }

    // 2d. Streak a rischio
    const checkInStreaks = data.habitStreaks.filter(s => s.habit_type === 'checkin' || s.current_streak >= 5);
    const todayStr = now.toISOString().split('T')[0];
    const todayCheckin = data.recentCheckins.find(c => {
        const d = new Date(c.created_at);
        return d.toISOString().split('T')[0] === todayStr;
    });
    if (checkInStreaks.length > 0 && !todayCheckin && data.currentHour >= 20 && data.canSendPush) {
        const streak = checkInStreaks[0].current_streak;
        if (streak >= 5) {
            actions.push({
                user_id: data.userId,
                action_type: 'push_notification',
                priority: 'medium',
                payload: {
                    title: 'Aria',
                    body: `Sei a ${streak} giorni di streak! Non dimenticare il check-in 💪`,
                    reason: 'streak_at_risk'
                },
                created_at: new Date().toISOString(),
                executed: false
            });
        }
    }

    // 2e. Completamento obiettivo
    for (const obj of data.objectives) {
        if (obj.target_value && obj.current_value && obj.current_value >= obj.target_value) {
            actions.push({
                user_id: data.userId,
                action_type: 'push_notification',
                priority: 'medium',
                payload: {
                    title: 'Aria',
                    body: `Hai raggiunto il tuo obiettivo "${obj.title}"! Sono fiera di te 🎉`,
                    reason: 'goal_completed'
                },
                created_at: new Date().toISOString(),
                executed: false
            });
        }
    }

    // 2f. Miglioramento rilevato (metrica negativa calata di 3+ punti in 7gg)
    if (data.recentPsychology.length >= 2) {
        const latest = data.recentPsychology[0];
        const oldest = data.recentPsychology[data.recentPsychology.length - 1];
        const negativeMetrics = ['rumination', 'burnout_level', 'somatic_tension', 'hopelessness'];
        for (const metric of negativeMetrics) {
            if (oldest[metric] && latest[metric] && (oldest[metric] - latest[metric]) >= 3) {
                actions.push({
                    user_id: data.userId,
                    action_type: 'push_notification',
                    priority: 'low',
                    payload: {
                        title: 'Aria',
                        body: `Ho notato un miglioramento questa settimana. Stai facendo un ottimo lavoro! 🌟`,
                        reason: 'improvement_detected',
                        metric
                    },
                    created_at: new Date().toISOString(),
                    executed: false
                });
                break; // solo una push per miglioramento
            }
        }
    }

    // 2g. Follow-up post-sessione intensa
    if (data.lastSession && data.hoursSinceLastSession >= 12 && data.hoursSinceLastSession <= 36) {
        const wasIntense = (data.lastSession.mood_score_detected && data.lastSession.mood_score_detected <= 3) ||
            (data.lastSession.anxiety_score_detected && data.lastSession.anxiety_score_detected >= 8);
        if (wasIntense && data.canSendPush) {
            actions.push({
                user_id: data.userId,
                action_type: 'push_notification',
                priority: 'high',
                payload: {
                    title: 'Aria',
                    body: `${name}, come stai oggi? Ieri è stata intensa. Sono qui 💜`,
                    reason: 'post_session_followup'
                },
                created_at: new Date().toISOString(),
                executed: false
            });
        }
    }

    // 2h. Reminder esercizio personalizzato
    if (adaptiveProfile?.therapeutic_context?.techniques_effective?.length > 0) {
        const todayAnxiety = data.recentCheckins[0]?.notes;
        let anxietyValue = 0;
        if (todayAnxiety) {
            try {
                const notes = typeof todayAnxiety === 'string' ? JSON.parse(todayAnxiety) : todayAnxiety;
                anxietyValue = notes.anxiety || 0;
            } catch { /* ignore parse errors */ }
        }
        if (anxietyValue >= 7 && data.canSendPush) {
            const technique = adaptiveProfile.therapeutic_context.techniques_effective[0];
            actions.push({
                user_id: data.userId,
                action_type: 'push_notification',
                priority: 'medium',
                payload: {
                    title: 'Aria',
                    body: `L'ansia è alta oggi. Prova ${technique}, ti aiuta sempre 🧘`,
                    reason: 'exercise_reminder'
                },
                created_at: new Date().toISOString(),
                executed: false
            });
        }
    }

    // 2i. Sonno critico (HealthKit < 5h per 3+ notti)
    if (data.healthkitData.length >= 3) {
        const recentSleep = data.healthkitData.filter(h => h.sleep_hours != null).map(h => h.sleep_hours);
        if (recentSleep.length >= 3 && recentSleep.every((s: number) => s < 5)) {
            actions.push({
                user_id: data.userId,
                action_type: 'push_notification',
                priority: 'high',
                payload: {
                    title: 'Aria',
                    body: `${name}, non dormi abbastanza da qualche giorno. Il sonno è fondamentale. Parliamone? 🌙`,
                    reason: 'sleep_critical'
                },
                created_at: new Date().toISOString(),
                executed: false
            });
        }
    }

    // 2j. Settimana intensa (5+ eventi prossima settimana, solo domenica sera)
    const nextWeekEvents = data.events.filter(e => {
        const d = new Date(e.event_date);
        return d.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000;
    });
    if (nextWeekEvents.length >= 5 && data.currentHour >= 19 && data.currentHour <= 21 && data.canSendPush) {
        if (now.getDay() === 0) {
            actions.push({
                user_id: data.userId,
                action_type: 'push_notification',
                priority: 'low',
                payload: {
                    title: 'Aria',
                    body: `Settimana piena in arrivo! Vuoi pianificare come gestirla? 📅`,
                    reason: 'busy_week'
                },
                created_at: new Date().toISOString(),
                executed: false
            });
        }
    }
}

// =============================================================================
// AREA 3: CHECK-IN PRIORITIES
// =============================================================================

function analyzeCheckinPriorities(data: UserData, actions: AgentAction[], now: Date) {
    const priorities: { key: string; boost: number }[] = [];

    // 3a. Trend ansia in salita
    if (data.recentCheckins.length >= 2) {
        const anxietyValues: number[] = [];
        for (const c of data.recentCheckins) {
            try {
                const notes = typeof c.notes === 'string' ? JSON.parse(c.notes) : c.notes;
                if (notes?.anxiety) anxietyValues.push(notes.anxiety);
            } catch { /* ignore parse errors */ }
        }
        if (anxietyValues.length >= 2 && anxietyValues[0] > anxietyValues[anxietyValues.length - 1] + 2) {
            priorities.push(
                { key: 'anxiety', boost: 40 },
                { key: 'somatic_tension', boost: 30 },
                { key: 'coping_ability', boost: 25 }
            );
        }
    }

    // 3b. Follow-up tema sessione
    if (data.lastSession?.emotion_tags?.length > 0) {
        const tags = data.lastSession.emotion_tags;
        if (tags.includes('family') || tags.includes('famiglia')) priorities.push({ key: 'family', boost: 35 });
        if (tags.includes('work') || tags.includes('lavoro')) priorities.push({ key: 'work', boost: 35 });
        if (tags.includes('love') || tags.includes('amore')) priorities.push({ key: 'love', boost: 35 });
        if (tags.includes('anxiety') || tags.includes('ansia')) priorities.push({ key: 'anxiety', boost: 30 });
    }

    // 3c. Post-evento
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const yesterdayEvent = data.events.find(e => e.event_date === yesterday);
    if (yesterdayEvent) {
        if (yesterdayEvent.event_type === 'work') priorities.push({ key: 'work', boost: 35 });
        else if (yesterdayEvent.event_type === 'social') priorities.push({ key: 'social', boost: 35 });
        else if (yesterdayEvent.event_type === 'health') priorities.push({ key: 'health', boost: 35 });
        else priorities.push({ key: 'mood', boost: 20 });
    }

    // 3d. Sonno basso (HealthKit) → priorità sonno e energia
    if (data.healthkitData.length > 0 && data.healthkitData[0].sleep_hours && data.healthkitData[0].sleep_hours < 5) {
        priorities.push(
            { key: 'sleep', boost: 40 },
            { key: 'energy', boost: 30 }
        );
    }

    if (priorities.length > 0) {
        actions.push({
            user_id: data.userId,
            action_type: 'prepare_checkins',
            priority: 'medium',
            payload: { priority_metrics: priorities },
            created_at: new Date().toISOString(),
            executed: false
        });
    }
}

// =============================================================================
// AREA 4: ESERCIZI
// =============================================================================

function analyzeExerciseSuggestion(data: UserData, actions: AgentAction[]) {
    const adaptiveProfile = data.profile?.adaptive_profile;
    let suggestion: { slug: string; title: string; reason: string } | null = null;

    // 4a. Basato su profilo adattivo
    if (adaptiveProfile?.therapeutic_context?.techniques_effective?.length > 0) {
        const techniques = adaptiveProfile.therapeutic_context.techniques_effective;
        const exerciseMap: Record<string, string> = {
            'respirazione': 'breathing-478',
            'respirazione 4-7-8': 'breathing-478',
            'box breathing': 'box-breathing',
            'grounding': 'grounding-54321',
            'body scan': 'body-scan',
            'meditazione': 'mindfulness-1min',
            'rilassamento muscolare': 'muscle-relaxation',
        };
        for (const tech of techniques) {
            const slug = exerciseMap[tech.toLowerCase()];
            if (slug) {
                suggestion = { slug, title: tech, reason: 'Funziona bene per te' };
                break;
            }
        }
    }

    // 4b. Post-crisi
    if (!suggestion && data.recentPsychology.length > 0) {
        const latest = data.recentPsychology[0];
        if ((latest.suicidal_ideation >= 5) || (latest.self_harm_urges >= 5) || (latest.hopelessness >= 6)) {
            suggestion = { slug: 'grounding-54321', title: 'Grounding 5-4-3-2-1', reason: 'Potrebbe aiutarti ora' };
        }
    }

    // 4c. Basato su orario
    if (!suggestion) {
        if (data.currentHour >= 6 && data.currentHour < 12) {
            suggestion = { slug: 'box-breathing', title: 'Box Breathing', reason: 'Perfetto per iniziare la giornata' };
        } else if (data.currentHour >= 21 || data.currentHour < 6) {
            suggestion = { slug: 'body-scan', title: 'Body Scan', reason: 'Per rilassarti prima di dormire' };
        }
    }

    // 4d. Evita tecniche inefficaci
    if (suggestion && adaptiveProfile?.therapeutic_context?.techniques_ineffective?.length > 0) {
        const ineffective = adaptiveProfile.therapeutic_context.techniques_ineffective.map((t: string) => t.toLowerCase());
        if (ineffective.some((t: string) => suggestion!.title.toLowerCase().includes(t))) {
            suggestion = null;
        }
    }

    if (suggestion) {
        actions.push({
            user_id: data.userId,
            action_type: 'suggest_exercise',
            priority: 'low',
            payload: suggestion,
            created_at: new Date().toISOString(),
            executed: false
        });
    }
}

// =============================================================================
// AREA 5: BOLLA HOME
// =============================================================================

function analyzeBubble(data: UserData, actions: any[], now: Date) {
    const lastBubbleTime = data.profile?.aria_home_message_at ? new Date(data.profile.aria_home_message_at) : null;
    const hoursSinceBubble = lastBubbleTime ? (now.getTime() - lastBubbleTime.getTime()) / (1000 * 60 * 60) : 999;

    if (hoursSinceBubble < 6) return;

    const name = data.profile?.name || 'Ehi';
    const adaptiveProfile = data.profile?.adaptive_profile;

    // Determina la situazione prioritaria e genera messaggio
    let message = '';
    let priority = 'low';

    // PRIORITÀ 1: Inattività lunga (> 7 giorni)
    if (data.hoursSinceLastSession > 168) {
        const days = Math.floor(data.hoursSinceLastSession / 24);
        const messages = [
            `${name}, è passata più di una settimana... mi manchi! Come stai?`,
            `Ehi ${name}, tutto ok? Non ci sentiamo da ${days} giorni.`,
            `${name}, sono qui. Quando vuoi, parliamo.`
        ];
        message = messages[Math.floor(Math.random() * messages.length)];
        priority = 'medium';
    }
    // PRIORITÀ 2: Inattività media (3-7 giorni)
    else if (data.hoursSinceLastSession > 72) {
        const messages = [
            `${name}, come stai? Non ci sentiamo da qualche giorno.`,
            `Ehi ${name}, mi manchi! Raccontami come va.`,
            `${name}, sono qui se hai voglia di parlare. Come stai?`
        ];
        message = messages[Math.floor(Math.random() * messages.length)];
    }
    // PRIORITÀ 3: Trend negativo
    else if (data.recentCheckins.length >= 2) {
        const moods = data.recentCheckins.filter(c => c.mood_value).map(c => c.mood_value);
        const avgMood = moods.length > 0 ? moods.reduce((a: number, b: number) => a + b, 0) / moods.length : 0;
        if (avgMood > 0 && avgMood <= 3) {
            const messages = [
                `${name}, ho notato che non è un periodo facile. Sono qui per te.`,
                `Ehi ${name}, giorni duri eh? Ne parliamo?`,
                `${name}, so che è un momento impegnativo. Non sei solo/a.`
            ];
            message = messages[Math.floor(Math.random() * messages.length)];
            priority = 'medium';
        }
    }

    // PRIORITÀ 4: Evento domani
    if (!message) {
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const tomorrowEvent = data.events.find(e => e.event_date === tomorrow);
        if (tomorrowEvent) {
            message = `${name}, domani hai "${tomorrowEvent.title}". Come ti senti a riguardo?`;
        }
    }

    // PRIORITÀ 5: Streak da celebrare
    if (!message) {
        const highStreak = data.habitStreaks.find(s => s.current_streak >= 7);
        if (highStreak) {
            message = `${name}, ${highStreak.current_streak} giorni consecutivi! Stai costruendo una bella abitudine.`;
        }
    }

    // PRIORITÀ 6: Miglioramento rilevato
    if (!message && data.recentPsychology.length >= 2) {
        const latest = data.recentPsychology[0];
        const oldest = data.recentPsychology[data.recentPsychology.length - 1];
        const negMetrics = ['rumination', 'burnout_level', 'somatic_tension'];
        for (const m of negMetrics) {
            if (oldest[m] && latest[m] && (oldest[m] - latest[m]) >= 3) {
                message = `${name}, ho notato un miglioramento questa settimana. Continua così!`;
                break;
            }
        }
    }

    // PRIORITÀ 7: Post-sessione (12-36 ore fa)
    if (!message && data.hoursSinceLastSession >= 12 && data.hoursSinceLastSession <= 36) {
        const wasIntense = data.lastSession?.mood_score_detected && data.lastSession.mood_score_detected <= 3;
        if (wasIntense) {
            message = `${name}, come stai oggi? Ieri è stata una conversazione intensa.`;
        }
    }

    // PRIORITÀ 8: Messaggio basato su profilo adattivo
    if (!message && adaptiveProfile) {
        const unresolved = adaptiveProfile.therapeutic_context?.unresolved_themes;
        if (unresolved && unresolved.length > 0) {
            message = `${name}, ho pensato alla nostra ultima conversazione. Vuoi riprendere da dove eravamo rimasti?`;
        }
    }

    // PRIORITÀ 9: Messaggio generico personalizzato
    if (!message) {
        const hour = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Rome' })).getHours();
        if (hour >= 6 && hour < 12) {
            message = `Buongiorno ${name}! Come inizia la giornata?`;
        } else if (hour >= 12 && hour < 18) {
            message = `Ehi ${name}, come va il pomeriggio?`;
        } else if (hour >= 18 && hour < 23) {
            message = `${name}, come è andata oggi?`;
        } else {
            message = `${name}, ancora sveglio/a? Tutto ok?`;
        }
    }

    if (message) {
        actions.push({
            user_id: data.userId,
            action_type: 'update_bubble',
            priority,
            payload: {
                direct_message: message  // messaggio pronto, non serve AI
            },
            created_at: new Date().toISOString(),
            executed: false
        });
    }
}

// =============================================================================
// AREA 6: ANALISI E CORRELAZIONI
// =============================================================================

function analyzeAnalyticsTriggers(data: UserData, actions: AgentAction[]) {
    // 6a. Trigger calculate-correlations
    const hasEnoughData = data.recentEmotions.length >= 7;
    const lastCorrelation = data.correlations[0]?.updated_at ? new Date(data.correlations[0].updated_at) : null;
    const daysSinceCorrelation = lastCorrelation
        ? (Date.now() - lastCorrelation.getTime()) / (1000 * 60 * 60 * 24) : 999;

    if (hasEnoughData && daysSinceCorrelation >= 7) {
        actions.push({
            user_id: data.userId,
            action_type: 'trigger_analysis',
            priority: 'low',
            payload: { function: 'calculate-correlations' },
            created_at: new Date().toISOString(),
            executed: false
        });
    }

    // 6b. Trigger detect-emotion-patterns
    if (data.recentEmotions.length >= 14 && daysSinceCorrelation >= 14) {
        actions.push({
            user_id: data.userId,
            action_type: 'trigger_analysis',
            priority: 'low',
            payload: { function: 'detect-emotion-patterns' },
            created_at: new Date().toISOString(),
            executed: false
        });
    }
}

// =============================================================================
// AREA 7: HABITS
// =============================================================================

function analyzeHabits(data: UserData, actions: AgentAction[], now: Date) {
    const todayStr = now.toISOString().split('T')[0];

    const habitNamesIT: Record<string, string> = {
        meditation: 'meditazione', breathing: 'respirazione',
        journaling: 'il diario', reading: 'lettura',
        exercise: 'esercizio', yoga: 'yoga',
        water: 'abbastanza acqua', vitamins: 'le vitamine',
        medication: 'i farmaci', alcohol: 'evitare l\'alcol',
        smoking: 'non fumare', social_interaction: 'contatto sociale',
        gratitude: 'gratitudine', stretching: 'stretching',
        walking: 'la camminata', mindfulness: 'mindfulness',
        no_junk_food: 'evitare il junk food', fruits_veggies: 'frutta e verdura'
    };

    const abstainHabits = ['alcohol', 'smoking', 'no_junk_food', 'nail_biting', 'no_sugar', 'late_snacking'];

    // 7a. Reminder habits non fatte (dopo le 19)
    if (data.currentHour >= 19 && data.canSendPush) {
        const activeHabits = data.habitStreaks.filter(s => s.current_streak > 0);
        for (const habit of activeHabits) {
            const doneToday = data.habits.some(h => h.habit_type === habit.habit_type && h.date === todayStr);
            if (!doneToday && habit.current_streak >= 3) {
                const isAbstain = abstainHabits.includes(habit.habit_type);
                const habitName = habitNamesIT[habit.habit_type] || habit.habit_type;
                const question = isAbstain
                    ? `Sei riuscito/a a ${habitName} oggi?`
                    : `Hai fatto ${habitName} oggi?`;

                actions.push({
                    user_id: data.userId,
                    action_type: 'push_notification',
                    priority: 'low',
                    payload: {
                        title: 'Aria',
                        body: question,
                        reason: 'habit_reminder',
                        category: habit.habit_type === 'water' ? 'HABIT_COUNTER' : 'HABIT_CHECKIN',
                        custom_data: {
                            habit_type: habit.habit_type,
                            user_id: data.userId
                        }
                    },
                    created_at: new Date().toISOString(),
                    executed: false
                });
                break; // solo un reminder habit
            }
        }
    }
}

// =============================================================================
// AREA 8: DIARIO
// =============================================================================

function analyzeDiary(data: UserData, actions: AgentAction[]) {
    // 8a. Reminder se non scrive da 3+ giorni
    if (data.diaryEntries.length > 0) {
        const lastEntry = new Date(data.diaryEntries[0].created_at);
        const daysSinceEntry = (Date.now() - lastEntry.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceEntry >= 3 && data.canSendPush) {
            actions.push({
                user_id: data.userId,
                action_type: 'push_notification',
                priority: 'low',
                payload: {
                    title: 'Aria',
                    body: `Il diario ti aspetta. Anche 2 righe possono fare la differenza 📝`,
                    reason: 'diary_reminder'
                },
                created_at: new Date().toISOString(),
                executed: false
            });
        }
    }
}

// =============================================================================
// AREA 9: MEMORIES — "Questo giorno, X tempo fa"
// =============================================================================

async function analyzeMemories(data: UserData, actions: AgentAction[], now: Date, supabase: any) {
    if (!data.canSendPush) return;

    const today = now.toISOString().split('T')[0];

    // Cerca voci del diario scritte esattamente 1 mese fa, 3 mesi fa, 6 mesi fa, 1 anno fa
    const lookbackDays = [30, 90, 180, 365];

    for (const days of lookbackDays) {
        const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const pastDateStr = pastDate.toISOString().split('T')[0];

        const { data: entries } = await supabase
            .from('diary_entries')
            .select('content_text, created_at')
            .eq('user_id', data.userId)
            .gte('created_at', pastDateStr + 'T00:00:00')
            .lt('created_at', pastDateStr + 'T23:59:59')
            .limit(1);

        if (entries && entries.length > 0) {
            const entry = entries[0];
            const preview = entry.content_text.substring(0, 80);
            const timeLabel = days <= 31 ? 'Un mese fa' :
                              days <= 91 ? '3 mesi fa' :
                              days <= 181 ? '6 mesi fa' : 'Un anno fa';

            actions.push({
                user_id: data.userId,
                action_type: 'push_notification',
                priority: 'low',
                payload: {
                    title: 'Aria',
                    body: `${timeLabel} hai scritto: "${preview}..." Come stai oggi rispetto ad allora?`,
                    reason: 'memory_recall'
                },
                created_at: new Date().toISOString(),
                executed: false
            });
            break; // Solo una push "ricordo" per ciclo
        }
    }

    // Cerca anche sessioni significative da 1 mese fa
    if (!actions.some(a => a.payload?.reason === 'memory_recall')) {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];

        const { data: sessions } = await supabase
            .from('sessions')
            .select('ai_summary, start_time')
            .eq('user_id', data.userId)
            .eq('status', 'completed')
            .gte('start_time', oneMonthAgoStr + 'T00:00:00')
            .lt('start_time', oneMonthAgoStr + 'T23:59:59')
            .limit(1);

        if (sessions && sessions.length > 0 && sessions[0].ai_summary) {
            const summary = sessions[0].ai_summary.substring(0, 80);
            actions.push({
                user_id: data.userId,
                action_type: 'push_notification',
                priority: 'low',
                payload: {
                    title: 'Aria',
                    body: `Un mese fa abbiamo parlato di: "${summary}..." Come va adesso?`,
                    reason: 'memory_recall'
                },
                created_at: new Date().toISOString(),
                executed: false
            });
        }
    }
}

// =============================================================================
// AREA 10: HEALTHKIT
// =============================================================================

function analyzeHealthKit(data: UserData, actions: AgentAction[]) {
    if (data.healthkitData.length < 2) return;

    // 9a. FC anomala — informational, aggiunto al contesto ma non genera push
    // Verrà gestito dal contesto di Aria nelle conversazioni
    const hrValues = data.healthkitData.filter(h => h.heart_rate_avg).map(h => h.heart_rate_avg);
    if (hrValues.length >= 2) {
        const avg = hrValues.reduce((a: number, b: number) => a + b, 0) / hrValues.length;
        const latest = hrValues[0];
        if (latest - avg >= 10) {
            // FC significativamente più alta — tracked but no push action
        }
    }
}

// =============================================================================
// PUSH LIMITER — Max 2 push per utente per ciclo
// =============================================================================

function limitPushPerUser(actions: AgentAction[]) {
    const pushByUser = new Map<string, AgentAction[]>();
    for (const action of actions) {
        if (action.action_type === 'push_notification') {
            if (!pushByUser.has(action.user_id)) pushByUser.set(action.user_id, []);
            pushByUser.get(action.user_id)!.push(action);
        }
    }
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    for (const [_userId, pushes] of pushByUser) {
        if (pushes.length > 2) {
            pushes.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));
            const toRemove = pushes.slice(2);
            for (const r of toRemove) {
                const idx = actions.indexOf(r);
                if (idx >= 0) actions.splice(idx, 1);
            }
        }
    }
}

// =============================================================================
// AREA 11: GENERATE CHECKIN PLAN
// =============================================================================

function getVitalQuestion(key: string): string {
    const questions: Record<string, string> = {
        mood: 'Come ti senti in questo momento?',
        anxiety: 'Quanto ti senti ansioso/a?',
        energy: 'Com\'è il tuo livello di energia?',
        sleep: 'Come hai dormito stanotte?'
    };
    return questions[key] || `Come valuti ${key}?`;
}

function getResponseType(key: string): string {
    const types: Record<string, string> = {
        mood: 'slider_1_10',
        anxiety: 'slider_1_10',
        energy: 'slider_1_10',
        sleep: 'slider_1_10'
    };
    return types[key] || 'slider_1_10';
}

async function generateCheckinPlan(data: UserData, supabase: any) {
    const plan: { key: string; question: string; responseType: string; reason: string }[] = [];

    // 1. VITALI sempre (se non risposti oggi)
    const todayStr = new Date().toISOString().split('T')[0];
    const answeredToday = new Set<string>();

    // Popola answeredToday dalle tabelle giornaliere con source='checkin'
    for (const checkin of data.recentCheckins) {
        const checkinDate = new Date(checkin.created_at).toISOString().split('T')[0];
        if (checkinDate === todayStr) {
            if (checkin.mood_value) answeredToday.add('mood');
            try {
                const notes = typeof checkin.notes === 'string' ? JSON.parse(checkin.notes) : checkin.notes;
                if (notes?.anxiety) answeredToday.add('anxiety');
                if (notes?.energy) answeredToday.add('energy');
                if (notes?.sleep) answeredToday.add('sleep');
            } catch { /* ignore parse errors */ }
        }
    }

    const vitals = ['mood', 'anxiety', 'energy', 'sleep'];
    for (const v of vitals) {
        if (!answeredToday.has(v)) {
            plan.push({ key: v, question: getVitalQuestion(v), responseType: getResponseType(v), reason: 'vitale giornaliero' });
        }
    }

    // 2. BASATI SU CONTESTO
    // Se ansia in salita → somatic_tension, coping_ability
    if (data.recentCheckins.length >= 2) {
        const anxietyValues: number[] = [];
        for (const c of data.recentCheckins) {
            try {
                const notes = typeof c.notes === 'string' ? JSON.parse(c.notes) : c.notes;
                if (notes?.anxiety) anxietyValues.push(notes.anxiety);
            } catch { /* ignore parse errors */ }
        }
        if (anxietyValues.length >= 2 && anxietyValues[0] > anxietyValues[anxietyValues.length - 1] + 2) {
            if (!plan.find(p => p.key === 'somatic_tension')) {
                plan.push({ key: 'somatic_tension', question: 'Senti tensione fisica nel corpo?', responseType: 'slider_1_10', reason: 'ansia in salita' });
            }
            if (!plan.find(p => p.key === 'coping_ability')) {
                plan.push({ key: 'coping_ability', question: 'Quanto ti senti in grado di gestire la situazione?', responseType: 'slider_1_10', reason: 'ansia in salita' });
            }
        }
    }

    // Se evento domani → area correlata
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const tomorrowEvent = data.events.find(e => e.event_date === tomorrow);
    if (tomorrowEvent) {
        if (tomorrowEvent.event_type === 'work' && !plan.find(p => p.key === 'work')) {
            plan.push({ key: 'work', question: 'Come va il lavoro ultimamente?', responseType: 'slider_1_10', reason: 'evento lavoro domani' });
        } else if (tomorrowEvent.event_type === 'social' && !plan.find(p => p.key === 'social')) {
            plan.push({ key: 'social', question: 'Come ti senti riguardo alle relazioni sociali?', responseType: 'slider_1_10', reason: 'evento social domani' });
        }
    }

    // Se tema irrisolto dalla sessione → area correlata
    const adaptiveProfile = data.profile?.adaptive_profile;
    if (adaptiveProfile?.therapeutic_context?.unresolved_themes?.length > 0) {
        const theme = adaptiveProfile.therapeutic_context.unresolved_themes[0];
        if (!plan.find(p => p.key === 'emotional_awareness')) {
            plan.push({ key: 'emotional_awareness', question: `Come ti senti riguardo a "${theme}"?`, responseType: 'slider_1_10', reason: 'tema irrisolto' });
        }
    }

    // Se HealthKit mostra sonno basso → sleep, energy
    if (data.healthkitData.length > 0 && data.healthkitData[0].sleep_hours && data.healthkitData[0].sleep_hours < 5) {
        if (!plan.find(p => p.key === 'sleep')) {
            plan.push({ key: 'sleep', question: 'Come hai dormito stanotte?', responseType: 'slider_1_10', reason: 'sonno basso HealthKit' });
        }
        if (!plan.find(p => p.key === 'energy')) {
            plan.push({ key: 'energy', question: 'Com\'è il tuo livello di energia?', responseType: 'slider_1_10', reason: 'sonno basso HealthKit' });
        }
    }

    // 3. DISCOVERY (1-2 metriche mai chieste)
    const discoveryMetrics = [
        { key: 'self_worth', question: 'Come valuti la tua autostima oggi?', responseType: 'slider_1_10' },
        { key: 'gratitude', question: 'Quanto ti senti grato/a oggi?', responseType: 'slider_1_10' },
        { key: 'focus', question: 'Quanto riesci a concentrarti?', responseType: 'slider_1_10' },
        { key: 'motivation', question: 'Quanto ti senti motivato/a?', responseType: 'slider_1_10' }
    ];
    for (const dm of discoveryMetrics) {
        if (plan.length >= 7) break;
        if (!plan.find(p => p.key === dm.key)) {
            plan.push({ ...dm, reason: 'discovery' });
            if (plan.filter(p => p.reason === 'discovery').length >= 2) break;
        }
    }

    // 4. GOAL-ALIGNED (basato su obiettivi utente)
    const goalMetricKeys: Record<string, { key: string; question: string }> = {
        'anxiety': { key: 'anxiety', question: 'Quanto ti senti ansioso/a?' },
        'mood': { key: 'mood', question: 'Come ti senti in questo momento?' },
        'sleep': { key: 'sleep', question: 'Come hai dormito stanotte?' },
        'relationships': { key: 'love', question: 'Come vanno le tue relazioni?' },
        'work': { key: 'work', question: 'Come va il lavoro ultimamente?' },
        'health': { key: 'health', question: 'Come ti senti fisicamente?' },
        'growth': { key: 'growth', question: 'Senti che stai crescendo come persona?' },
        'expression': { key: 'self_worth', question: 'Come valuti la tua autostima oggi?' }
    };
    const goals = data.profile?.selected_goals || [];
    for (const goal of goals) {
        if (plan.length >= 8) break;
        const gm = goalMetricKeys[goal];
        if (gm && !plan.find(p => p.key === gm.key)) {
            plan.push({ key: gm.key, question: gm.question, responseType: 'slider_1_10', reason: 'obiettivo utente' });
        }
    }

    // Max 8 items
    const finalPlan = plan.slice(0, 8);

    // Salva in user_profiles
    await supabase.from('user_profiles').update({
        agent_checkin_plan: finalPlan
    }).eq('user_id', data.userId);
}

// =============================================================================
// AREA 12: GENERATE PRIMARY METRICS
// =============================================================================

async function generatePrimaryMetrics(data: UserData, supabase: any) {
    const metrics: { key: string; label: string; icon: string; reason: string }[] = [];

    // Basato su obiettivi utente
    const goals = data.profile?.selected_goals || [];
    const goalMetricMap: Record<string, { key: string; label: string; icon: string }> = {
        'anxiety': { key: 'anxiety', label: 'Ansia', icon: '😰' },
        'mood': { key: 'mood', label: 'Umore', icon: '😊' },
        'sleep': { key: 'sleep', label: 'Sonno', icon: '😴' },
        'relationships': { key: 'love', label: 'Amore', icon: '❤️' },
        'work': { key: 'work', label: 'Lavoro', icon: '💼' },
        'health': { key: 'health', label: 'Salute', icon: '🏃' },
        'growth': { key: 'growth', label: 'Crescita', icon: '🧠' },
        'expression': { key: 'self_worth', label: 'Autostima', icon: '💪' }
    };

    // Prima: metriche dagli obiettivi
    for (const goal of goals.slice(0, 2)) {
        const m = goalMetricMap[goal];
        if (m) metrics.push({ ...m, reason: 'obiettivo utente' });
    }

    // Poi: metriche critiche (valori estremi recenti)
    if (data.recentPsychology.length > 0) {
        const latest = data.recentPsychology[0];
        if (latest.burnout_level >= 7 && !metrics.find(m => m.key === 'burnout_level')) {
            metrics.push({ key: 'burnout_level', label: 'Burnout', icon: '🔥', reason: 'valore critico' });
        }
        if (latest.rumination >= 7 && !metrics.find(m => m.key === 'rumination')) {
            metrics.push({ key: 'rumination', label: 'Ruminazione', icon: '🌀', reason: 'valore critico' });
        }
        if (latest.somatic_tension >= 7 && !metrics.find(m => m.key === 'somatic_tension')) {
            metrics.push({ key: 'somatic_tension', label: 'Tensione', icon: '😣', reason: 'valore critico' });
        }
    }

    // Riempire fino a 4 con metriche base
    const defaults = [
        { key: 'mood', label: 'Umore', icon: '😊' },
        { key: 'energy', label: 'Energia', icon: '⚡' },
        { key: 'anxiety', label: 'Ansia', icon: '😰' },
        { key: 'sleep', label: 'Sonno', icon: '😴' }
    ];
    for (const d of defaults) {
        if (metrics.length >= 4) break;
        if (!metrics.find(m => m.key === d.key)) {
            metrics.push({ ...d, reason: 'metrica base' });
        }
    }

    await supabase.from('user_profiles').update({
        agent_primary_metrics: metrics.slice(0, 4)
    }).eq('user_id', data.userId);
}

// =============================================================================
// AREA 13: GENERATE DIARY PROMPT
// =============================================================================

async function generateDiaryPrompt(data: UserData, supabase: any, now: Date) {
    const hour = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Rome' })).getHours();
    const name = data.profile?.name || 'utente';
    let prompt = '';

    // Basato sull'orario
    if (hour >= 20 || hour < 6) {
        // Sera/notte → riflessione sulla giornata
        prompt = `Come è andata oggi, ${name}? Cosa ti è rimasto di questa giornata?`;
    } else if (hour >= 6 && hour < 12) {
        // Mattina → intenzioni
        prompt = `Buongiorno ${name}! Come vuoi vivere questa giornata?`;
    } else {
        // Pomeriggio
        prompt = `${name}, come sta andando la giornata?`;
    }

    // Se c'è stato un evento oggi → chiedi come è andato
    const today = now.toISOString().split('T')[0];
    const todayEvent = data.events.find(e => e.event_date === today);
    if (todayEvent) {
        prompt = `Come è andato "${todayEvent.title}" oggi?`;
    }

    // Se trend negativo → domanda supportiva
    if (data.recentCheckins.length >= 2) {
        const moods = data.recentCheckins.filter(c => c.mood_value).map(c => c.mood_value);
        const avg = moods.length > 0 ? moods.reduce((a: number, b: number) => a + b, 0) / moods.length : 5;
        if (avg <= 3) {
            prompt = `${name}, so che non è facile. Scrivi quello che senti, senza filtri.`;
        }
    }

    // Se tema irrisolto
    const adaptiveProfile = data.profile?.adaptive_profile;
    if (adaptiveProfile?.therapeutic_context?.unresolved_themes?.length > 0 && !prompt.includes('evento')) {
        const theme = adaptiveProfile.therapeutic_context.unresolved_themes[0];
        prompt = `${name}, hai pensato a "${theme}" ultimamente? Come ti senti a riguardo?`;
    }

    if (prompt) {
        await supabase.from('user_profiles').update({
            agent_diary_prompt: { prompt, generated_at: now.toISOString() }
        }).eq('user_id', data.userId);
    }
}

// =============================================================================
// AREA 14: GENERATE DAILY QUOTE
// =============================================================================

async function generateDailyQuote(data: UserData, supabase: any) {
    // Pool di citazioni categorizzate
    const quotesForLowMood = [
        { text: "Anche i giorni difficili finiscono.", author: "" },
        { text: "Non devi vedere l'intera scala. Basta fare il primo passo.", author: "Martin Luther King Jr." },
        { text: "La tua storia non è ancora finita.", author: "" },
        { text: "Dopo la tempesta arriva sempre la calma.", author: "" },
        { text: "Sei più forte di quello che pensi.", author: "" }
    ];

    const quotesForGrowth = [
        { text: "La crescita personale non è sempre comoda, ma ne vale sempre la pena.", author: "" },
        { text: "Ogni respiro è un nuovo inizio.", author: "" },
        { text: "Il cambiamento inizia con un piccolo passo.", author: "" },
        { text: "Diventa la persona che avresti voluto avere accanto.", author: "" }
    ];

    const quotesGeneral = [
        { text: "Sii gentile con te stesso. Stai facendo del tuo meglio.", author: "" },
        { text: "La calma è il tuo superpotere.", author: "" },
        { text: "Meriti la stessa gentilezza che dai agli altri.", author: "" },
        { text: "Oggi è un buon giorno per stare bene.", author: "" },
        { text: "Prenditi cura di te come faresti con chi ami.", author: "" },
        { text: "Non devi avere tutte le risposte. Basta fare un passo alla volta.", author: "" }
    ];

    // Scegli pool basato sul contesto
    let pool = quotesGeneral;

    if (data.recentCheckins.length > 0) {
        const lastMood = data.recentCheckins[0].mood_value;
        if (lastMood && lastMood <= 3) pool = quotesForLowMood;
    }

    const goals = data.profile?.selected_goals || [];
    if (goals.includes('growth')) pool = pool.concat(quotesForGrowth);

    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const quote = pool[dayOfYear % pool.length];

    await supabase.from('user_profiles').update({
        agent_daily_quote: quote
    }).eq('user_id', data.userId);
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

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

        // Carica utenti attivi
        let usersQuery = supabaseAdmin
            .from('user_profiles')
            .select('user_id')
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

        for (const user of users) {
            try {
                const userData = await loadUserData(user.user_id, supabaseAdmin, now);

                // Skip nuovi utenti senza sessioni
                if (!userData.lastSession && userData.recentCheckins.length === 0) continue;

                // Safety PRIMA (può fare continue se critico)
                analyzeSafety(userData, actions);

                // Se safety critico, skip resto
                const hasCritical = actions.some(a => a.user_id === userData.userId && a.priority === 'critical');
                if (hasCritical) continue;

                // Tutte le altre analisi
                analyzePushTriggers(userData, actions, now);
                analyzeCheckinPriorities(userData, actions, now);
                analyzeExerciseSuggestion(userData, actions);
                analyzeBubble(userData, actions, now);
                analyzeAnalyticsTriggers(userData, actions);
                analyzeHabits(userData, actions, now);
                analyzeDiary(userData, actions);
                analyzeHealthKit(userData, actions);

                // "Questo giorno, X tempo fa" — ricordi dal diario/sessioni
                await analyzeMemories(userData, actions, now, supabaseAdmin);

                // Genera decisioni
                await generateCheckinPlan(userData, supabaseAdmin);
                await generatePrimaryMetrics(userData, supabaseAdmin);
                await generateDiaryPrompt(userData, supabaseAdmin, now);
                await generateDailyQuote(userData, supabaseAdmin);

            } catch (userErr) {
                console.error(`[AriaAgent] Error for user ${user.user_id}:`, userErr);
            }
        }

        // Limita a max 2 push per utente
        limitPushPerUser(actions);

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
