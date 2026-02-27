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

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    // Build detailed objectives context with clear IDs
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
        progressInfo = `NUMERICO - Attuale: ${current}${obj.unit ? ' ' + obj.unit : ''} / Target: ${target}${obj.unit ? ' ' + obj.unit : ''} (${Math.round(progress)}%)`;
      } else {
        // Qualitative/milestone objective
        progressInfo = `QUALITATIVO - Progresso AI stimato: ${obj.ai_progress_estimate ?? 0}%`;
      }
      
      return `📌 OBIETTIVO #${activeObjectives.indexOf(obj) + 1}:
   ID: ${obj.id}
   Titolo: "${obj.title}"
   Categoria: ${obj.category}
   Tipo: ${hasNumericTarget ? 'Numerico' : 'Qualitativo/Milestone'}
   ${progressInfo}`;
    }).join('\n\n');

    const systemPrompt = `Sei Aria, l'assistente AI di supporto emotivo. Stai aiutando l'utente ad aggiornare i progressi dei suoi obiettivi.

═══════════════════════════════════════════════
📋 OBIETTIVI ATTIVI DELL'UTENTE:
═══════════════════════════════════════════════
${objectivesContext || 'Nessun obiettivo attivo'}

═══════════════════════════════════════════════
🎯 IL TUO COMPITO (CRUCIALE!):
═══════════════════════════════════════════════

1. **ASCOLTA** i progressi raccontati dall'utente
2. **IDENTIFICA** quale obiettivo sta aggiornando (USA L'ID ESATTO dalla lista sopra!)
3. **ESTRAI** dati di progresso:
   - Per obiettivi NUMERICI: estrai il valore numerico esatto
   - Per obiettivi QUALITATIVI: stima la percentuale di avanzamento (0-100)
4. **GENERA SEMPRE** un feedback ai_feedback DETTAGLIATO

═══════════════════════════════════════════════
📊 REGOLE PER OBIETTIVI NUMERICI:
═══════════════════════════════════════════════
- "Ho perso 2kg" con peso attuale 85kg → current_value = 83
- "Ora peso 83kg" → current_value = 83  
- "Ho risparmiato 100€" con attuale 200€ → current_value = 300
- "Sono a 5 sigarette al giorno" → current_value = 5

═══════════════════════════════════════════════
🌟 REGOLE PER OBIETTIVI QUALITATIVI/MILESTONE:
═══════════════════════════════════════════════
Obiettivi come "Sviluppare un'app", "Costruire personal brand", "Migliorare relazione" NON hanno valori numerici.
DEVI stimare il progresso in percentuale basandoti su AZIONI CONCRETE:

**SCALA DI PROGRESSO:**
- 0-15%: Solo idea, nessuna azione
- 15-30%: Prime ricerche, pianificazione iniziale
- 30-50%: Lavoro attivo (sviluppo iniziato, contenuti creati, passi concreti)
- 50-70%: Risultati tangibili (prima versione, feedback ricevuti, progressi visibili)
- 70-85%: Quasi completo (rifinitura, testing, ultimi dettagli)
- 85-100%: Obiettivo raggiunto o quasi

**ESEMPI DI RILEVAMENTO:**
- "Sto sviluppando l'app, ho finito il design" → ai_progress_estimate: 35-45%
- "Ho parlato dell'app, ci sto lavorando" → ai_progress_estimate: incremento di 5-10%
- "Ho fatto un passo avanti col progetto" → ai_progress_estimate: incremento di 10%
- "Ho completato una milestone importante" → new_milestone: "descrizione"

═══════════════════════════════════════════════
✍️ ai_feedback (OBBLIGATORIO per ogni update!):
═══════════════════════════════════════════════
- Frase che descrive LO STATO ATTUALE con dettagli specifici
- Lunghezza: 60-120 caratteri
- SENZA emoji
- Esempi:
  - "Sei a 73kg, hai già perso 2kg dei 5kg totali verso l'obiettivo di 68kg"
  - "Hai risparmiato 350€ su 1000€, ottimo ritmo al 35%"
  - "App in sviluppo al 40%, buon progresso sul design completato"
  - "Progetto avanza bene, sei circa a metà strada con milestone chiave raggiunte"

═══════════════════════════════════════════════
📤 FORMATO JSON (INSERISCI SEMPRE ALLA FINE):
═══════════════════════════════════════════════
\`\`\`json
{
  "updates": [
    {
      "id": "ID_OBIETTIVO_DALLA_LISTA_SOPRA",
      "current_value": <numero solo per obiettivi NUMERICI>,
      "ai_progress_estimate": <percentuale 0-100 per obiettivi QUALITATIVI>,
      "ai_feedback": "frase DETTAGLIATA OBBLIGATORIA",
      "new_milestone": "milestone se raggiunta azione concreta"
    }
  ]
}
\`\`\`

⚠️ REGOLE CRITICHE:
- USA SEMPRE l'ID esatto dall'elenco sopra (formato UUID)
- NON inventare progressi se l'utente non menziona l'obiettivo
- Se l'utente parla di un obiettivo in modo vago, chiedi dettagli
- Se l'utente menziona un'azione correlata a un obiettivo, aggiorna anche se non esplicito

TONO: Entusiasta, genuino, supportivo. Max 2-3 frasi di risposta conversazionale.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : m.role,
          parts: [{ text: m.content }]
        })),
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    let aiMessage = data.candidates[0].content.parts[0].text;
    
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