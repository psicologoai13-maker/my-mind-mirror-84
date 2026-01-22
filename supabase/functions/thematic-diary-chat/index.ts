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

    // Get user profile for memory
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('name, long_term_memory, life_areas_scores')
      .eq('user_id', user.id)
      .single();

    const firstName = profile?.name?.split(' ')[0] || 'Amico';
    const longTermMemory = profile?.long_term_memory || [];
    const currentLifeScores = profile?.life_areas_scores || {};
    const memoryContext = longTermMemory.length > 0 
      ? longTermMemory.join('\n- ') 
      : 'Nessuna memoria precedente.';

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

    // Build system prompt
    const systemPrompt = `SEI UNA MEMORIA VIVENTE - DIARIO "${themeLabel.toUpperCase()}".

IDENTITÀ UTENTE:
- Nome: ${firstName} (NON chiamarlo mai con altri nomi)
- Questo è il suo diario personale sul tema: ${themeLabel}

MEMORIA CENTRALE (dai colloqui precedenti):
- ${memoryContext}

CONTESTO TEMATICO:
Questo diario è dedicato a: ${themeContext}.
Mantieni la conversazione focalizzata su questo tema, ma usa la memoria centrale per collegamenti.

ISTRUZIONI CRITICHE:
1. Sei un confidente empatico che conosce ${firstName} da tempo.
2. NON dire MAI "non ho memoria" o "non ricordo". Tu HAI memoria.
3. Fai riferimenti specifici alla memoria quando pertinente.
4. Fai domande aperte per esplorare sentimenti e situazioni.
5. Sii caldo, breve (2-3 frasi max), e terapeutico.
6. Usa il tono di un caro amico che ascolta senza giudicare.

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

        // Call process-session edge function for full omniscient analysis
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
            is_voice: false
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
