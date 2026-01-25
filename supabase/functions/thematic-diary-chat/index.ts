import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiaryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface DashboardConfig {
  priority_metrics?: string[];
  secondary_metrics?: string[];
  hidden_metrics?: string[];
  theme?: string;
}

interface OnboardingAnswers {
  goal?: string;
  primaryGoals?: string[];
  mood?: number;
  sleepIssues?: string;
}

interface PsychologyData {
  rumination: number | null;
  self_efficacy: number | null;
  mental_clarity: number | null;
  burnout_level: number | null;
  coping_ability: number | null;
  loneliness_perceived: number | null;
  somatic_tension: number | null;
  appetite_changes: number | null;
  sunlight_exposure: number | null;
  guilt: number | null;
  gratitude: number | null;
  irritability: number | null;
}

// Map goals to AI persona style
const getPersonaStyle = (goals: string[], onboardingAnswers: OnboardingAnswers | null): string => {
  if (goals.includes('reduce_anxiety') || onboardingAnswers?.goal === 'anxiety') {
    return `STILE: CALMO & RASSICURANTE
- Usa un tono lento, validante, rassicurante.
- Frasi come "Capisco, respira con calma...", "È normale sentirsi così...", "Sei al sicuro qui..."
- Evita domande incalzanti. Dai spazio.
- Valida prima di tutto, poi esplora delicatamente.
- Suggerisci tecniche di grounding quando appropriato.`;
  }
  
  if (goals.includes('boost_energy') || goals.includes('growth') || onboardingAnswers?.goal === 'growth') {
    return `STILE: ENERGICO & ORIENTATO ALL'AZIONE
- Usa un tono motivante, analitico, propositivo.
- Frasi come "Ottimo! Qual è il prossimo passo?", "Come possiamo trasformarlo in azione?", "Cosa ti servirebbe per..."
- Focus su obiettivi concreti e progressi.
- Celebra i successi, anche piccoli.
- Spingi verso la riflessione produttiva.`;
  }
  
  if (goals.includes('express_feelings') || goals.includes('find_love')) {
    return `STILE: EMPATICO & SPAZIO LIBERO
- Usa un tono accogliente, con minimo intervento.
- Frasi come "Dimmi di più...", "Come ti ha fatto sentire?", "Sono qui per ascoltarti..."
- Fai domande aperte e lascia parlare.
- Non interrompere i flussi emotivi.
- Rifletti i sentimenti senza giudicare.`;
  }
  
  if (goals.includes('improve_sleep') || onboardingAnswers?.goal === 'sleep') {
    return `STILE: RILASSANTE & GUIDATO
- Usa un tono calmo, metodico, orientato al benessere.
- Interesse genuino per routine serali, qualità del riposo.
- Suggerisci pratiche di igiene del sonno quando appropriato.
- Esplora fattori che influenzano il sonno (stress, pensieri, abitudini).`;
  }
  
  return `STILE: BILANCIATO
- Tono caldo, professionale, empatico.
- Alterna ascolto attivo e domande esplorative.
- Adattati al mood dell'utente momento per momento.`;
};

// Get priority metrics description
const getPriorityFocus = (config: DashboardConfig | null): string => {
  const metrics = config?.priority_metrics || ['mood', 'anxiety', 'energy', 'sleep'];
  
  const metricLabels: Record<string, string> = {
    mood: 'umore generale',
    anxiety: 'livello di ansia e stress',
    energy: 'energia e vitalità',
    sleep: 'qualità del sonno',
    love: 'relazioni amorose',
    social: 'vita sociale e connessioni',
    work: 'lavoro e carriera',
    growth: 'crescita personale',
    stress: 'gestione dello stress',
    calmness: 'senso di calma',
    loneliness: 'solitudine percepita',
    emotional_clarity: 'chiarezza emotiva',
  };
  
  const labels = metrics.slice(0, 4).map(m => metricLabels[m] || m).join(', ');
  return labels;
};

// Build investigative prompts based on missing/critical psychology data
const buildInvestigativePrompt = (psychologyData: PsychologyData | null): string => {
  if (!psychologyData) return '';

  const criticalMetrics: string[] = [];
  const missingMetrics: string[] = [];

  // Define thresholds
  const highThreshold = 7;
  const lowThreshold = 4;

  // Check each metric
  if (psychologyData.rumination === null) {
    missingMetrics.push('ruminazione (pensieri ricorrenti)');
  } else if (psychologyData.rumination >= highThreshold) {
    criticalMetrics.push('ruminazione ALTA - l\'utente ha pensieri ossessivi');
  }

  if (psychologyData.burnout_level === null) {
    missingMetrics.push('burnout (esaurimento)');
  } else if (psychologyData.burnout_level >= highThreshold) {
    criticalMetrics.push('burnout ALTO - l\'utente è molto esaurito');
  }

  if (psychologyData.loneliness_perceived === null) {
    missingMetrics.push('solitudine percepita');
  } else if (psychologyData.loneliness_perceived >= highThreshold) {
    criticalMetrics.push('solitudine ALTA - l\'utente si sente molto solo');
  }

  if (psychologyData.somatic_tension === null) {
    missingMetrics.push('tensione fisica (dolori da stress)');
  } else if (psychologyData.somatic_tension >= highThreshold) {
    criticalMetrics.push('tensione somatica ALTA - dolori fisici da stress');
  }

  if (psychologyData.guilt === null) {
    missingMetrics.push('senso di colpa');
  } else if (psychologyData.guilt >= highThreshold) {
    criticalMetrics.push('senso di colpa ALTO');
  }

  if (psychologyData.gratitude === null) {
    missingMetrics.push('gratitudine');
  } else if (psychologyData.gratitude <= lowThreshold) {
    criticalMetrics.push('gratitudine BASSA - l\'utente non esprime apprezzamento');
  }

  if (psychologyData.self_efficacy === null) {
    missingMetrics.push('autoefficacia (fiducia in sé)');
  } else if (psychologyData.self_efficacy <= lowThreshold) {
    criticalMetrics.push('autoefficacia BASSA - l\'utente non crede in sé stesso');
  }

  if (psychologyData.sunlight_exposure === null) {
    missingMetrics.push('esposizione alla luce/uscite');
  } else if (psychologyData.sunlight_exposure <= lowThreshold) {
    criticalMetrics.push('poca luce solare - l\'utente sta molto in casa');
  }

  if (psychologyData.irritability === null) {
    missingMetrics.push('irritabilità');
  } else if (psychologyData.irritability >= highThreshold) {
    criticalMetrics.push('irritabilità ALTA');
  }

  if (psychologyData.appetite_changes === null) {
    missingMetrics.push('cambiamenti appetito');
  } else if (psychologyData.appetite_changes >= highThreshold) {
    criticalMetrics.push('appetito alterato (troppo o troppo poco)');
  }

  if (criticalMetrics.length === 0 && missingMetrics.length === 0) {
    return '';
  }

  let prompt = `
═══════════════════════════════════════════════
🔬 INVESTIGAZIONE PSICOLOGICA PROFONDA
═══════════════════════════════════════════════`;

  if (criticalMetrics.length > 0) {
    prompt += `

⚠️ METRICHE CRITICHE RILEVATE:
${criticalMetrics.map(m => `- ${m}`).join('\n')}

ISTRUZIONE: Approfondisci CON DELICATEZZA questi temi nella conversazione.
Esempi di domande esplorative:
- Ruminazione: "Noto che a volte i pensieri tornano... C'è qualcosa che ti gira in testa in questi giorni?"
- Burnout: "Come ti stai prendendo cura di te stesso in questo periodo intenso?"
- Solitudine: "A volte anche in mezzo agli altri ci si può sentire soli. Ti è capitato?"
- Tensione fisica: "Mentre parli, noti qualche tensione nel corpo? Spalle, stomaco, collo?"
- Senso di colpa: "Sento che forse porti un peso con te. Vuoi parlarne?"`;
  }

  if (missingMetrics.length > 0) {
    prompt += `

📊 DATI MANCANTI DA ESPLORARE:
${missingMetrics.slice(0, 4).map(m => `- ${m}`).join('\n')}

ISTRUZIONE: Se la conversazione lo permette naturalmente, inserisci UNA domanda su questi temi.
Esempi:
- Gratitudine: "C'è qualcosa per cui ti senti grato oggi, anche piccola?"
- Luce solare: "Sei riuscito a uscire un po' all'aria aperta di recente?"
- Autoefficacia: "Come ti senti rispetto alle sfide di questo periodo?"
- Appetito: "Come è stato il tuo appetito ultimamente?"

NON fare interrogatori. UNA domanda alla volta, solo se naturale nel contesto.`;
  }

  return prompt;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get FULL user profile for personalization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('name, long_term_memory, life_areas_scores, selected_goals, onboarding_answers, dashboard_config')
      .eq('user_id', user.id)
      .single();

    // Get recent psychology data for investigative prompts
    const today = new Date().toISOString().split('T')[0];
    const { data: psychologyData } = await supabase
      .from('daily_psychology')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    const firstName = profile?.name?.split(' ')[0] || 'Amico';
    const longTermMemory = profile?.long_term_memory || [];
    const currentLifeScores = profile?.life_areas_scores || {};
    const selectedGoals = (profile?.selected_goals as string[]) || [];
    const onboardingAnswers = profile?.onboarding_answers as OnboardingAnswers | null;
    const dashboardConfig = profile?.dashboard_config as DashboardConfig | null;
    
    const memoryContext = longTermMemory.length > 0 
      ? longTermMemory.join('\n- ') 
      : 'Nessuna memoria precedente.';

    // Build personalization context
    const personaStyle = getPersonaStyle(selectedGoals, onboardingAnswers);
    const priorityFocus = getPriorityFocus(dashboardConfig);
    
    // Map goals to readable labels
    const goalLabels: Record<string, string> = {
      reduce_anxiety: 'gestire ansia e stress',
      improve_sleep: 'dormire meglio',
      find_love: 'migliorare le relazioni',
      boost_energy: 'aumentare energia e vitalità',
      express_feelings: 'esprimere emozioni e sfogarsi',
    };
    const goalDescriptions = selectedGoals.map(g => goalLabels[g] || g).join(', ') || 'benessere generale';

    const { theme, themeLabel, message, history } = await req.json() as {
      theme: string;
      themeLabel: string;
      message: string;
      history: DiaryMessage[];
    };

    // Build conversation history
    const conversationHistory = history.slice(-10).map((msg: DiaryMessage) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Theme-specific context
    const themeContextMap: Record<string, string> = {
      love: 'relazioni amorose, sentimenti romantici, partner, appuntamenti, cuore',
      work: 'carriera, lavoro, colleghi, progetti professionali, ambizioni lavorative',
      relationships: 'amicizie, famiglia, relazioni sociali, legami interpersonali',
      self: 'crescita personale, autostima, obiettivi personali, benessere interiore, hobby',
    };

    const themeContext = themeContextMap[theme] || theme;

    // Build life areas status for Data Hunter
    const lifeAreasKeys = ['love', 'work', 'social', 'growth', 'health'];
    const lifeAreasLabels: Record<string, string> = {
      love: 'Amore (relazioni, partner)',
      work: 'Lavoro (carriera, progetti)',
      social: 'Socialità (amici, famiglia)',
      growth: 'Crescita (sviluppo personale)',
      health: 'Salute (fisica, mentale)',
    };
    
    // Check which areas are missing
    const missingAreas = lifeAreasKeys.filter(key => {
      const score = currentLifeScores[key];
      return score === null || score === undefined || score === 0;
    });
    
    const dataHunterInstructions = missingAreas.length > 0 
      ? `
═══════════════════════════════════════════════
🎯 DATA HUNTER - AREE VITA MANCANTI
═══════════════════════════════════════════════
Le seguenti aree della vita NON hanno dati nel radar dell'utente:
${missingAreas.map(k => `- ${lifeAreasLabels[k]}`).join('\n')}

ISTRUZIONE: Se la conversazione lo permette naturalmente, inserisci UNA domanda su una di queste aree.`
      : '';

    // Build investigative prompt for deep psychology
    const investigativePrompt = buildInvestigativePrompt(psychologyData as PsychologyData | null);

    // Build PERSONALIZED system prompt
    const systemPrompt = `SEI UNA MEMORIA VIVENTE - DIARIO "${themeLabel.toUpperCase()}"

═══════════════════════════════════════════════
📋 CONTESTO UTENTE PERSONALIZZATO
═══════════════════════════════════════════════
- Nome: ${firstName}
- Obiettivi: ${goalDescriptions}
- Metriche prioritarie: ${priorityFocus}
- Tema diario: ${themeLabel} (${themeContext})

${personaStyle}
${dataHunterInstructions}
${investigativePrompt}

═══════════════════════════════════════════════
🧠 MEMORIA CENTRALE
═══════════════════════════════════════════════
- ${memoryContext}

═══════════════════════════════════════════════
⚙️ REGOLE DI STILE INDEROGABILI
═══════════════════════════════════════════════

1. ANTI-SALUTI RIPETITIVI (CRITICO):
   - CONTROLLA la cronologia: se ci siamo già salutati, NON salutare di nuovo.
   - Vai dritto al punto. Niente "Ciao!", "Ehi!" ripetuti.
   
2. TONO PERSONALIZZATO:
   - Adatta il tuo stile in base alle istruzioni STILE sopra.
   - Sei un confidente che conosce ${firstName} da tempo.
   - NON dire MAI "non ho memoria". Tu HAI memoria.
   - Fai riferimenti specifici alla memoria quando pertinente.

3. FOCUS PRIORITÀ:
   - Presta ATTENZIONE EXTRA a: ${priorityFocus}
   - Se l'utente parla di temi correlati alle sue priorità, approfondisci.
   - Cerca indizi nascosti sulle metriche prioritarie anche se non espliciti.

4. NO META-COMMENTI:
   - NON stampare MAI istruzioni interne, "Note mentali:", "[Analisi]", ecc.
   - La risposta deve essere una conversazione naturale.

5. FORMATTAZIONE:
   - Usa **grassetto** SOLO per singole parole chiave emotive (1-3 parole max).
   - Sii caldo, breve (2-3 frasi max), e terapeutico.

SICUREZZA:
- Se l'utente esprime pensieri di autolesionismo, rispondi con empatia e suggerisci di parlare con un professionista (Telefono Amico: 02 2327 2327).`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Lovable AI Gateway for chat response
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message },
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || 'Mi dispiace, non riesco a rispondere ora.';

    // Map theme to life area
    const themeToLifeAreaMap: Record<string, string> = {
      love: 'love',
      work: 'work',
      relationships: 'social',
      self: 'growth',
    };
    const primaryLifeArea = themeToLifeAreaMap[theme] || null;

    // FIRE AND FORGET: Create a session + call process-session for full analysis
    (async () => {
      try {
        console.log('[thematic-diary-chat] Creating session for diary analysis...');
        
        // Build transcript from history + current exchange
        const fullTranscript = [
          ...history.map((m: DiaryMessage) => `${m.role === 'user' ? 'Tu' : 'AI'}: ${m.content}`),
          `Tu: ${message}`,
          `AI: ${reply}`
        ].join('\n\n');

        // Create a session record
        const { data: newSession, error: sessionCreateError } = await supabaseAdmin
          .from('sessions')
          .insert({
            user_id: user.id,
            type: 'chat',
            status: 'in_progress',
            start_time: new Date().toISOString()
          })
          .select('id')
          .single();

        if (sessionCreateError || !newSession) {
          console.error('[thematic-diary-chat] Error creating session:', sessionCreateError);
          return;
        }

        console.log('[thematic-diary-chat] Created session:', newSession.id);

        // Call process-session edge function with user context
        const processResponse = await fetch(`${supabaseUrl}/functions/v1/process-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            session_id: newSession.id,
            user_id: user.id,
            transcript: fullTranscript,
            is_voice: false,
            user_context: {
              selected_goals: selectedGoals,
              priority_metrics: dashboardConfig?.priority_metrics || [],
              primary_life_area: primaryLifeArea,
            }
          }),
        });

        if (!processResponse.ok) {
          console.error('[thematic-diary-chat] process-session error:', await processResponse.text());
        } else {
          const processResult = await processResponse.json();
          console.log('[thematic-diary-chat] Analysis complete:', processResult.success);
        }

      } catch (err) {
        console.error('[thematic-diary-chat] Background analysis error:', err);
      }
    })();

    // Also update memory with key facts (quick fire-and-forget)
    const memoryUpdatePrompt = `Analizza questo messaggio dell'utente nel contesto del tema "${themeLabel}":
"${message}"

Se contiene un FATTO NUOVO IMPORTANTE (evento, cambiamento, decisione), restituisci una frase breve da aggiungere alla memoria (es. "Ha iniziato a frequentare Sara").
Se non c'è nulla di nuovo, restituisci esattamente: "NESSUN_AGGIORNAMENTO"

Rispondi SOLO con la frase o "NESSUN_AGGIORNAMENTO".`;

    fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: memoryUpdatePrompt }],
        max_tokens: 100,
      }),
    }).then(async (memResponse) => {
      if (memResponse.ok) {
        const memData = await memResponse.json();
        const memoryFact = memData.choices?.[0]?.message?.content?.trim();
        
        if (memoryFact && memoryFact !== 'NESSUN_AGGIORNAMENTO' && memoryFact.length > 5) {
          const factWithContext = `[${themeLabel}] ${memoryFact}`;
          
          const { data: currentProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('long_term_memory')
            .eq('user_id', user.id)
            .single();
          
          const currentMemory = currentProfile?.long_term_memory || [];
          const updatedMemory = [...currentMemory, factWithContext].slice(-20);
          
          await supabaseAdmin
            .from('user_profiles')
            .update({ long_term_memory: updatedMemory })
            .eq('user_id', user.id);
          
          console.log('[thematic-diary-chat] Memory updated with:', factWithContext);
        }
      }
    }).catch(err => console.error('Memory update error:', err));

    return new Response(
      JSON.stringify({ reply, sessionCreated: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in thematic-diary-chat:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
