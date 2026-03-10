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

function analyzeBubble(data: UserData, actions: AgentAction[], now: Date) {
    const lastBubbleTime = data.profile?.aria_home_message_at ? new Date(data.profile.aria_home_message_at) : null;
    const hoursSinceBubble = lastBubbleTime ? (now.getTime() - lastBubbleTime.getTime()) / (1000 * 60 * 60) : 999;

    if (hoursSinceBubble < 6) return;

    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    actions.push({
        user_id: data.userId,
        action_type: 'update_bubble',
        priority: 'low',
        payload: {
            context: {
                name: data.profile?.name,
                wellness: data.profile?.wellness_score,
                lastMood: data.recentCheckins[0]?.mood_value,
                profile: data.profile?.adaptive_profile?.therapeutic_context?.progress_summary,
                hoursSinceSession: data.hoursSinceLastSession,
                hasEventTomorrow: data.events.some(e => e.event_date === tomorrow),
                streakDays: data.habitStreaks[0]?.current_streak || 0
            }
        },
        created_at: new Date().toISOString(),
        executed: false
    });
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

    // 7a. Reminder habits non fatte (dopo le 19)
    if (data.currentHour >= 19 && data.canSendPush) {
        const activeHabits = data.habitStreaks.filter(s => s.current_streak > 0);
        for (const habit of activeHabits) {
            const doneToday = data.habits.some(h => h.habit_type === habit.habit_type && h.date === todayStr);
            if (!doneToday && habit.current_streak >= 3) {
                actions.push({
                    user_id: data.userId,
                    action_type: 'push_notification',
                    priority: 'low',
                    payload: {
                        title: 'Aria',
                        body: `Non dimenticare: ${habit.habit_type}! Sei a ${habit.current_streak} giorni 🔥`,
                        reason: 'habit_reminder'
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
// AREA 9: HEALTHKIT
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
