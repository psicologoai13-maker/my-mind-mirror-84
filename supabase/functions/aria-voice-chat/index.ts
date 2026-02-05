import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

// ═══════════════════════════════════════════════
// 🧠 ARIA - CLINICAL PSYCHOLOGY SYSTEM PROMPT
// ═══════════════════════════════════════════════

const ARIA_SYSTEM_PROMPT = `Sei Aria, una psicologa clinica empatica e competente. Il tuo ruolo è supportare l'utente nel suo percorso di benessere psicologico.

## PERSONALITÀ
- Empatica e accogliente
- Professionale ma calda
- Ascoltatrice attenta
- Mai giudicante

## APPROCCIO CLINICO
Integri diversi approcci terapeutici:
- CBT (Terapia Cognitivo-Comportamentale)
- ACT (Acceptance and Commitment Therapy)
- Mindfulness
- Motivational Interviewing

## LINEE GUIDA
1. Rispondi in modo conciso e naturale (2-3 frasi max per turno vocale)
2. Fai domande aperte per esplorare i vissuti
3. Valida sempre le emozioni dell'utente
4. Offri riflessioni e spunti, mai soluzioni preconfezionate
5. Se emergono segnali di crisi, suggerisci risorse appropriate

## SICUREZZA
Se l'utente esprime pensieri di autolesionismo o suicidio:
- Mostra comprensione senza minimizzare
- Suggerisci di contattare il Telefono Amico (02 2327 2327) o il 112
- Non terminare la conversazione bruscamente

## STILE VOCALE
Parla in italiano naturale, come in una vera seduta. Usa un tono caldo e rassicurante.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory, userId } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('[aria-voice-chat] Processing message:', message.substring(0, 50));

    // Build messages array
    const messages = [
      { role: 'system', content: ARIA_SYSTEM_PROMPT }
    ];

    // Add conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const entry of conversationHistory.slice(-10)) {
        messages.push({
          role: entry.role === 'user' ? 'user' : 'assistant',
          content: entry.text || entry.content
        });
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        max_tokens: 300, // Keep responses concise for voice
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[aria-voice-chat] Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          text: 'Mi dispiace, sono un po\' sovraccarica in questo momento. Riprova tra qualche secondo.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required',
          text: 'Il servizio AI richiede crediti aggiuntivi.'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantText = data.choices?.[0]?.message?.content || 
      'Mi dispiace, non sono riuscita a elaborare una risposta. Puoi ripetere?';

    console.log('[aria-voice-chat] Response:', assistantText.substring(0, 50));

    // Generate audio with ElevenLabs if available
    let audioBase64: string | null = null;
    let audioMimeType = 'audio/mpeg';
    
    if (ELEVENLABS_API_KEY) {
      try {
        console.log('[aria-voice-chat] Generating audio with ElevenLabs...');
        
        const ttsResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL', {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: assistantText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.3,
              use_speaker_boost: true
            }
          }),
        });

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();
          const uint8Array = new Uint8Array(audioBuffer);
          
          // Convert to base64
          let binary = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          audioBase64 = btoa(binary);
          
          console.log('[aria-voice-chat] Audio generated successfully');
        } else {
          console.error('[aria-voice-chat] ElevenLabs error:', ttsResponse.status);
        }
      } catch (ttsError) {
        console.error('[aria-voice-chat] TTS error:', ttsError);
      }
    }

    return new Response(JSON.stringify({ 
      text: assistantText,
      audio: audioBase64,
      mimeType: audioMimeType,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[aria-voice-chat] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      text: 'Si è verificato un errore. Riprova tra poco.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
