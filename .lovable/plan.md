
# Piano: Aria Live con ElevenLabs Conversational AI

## Problema Identificato

Il modello Gemini Native Audio è stato ritirato. L'utente vuole una **conversazione live bidirezionale** (non semplice TTS), preservando l'intelligenza clinica di Aria (2500+ righe di prompt).

## Soluzione: ElevenLabs Conversational AI Agent + Backend Ibrido

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ARIA LIVE - ARCHITETTURA                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   UTENTE PARLA (audio live)                                         │
│        ↓                                                            │
│   [ElevenLabs Agent - WebRTC]                                       │
│   (bassa latenza, voce italiana "Carla")                            │
│        ↓                                                            │
│   Trascrizione automatica                                           │
│        ↓                                                            │
│   [Client Tool: "aria_respond"]                                     │
│        ↓                                                            │
│   [Edge Function: aria-agent-backend]                               │
│        ↓                                                            │
│   [Lovable AI Gateway - Gemini 2.5 Flash]                           │
│   (TUTTE le 2500+ righe di prompt clinico)                          │
│        ↓                                                            │
│   Risposta testuale di Aria                                         │
│        ↓                                                            │
│   [ElevenLabs Agent - TTS Live]                                     │
│        ↓                                                            │
│   UTENTE ASCOLTA (audio live)                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Vantaggi

| Aspetto | Gemini Native (ritirato) | ElevenLabs Agent |
|---------|--------------------------|------------------|
| Disponibilità | Modello non più disponibile | Sempre disponibile |
| Latenza | Bassa | Ultra-bassa (WebRTC) |
| Voce italiana | Aoede (generica) | Carla (italiana naturale) |
| Intelligenza | 578 righe (condensato) | 2500+ righe via backend |
| Interruzioni | Supportate | Supportate nativamente |

## File da Creare/Modificare

### 1. Nuova Edge Function: `supabase/functions/elevenlabs-conversation-token/index.ts`
Genera token di autenticazione per l'agent ElevenLabs:
- Chiamata sicura all'API ElevenLabs
- Restituisce token monouso per la sessione

### 2. Nuova Edge Function: `supabase/functions/aria-agent-backend/index.ts`
Backend che l'agent ElevenLabs chiama come "tool":
- Riceve la trascrizione dell'utente
- Carica profilo utente, memoria, contesto real-time
- Costruisce prompt completo (2500+ righe)
- Chiama Lovable AI Gateway (Gemini 2.5 Flash)
- Restituisce risposta testuale

### 3. Nuovo Hook: `src/hooks/useElevenLabsAgent.tsx`
Usa `@elevenlabs/react` SDK:
- `useConversation` hook per WebRTC
- Gestione stati (isConnected, isSpeaking)
- Client tools per chiamare backend
- Gestione transcript per salvataggio sessione

### 4. Aggiornamento: `src/components/voice/ZenVoiceModal.tsx`
- Import da `useElevenLabsAgent` invece di `useGeminiVoice`
- UI invariata (già perfetta)

### 5. Configurazione ElevenLabs Dashboard
Necessaria creazione agent con:
- Voce "Carla" (italiano)
- Tool "aria_respond" configurato
- Webhook al nostro backend

### 6. Aggiornamento: `supabase/config.toml`
Aggiungere configurazioni per le nuove edge functions

## Dettaglio Tecnico

### ElevenLabs Conversational AI

```typescript
import { useConversation } from "@elevenlabs/react";

const conversation = useConversation({
  onConnect: () => console.log("Connesso all'agent"),
  onDisconnect: () => console.log("Disconnesso"),
  onMessage: (message) => {
    // Gestione transcript
    if (message.type === "user_transcript") {
      transcriptRef.current.push({
        role: "user",
        text: message.user_transcription_event.user_transcript
      });
    }
  },
  clientTools: {
    aria_respond: async (params: { user_message: string }) => {
      // Chiama il nostro backend con Gemini
      const { data } = await supabase.functions.invoke("aria-agent-backend", {
        body: { message: params.user_message, user_id, context }
      });
      return data.response;
    }
  }
});

// Avvio sessione
const startConversation = async () => {
  await navigator.mediaDevices.getUserMedia({ audio: true });
  const { data } = await supabase.functions.invoke("elevenlabs-conversation-token");
  await conversation.startSession({
    conversationToken: data.token,
    connectionType: "webrtc"
  });
};
```

### Backend Aria (Preserva 100% Intelligenza)

L'edge function `aria-agent-backend` conterrà TUTTO il sistema di prompt esistente:
- EMOTIONAL_RUBRIC (20 emozioni)
- ADVANCED_CLINICAL_TECHNIQUES (MI, DBT, SFBT)
- CLINICAL_KNOWLEDGE_BASE (Enciclopedia condizioni)
- PSYCHOEDUCATION_LIBRARY (Distorsioni cognitive)
- INTERVENTION_PROTOCOLS (Mindfulness, Anger, Grief)
- LIFE_AREAS_INVESTIGATION (9 aree della vita)
- YOUNG_USER_PROTOCOL (per utenti minori di 18 anni)
- BEST_FRIEND_PERSONA (Identità Aria)
- RESPONSE_RULES (Regole d'oro)
- CRISIS_PROTOCOL (Sicurezza)

### Flusso Conversazione Live

1. Utente preme "Inizia" - si connette all'agent ElevenLabs via WebRTC
2. Utente parla - audio inviato in tempo reale
3. ElevenLabs trascrive e attiva il tool "aria_respond"
4. Tool chiama `aria-agent-backend`:
   - Carica profilo, memoria, contesto
   - Costruisce prompt completo (2500+ righe)
   - Chiama Lovable AI Gateway
5. Risposta restituita all'agent
6. Agent sintetizza con voce "Carla" in tempo reale
7. Utente può interrompere in qualsiasi momento
8. Ciclo continua naturalmente

## Requisiti di Setup

### ElevenLabs Dashboard (una tantum)
1. Creare nuovo Agent conversazionale
2. Selezionare voce "Carla" (italiano)
3. Configurare Tool "aria_respond":
   - Nome: aria_respond
   - Descrizione: "Genera risposta di Aria"
   - Parametri: user_message (string)
4. Impostare webhook URL al nostro backend
5. Abilitare trascrizioni utente

### Secret già configurato
- `ELEVENLABS_API_KEY` - Già presente nel progetto

## Gestione Errori

- Errore connessione WebRTC: riprova automatico con backoff
- Errore backend Gemini: messaggio fallback dall'agent
- Rate limit ElevenLabs: toast informativo
- Disconnessione inattesa: salvataggio transcript parziale

## Dipendenze da Installare

```bash
npm install @elevenlabs/react
```

## Stima Tempi

| Task | Complessità |
|------|-------------|
| Setup agent ElevenLabs Dashboard | Bassa |
| Edge function token | Bassa |
| Edge function backend (copia prompt) | Alta |
| Hook useElevenLabsAgent | Media |
| Aggiornamento ZenVoiceModal | Minima |
| Test e debug | Media |

## Risultato Atteso

- Conversazione live bidirezionale fluida
- Intelligenza clinica completa (2500+ righe)
- Voce "Carla" italiana naturale
- Supporto interruzioni native
- Latenza ultra-bassa (WebRTC)
- Nessuna dipendenza da modelli Google specifici
