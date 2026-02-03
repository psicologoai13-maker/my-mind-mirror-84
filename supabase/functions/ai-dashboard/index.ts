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
  wellness_score: number | null; // null for new users without data
  wellness_message: string;
}

// Build metrics based on user goals - ALWAYS returns 4 metrics
function buildMetricsFromGoals(goals: string[]): MetricConfig[] {
  const goalMetricMap: Record<string, MetricConfig[]> = {
    'reduce_anxiety': [
      { key: 'anxiety', value: 0, label: 'Ansia', icon: '🧠', priority: 1, reason: 'Il tuo obiettivo principale' },
      { key: 'mood', value: 0, label: 'Umore', icon: '😌', priority: 2, reason: 'Collegato all\'ansia' },
      { key: 'sleep', value: 0, label: 'Riposo', icon: '💤', priority: 3, reason: 'Impatta l\'ansia' },
      { key: 'energy', value: 0, label: 'Energia', icon: '⚡', priority: 4, reason: 'Livello energetico' },
    ],
    'improve_sleep': [
      { key: 'sleep', value: 0, label: 'Riposo', icon: '💤', priority: 1, reason: 'Il tuo obiettivo principale' },
      { key: 'energy', value: 0, label: 'Energia', icon: '⚡', priority: 2, reason: 'Collegato al sonno' },
      { key: 'mood', value: 0, label: 'Umore', icon: '😌', priority: 3, reason: 'Impattato dal riposo' },
      { key: 'anxiety', value: 0, label: 'Ansia', icon: '🧠', priority: 4, reason: 'Monitora lo stress' },
    ],
    'boost_energy': [
      { key: 'energy', value: 0, label: 'Energia', icon: '⚡', priority: 1, reason: 'Il tuo obiettivo principale' },
      { key: 'sleep', value: 0, label: 'Riposo', icon: '💤', priority: 2, reason: 'Fonte di energia' },
      { key: 'mood', value: 0, label: 'Umore', icon: '😌', priority: 3, reason: 'Collegato all\'energia' },
      { key: 'health', value: 0, label: 'Salute', icon: '💪', priority: 4, reason: 'Benessere fisico' },
    ],
    'find_love': [
      { key: 'love', value: 0, label: 'Amore', icon: '❤️', priority: 1, reason: 'Il tuo obiettivo principale' },
      { key: 'social', value: 0, label: 'Socialità', icon: '👥', priority: 2, reason: 'Relazioni sociali' },
      { key: 'mood', value: 0, label: 'Umore', icon: '😌', priority: 3, reason: 'Stato emotivo' },
      { key: 'growth', value: 0, label: 'Crescita', icon: '🌱', priority: 4, reason: 'Sviluppo personale' },
    ],
    'personal_growth': [
      { key: 'growth', value: 0, label: 'Crescita', icon: '🌱', priority: 1, reason: 'Il tuo obiettivo principale' },
      { key: 'mood', value: 0, label: 'Umore', icon: '😌', priority: 2, reason: 'Stato emotivo' },
      { key: 'energy', value: 0, label: 'Energia', icon: '⚡', priority: 3, reason: 'Motivazione' },
      { key: 'work', value: 0, label: 'Lavoro', icon: '💼', priority: 4, reason: 'Produttività' },
    ],
    'self_esteem': [
      { key: 'mood', value: 0, label: 'Umore', icon: '😌', priority: 1, reason: 'Collegato all\'autostima' },
      { key: 'growth', value: 0, label: 'Crescita', icon: '🌱', priority: 2, reason: 'Sviluppo personale' },
      { key: 'social', value: 0, label: 'Socialità', icon: '👥', priority: 3, reason: 'Relazioni' },
      { key: 'energy', value: 0, label: 'Energia', icon: '⚡', priority: 4, reason: 'Vitalità' },
    ],
    // NEW: Additional goal mappings for onboarding goals
    'fitness': [
      { key: 'health', value: 0, label: 'Salute', icon: '💪', priority: 1, reason: 'Il tuo obiettivo fitness' },
      { key: 'energy', value: 0, label: 'Energia', icon: '⚡', priority: 2, reason: 'Performance fisica' },
      { key: 'sleep', value: 0, label: 'Riposo', icon: '💤', priority: 3, reason: 'Recupero muscolare' },
      { key: 'mood', value: 0, label: 'Umore', icon: '😌', priority: 4, reason: 'Benessere generale' },
    ],
    'mood': [
      { key: 'mood', value: 0, label: 'Umore', icon: '😌', priority: 1, reason: 'Il tuo focus principale' },
      { key: 'anxiety', value: 0, label: 'Ansia', icon: '🧠', priority: 2, reason: 'Influenza l\'umore' },
      { key: 'energy', value: 0, label: 'Energia', icon: '⚡', priority: 3, reason: 'Vitalità' },
      { key: 'sleep', value: 0, label: 'Riposo', icon: '💤', priority: 4, reason: 'Impatta l\'umore' },
    ],
    'financial': [
      { key: 'work', value: 0, label: 'Lavoro', icon: '💼', priority: 1, reason: 'Focus carriera/finanze' },
      { key: 'anxiety', value: 0, label: 'Ansia', icon: '🧠', priority: 2, reason: 'Stress finanziario' },
      { key: 'growth', value: 0, label: 'Crescita', icon: '🌱', priority: 3, reason: 'Sviluppo professionale' },
      { key: 'mood', value: 0, label: 'Umore', icon: '😌', priority: 4, reason: 'Benessere generale' },
    ],
    'aging': [
      { key: 'health', value: 0, label: 'Salute', icon: '💪', priority: 1, reason: 'Focus longevità' },
      { key: 'energy', value: 0, label: 'Energia', icon: '⚡', priority: 2, reason: 'Vitalità' },
      { key: 'sleep', value: 0, label: 'Riposo', icon: '💤', priority: 3, reason: 'Rigenerazione' },
      { key: 'growth', value: 0, label: 'Crescita', icon: '🌱', priority: 4, reason: 'Sviluppo continuo' },
    ],
    'relationships': [
      { key: 'love', value: 0, label: 'Amore', icon: '❤️', priority: 1, reason: 'Focus relazioni' },
      { key: 'social', value: 0, label: 'Socialità', icon: '👥', priority: 2, reason: 'Connessioni' },
      { key: 'mood', value: 0, label: 'Umore', icon: '😌', priority: 3, reason: 'Stato emotivo' },
      { key: 'anxiety', value: 0, label: 'Ansia', icon: '🧠', priority: 4, reason: 'Ansia sociale' },
    ],
    'stress': [
      { key: 'anxiety', value: 0, label: 'Ansia', icon: '🧠', priority: 1, reason: 'Focus stress' },
      { key: 'sleep', value: 0, label: 'Riposo', icon: '💤', priority: 2, reason: 'Impatto sonno' },
      { key: 'energy', value: 0, label: 'Energia', icon: '⚡', priority: 3, reason: 'Livello energetico' },
      { key: 'mood', value: 0, label: 'Umore', icon: '😌', priority: 4, reason: 'Benessere' },
    ],
  };

  // Default metrics
  const defaultMetrics: MetricConfig[] = [
    { key: 'mood', value: 0, label: 'Umore', icon: '😌', priority: 1, reason: 'Metrica fondamentale' },
    { key: 'anxiety', value: 0, label: 'Ansia', icon: '🧠', priority: 2, reason: 'Monitora lo stress' },
    { key: 'energy', value: 0, label: 'Energia', icon: '⚡', priority: 3, reason: 'Livello energetico' },
    { key: 'sleep', value: 0, label: 'Riposo', icon: '💤', priority: 4, reason: 'Qualità del riposo' },
  ];

  if (!goals || goals.length === 0) {
    return defaultMetrics;
  }

  // Get metrics for first goal that has a mapping
  for (const goal of goals) {
    const metrics = goalMetricMap[goal];
    if (metrics) {
      return metrics;
    }
  }

  return defaultMetrics;
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

    // CRITICAL: Check if user has ANY real data
    const hasRealData = sessions.length > 0 || emotions.length > 0 || lifeAreas.length > 0 || psychology.length > 0;
    const userGoals = profile?.selected_goals || [];

    // If NO DATA exists, return empty state layout immediately (don't generate AI score)
    if (!hasRealData) {
      console.log('[ai-dashboard] New user with no data - returning empty state');
      const goalBasedMetrics = buildMetricsFromGoals(userGoals);
      const emptyStateLayout: DashboardLayout = {
        primary_metrics: goalBasedMetrics,
        widgets: [
          { type: 'vitals_grid', title: 'I Tuoi Focus', description: '', priority: 1, visible: true },
          { type: 'goals_progress', title: 'Obiettivi', description: '', priority: 2, visible: userGoals.length > 0 },
          { type: 'radar_chart', title: 'Aree della Vita', description: '', priority: 3, visible: false },
          { type: 'emotional_mix', title: 'Mix Emotivo', description: '', priority: 4, visible: false },
        ],
        ai_message: '',
        focus_areas: userGoals.slice(0, 2),
        wellness_score: null, // NULL for new users - score activates after check-in or Aria conversation
        wellness_message: 'Iniziamo questo percorso insieme: ogni piccolo passo conta per il tuo benessere.',
      };
      
      return new Response(JSON.stringify(emptyStateLayout), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 🎯 CRITICAL: Use MOST RECENT values, not averages!
    // This ensures consistency with what the Focus Cards display
    // The frontend uses getMostRecentVital() which returns the first non-zero value
    // The AI should evaluate the user's CURRENT state, not historical average
    
    const getMostRecent = <T>(arr: T[], getter: (item: T) => number | null): number | null => {
      for (const item of arr) {
        const val = getter(item);
        if (val !== null && val > 0) return val;
      }
      return null;
    };

    // Sessions are already sorted DESC by start_time
    const mostRecentVitals = {
      mood: getMostRecent(sessions, s => s.mood_score_detected),
      anxiety: getMostRecent(sessions, s => s.anxiety_score_detected),
    };

    // Emotions sorted DESC by date (newest first)
    const mostRecentEmotions = {
      joy: getMostRecent(emotions, e => e.joy),
      sadness: getMostRecent(emotions, e => e.sadness),
      anger: getMostRecent(emotions, e => e.anger),
      fear: getMostRecent(emotions, e => e.fear),
      apathy: getMostRecent(emotions, e => e.apathy),
    };

    // Life areas sorted DESC by date (newest first)
    const mostRecentLifeAreas = {
      love: getMostRecent(lifeAreas, l => l.love),
      work: getMostRecent(lifeAreas, l => l.work),
      health: getMostRecent(lifeAreas, l => l.health),
      social: getMostRecent(lifeAreas, l => l.social),
      growth: getMostRecent(lifeAreas, l => l.growth),
    };

    // Psychology sorted DESC by date (newest first)
    const mostRecentPsychology = {
      rumination: getMostRecent(psychology, p => p.rumination),
      burnout_level: getMostRecent(psychology, p => p.burnout_level),
      somatic_tension: getMostRecent(psychology, p => p.somatic_tension),
      self_efficacy: getMostRecent(psychology, p => p.self_efficacy),
      mental_clarity: getMostRecent(psychology, p => p.mental_clarity),
      gratitude: getMostRecent(psychology, p => p.gratitude),
    };

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

    const userMessage = `Dati utente (valori PIÙ RECENTI disponibili):

OBIETTIVI SELEZIONATI: ${userGoals.length > 0 ? userGoals.join(', ') : 'Nessuno'}

VITALI (1-10, più recente):
- Umore: ${mostRecentVitals.mood || 'N/D'}
- Ansia: ${mostRecentVitals.anxiety || 'N/D'}

EMOZIONI (1-10, più recente):
- Gioia: ${mostRecentEmotions.joy || 'N/D'}
- Tristezza: ${mostRecentEmotions.sadness || 'N/D'}
- Rabbia: ${mostRecentEmotions.anger || 'N/D'}
- Paura: ${mostRecentEmotions.fear || 'N/D'}
- Apatia: ${mostRecentEmotions.apathy || 'N/D'}

AREE VITA (1-10, più recente):
- Amore: ${mostRecentLifeAreas.love || 'N/D'}
- Lavoro: ${mostRecentLifeAreas.work || 'N/D'}
- Salute: ${mostRecentLifeAreas.health || 'N/D'}
- Socialità: ${mostRecentLifeAreas.social || 'N/D'}
- Crescita: ${mostRecentLifeAreas.growth || 'N/D'}

PSICOLOGIA PROFONDA (1-10, più recente):
- Ruminazione: ${mostRecentPsychology.rumination || 'N/D'}
- Burnout: ${mostRecentPsychology.burnout_level || 'N/D'}
- Tensione somatica: ${mostRecentPsychology.somatic_tension || 'N/D'}
- Autoefficacia: ${mostRecentPsychology.self_efficacy || 'N/D'}
- Chiarezza mentale: ${mostRecentPsychology.mental_clarity || 'N/D'}
- Gratitudine: ${mostRecentPsychology.gratitude || 'N/D'}

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
      // Fallback to default layout based on user goals
      const goalBasedMetrics = buildMetricsFromGoals(userGoals);
      dashboardLayout = {
        primary_metrics: goalBasedMetrics,
        widgets: [
          { type: 'vitals_grid', title: 'I Tuoi Focus', description: '', priority: 1, visible: true },
          { type: 'goals_progress', title: 'Obiettivi', description: '', priority: 2, visible: userGoals.length > 0 },
          { type: 'radar_chart', title: 'Aree della Vita', description: '', priority: 3, visible: lifeAreas.length > 0 },
          { type: 'emotional_mix', title: 'Mix Emotivo', description: '', priority: 4, visible: emotions.length > 0 },
        ],
        ai_message: '',
        focus_areas: userGoals.slice(0, 2),
        wellness_score: 5,
        wellness_message: 'Parla con me per iniziare a monitorare il tuo benessere.',
      };
    }

    // Add current values to metrics (using most recent, not averages)
    const metricValues: Record<string, number> = {
      mood: mostRecentVitals.mood || 0,
      anxiety: mostRecentVitals.anxiety || 0,
      energy: mostRecentVitals.mood ? mostRecentVitals.mood * 0.8 : 0,
      sleep: 0,
      joy: mostRecentEmotions.joy || 0,
      sadness: mostRecentEmotions.sadness || 0,
      anger: mostRecentEmotions.anger || 0,
      fear: mostRecentEmotions.fear || 0,
      apathy: mostRecentEmotions.apathy || 0,
      love: mostRecentLifeAreas.love || 0,
      work: mostRecentLifeAreas.work || 0,
      health: mostRecentLifeAreas.health || 0,
      social: mostRecentLifeAreas.social || 0,
      growth: mostRecentLifeAreas.growth || 0,
      rumination: mostRecentPsychology.rumination || 0,
      burnout_level: mostRecentPsychology.burnout_level || 0,
      somatic_tension: mostRecentPsychology.somatic_tension || 0,
      self_efficacy: mostRecentPsychology.self_efficacy || 0,
      mental_clarity: mostRecentPsychology.mental_clarity || 0,
      gratitude: mostRecentPsychology.gratitude || 0,
    };

    // Enrich metrics with values
    dashboardLayout.primary_metrics = dashboardLayout.primary_metrics.map(m => ({
      ...m,
      value: metricValues[m.key] || 0,
    }));

    // CRITICAL: Ensure we ALWAYS have exactly 4 metrics for proper grid layout
    if (dashboardLayout.primary_metrics.length < 4) {
      const existingKeys = new Set(dashboardLayout.primary_metrics.map(m => m.key));
      const fallbackMetrics = [
        { key: 'mood', value: 0, label: 'Umore', icon: '😌', priority: 5, reason: 'Stato emotivo' },
        { key: 'anxiety', value: 0, label: 'Ansia', icon: '🧠', priority: 6, reason: 'Livello stress' },
        { key: 'energy', value: 0, label: 'Energia', icon: '⚡', priority: 7, reason: 'Energia' },
        { key: 'sleep', value: 0, label: 'Riposo', icon: '💤', priority: 8, reason: 'Riposo' },
      ];
      
      for (const fallback of fallbackMetrics) {
        if (dashboardLayout.primary_metrics.length >= 4) break;
        if (!existingKeys.has(fallback.key)) {
          fallback.value = metricValues[fallback.key] || 0;
          dashboardLayout.primary_metrics.push(fallback);
        }
      }
    }
    
    // Limit to exactly 4 for consistent grid
    dashboardLayout.primary_metrics = dashboardLayout.primary_metrics.slice(0, 4);

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
