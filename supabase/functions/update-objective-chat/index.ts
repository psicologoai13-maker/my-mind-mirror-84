import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
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
      
      return `- "${obj.title}" [${obj.category}]: ${progressInfo}`;
    }).join('\n');

    const systemPrompt = `Sei Aria, l'assistente AI di supporto emotivo. In questo momento stai aiutando l'utente ad aggiornare i progressi dei suoi obiettivi.

OBIETTIVI ATTIVI DELL'UTENTE:
${objectivesContext || 'Nessun obiettivo attivo'}

IL TUO COMPITO:
1. Ascolta quando l'utente descrive i suoi progressi
2. Identifica a quale obiettivo si riferisce
3. Estrai valori numerici specifici quando menzionati
4. Calcola la nuova percentuale di progresso
5. Celebra i progressi e motiva l'utente

REGOLE PER L'ESTRAZIONE:
- Se l'utente dice "ho perso 2kg" e l'obiettivo è "perdere peso", aggiorna current_value
- Se l'utente dice "ho risparmiato 100€", aggiungi al valore attuale
- Per obiettivi qualitativi (senza target numerico), stima la % basandoti su:
  - Milestone raggiunte
  - Impegno dimostrato
  - Progressi descritti
- NON inventare numeri: se l'utente non è specifico, chiedi dettagli

FORMATO RISPOSTA JSON (alla fine del tuo messaggio):
Se rilevi un aggiornamento, aggiungi alla fine:
\`\`\`json
{
  "updates": [
    {
      "id": "objective_id",
      "current_value": numero_se_applicabile,
      "ai_progress_estimate": percentuale_0_100,
      "ai_feedback": "breve commento sul progresso",
      "new_milestone": "descrizione milestone se raggiunta"
    }
  ]
}
\`\`\`

Se non ci sono aggiornamenti da fare, non includere il blocco JSON.

TONO:
- Entusiasta ma genuino
- Celebra ogni progresso, anche piccolo
- Fai domande specifiche per capire meglio
- Max 2-3 frasi per risposta`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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