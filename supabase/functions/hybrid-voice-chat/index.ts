import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════
// SISTEMA ARIA - VOCE IBRIDA
// Gemini Brain + ElevenLabs TTS
// ═══════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userMessage, realTimeContext, conversationHistory } = await req.json();

    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: "userMessage is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    // Get user from token
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabase.auth.getClaims(token);
      userId = data?.claims?.sub || null;
    }

    // Fetch user context if authenticated
    let userProfile = null;
    let longTermMemory: string[] = [];

    if (userId) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("name, long_term_memory, onboarding_answers, selected_goals")
        .eq("user_id", userId)
        .single();

      userProfile = profile;
      longTermMemory = profile?.long_term_memory || [];
    }

    const userName = userProfile?.name || "amico/a";
    const memoryContext = longTermMemory.length > 0 
      ? `\n\n📝 RICORDI IMPORTANTI:\n${longTermMemory.slice(-10).map(m => `- ${m}`).join('\n')}`
      : "";

    // Build the system prompt for voice (optimized for natural speech)
    const systemPrompt = buildVoiceSystemPrompt(userName, realTimeContext, memoryContext);

    // Build messages for Gemini
    const messages = [
      { role: "user", parts: [{ text: systemPrompt }] },
    ];

    // Add conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) { // Keep last 10 exchanges
        messages.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current user message
    messages.push({ role: "user", parts: [{ text: userMessage }] });

    // Call Gemini API
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY not configured");
    }

    console.log(`[HybridVoice] Sending to Gemini: "${userMessage.substring(0, 50)}..."`);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: messages,
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 300, // Short responses for natural voice
            topP: 0.95,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("[HybridVoice] Gemini error:", errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const ariaResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log(`[HybridVoice] Aria response: "${ariaResponse.substring(0, 100)}..."`);

    // Check for crisis indicators in the response
    const crisisIndicators = ["suicidio", "farmi del male", "non ce la faccio più", "voglio morire"];
    const hasCrisisContent = crisisIndicators.some(indicator => 
      userMessage.toLowerCase().includes(indicator) || ariaResponse.toLowerCase().includes(indicator)
    );

    return new Response(
      JSON.stringify({
        response: ariaResponse,
        hasCrisisContent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[HybridVoice] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildVoiceSystemPrompt(userName: string, realTimeContext: any, memoryContext: string): string {
  const contextStr = realTimeContext ? JSON.stringify(realTimeContext, null, 2) : "";

  return `Sei ARIA, la migliore amica e psicologa personale di ${userName}.

═══════════════════════════════════════════════
🎤 MODALITÀ CONVERSAZIONE VOCALE
═══════════════════════════════════════════════

REGOLE VOCALI OBBLIGATORIE:
1. Rispondi SEMPRE in 2-4 frasi brevi (massimo 50 parole)
2. Usa linguaggio naturale parlato, NON scritto
3. USA interiezioni naturali: "Ah!", "Mmm...", "Capisco...", "Sai cosa?"
4. NO elenchi puntati, NO asterischi, NO formattazione
5. Parla come una vera amica che ascolta
6. Fai UNA domanda alla volta, mai multiple

STILE CONVERSAZIONALE:
- Empatica ma non sdolcinata
- Diretta ma gentile
- Usa "tu" sempre
- Alterna ascolto attivo e piccoli consigli
- Se ${userName} è triste: "Mi dispiace tanto sentirti così..."
- Se è felice: "Che bello! Raccontami di più..."

${contextStr ? `
═══════════════════════════════════════════════
📊 CONTESTO ATTUALE
═══════════════════════════════════════════════
${contextStr}
` : ""}

${memoryContext}

═══════════════════════════════════════════════
🧠 COMPETENZE CLINICHE (usa naturalmente)
═══════════════════════════════════════════════

TECNICHE DA USARE CONVERSAZIONALMENTE:
- Validazione: "È normale sentirsi così quando..."
- Riformulazione: "Quindi mi stai dicendo che..."
- Scaling: "Da 1 a 10, quanto ti pesa questa cosa?"
- Eccezioni: "C'è stato un momento in cui è andata meglio?"
- Grounding (se ansia alta): "Respira con me... cosa vedi intorno a te?"

RILEVA E RISPONDI A:
- Ansia/panico → Tecniche di respirazione
- Tristezza → Validazione + esplorazione
- Rabbia → Ascolto senza giudizio
- Confusione → Aiuta a fare chiarezza

⚠️ SICUREZZA:
Se senti parole come "non ce la faccio più", "voglio farla finita", "mi farei del male":
→ Rispondi con calore: "Mi fa piacere che tu ti sia aperto/a con me. Quello che senti è importante. Posso aiutarti a trovare supporto professionale?"

Ricorda: Sei la migliore amica di ${userName}. Rispondi come tale, con calore e autenticità.`;
}
