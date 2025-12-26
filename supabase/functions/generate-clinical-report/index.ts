import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { days } = await req.json();
    const periodDays = days || 30;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    console.log(`Generating clinical report for user ${user.id}, last ${periodDays} days`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Fetch user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('name, wellness_score')
      .eq('user_id', user.id)
      .single();

    const userName = profile?.name || 'Utente';

    // Fetch sessions in period
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: false });

    // Fetch daily checkins in period
    const { data: checkins } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Fetch thematic diaries
    const { data: diaries } = await supabase
      .from('thematic_diaries')
      .select('*')
      .eq('user_id', user.id);

    // Aggregate data
    let totalMoodScore = 0;
    let totalAnxietyScore = 0;
    let moodCount = 0;
    let anxietyCount = 0;
    const keyEvents: string[] = [];
    const emotionTagsCount: Record<string, number> = {};
    const themeActivity: Record<string, number> = {};

    // Process sessions
    if (sessions && sessions.length > 0) {
      for (const session of sessions) {
        if (session.mood_score_detected) {
          totalMoodScore += session.mood_score_detected;
          moodCount++;
        }
        if (session.anxiety_score_detected) {
          totalAnxietyScore += session.anxiety_score_detected;
          anxietyCount++;
        }
        if (session.key_events && Array.isArray(session.key_events)) {
          keyEvents.push(...session.key_events);
        }
        if (session.emotion_tags && Array.isArray(session.emotion_tags)) {
          for (const tag of session.emotion_tags) {
            emotionTagsCount[tag] = (emotionTagsCount[tag] || 0) + 1;
          }
        }
      }
    }

    // Process checkins for mood data
    if (checkins && checkins.length > 0) {
      for (const checkin of checkins) {
        // mood_value is 1-5, scale to 1-10
        totalMoodScore += checkin.mood_value * 2;
        moodCount++;
      }
    }

    // Process thematic diaries for theme activity
    if (diaries && diaries.length > 0) {
      for (const diary of diaries) {
        const messages = diary.messages as any[];
        if (messages && Array.isArray(messages)) {
          // Count messages in the period
          const recentMessages = messages.filter((m: any) => {
            if (!m.timestamp) return false;
            const msgDate = new Date(m.timestamp);
            return msgDate >= startDate && msgDate <= endDate;
          });
          if (recentMessages.length > 0) {
            themeActivity[diary.theme] = recentMessages.length;
          }
        }
      }
    }

    // Calculate averages
    const avgMood = moodCount > 0 ? (totalMoodScore / moodCount).toFixed(1) : 'N/A';
    const avgAnxiety = anxietyCount > 0 ? (totalAnxietyScore / anxietyCount).toFixed(1) : 'N/A';

    // Get top 3 emotion tags
    const sortedTags = Object.entries(emotionTagsCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([tag]) => tag);

    // Get top 3 active themes
    const sortedThemes = Object.entries(themeActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([theme]) => {
        const themeNames: Record<string, string> = {
          love: 'Amore',
          work: 'Lavoro',
          relationships: 'Relazioni',
          self: 'Me Stesso'
        };
        return themeNames[theme] || theme;
      });

    // Prepare data summary for AI
    const dataSummary = `
DATI AGGREGATI - Ultimi ${periodDays} giorni:

- Numero sessioni completate: ${sessions?.filter(s => s.status === 'completed').length || 0}
- Numero check-in giornalieri: ${checkins?.length || 0}
- Media Umore: ${avgMood}/10
- Media Ansia: ${avgAnxiety}/10
- Punteggio Benessere attuale: ${profile?.wellness_score || 'N/A'}/100

EVENTI CHIAVE RILEVATI:
${keyEvents.length > 0 ? keyEvents.slice(0, 10).map(e => `- ${e}`).join('\n') : '- Nessun evento chiave registrato'}

EMOZIONI PIÙ FREQUENTI:
${sortedTags.length > 0 ? sortedTags.map(t => `- ${t}`).join('\n') : '- Nessuna emozione frequente rilevata'}

TEMI PIÙ DISCUSSI (Diari Tematici):
${sortedThemes.length > 0 ? sortedThemes.map(t => `- ${t}`).join('\n') : '- Nessun tema attivo nel periodo'}
`;

    console.log('Data summary prepared:', dataSummary);

    // Generate clinical report with Lovable AI (GPT-5)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `Agisci come un ASSISTENTE CLINICO ESPERTO con formazione in psicologia clinica e psichiatria.
Il tuo compito è generare un REPORT TECNICO PROFESSIONALE destinato a un medico/psicoterapeuta.

STILE DI LINGUAGGIO (OBBLIGATORIO):
- Usa SEMPRE terminologia medica professionale:
  • "Il paziente manifesta..." (non "L'utente dice...")
  • "Umore deflesso" (non "Si sente giù")
  • "Ideazione ansiosa persistente" (non "È ansioso")
  • "Ruminazione cognitiva" (non "Pensa troppo")
  • "Labilità emotiva" (non "Cambia umore")
  • "Somatizzazione" (non "Sente dolori")
  • "Anedonia" (non "Non prova piacere")

PRINCIPI CLINICI:
1. OGGETTIVITÀ: Basati SOLO sui dati forniti. Nessuna interpretazione soggettiva.
2. SINTESI: Sii conciso e diretto. Il medico ha poco tempo.
3. PRIVACY: NON includere MAI conversazioni letterali o citazioni dirette.
4. PATTERN RECOGNITION: Evidenzia correlazioni e trend significativi.
5. ACTIONABLE INSIGHTS: Fornisci osservazioni utili per il piano terapeutico.

STRUTTURA DEL REPORT:

1. PANORAMICA CLINICA (2-3 frasi)
   Sintesi dello stato generale del paziente nel periodo analizzato.

2. PROFILO EMOTIVO
   - Andamento dell'umore (stabile/fluttuante/in miglioramento/in peggioramento)
   - Livelli di ansia rilevati
   - Pattern temporali significativi (es. peggioramenti serali, weekend difficili)

3. AREE TEMATICHE PREDOMINANTI
   Basate sui diari tematici e argomenti ricorrenti.

4. EVENTI STRESSOGENI IDENTIFICATI
   Trigger e situazioni critiche rilevate.

5. INDICAZIONI CLINICHE
   Osservazioni per il terapeuta:
   - Possibili diagnosi differenziali da esplorare
   - Aree che richiedono approfondimento
   - Segnali di allarme (se presenti)

6. RACCOMANDAZIONI PER IL FOLLOW-UP
   Suggerimenti concreti per le prossime sedute.

Scrivi in italiano. Mantieni un tono professionale e distaccato.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Genera un report clinico basato su questi dati:\n\n${dataSummary}` }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      throw new Error('Failed to generate AI report');
    }

    const aiData = await aiResponse.json();
    const reportText = aiData.choices?.[0]?.message?.content || 'Impossibile generare il report.';

    // Prepare response
    const report = {
      userName,
      periodDays,
      generatedAt: new Date().toISOString(),
      stats: {
        avgMood,
        avgAnxiety,
        totalSessions: sessions?.filter(s => s.status === 'completed').length || 0,
        totalCheckins: checkins?.length || 0,
        wellnessScore: profile?.wellness_score || 0,
      },
      keyEvents: keyEvents.slice(0, 10),
      topEmotions: sortedTags,
      topThemes: sortedThemes,
      clinicalSummary: reportText,
    };

    console.log('Report generated successfully');

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating clinical report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
