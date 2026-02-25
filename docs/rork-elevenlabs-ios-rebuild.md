# Prompt per Rork Max: Reimplementazione Aria Voice (ElevenLabs Agent) su iOS

## CONTESTO DEL PROBLEMA

Le modifiche recenti fatte per debugging hanno probabilmente rotto la connessione vocale. Il backend è stato fixato (rimosso ~10k caratteri extra dal prompt). Ora serve reimplementare il client iOS in modo pulito e semplice, **identico a come funziona sul web**.

## ARCHITETTURA BACKEND (NON MODIFICARE)

Il backend espone **2 Edge Functions** su Supabase:

### 1. `elevenlabs-conversation-token`
- **URL:** `https://yzlszvvhbcasbzsaastq.supabase.co/functions/v1/elevenlabs-conversation-token`
- **Metodo:** POST (body può essere vuoto `{}`)
- **Headers richiesti:** `Authorization: Bearer <access_token>`, `apikey: <anon_key>`, `Content-Type: application/json`
- **Risposta JSON:**
```json
{
  "signed_url": "wss://...",   // WebSocket URL (primario)
  "token": "xxx",              // WebRTC token (fallback, può essere null)
  "agent_id": "agent_2901khw977kbesesvd00yh2mbeyx"
}
```

### 2. `elevenlabs-context`
- **URL:** `https://yzlszvvhbcasbzsaastq.supabase.co/functions/v1/elevenlabs-context`
- **Metodo:** POST (body può essere vuoto `{}`)
- **Headers richiesti:** `Authorization: Bearer <access_token>`, `apikey: <anon_key>`, `Content-Type: application/json`
- **Risposta JSON:**
```json
{
  "user_name": "Mario",
  "system_prompt": "...prompt clinico completo (~66k caratteri)...",
  "first_message": "Ciao Mario! Come stai?"
}
```

### Anon Key Supabase
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bHN6dnZoYmNhc2J6c2Fhc3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1ODEwOTUsImV4cCI6MjA4MjE1NzA5NX0.V_GTQQ1kN8nmtu3Y4_hTrZvmZeN9vcW_cUH4CHhCoT4
```

## COME FUNZIONA SUL WEB (REFERENZA - FUNZIONA PERFETTAMENTE)

Il web usa `@elevenlabs/react` SDK (v0.14.0) con `useConversation()`. La sequenza è:

```
1. Utente preme "Parla con Aria"
2. In PARALLELO:
   a. Richiedi permesso microfono: navigator.mediaDevices.getUserMedia({ audio: true })
   b. Chiama elevenlabs-conversation-token → ottieni signed_url + token
   c. Chiama elevenlabs-context → ottieni system_prompt + first_message
3. Costruisci overrides:
   overrides = {
     agent: {
       prompt: { prompt: system_prompt },
       firstMessage: first_message,
       language: 'it'
     }
   }
4. Tentativo 1: conversation.startSession({ signedUrl: signed_url, overrides: overrides })
5. Se fallisce → Tentativo 2: conversation.startSession({ conversationToken: token })  (senza overrides)
6. Se fallisce → Tentativo 3: conversation.startSession({ signedUrl: signed_url })  (senza overrides)
7. Connesso! L'agente inizia a parlare con first_message.
```

**Questo è tutto.** Non ci sono strategie complesse, niente `updateContext()`, niente path A/B/C/D. È semplice.

## IMPLEMENTAZIONE iOS RICHIESTA

### SDK da usare
ElevenLabs Swift SDK v3.0.0 (già installato). L'SDK usa LiveKit internamente.

### Sequenza di connessione (IDENTICA al web)

```swift
// 1. In parallelo: fetch token + context
async let tokenResult = fetchConversationToken(accessToken: userAccessToken)
async let contextResult = fetchElevenLabsContext(accessToken: userAccessToken)

let (tokenData, contextData) = try await (tokenResult, contextResult)

// 2. Costruisci overrides (se context disponibile)
var config = ElevenLabsConversation.Configuration()

if let systemPrompt = contextData.systemPrompt {
    config.overrides = .init(
        agent: .init(
            prompt: .init(prompt: systemPrompt),
            firstMessage: contextData.firstMessage,
            language: "it"
        )
    )
}

// 3. Connetti con signed_url (primario)
if let signedUrl = tokenData.signedUrl {
    do {
        conversation = try await ElevenLabsConversation.startSession(
            signedUrl: signedUrl,
            config: config
        )
        // CONNESSO - fine!
        return
    } catch {
        print("[AriaVoice] WebSocket+overrides failed: \(error)")
    }
    
    // Fallback: signed_url senza overrides
    do {
        config.overrides = nil
        conversation = try await ElevenLabsConversation.startSession(
            signedUrl: signedUrl,
            config: config
        )
        return
    } catch {
        print("[AriaVoice] WebSocket no overrides failed: \(error)")
    }
}

// 4. Ultimo fallback: WebRTC token senza overrides
if let token = tokenData.token {
    conversation = try await ElevenLabsConversation.startSession(
        conversationToken: token,
        config: config
    )
}
```

### REGOLE CRITICHE

1. **NON pre-configurare AVAudioSession** prima di chiamare l'SDK ElevenLabs. L'SDK LiveKit v3 gestisce internamente la sessione audio. Pre-configurarla causa conflitti e audio muto.

2. **NON usare `updateContext()`** o strategie "light then context". Il backend è stato ottimizzato e il prompt è ora sotto i limiti. Basta passare gli overrides normalmente nella `startSession()`.

3. **NON usare path A/B/C/D.** Usa la stessa strategia lineare del web: prova signed_url+overrides → signed_url senza overrides → token senza overrides.

4. **Timeout:** Usa un timeout di connessione di **15 secondi** (standard). Non serve estenderlo a 20-30s.

5. **Permesso microfono:** Richiedilo prima o durante la connessione, come preferisci per iOS. L'importante è che sia concesso prima che l'SDK inizi a registrare.

6. **Audio unlock su iOS:** Se necessario, riproduci un silent buffer al tap dell'utente per sbloccare l'AVAudioSession di iOS (restrizione Apple). Ma NON configurare manualmente la category/mode dell'audio session.

### Salvataggio sessione (post-disconnessione)

Quando la conversazione termina, salva la sessione nel database:

```
POST https://yzlszvvhbcasbzsaastq.supabase.co/functions/v1/process-session
Headers: Authorization: Bearer <access_token>, apikey: <anon_key>
Body: {
  "session_id": "<uuid della sessione salvata>",
  "user_id": "<user id>",
  "transcript": "Utente: ciao\nAria: Ciao! Come stai?",
  "is_voice": true
}
```

Prima salva la sessione nella tabella `sessions`:
```
INSERT INTO sessions (user_id, type, status, start_time, end_time, duration, transcript, ai_summary)
VALUES (user_id, 'voice', 'completed', start_iso, end_iso, duration_seconds, transcript_text, 'Sessione vocale con Aria')
```

### Gestione transcript in tempo reale

L'SDK ElevenLabs v3 fornisce callback per:
- **User transcript:** quando l'utente finisce di parlare (speech-to-text)
- **Agent response:** quando l'agente risponde (testo)

Accumula questi in un array e formattali come:
```
Utente: <testo utente>
Aria: <testo agente>
```

### Logging per debug

Usa il prefisso `[AriaVoice]` per tutti i log:
```
[AriaVoice] Fetching token and context...
[AriaVoice] Token received: signedUrl=true, token=true
[AriaVoice] Context received: promptLength=66000, userName=Mario
[AriaVoice] Attempting signedUrl + overrides...
[AriaVoice] Connected! Agent speaking...
[AriaVoice] Session ended. Duration: 45s, transcript entries: 12
```

## COSA RIMUOVERE/SEMPLIFICARE

- ❌ Rimuovi `AriaVoiceConnectionCoordinator.swift` con la macchina a stati A/B/C/D
- ❌ Rimuovi qualsiasi pre-configurazione di `AVAudioSession` (.playAndRecord, .voiceChat, etc.)
- ❌ Rimuovi `updateContext()` post-connessione
- ❌ Rimuovi timeout estesi (20s, 30s)
- ❌ Rimuovi il fallback a `aria-voice-chat` (non serve per ElevenLabs Agent)
- ✅ Mantieni il VoiceSessionViewModel con logica semplice: start → connect → speaking → stop → save
- ✅ Mantieni il silent buffer per audio unlock iOS (se già presente)
- ✅ Mantieni il logging strutturato [AriaVoice]

## RIASSUNTO

Il problema era che il backend aggiungeva ~10k caratteri extra al prompt (documenti Knowledge Base). Questo è stato fixato lato server. Ora il prompt è ~66k caratteri, che è la stessa dimensione che funzionava correttamente prima.

L'implementazione iOS deve essere **semplice e lineare**, identica al web:
1. Fetch token + context in parallelo
2. `startSession(signedUrl, overrides)` 
3. Fallback senza overrides se necessario
4. Fine.

Non servono strategie complesse. Se funziona sul web, deve funzionare su iOS con la stessa logica.
