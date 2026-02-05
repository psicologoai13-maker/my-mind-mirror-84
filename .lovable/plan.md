
# Piano di Ripristino: Aria Voice con Gemini 2.5 Flash Native Audio

## Problema Identificato

L'architettura di base è corretta, ma:
1. Il modello `gemini-2.0-flash-live-001` potrebbe essere deprecato o non supportare più audio nativo
2. I file ElevenLabs rimasti creano confusione ma NON stanno rompendo il flusso (la pagina Aria.tsx usa `ZenVoiceModal` → `useGeminiVoice` → `gemini-voice`)

## Soluzione in 3 Fasi

### Fase 1: Aggiornamento Edge Function `gemini-voice`

**File:** `supabase/functions/gemini-voice/index.ts`

Modifiche:
- Cambiare il modello da `gemini-2.0-flash-live-001` a `gemini-2.5-flash-native-audio-preview-12-2025`
- Verificare il formato del setup message (già corretto con `snake_case`)

```text
Riga 14: const MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025";
```

### Fase 2: Verifica Hook Frontend `useGeminiVoice`

**File:** `src/hooks/useGeminiVoice.tsx`

L'hook è già corretto:
- Gestisce WebSocket verso l'edge function
- Audio PCM 16-bit 16kHz in ingresso
- Audio PCM 24kHz in uscita
- Salvataggio sessione con `process-session`

Nessuna modifica necessaria, ma verificheremo:
- Il parsing dei messaggi `setup_complete`
- La gestione degli errori WebSocket

### Fase 3: Pulizia Residui ElevenLabs (Opzionale)

I seguenti file NON sono usati dal flusso principale ma possono essere rimossi per chiarezza:

```text
Da rimuovere (opzionale):
- src/hooks/useElevenLabsAgent.tsx
- src/hooks/useHybridVoice.tsx
- supabase/functions/elevenlabs-context/
- supabase/functions/elevenlabs-conversation-token/
```

**Nota:** Se preferisci tenerli per test futuri, non influenzano il funzionamento attuale.

---

## Dettaglio Tecnico

### Flusso Architetturale (già funzionante)

```text
[Aria.tsx]
    |
    v
[ZenVoiceModal] --> useGeminiVoice hook
    |
    v
[WebSocket] --> Edge Function gemini-voice
    |
    v
[Gemini Live API] wss://generativelanguage.googleapis.com/...
```

### Configurazione Audio

- **Input:** PCM 16-bit, 16kHz, mono (dal microfono)
- **Output:** PCM 24kHz (da Gemini)
- **Voce:** "Aoede" (femminile, calda)

### System Prompt

Il prompt è già completo con:
- Tutti i 66 metriche cliniche (8 domini)
- Enciclopedia clinica
- Libreria psicoeducativa
- Protocolli di intervento
- Memoria lungo termine
- Obiettivi e interessi utente
- Contesto tempo reale (meteo, news, posizione)

---

## Azioni da Eseguire

1. **Aggiornare modello** in `gemini-voice/index.ts`:
   - `gemini-2.0-flash-live-001` → `gemini-2.5-flash-native-audio-preview-12-2025`

2. **Deploy** della edge function

3. **Test** della sessione vocale

4. **(Opzionale)** Pulizia file ElevenLabs

---

## Test di Verifica

Dopo l'implementazione:
1. Aprire la pagina `/aria`
2. Toccare il pulsante vocale
3. Verificare che il WebSocket si connetta (no più "Connessione...")
4. Verificare che Aria risponda a voce in italiano
5. Verificare che la sessione venga salvata nel database
