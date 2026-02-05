import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ObjectiveInfo {
  id: string;
  title: string;
  category: string;
  current_value: number | null;
  target_value: number | null;
  starting_value: number | null;
  unit: string | null;
  ai_progress_estimate: number | null;
  ai_milestones: any[] | null;
}

interface ObjectiveUpdate {
  id: string;
  current_value?: number;
  ai_progress_estimate?: number;
  ai_feedback?: string;
  ai_milestones?: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, activeObjectives } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Pass the token directly to getUser
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build objectives context
    const objectivesContext = activeObjectives.map((obj: ObjectiveInfo) => {
      const hasNumericTarget = obj.target_value !== null;
      let progressInfo = '';
      
      if (hasNumericTarget) {
        const current = obj.current_value ?? obj.starting_value ?? 0;
        const starting = obj.starting_value ?? 0;
        const target = obj.target_value!;
        const progress = starting !== target 
          ? Math.min(100, Math.max(0, ((current - starting) / (target - starting)) * 100))
          : 0;
        progressInfo = `Progresso: ${current}${obj.unit ? ' ' + obj.unit : ''} / ${target}${obj.unit ? ' ' + obj.unit : ''} (${Math.round(progress)}%)`;
      } else {
        progressInfo = `Progresso stimato AI: ${obj.ai_progress_estimate ?? 0}%`;
      }
      
      return `- ID: ${obj.id} | "${obj.title}" [${obj.category}]: ${progressInfo}`;
    }).join('\n');

    const systemPrompt = `Sei Aria, l'assistente AI di supporto emotivo. Stai aiutando l'utente ad aggiornare i progressi dei suoi obiettivi.

OBIETTIVI ATTIVI:
${objectivesContext || 'Nessun obiettivo attivo'}

COMPITO:
1. Ascolta i progressi dell'utente
2. Identifica l'obiettivo (usa l'ID dalla lista!)
3. Estrai valori numerici
4. Genera SEMPRE una frase ai_feedback DETTAGLIATA con i numeri specifici

REGOLE NUMERICHE:
- "ho perso 2kg" con peso attuale 85kg → current_value = 83
- "ora peso 83kg" → current_value = 83
- "ho risparmiato 100€" con attuale 200€ → current_value = 300
- Per obiettivi qualitativi: stima % basata su progressi descritti

ai_feedback (OBBLIGATORIO e DETTAGLIATO per ogni update):
- Frase che descrive LO STATO ATTUALE con NUMERI SPECIFICI
- DEVE contenere: valore attuale, target, progresso fatto
- Lunghezza: 80-120 caratteri (frase completa e descrittiva)
- SENZA emoji
- Esempi con dati specifici:
  - "Sei a 73kg, hai già preso 1kg dei 5kg che vuoi raggiungere per arrivare a 76kg"
  - "Hai risparmiato 350€ su 1000€, sei al 35% del tuo obiettivo di risparmio"
  - "Oggi 2 sigarette, stai riducendo bene verso le 0 al giorno"
  - "Hai letto 3 libri su 10 quest'anno, ottimo ritmo continua così"
  - "Sei a metà strada: 50km fatti dei 100km che vuoi correre questo mese"

FORMATO JSON (alla fine del messaggio):
\`\`\`json
{
  "updates": [
    {
      "id": "ID_OBIETTIVO_DALLA_LISTA",
      "current_value": numero,
      "ai_progress_estimate": percentuale_0_100,
      "ai_feedback": "frase LUNGA e DETTAGLIATA con numeri specifici OBBLIGATORIA",
      "new_milestone": "milestone se raggiunta"
    }
  ]
}
\`\`\`

TONO: Entusiasta, genuino, max 2-3 frasi.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    let aiMessage = data.choices[0].message.content;
    
    // Parse any JSON updates from the response
    const updates: ObjectiveUpdate[] = [];
    const jsonMatch = aiMessage.match(/```json\n?([\s\S]*?)\n?```/);
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.updates && Array.isArray(parsed.updates)) {
          for (const update of parsed.updates) {
            // Validate the objective exists
            const objective = activeObjectives.find((o: ObjectiveInfo) => o.id === update.id);
            if (objective) {
              const updateData: any = {
                ai_feedback: update.ai_feedback,
                updated_at: new Date().toISOString(),
              };
              
              // Update numeric value if provided
              if (update.current_value !== undefined) {
                updateData.current_value = update.current_value;
              }
              
              // Update AI progress estimate
              if (update.ai_progress_estimate !== undefined) {
                updateData.ai_progress_estimate = Math.min(100, Math.max(0, update.ai_progress_estimate));
              }
              
              // Add milestone if provided
              if (update.new_milestone) {
                const existingMilestones = objective.ai_milestones || [];
                updateData.ai_milestones = [
                  ...existingMilestones,
                  {
                    milestone: update.new_milestone,
                    date: new Date().toISOString(),
                  }
                ];
              }
              
              // Save to database
              const { error: updateError } = await supabaseClient
                .from('user_objectives')
                .update(updateData)
                .eq('id', update.id)
                .eq('user_id', user.id);
              
              if (!updateError) {
                updates.push({
                  id: update.id,
                  ...updateData,
                });
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse JSON updates:', e);
      }
      
      // Remove JSON block from visible message
      aiMessage = aiMessage.replace(/```json\n?[\s\S]*?\n?```/, '').trim();
    }

    return new Response(
      JSON.stringify({ 
        message: aiMessage, 
        updates 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in update-objective-chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});