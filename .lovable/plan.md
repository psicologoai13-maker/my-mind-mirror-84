

# Analisi Alternative e Piano Implementazione Voce Aria

## Ricerca: Panorama Voice AI nel 2026

Ho analizzato le principali piattaforme disponibili per conversazioni vocali in tempo reale:

### 1. ElevenLabs Conversational AI (gia integrato)
- **Latenza:** ~800ms-1.2s (WebRTC)
- **Qualita voce:** Eccellente, specialmente in italiano con voce custom gia configurata
- **Punti di forza:** Overrides completi del system prompt, first message, lingua e voce. React SDK (`useConversation`) gia installato. Supporta Dynamic Variables per contesto strutturato
- **Limite:** Il system prompt puo essere lungo ma va ottimizzato (ElevenLabs consiglia prompt concisi per latenza migliore)
- **Costo:** Piano gia attivo con API key configurata

### 2. OpenAI Realtime API (GPT-4o / gpt-realtime-mini)
- **Latenza:** ~500-800ms (nativa speech-to-speech)
- **Qualita voce:** Buona ma limitata a voci preset OpenAI (nessuna voce italiana custom)
- **Punti di forza:** Speech-to-speech nativo (no pipeline separata), reasoning integrato nel modello
- **Limiti:** 
  - Nessun supporto per voci custom/clonate
  - Le voci italiane suonano con accento inglese
  - Costo molto alto (~$0.06/min input + $0.24/min output per il modello standard)
  - Richiede WebSocket custom, nessun React SDK pronto
  - Richiederebbe OPENAI_API_KEY separata o passare tramite Lovable Gateway (che non supporta WebSocket realtime)

### 3. Google Gemini Live API
- **Latenza:** 4-11 secondi riportati dalla community (molto variabile)
- **Qualita voce:** Media, voci sintetiche
- **Limiti:** Latenza troppo alta per conversazione naturale, API ancora instabile

### 4. Cartesia AI (Sonic-3)
- **Latenza:** ~100-200ms (solo TTS, non end-to-end)
- **Qualita voce:** Eccellente
- **Limiti:** Solo TTS, non e una piattaforma conversazionale completa. Bisognerebbe costruire l'intera pipeline STT + LLM + TTS

### 5. Smallest.ai (Lightning)
- **Latenza:** Molto bassa (TTS)
- **Limiti:** Come Cartesia, solo TTS. Non una soluzione conversazionale end-to-end

## Verdetto

**ElevenLabs resta la scelta migliore** per questo progetto perche:
1. E gia integrato (SDK, API key, voce italiana custom, agent ID)
2. Gestisce l'intera pipeline STT + LLM + TTS in un unico flusso WebRTC
3. Supporta overrides completi del system prompt (il pezzo mancante)
4. La voce italiana custom e gia configurata e di alta qualita
5. Nessun costo aggiuntivo di setup

OpenAI Realtime sarebbe l'unica vera alternativa ma manca di voci italiane custom ed e significativamente piu costoso.

---

## Cosa serve su ElevenLabs Dashboard

Si, serve una modifica nel dashboard ElevenLabs (non nel codice):

1. Andare su **elevenlabs.io/app/agents** e selezionare l'agente
2. Tab **Security** -> abilitare gli override per:
   - "System prompt" 
   - "First message"
   - "Language"
3. Nient'altro. La voce, il modello LLM e le altre impostazioni restano quelle del dashboard

Senza abilitare questi override, il codice passera il prompt completo di Aria ma ElevenLabs lo ignorera silenziosamente.

---

## Preservazione del Flusso Attuale

Il flusso attuale (useHybridVoice + aria-voice-chat) **non verra toccato**:

| File | Azione |
|------|--------|
| `src/hooks/useHybridVoice.tsx` | **NON MODIFICATO** - resta intatto |
| `supabase/functions/aria-voice-chat/index.ts` | **NON MODIFICATO** - resta intatto |
| `src/hooks/useElevenLabsAgent.tsx` | **MODIFICATO** - aggiunta overrides e WebRTC |
| `supabase/functions/elevenlabs-context/index.ts` | **MODIFICATO** - costruisce il prompt completo di Aria |
| `supabase/functions/elevenlabs-conversation-token/index.ts` | **MODIFICATO** - aggiunta token WebRTC |
| `src/components/voice/ZenVoiceModal.tsx` | **MODIFICATO** - switch a useElevenLabsAgent |

Per tornare al flusso precedente bastera cambiare una sola riga in ZenVoiceModal: da `useElevenLabsAgent()` a `useHybridVoice()`.

---

## Piano di Implementazione

### Step 1: Arricchire `elevenlabs-context` con il cervello completo di Aria

Riscrivere la Edge Function per:
- Eseguire le stesse 12+ query parallele di `aria-voice-chat` (profilo, memorie strutturate, obiettivi, metriche giornaliere, sessioni recenti, abitudini, interessi, eventi, body metrics, snapshot, conversation topics, habit streaks)
- Costruire il system prompt completo usando le stesse istruzioni cliniche (Golden Rules, Personalita, Protocolli, Rubrica Emotiva, Tecniche Cliniche) gia presenti in `aria-voice-chat`
- Adattare per il formato vocale (risposte brevi)
- Ritornare `{ user_name, system_prompt, first_message }`

### Step 2: Aggiornare `elevenlabs-conversation-token` per WebRTC

- Aggiungere chiamata all'endpoint `/v1/convai/conversation/token` per ottenere un token WebRTC (latenza inferiore rispetto a WebSocket)
- Mantenere compatibilita con signed URL come fallback

### Step 3: Aggiornare `useElevenLabsAgent.tsx` con overrides e audio reali

- Fetch parallelo di token WebRTC + contesto completo all'avvio
- Passare il system prompt come override nella `startSession()`
- Usare `getInputVolume()` / `getOutputVolume()` per livelli audio reali
- Gestione transcript e salvataggio sessione + process-session a fine conversazione

### Step 4: Collegare `ZenVoiceModal.tsx` al nuovo hook

- Sostituire `useHybridVoice()` con `useElevenLabsAgent()`
- Collegare livelli audio reali all'animazione canvas
- Aggiornare anteprima transcript

---

## Prerequisito Manuale (Dashboard ElevenLabs)

Prima di testare, dovrai abilitare gli override nell'agente ElevenLabs:
1. Vai su elevenlabs.io/app/agents
2. Seleziona il tuo agente
3. Tab Security -> abilita override per: System prompt, First message, Language

