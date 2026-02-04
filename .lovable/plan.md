

# Piano: Conversazione Vocale Real-Time con ElevenLabs STT

## Problema Identificato

L'attuale sistema usa la **Web Speech API del browser** per il riconoscimento vocale, che presenta:
- Compatibilita iOS inesistente (Safari non supporta `continuous` mode)
- Accuratezza pessima su desktop (confidence scores del 1-10%)
- Nessun VAD nativo (richiede hack con timeout)

## Soluzione Proposta: ElevenLabs Realtime STT

Sostituire la Web Speech API con **ElevenLabs Scribe v2 Realtime** - un servizio professionale di trascrizione che offre:

- Cross-platform (funziona su iOS, Android, desktop via WebSocket)
- Alta accuratezza (modello `scribe_v2_realtime`)
- VAD integrato (rileva automaticamente fine frase)
- Supporto nativo italiano

### Nuova Architettura

```text
+------------------+     +------------------+     +------------------+
|   UTENTE PARLA   | --> | ElevenLabs STT   | --> |   GEMINI BRAIN   |
|   (Microfono)    |     | (scribe_v2)      |     | (Intelligenza    |
|                  |     | Alta accuratezza |     |  clinica Aria)   |
+------------------+     +------------------+     +------------------+
                                                           |
                                                           v
+------------------+     +------------------+
|   UTENTE SENTE   | <-- | ElevenLabs TTS   |
|   (Speaker)      |     | (Voce Carla)     |
+------------------+     +------------------+
```

## Dettagli Implementazione

### 1. Nuova Edge Function: `elevenlabs-scribe-token`

Genera token monouso per la trascrizione realtime (scadenza 15 minuti).

Endpoint ElevenLabs: `POST /v1/single-use-token/realtime_scribe`

### 2. Riscrittura Hook: `useHybridVoice.tsx`

Sostituisce Web Speech API con il hook `useScribe` di `@elevenlabs/react`:

**Prima (Web Speech API):**
- `window.SpeechRecognition` - non funziona su iOS
- Hack con timeout per rilevare silenzio
- Accuratezza bassa

**Dopo (ElevenLabs Scribe):**
- `useScribe({ modelId: 'scribe_v2_realtime', commitStrategy: 'vad' })`
- VAD automatico
- Alta accuratezza multilingue

### 3. Flusso Conversazione Aggiornato

1. Utente avvia sessione
2. Client richiede token STT da edge function
3. `useScribe` si connette via WebSocket
4. Utente parla - ElevenLabs trascrive in tempo reale
5. VAD rileva fine frase - callback `onCommittedTranscript`
6. Testo inviato a Gemini (`hybrid-voice-chat`) per risposta Aria
7. Risposta convertita in audio con ElevenLabs TTS (Carla)
8. Audio riprodotto all'utente
9. Ciclo si ripete

## Modifiche File

### Nuovi File

| File | Scopo |
|------|-------|
| `supabase/functions/elevenlabs-scribe-token/index.ts` | Genera token STT monouso |

### File Modificati

| File | Modifiche |
|------|-----------|
| `src/hooks/useHybridVoice.tsx` | Sostituisce Web Speech API con `useScribe` di ElevenLabs |

## Vantaggi

| Aspetto | Prima | Dopo |
|---------|-------|------|
| **iOS** | Non funziona | Funziona |
| **Accuratezza** | 1-10% confidence | 95%+ accuracy |
| **VAD** | Hack con timeout | Nativo |
| **Latenza** | Alta (attesa timeout) | Bassa (VAD immediato) |
| **Intelligenza Aria** | Preservata | Preservata |
| **Voce Carla** | Preservata | Preservata |

## Costi

ElevenLabs STT usa crediti dal piano Starter gia attivo. Il modello `scribe_v2_realtime` ha costi ragionevoli per uso conversazionale.

## Dipendenze

Il pacchetto `@elevenlabs/react` e gia installato nel progetto (versione ^0.14.0).

## Note Tecniche

- Il secret `ELEVENLABS_API_KEY` e gia configurato
- Nessuna modifica al database richiesta
- Il cervello Gemini con tutti i protocolli clinici rimane intatto
- La voce Carla rimane configurata nel TTS

