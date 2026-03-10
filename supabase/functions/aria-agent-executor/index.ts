import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        // Leggi azioni non eseguite, ordinate per priorità
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        const { data: actions, error } = await supabase
            .from('agent_actions')
            .select('*')
            .eq('executed', false)
            .order('created_at', { ascending: true })
            .limit(50);

        if (error || !actions?.length) {
            return new Response(JSON.stringify({
                message: 'No pending actions',
                error: error?.message
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }

        // Ordina per priorità
        actions.sort((a: any, b: any) =>
            (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
        );

        const results = [];

        for (const action of actions) {
            try {
                let success = false;

                switch (action.action_type) {
                    case 'push_notification': {
                        // Chiama aria-push-notification con service_role
                        const pushResponse = await fetch(
                            `${supabaseUrl}/functions/v1/aria-push-notification`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${serviceRoleKey}`
                                },
                                body: JSON.stringify({
                                    userId: action.user_id,
                                    triggerType: action.payload?.reason || 'scheduled',
                                    override_message: action.payload?.title && action.payload?.body
                                        ? { title: action.payload.title, body: action.payload.body }
                                        : undefined
                                })
                            }
                        );
                        success = pushResponse.ok;
                        if (!success) {
                            console.error(`[Executor] Push failed for ${action.user_id}:`, await pushResponse.text());
                        }
                        break;
                    }

                    case 'prepare_checkins': {
                        // Scrivi priorità check-in nel profilo utente
                        const priorities = action.payload?.priority_metrics || [];
                        const { error: updateErr } = await supabase
                            .from('user_profiles')
                            .update({
                                agent_checkin_priorities: priorities.map((key: string) => ({ key, boost: 30 }))
                            })
                            .eq('user_id', action.user_id);
                        success = !updateErr;
                        if (updateErr) console.error(`[Executor] Checkin priorities error:`, updateErr);
                        break;
                    }

                    case 'suggest_exercise': {
                        // Scrivi esercizio suggerito nel profilo
                        const { error: updateErr } = await supabase
                            .from('user_profiles')
                            .update({ agent_suggested_exercise: action.payload })
                            .eq('user_id', action.user_id);
                        success = !updateErr;
                        if (updateErr) console.error(`[Executor] Exercise suggestion error:`, updateErr);
                        break;
                    }

                    case 'update_bubble': {
                        // Genera messaggio bolla con Gemini
                        const ctx = action.payload?.context || {};
                        const apiKey = Deno.env.get('GOOGLE_API_KEY');

                        const bubblePrompt = `Sei Aria, un'amica empatica. Genera UN messaggio breve (max 2 frasi) \
per la bolla nella home dell'app. Il messaggio deve essere caldo e personale. \
Contesto utente: \
- Nome: ${ctx.name || 'utente'} \
- Wellness score: ${ctx.wellness || '?'}/100 \
- Ultimo umore: ${ctx.lastMood || '?'}/5 \
- Ore dall'ultima sessione: ${Math.round(ctx.hoursSinceSession || 0)} \
- Progresso: ${ctx.profile || 'inizio percorso'} \
\
Rispondi SOLO con il messaggio, niente altro.`;

                        const geminiResponse = await fetch(
                            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`,
                            {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    contents: [{ parts: [{ text: bubblePrompt }] }],
                                    generationConfig: { temperature: 0.7, maxOutputTokens: 100 }
                                })
                            }
                        );

                        if (geminiResponse.ok) {
                            const data = await geminiResponse.json();
                            const message = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

                            if (message) {
                                const { error: updateErr } = await supabase
                                    .from('user_profiles')
                                    .update({
                                        aria_home_message: message,
                                        aria_home_message_at: new Date().toISOString()
                                    })
                                    .eq('user_id', action.user_id);
                                success = !updateErr;
                            }
                        }
                        break;
                    }

                    case 'trigger_analysis': {
                        // Chiama calculate-correlations o detect-emotion-patterns
                        const functionName = action.payload?.function || 'calculate-correlations';
                        const analysisResponse = await fetch(
                            `${supabaseUrl}/functions/v1/${functionName}`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${serviceRoleKey}`
                                },
                                body: JSON.stringify({ userId: action.user_id })
                            }
                        );
                        success = analysisResponse.ok;
                        break;
                    }

                    case 'clinical_alert': {
                        // Per ora logga — in futuro notifica al dottore
                        console.warn(`[Executor] CLINICAL ALERT for ${action.user_id}:`, action.payload);
                        success = true;
                        break;
                    }

                    default:
                        console.warn(`[Executor] Unknown action type: ${action.action_type}`);
                        success = true; // Marca come eseguita per non riprovarla
                }

                // Marca come eseguita
                if (success) {
                    await supabase
                        .from('agent_actions')
                        .update({ executed: true, executed_at: new Date().toISOString() })
                        .eq('id', action.id);
                }

                results.push({
                    id: action.id,
                    type: action.action_type,
                    user: action.user_id.substring(0, 8),
                    success
                });

            } catch (actionErr) {
                console.error(`[Executor] Error executing action ${action.id}:`, actionErr);
                results.push({
                    id: action.id,
                    type: action.action_type,
                    success: false,
                    error: (actionErr as Error).message
                });
            }
        }

        return new Response(JSON.stringify({
            actions_processed: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            details: results
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (err) {
        console.error('[Executor] Fatal error:', err);
        return new Response(JSON.stringify({ error: (err as Error).message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
