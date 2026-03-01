import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

    // SECURITY: Require doctor authentication via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create authenticated client for the requesting user
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate the JWT and get user
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !userData?.user) {
      console.log('[doctor-view-data] Invalid JWT:', userError?.message);
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const doctorId = userData.user.id;
    if (!doctorId) {
      return new Response(JSON.stringify({ error: 'Invalid user identity' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create service role client for privileged operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // SECURITY: Verify the requesting user is a doctor
    const { data: doctorRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', doctorId)
      .eq('role', 'doctor')
      .single();

    if (!doctorRole) {
      console.log('[doctor-view-data] User is not a doctor:', doctorId);
      return new Response(JSON.stringify({ error: 'Access denied: doctor role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { token: accessToken } = await req.json();

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Token mancante' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the shared access record
    const { data: accessRecord, error: accessError } = await supabase
      .from('shared_access')
      .select('*')
      .eq('token', accessToken)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (accessError || !accessRecord) {
      console.log('[doctor-view-data] Invalid or expired token:', accessToken);
      return new Response(JSON.stringify({ error: 'Token non valido o scaduto' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = accessRecord.user_id;

    // FIX 2.3: Verifica OBBLIGATORIA che esista una relazione dottore-paziente attiva
    const { data: accessRelation } = await supabase
      .from('doctor_patient_access')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('patient_id', userId)
      .eq('is_active', true)
      .single();

    if (!accessRelation) {
      console.log('[doctor-view-data] No active relationship. Doctor:', doctorId, 'Patient:', userId);
      return new Response(JSON.stringify({ error: 'No active access relationship with this patient' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log access attempt with doctor identity for audit trail
    console.log('[doctor-view-data] Access granted for doctor:', doctorId, 'patient:', userId);

    // Update access count with doctor identity
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
      .select('id, start_time, mood_score_detected, anxiety_score_detected, emotion_tags, ai_summary, life_balance_scores, key_events, status, crisis_alert')
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
      .map(s => s.mood_score_detected as number);
    const anxietyScores = completedSessions
      .filter(s => s.anxiety_score_detected)
      .map(s => s.anxiety_score_detected as number);

    const avgMood = moodScores.length > 0 
      ? (moodScores.reduce((a, b) => a + b, 0) / moodScores.length).toFixed(1)
      : null;
    const avgAnxiety = anxietyScores.length > 0 
      ? (anxietyScores.reduce((a, b) => a + b, 0) / anxietyScores.length).toFixed(1)
      : null;
    const peakAnxiety = anxietyScores.length > 0 
      ? Math.max(...anxietyScores) 
      : null;

    // Estimate sleep quality from mood/anxiety patterns
    let estimatedSleepQuality: string | null = null;
    if (avgMood && avgAnxiety) {
      const moodVal = parseFloat(avgMood);
      const anxietyVal = parseFloat(avgAnxiety);
      if (moodVal >= 7 && anxietyVal <= 3) estimatedSleepQuality = 'Buona';
      else if (moodVal >= 5 && anxietyVal <= 5) estimatedSleepQuality = 'Moderata';
      else if (moodVal < 5 || anxietyVal > 6) estimatedSleepQuality = 'Scarsa';
    }

    // Determine risk status
    let riskStatus: 'stable' | 'attention' | 'critical' = 'stable';
    const hasCrisisAlert = completedSessions.some(s => s.crisis_alert);
    if (hasCrisisAlert || (peakAnxiety && peakAnxiety >= 9)) {
      riskStatus = 'critical';
    } else if ((avgAnxiety && parseFloat(avgAnxiety) >= 6) || (avgMood && parseFloat(avgMood) <= 4)) {
      riskStatus = 'attention';
    }

    // Extract top themes/tags
    const allTags: string[] = [];
    completedSessions.forEach(s => {
      if (s.emotion_tags) allTags.push(...(s.emotion_tags as string[]));
    });
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topThemes = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));

    // Extract key events with dates
    const recentEvents: { date: string; event: string }[] = [];
    completedSessions.forEach(s => {
      if (s.key_events && Array.isArray(s.key_events)) {
        const sessionDate = new Date(s.start_time).toLocaleDateString('it-IT', { 
          day: '2-digit', month: '2-digit' 
        });
        (s.key_events as string[]).forEach(event => {
          recentEvents.push({ date: sessionDate, event });
        });
      }
    });

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

    // Get last session date
    const lastSessionDate = completedSessions.length > 0 
      ? completedSessions[0].start_time 
      : null;

    // Generate AI Clinical Summary using Lovable AI Gateway
    let clinicalSummary = '';
    if (GOOGLE_API_KEY && completedSessions.length >= 1) {
      try {
        const summariesText = completedSessions
          .slice(0, 5)
          .filter(s => s.ai_summary)
          .map(s => s.ai_summary)
          .join('\n---\n');

        const eventsText = recentEvents.slice(0, 10).map(e => `${e.date}: ${e.event}`).join('\n');
        const themesText = topThemes.map(t => t.tag).join(', ');

        const clinicalPrompt = `Sei uno psicologo clinico che deve redigere un report professionale per un collega medico.

DATI DEL PAZIENTE (ultimi 30 giorni):
- Media umore: ${avgMood || 'N/D'}/10
- Media ansia: ${avgAnxiety || 'N/D'}/10  
- Picco ansia: ${peakAnxiety || 'N/D'}/10
- Sessioni totali: ${completedSessions.length}
- Temi principali: ${themesText || 'Nessuno rilevato'}

EVENTI DI VITA RILEVATI:
${eventsText || 'Nessun evento specifico registrato.'}

RIASSUNTI SESSIONI RECENTI:
${summariesText || 'Nessun riassunto disponibile.'}

ISTRUZIONI:
Genera un report clinico STRUTTURATO (max 400 parole) con i seguenti paragrafi:

**SINTOMATOLOGIA OSSERVATA**
Descrivi brevemente i pattern emotivi e comportamentali emersi.

**FATTORI STRESSANTI IDENTIFICATI**
Elenca i principali fattori di stress o eventi significativi.

**PROGRESSI E RISORSE**
Evidenzia eventuali miglioramenti o punti di forza del paziente.

**INDICAZIONI CLINICHE**
Suggerimenti generici per il professionista (NON diagnosi).

Usa un linguaggio tecnico ma accessibile. NON inventare dati. Se mancano informazioni, indicalo.`;

        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: 'Sei uno psicologo clinico esperto. Scrivi in italiano, in modo professionale e obiettivo.' }] },
            contents: [{ role: 'user', parts: [{ text: clinicalPrompt }] }],
            generationConfig: { maxOutputTokens: 800 },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          clinicalSummary = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          console.error('[doctor-view-data] AI response error:', await aiResponse.text());
        }
      } catch (aiError) {
        console.error('[doctor-view-data] Error generating clinical summary:', aiError);
      }
    }

    const responseData = {
      patient: {
        firstName: profile?.name?.split(' ')[0] || 'Paziente Anonimo',
        memberSince: profile?.created_at,
        wellnessScore: profile?.wellness_score || 0,
        lifeAreasScores: profile?.life_areas_scores || {},
        lastSessionDate,
      },
      metrics: {
        totalSessions: completedSessions.length,
        totalCheckins: (checkins || []).length,
        avgMood,
        avgAnxiety,
        peakAnxiety,
        estimatedSleepQuality,
        periodDays: 30,
      },
      topThemes,
      recentEvents: recentEvents.slice(0, 10),
      moodTrend,
      clinicalSummary,
      riskStatus,
      accessInfo: {
        expiresAt: accessRecord.expires_at,
        accessCount: accessRecord.access_count + 1,
        accessedBy: doctorId, // Include doctor ID in response for transparency
      },
    };

    console.log('[doctor-view-data] Data fetched for user:', userId, '| Risk:', riskStatus, '| Accessed by doctor:', doctorId);

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
