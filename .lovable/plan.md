
# Piano: Architettura Ibrida Aria con ElevenLabs

## Problema Identificato

Il modello Gemini Native Audio (`gemini-2.5-flash-preview-native-audio-dialog`) non è più disponibile. L'API WebSocket per audio bidirezionale richiede accesso specifico che non è garantito dal Lovable AI Gateway.

## Soluzione: Architettura Ibrida

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ARCHITETTURA IBRIDA ARIA                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   UTENTE PARLA                                                      │
│        ↓                                                            │
│   [Web Speech API - STT]                                            │
│        ↓                                                            │
│   Testo trascritto                                                  │
│        ↓                                                            │
│   [Edge Function: aria-voice-hybrid]                                │
│        ↓                                                            │
│   [Lovable AI Gateway - Gemini 2.5 Flash]                           │
│   (TUTTE le 2500+ righe di prompt clinico)                          │
│        ↓                                                            │
│   Risposta testuale di Aria                                         │
│        ↓                                                            │
│   [Edge Function: elevenlabs-tts]                                   │
│        ↓                                                            │
│   [ElevenLabs TTS - Voce "Carla"]                                   │
│        ↓                                                            │
│   Audio riprodotto                                                  │
│        ↓                                                            │
│   UTENTE ASCOLTA                                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Vantaggi

| Aspetto | Gemini Native (non funziona) | Ibrido ElevenLabs |
|---------|------------------------------|-------------------|
| Disponibilità | Modello ritirato | Sempre disponibile |
| Prompt completo | 578 righe (condensato) | 2500+ righe (completo) |
| Voce italiana | Aoede (generica) | Carla (italiana naturale) |
| Dipendenza | Google API Key specifica | Lovable AI Gateway + ElevenLabs |

## File da Creare/Modificare

### 1. Nuova Edge Function: `supabase/functions/aria-voice-hybrid/index.ts`
Utilizzerà:
- Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`)
- Sistema di prompt COMPLETO da `ai-chat/index.ts` (2500+ righe)
- Caricamento profilo utente, memoria, contesto real-time

### 2. Nuova Edge Function: `supabase/functions/elevenlabs-tts/index.ts`
Converte testo in audio usando:
- ElevenLabs API (`https://api.elevenlabs.io/v1/text-to-speech`)
- Voce "Carla" (Voice ID: `litDcG1avVppv4R90BLu`)

### 3. Nuovo Hook: `src/hooks/useHybridVoice.tsx`
Orchestrazione del flusso:
- Web Speech API per Speech-to-Text (nativo browser)
- Chiamata a `aria-voice-hybrid` per risposta AI
- Chiamata a `elevenlabs-tts` per sintesi vocale
- Gestione stati (isListening, isSpeaking, etc.)

### 4. Aggiornamento: `src/components/voice/ZenVoiceModal.tsx`
- Cambio import da `useGeminiVoice` a `useHybridVoice`
- Nessun cambio UI (già perfetta)

### 5. Aggiornamento: `supabase/config.toml`
- Aggiungere configurazione per le nuove edge functions

## Dettaglio Tecnico

### Sistema di Prompt Aria (Preservato al 100%)

La nuova edge function `aria-voice-hybrid` conterrà TUTTO il sistema di prompt esistente:

- EMOTIONAL_RUBRIC (20 emozioni)
- ADVANCED_CLINICAL_TECHNIQUES (MI, DBT, SFBT)
- CLINICAL_KNOWLEDGE_BASE (Enciclopedia condizioni)
- PSYCHOEDUCATION_LIBRARY (Distorsioni cognitive)
- INTERVENTION_PROTOCOLS (Mindfulness, Anger, Grief)
- LIFE_AREAS_INVESTIGATION (9 aree della vita)
- YOUNG_USER_PROTOCOL (per utenti <18)
- BEST_FRIEND_PERSONA (Identità Aria)
- RESPONSE_RULES (Regole d'oro)
- CRISIS_PROTOCOL (Sicurezza)

### Web Speech API (Speech-to-Text)

```typescript
const recognition = new webkitSpeechRecognition();
recognition.lang = 'it-IT';
recognition.continuous = true;
recognition.interimResults = false;
```

Vantaggi:
- Nativo nel browser (Chrome, Edge, Safari)
- Nessuna API key richiesta
- Bassa latenza

### ElevenLabs TTS

```typescript
// Voce Carla - italiana, femminile, naturale
const VOICE_ID = "litDcG1avVppv4R90BLu";

const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
  {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: ariaResponse,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    }),
  }
);
```

## Flusso Conversazione

1. Utente preme "Inizia" → attiva Web Speech API
2. Utente parla → testo trascritto in italiano
3. Testo inviato a `aria-voice-hybrid`
4. Edge function:
   - Carica profilo utente, memoria, contesto
   - Costruisce prompt completo (2500+ righe)
   - Chiama Lovable AI Gateway (Gemini 2.5 Flash)
   - Restituisce risposta testuale
5. Risposta inviata a `elevenlabs-tts`
6. Audio MP3 riprodotto nel browser
7. Ciclo riparte (utente può parlare di nuovo)

## Gestione Errori

- Timeout Web Speech API → riavvio automatico riconoscimento
- Errore Lovable AI → messaggio "Riprova tra poco"
- Errore ElevenLabs → fallback a messaggio testuale
- Limite rate ElevenLabs → toast informativo

## Stima Tempi

| Task | Complessità |
|------|-------------|
| Edge function aria-voice-hybrid | Alta (copia prompt 2500 righe) |
| Edge function elevenlabs-tts | Bassa |
| Hook useHybridVoice | Media |
| Aggiornamento ZenVoiceModal | Minima |
| Test e debug | Media |

## Risultato Atteso

- **Aria funzionante** con voce italiana naturale
- **Intelligenza clinica completa** (tutte le 2500+ righe)
- **Nessuna dipendenza** da modelli Google specifici
- **Voce "Carla"** professionale e calda
