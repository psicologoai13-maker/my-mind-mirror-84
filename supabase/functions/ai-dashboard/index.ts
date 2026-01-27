import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetricConfig {
  key: string;
  value: number;
  label: string;
  icon: string;
  priority: number;
  reason: string;
}

interface WidgetConfig {
  type: 'vitals_grid' | 'radar_chart' | 'emotional_mix' | 'goals_progress' | 'weekly_trend' | 'life_areas' | 'custom_metric';
  title: string;
  description: string;
  priority: number;
  metrics?: MetricConfig[];
  visible: boolean;
}

interface DashboardLayout {
  primary_metrics: MetricConfig[];
  widgets: WidgetConfig[];
  ai_message: string;
  focus_areas: string[];
  wellness_score: number;
  wellness_message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user profile with goals
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('selected_goals, onboarding_answers, dashboard_config')
      .eq('user_id', user.id)
      .single();

    // Fetch last 7 days of daily metrics
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [emotionsRes, lifeAreasRes, psychologyRes, sessionsRes] = await Promise.all([
      supabase.from('daily_emotions').select('*').eq('user_id', user.id).gte('date', weekAgo).order('date', { ascending: false }),
      supabase.from('daily_life_areas').select('*').eq('user_id', user.id).gte('date', weekAgo).order('date', { ascending: false }),
      supabase.from('daily_psychology').select('*').eq('user_id', user.id).gte('date', weekAgo).order('date', { ascending: false }),
      supabase.from('sessions').select('ai_summary, mood_score_detected, anxiety_score_detected').eq('user_id', user.id).gte('start_time', weekAgo).order('start_time', { ascending: false }).limit(10),
    ]);

    // Calculate averages
    const emotions = emotionsRes.data || [];
    const lifeAreas = lifeAreasRes.data || [];
    const psychology = psychologyRes.data || [];
    const sessions = sessionsRes.data || [];

    const avgVitals = {
      mood: sessions.length > 0 ? sessions.reduce((sum, s) => sum + (s.mood_score_detected || 0), 0) / sessions.length : null,
      anxiety: sessions.length > 0 ? sessions.reduce((sum, s) => sum + (s.anxiety_score_detected || 0), 0) / sessions.length : null,
    };

    const avgEmotions = {
      joy: emotions.length > 0 ? emotions.reduce((sum, e) => sum + (e.joy || 0), 0) / emotions.length : null,
      sadness: emotions.length > 0 ? emotions.reduce((sum, e) => sum + (e.sadness || 0), 0) / emotions.length : null,
      anger: emotions.length > 0 ? emotions.reduce((sum, e) => sum + (e.anger || 0), 0) / emotions.length : null,
      fear: emotions.length > 0 ? emotions.reduce((sum, e) => sum + (e.fear || 0), 0) / emotions.length : null,
      apathy: emotions.length > 0 ? emotions.reduce((sum, e) => sum + (e.apathy || 0), 0) / emotions.length : null,
    };

    const avgLifeAreas = {
      love: lifeAreas.length > 0 ? lifeAreas.reduce((sum, l) => sum + (l.love || 0), 0) / lifeAreas.length : null,
      work: lifeAreas.length > 0 ? lifeAreas.reduce((sum, l) => sum + (l.work || 0), 0) / lifeAreas.length : null,
      health: lifeAreas.length > 0 ? lifeAreas.reduce((sum, l) => sum + (l.health || 0), 0) / lifeAreas.length : null,
      social: lifeAreas.length > 0 ? lifeAreas.reduce((sum, l) => sum + (l.social || 0), 0) / lifeAreas.length : null,
      growth: lifeAreas.length > 0 ? lifeAreas.reduce((sum, l) => sum + (l.growth || 0), 0) / lifeAreas.length : null,
    };

    const avgPsychology = {
      rumination: psychology.length > 0 ? psychology.reduce((sum, p) => sum + (p.rumination || 0), 0) / psychology.length : null,
      burnout_level: psychology.length > 0 ? psychology.reduce((sum, p) => sum + (p.burnout_level || 0), 0) / psychology.length : null,
      somatic_tension: psychology.length > 0 ? psychology.reduce((sum, p) => sum + (p.somatic_tension || 0), 0) / psychology.length : null,
      self_efficacy: psychology.length > 0 ? psychology.reduce((sum, p) => sum + (p.self_efficacy || 0), 0) / psychology.length : null,
      mental_clarity: psychology.length > 0 ? psychology.reduce((sum, p) => sum + (p.mental_clarity || 0), 0) / psychology.length : null,
      gratitude: psychology.length > 0 ? psychology.reduce((sum, p) => sum + (p.gratitude || 0), 0) / psychology.length : null,
    };

    const userGoals = profile?.selected_goals || [];
    const recentSummaries = sessions.slice(0, 3).map(s => s.ai_summary).filter(Boolean);

    // Build AI prompt
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `Sei un AI psicologo che personalizza la DASHBOARD HOME di un'app di benessere mentale.
La Dashboard è una vista ESSENZIALE che mostra solo ciò che è più importante PER L'UTENTE in questo momento.

═══════════════════════════════════════════════
⚠️ REGOLA CRITICA: STABILITÀ DEI FOCUS
═══════════════════════════════════════════════
I FOCUS (primary_metrics) devono essere STABILI nel tempo:
- NON cambiarli ogni volta che viene richiesta la dashboard
- Cambiali SOLO se c'è un CAMBIAMENTO SIGNIFICATIVO nei dati (>20% variazione)
- I focus rappresentano le 4-6 metriche PIÙ IMPORTANTI per l'utente basate su:
  1. Obiettivi selezionati dall'utente (MASSIMA PRIORITÀ)
  2. Aree della vita con punteggi critici (<5 o >8)
  3. Metriche con variazioni significative recenti
  4. Problemi psicologici rilevati (burnout, ruminazione, ansia alta)

═══════════════════════════════════════════════
🎯 FOCUS METRICS (4-6 metriche stabili)
═══════════════════════════════════════════════
CATEGORIE DI METRICHE DISPONIBILI:
- VITALI: mood, anxiety, energy, sleep
- EMOZIONI: joy, sadness, anger, fear, apathy
- AREE VITA: love, work, health, social, growth
- PSICOLOGIA: rumination, burnout_level, self_efficacy, mental_clarity

REGOLE SELEZIONE:
1. Includi SEMPRE mood o anxiety (sono fondamentali)
2. Includi ALMENO 1 area vita se i dati sono disponibili
3. Includi metriche legate agli OBIETTIVI dell'utente
4. Includi metriche CRITICHE (valori <4 o >8)

ESEMPI DI FOCUS STABILI:
- Utente con obiettivo "reduce_anxiety": [mood, anxiety, sleep, rumination] - FISSO finché obiettivo attivo
- Utente con obiettivo "find_love": [mood, love, social, loneliness] - FISSO finché obiettivo attivo
- Utente con burnout alto: [mood, energy, burnout_level, work] - FISSO finché burnout non scende

═══════════════════════════════════════════════
🏆 WELLNESS SCORE (1-10)
═══════════════════════════════════════════════
REGOLE:
- Valuta lo stato ATTUALE dell'utente, non la media storica
- Se evento negativo grave (rottura, lutto, licenziamento): 1-3
- Se difficoltà moderate ma gestibili: 4-6
- Se stato positivo: 7-10
- Il messaggio deve essere empatico e breve (max 15 parole)

═══════════════════════════════════════════════
🎯 VALUTAZIONE OBIETTIVI
═══════════════════════════════════════════════
Per ogni obiettivo:
- progress (0-100): Quanto l'utente sta progredendo
- status: "in_progress" | "achieved" | "struggling"
- ai_feedback: Breve frase (max 10 parole)

CRITERI:
- reduce_anxiety: Progress = max(0, (10 - ansia) * 10)
- improve_sleep: Progress = sonno * 10
- find_love: Progress basato su love + social area
- boost_energy: Progress = energy * 10
- emotional_balance: Progress basato su stabilità emotiva
- personal_growth: Progress basato su growth + self_efficacy

═══════════════════════════════════════════════
📦 WIDGET (MAX 3 oltre vitals_grid)
═══════════════════════════════════════════════
- vitals_grid: SEMPRE visibile
- goals_progress: Solo se utente ha obiettivi
- radar_chart: Solo se dati life_areas disponibili
- emotional_mix: Solo se emozioni rilevanti

Rispondi SOLO in JSON valido:
{
  "wellness_score": 7.5,
  "wellness_message": "Messaggio personalizzato breve",
  "primary_metrics": [
    {"key": "mood", "priority": 1, "reason": "Il tuo umore generale"},
    {"key": "anxiety", "priority": 2, "reason": "Collegato al tuo obiettivo"},
    {"key": "love", "priority": 3, "reason": "Area importante per te"},
    {"key": "energy", "priority": 4, "reason": "Livello energetico"}
  ],
  "widgets": [
    {"type": "vitals_grid", "visible": true, "priority": 1, "title": "I Tuoi Focus", "description": ""},
    {"type": "goals_progress", "visible": true, "priority": 2, "title": "Obiettivi", "description": ""},
    {"type": "radar_chart", "visible": true, "priority": 3, "title": "Aree della Vita", "description": ""}
  ],
  "ai_message": "",
  "focus_areas": ["anxiety", "love"],
  "goals_evaluation": [
    {
      "goal_id": "reduce_anxiety",
      "progress": 65,
      "status": "in_progress",
      "ai_feedback": "Stai migliorando, continua così!"
    }
  ]
}`;

    const userMessage = `Dati utente ultimi 7 giorni:

OBIETTIVI SELEZIONATI: ${userGoals.length > 0 ? userGoals.join(', ') : 'Nessuno'}

VITALI (media 1-10):
- Umore: ${avgVitals.mood?.toFixed(1) || 'N/D'}
- Ansia: ${avgVitals.anxiety?.toFixed(1) || 'N/D'}

EMOZIONI (media 1-10):
- Gioia: ${avgEmotions.joy?.toFixed(1) || 'N/D'}
- Tristezza: ${avgEmotions.sadness?.toFixed(1) || 'N/D'}
- Rabbia: ${avgEmotions.anger?.toFixed(1) || 'N/D'}
- Paura: ${avgEmotions.fear?.toFixed(1) || 'N/D'}
- Apatia: ${avgEmotions.apathy?.toFixed(1) || 'N/D'}

AREE VITA (media 1-10):
- Amore: ${avgLifeAreas.love?.toFixed(1) || 'N/D'}
- Lavoro: ${avgLifeAreas.work?.toFixed(1) || 'N/D'}
- Salute: ${avgLifeAreas.health?.toFixed(1) || 'N/D'}
- Socialità: ${avgLifeAreas.social?.toFixed(1) || 'N/D'}
- Crescita: ${avgLifeAreas.growth?.toFixed(1) || 'N/D'}

PSICOLOGIA PROFONDA (media 1-10):
- Ruminazione: ${avgPsychology.rumination?.toFixed(1) || 'N/D'}
- Burnout: ${avgPsychology.burnout_level?.toFixed(1) || 'N/D'}
- Tensione somatica: ${avgPsychology.somatic_tension?.toFixed(1) || 'N/D'}
- Autoefficacia: ${avgPsychology.self_efficacy?.toFixed(1) || 'N/D'}
- Chiarezza mentale: ${avgPsychology.mental_clarity?.toFixed(1) || 'N/D'}
- Gratitudine: ${avgPsychology.gratitude?.toFixed(1) || 'N/D'}

RIASSUNTI SESSIONI RECENTI:
${recentSummaries.length > 0 ? recentSummaries.join('\n---\n') : 'Nessuna sessione recente'}

GIORNI CON DATI: Emozioni: ${emotions.length}, Aree: ${lifeAreas.length}, Sessioni: ${sessions.length}

Genera la configurazione dashboard personalizzata.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits exhausted' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    let dashboardLayout: DashboardLayout;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        dashboardLayout = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError, 'Content:', content);
      // Fallback to default layout
      dashboardLayout = {
        primary_metrics: [
          { key: 'mood', value: 0, label: 'Umore', icon: '❤️', priority: 1, reason: 'Metrica fondamentale' },
          { key: 'anxiety', value: 0, label: 'Ansia', icon: '🧠', priority: 2, reason: 'Monitora il tuo stress' },
          { key: 'energy', value: 0, label: 'Energia', icon: '⚡', priority: 3, reason: 'Livello energetico' },
          { key: 'sleep', value: 0, label: 'Sonno', icon: '🌙', priority: 4, reason: 'Qualità del riposo' },
        ],
        widgets: [
          { type: 'vitals_grid', title: 'I Tuoi Focus', description: '', priority: 1, visible: true },
          { type: 'goals_progress', title: 'Obiettivi', description: '', priority: 2, visible: userGoals.length > 0 },
          { type: 'radar_chart', title: 'Aree della Vita', description: '', priority: 3, visible: lifeAreas.length > 0 },
          { type: 'emotional_mix', title: 'Mix Emotivo', description: '', priority: 4, visible: emotions.length > 0 },
        ],
        ai_message: '',
        focus_areas: userGoals.slice(0, 2),
        wellness_score: 5,
        wellness_message: 'Inizia a interagire per personalizzare la dashboard.',
      };
    }

    // Add current values to metrics
    const metricValues: Record<string, number> = {
      mood: avgVitals.mood || 0,
      anxiety: avgVitals.anxiety || 0,
      energy: avgVitals.mood ? avgVitals.mood * 0.8 : 0,
      sleep: 0,
      joy: avgEmotions.joy || 0,
      sadness: avgEmotions.sadness || 0,
      anger: avgEmotions.anger || 0,
      fear: avgEmotions.fear || 0,
      apathy: avgEmotions.apathy || 0,
      love: avgLifeAreas.love || 0,
      work: avgLifeAreas.work || 0,
      health: avgLifeAreas.health || 0,
      social: avgLifeAreas.social || 0,
      growth: avgLifeAreas.growth || 0,
      rumination: avgPsychology.rumination || 0,
      burnout_level: avgPsychology.burnout_level || 0,
      somatic_tension: avgPsychology.somatic_tension || 0,
      self_efficacy: avgPsychology.self_efficacy || 0,
      mental_clarity: avgPsychology.mental_clarity || 0,
      gratitude: avgPsychology.gratitude || 0,
    };

    // Enrich metrics with values
    dashboardLayout.primary_metrics = dashboardLayout.primary_metrics.map(m => ({
      ...m,
      value: metricValues[m.key] || 0,
    }));

    return new Response(JSON.stringify(dashboardLayout), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('ai-dashboard error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
