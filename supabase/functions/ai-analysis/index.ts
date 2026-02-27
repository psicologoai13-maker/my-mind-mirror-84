import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetricConfig {
  key: string;
  label: string;
  category: 'vitali' | 'emozioni' | 'aree' | 'psicologia';
  icon: string;
  priority: number;
  reason: string;
  showChart: boolean;
  showInSummary: boolean;
}

interface SectionConfig {
  id: string;
  title: string;
  description: string;
  priority: number;
  visible: boolean;
  metrics: string[];
  chartType: 'grid' | 'bar' | 'radar' | 'line' | 'mix';
}

interface AnalysisLayout {
  sections: SectionConfig[];
  highlighted_metrics: MetricConfig[];
  ai_summary: string;
  focus_insight: string;
  recommended_deep_dive: string[];
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

    // Get time range from request
    const body = await req.json().catch(() => ({}));
    const timeRange = body.timeRange || 'week';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (timeRange) {
      case 'day': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'week': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case 'month': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }
    const startDateStr = startDate.toISOString().split('T')[0];

    // Fetch user profile with goals
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('selected_goals, onboarding_answers')
      .eq('user_id', user.id)
      .single();

    // Fetch all data for the period
    const [emotionsRes, lifeAreasRes, psychologyRes, sessionsRes] = await Promise.all([
      supabase.from('daily_emotions').select('*').eq('user_id', user.id).gte('date', startDateStr).order('date', { ascending: false }),
      supabase.from('daily_life_areas').select('*').eq('user_id', user.id).gte('date', startDateStr).order('date', { ascending: false }),
      supabase.from('daily_psychology').select('*').eq('user_id', user.id).gte('date', startDateStr).order('date', { ascending: false }),
      supabase.from('sessions').select('mood_score_detected, anxiety_score_detected, sleep_quality, ai_summary').eq('user_id', user.id).gte('start_time', startDateStr).order('start_time', { ascending: false }),
    ]);

    const emotions = emotionsRes.data || [];
    const lifeAreas = lifeAreasRes.data || [];
    const psychology = psychologyRes.data || [];
    const sessions = sessionsRes.data || [];

    // Calculate averages for all metrics (for trends analysis)
    const avg = (arr: any[], key: string) => {
      const valid = arr.map(x => x[key]).filter(v => v !== null && v !== undefined && v > 0);
      return valid.length > 0 ? (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1) : 'N/D';
    };

    // 🎯 CRITICAL: Also get MOST RECENT values for consistency with Dashboard Focus Cards
    // The focus_insight should reference the same values the user sees in "I tuoi focus"
    const getMostRecent = <T>(arr: T[], getter: (item: T) => number | null | undefined): string => {
      for (const item of arr) {
        const val = getter(item);
        if (val !== null && val !== undefined && val > 0) return val.toFixed(1);
      }
      return 'N/D';
    };

    const mostRecentVitals = {
      mood: getMostRecent(sessions, s => s.mood_score_detected),
      anxiety: getMostRecent(sessions, s => s.anxiety_score_detected),
      sleep: getMostRecent(sessions, s => s.sleep_quality),
    };

    const mostRecentLifeAreas = {
      love: getMostRecent(lifeAreas, l => l.love),
      work: getMostRecent(lifeAreas, l => l.work),
      school: getMostRecent(lifeAreas, l => l.school),
      health: getMostRecent(lifeAreas, l => l.health),
      social: getMostRecent(lifeAreas, l => l.social),
      growth: getMostRecent(lifeAreas, l => l.growth),
    };

    const avgVitals = {
      mood: sessions.length > 0 ? (sessions.reduce((sum, s) => sum + (s.mood_score_detected || 0), 0) / sessions.length).toFixed(1) : 'N/D',
      anxiety: sessions.length > 0 ? (sessions.reduce((sum, s) => sum + (s.anxiety_score_detected || 0), 0) / sessions.length).toFixed(1) : 'N/D',
      sleep: sessions.length > 0 ? (sessions.reduce((sum, s) => sum + (s.sleep_quality || 0), 0) / sessions.length).toFixed(1) : 'N/D',
    };

    const avgEmotions = {
      joy: avg(emotions, 'joy'),
      sadness: avg(emotions, 'sadness'),
      anger: avg(emotions, 'anger'),
      fear: avg(emotions, 'fear'),
      apathy: avg(emotions, 'apathy'),
    };

    const avgLifeAreas = {
      love: avg(lifeAreas, 'love'),
      work: avg(lifeAreas, 'work'),
      school: avg(lifeAreas, 'school'),
      health: avg(lifeAreas, 'health'),
      social: avg(lifeAreas, 'social'),
      growth: avg(lifeAreas, 'growth'),
    };

    const avgPsychology = {
      rumination: avg(psychology, 'rumination'),
      burnout_level: avg(psychology, 'burnout_level'),
      somatic_tension: avg(psychology, 'somatic_tension'),
      self_efficacy: avg(psychology, 'self_efficacy'),
      mental_clarity: avg(psychology, 'mental_clarity'),
      gratitude: avg(psychology, 'gratitude'),
      guilt: avg(psychology, 'guilt'),
      irritability: avg(psychology, 'irritability'),
      loneliness_perceived: avg(psychology, 'loneliness_perceived'),
      coping_ability: avg(psychology, 'coping_ability'),
    };

    const userGoals = profile?.selected_goals || [];
    const recentSummaries = sessions.slice(0, 3).map(s => s.ai_summary).filter(Boolean);

    // Build AI prompt
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    const systemPrompt = `Sei un AI psicologo che personalizza la pagina ANALISI di un'app di benessere mentale.
La pagina Analisi è una vista COMPLETA che mostra TUTTI i dati storici dell'utente, non solo quelli prioritari.

IL TUO COMPITO:
1. Organizzare le sezioni in ordine di rilevanza per l'utente
2. Evidenziare 3-5 metriche che meritano attenzione speciale (positive o da migliorare)
3. Suggerire 2-3 metriche su cui l'utente dovrebbe fare un "deep dive"
4. Generare un breve riassunto AI dello stato generale
5. Generare un insight focale basato sui pattern rilevati

REGOLE:
- TUTTE le sezioni devono essere visibili (visible: true) - è una pagina di analisi completa
- Ordina per priorità in base a: obiettivi utente, valori critici, pattern rilevanti
- Le metriche evidenziate devono avere una "reason" personalizzata
- Il riassunto deve essere max 2 frasi
- L'insight focale deve collegare almeno 2 metriche tra loro

SEZIONI DISPONIBILI:
- wellness_hero: Wellness Score complessivo
- vitals_grid: Griglia 4 parametri vitali (mood, anxiety, energy, sleep)
- emotional_mix: Mix emotivo con barre orizzontali
- life_areas: Aree della vita con radar/grid
- deep_psychology: Metriche psicologiche avanzate (ruminazione, burnout, etc.)

METRICHE DISPONIBILI:
Vitali: mood, anxiety, energy, sleep
Emozioni: joy, sadness, anger, fear, apathy
Aree: love, work, health, social, growth
Psicologia: rumination, burnout_level, somatic_tension, self_efficacy, mental_clarity, gratitude, guilt, irritability, loneliness_perceived, coping_ability

Rispondi SOLO in JSON valido:
{
  "sections": [
    {"id": "wellness_hero", "title": "Wellness Score", "description": "Breve desc", "priority": 1, "visible": true, "metrics": [], "chartType": "grid"},
    ...
  ],
  "highlighted_metrics": [
    {"key": "anxiety", "label": "Ansia", "category": "vitali", "icon": "😰", "priority": 1, "reason": "Motivo personalizzato", "showChart": true, "showInSummary": true},
    ...
  ],
  "ai_summary": "Riassunto di 2 frasi sullo stato dell'utente",
  "focus_insight": "Insight che collega 2+ metriche",
  "recommended_deep_dive": ["rumination", "sleep"]
}`;

    const userMessage = `Periodo analizzato: ${timeRange === 'day' ? 'Oggi' : timeRange === 'week' ? 'Ultima settimana' : timeRange === 'month' ? 'Ultimo mese' : 'Storico completo'}

OBIETTIVI UTENTE: ${userGoals.length > 0 ? userGoals.join(', ') : 'Nessuno selezionato'}

═══════════════════════════════════════════════
⚠️ VALORI ATTUALI (mostrati nelle Focus Cards della Home)
Usa questi valori quando menzioni lo stato ATTUALE dell'utente:
═══════════════════════════════════════════════
- Umore attuale: ${mostRecentVitals.mood}
- Ansia attuale: ${mostRecentVitals.anxiety}
- Sonno attuale: ${mostRecentVitals.sleep}
- Salute attuale: ${mostRecentLifeAreas.health}
- Lavoro attuale: ${mostRecentLifeAreas.work}
- Scuola attuale: ${mostRecentLifeAreas.school}
- Amore attuale: ${mostRecentLifeAreas.love}
- Socialità attuale: ${mostRecentLifeAreas.social}

═══════════════════════════════════════════════
MEDIE DEL PERIODO (per trend e confronti storici):
═══════════════════════════════════════════════
VITALI (media):
- Umore: ${avgVitals.mood}
- Ansia: ${avgVitals.anxiety}
- Sonno: ${avgVitals.sleep}

EMOZIONI (media 1-10):
- Gioia: ${avgEmotions.joy}
- Tristezza: ${avgEmotions.sadness}
- Rabbia: ${avgEmotions.anger}
- Paura: ${avgEmotions.fear}
- Apatia: ${avgEmotions.apathy}

AREE VITA (media 1-10):
- Amore: ${avgLifeAreas.love}
- Lavoro: ${avgLifeAreas.work}
- Scuola: ${avgLifeAreas.school}
- Salute: ${avgLifeAreas.health}
- Socialità: ${avgLifeAreas.social}
- Crescita: ${avgLifeAreas.growth}

PSICOLOGIA PROFONDA (media 1-10):
- Ruminazione: ${avgPsychology.rumination}
- Burnout: ${avgPsychology.burnout_level}
- Tensione somatica: ${avgPsychology.somatic_tension}
- Autoefficacia: ${avgPsychology.self_efficacy}
- Chiarezza mentale: ${avgPsychology.mental_clarity}
- Gratitudine: ${avgPsychology.gratitude}
- Senso di colpa: ${avgPsychology.guilt}
- Irritabilità: ${avgPsychology.irritability}
- Solitudine percepita: ${avgPsychology.loneliness_perceived}
- Capacità di coping: ${avgPsychology.coping_ability}

GIORNI CON DATI: Emozioni: ${emotions.length}, Aree: ${lifeAreas.length}, Psicologia: ${psychology.length}, Sessioni: ${sessions.length}

RIASSUNTI SESSIONI RECENTI:
${recentSummaries.length > 0 ? recentSummaries.join('\n---\n') : 'Nessuna sessione'}

Genera la configurazione della pagina Analisi.`;

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.7 },
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
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse JSON from response
    let analysisLayout: AnalysisLayout;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisLayout = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError, 'Content:', content);
      // Fallback to default layout
      analysisLayout = {
        sections: [
          { id: 'wellness_hero', title: 'Wellness Score', description: 'Il tuo punteggio complessivo', priority: 1, visible: true, metrics: [], chartType: 'grid' },
          { id: 'vitals_grid', title: 'Parametri Vitali', description: 'I tuoi indicatori principali', priority: 2, visible: true, metrics: ['mood', 'anxiety', 'energy', 'sleep'], chartType: 'grid' },
          { id: 'emotional_mix', title: 'Mix Emotivo', description: 'Distribuzione delle emozioni', priority: 3, visible: true, metrics: ['joy', 'sadness', 'anger', 'fear', 'apathy'], chartType: 'bar' },
          { id: 'life_areas', title: 'Aree della Vita', description: 'Bilancio vita personale', priority: 4, visible: true, metrics: ['love', 'work', 'health', 'social', 'growth'], chartType: 'radar' },
          { id: 'deep_psychology', title: 'Psicologia Profonda', description: 'Metriche avanzate', priority: 5, visible: true, metrics: ['rumination', 'burnout_level', 'somatic_tension', 'self_efficacy', 'mental_clarity', 'gratitude'], chartType: 'grid' },
        ],
        highlighted_metrics: [
          { key: 'mood', label: 'Umore', category: 'vitali', icon: '😌', priority: 1, reason: 'Metrica fondamentale', showChart: true, showInSummary: true },
          { key: 'anxiety', label: 'Ansia', category: 'vitali', icon: '😰', priority: 2, reason: 'Monitora lo stress', showChart: true, showInSummary: true },
        ],
        ai_summary: 'Benvenuto nella tua pagina di analisi. Inizia a interagire con l\'app per generare insight personalizzati.',
        focus_insight: 'Parla con l\'AI per scoprire connessioni tra le tue metriche.',
        recommended_deep_dive: ['mood', 'anxiety'],
      };
    }

    return new Response(JSON.stringify(analysisLayout), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('ai-analysis error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
