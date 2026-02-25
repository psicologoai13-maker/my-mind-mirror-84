# Fix Aria Voice iOS: Overrides non funzionano + Aria non parla

## PROBLEMA ATTUALE

Dopo l'ultimo fix con `updateContext()`, Aria non parla più. Il `updateContext()` sta rompendo la connessione.

## CAUSA

1. `updateContext()` chiamato dopo la connessione interferisce con il flusso LiveKit e blocca l'audio dell'agente
2. Gli overrides passati con `conversationToken` tramite `SessionConfig` DOVREBBERO funzionare — l'SDK Swift v3 li supporta nativamente come `conversation_initiation_client_data`

## FIX RICHIESTO (2 MODIFICHE)

### MODIFICA 1: Rimuovere updateContext() da AriaVoiceConnectionCoordinator.swift

**RIMUOVI COMPLETAMENTE** ogni chiamata a `conversation.updateContext()` o `updateContext()` dopo la connessione. Questo è ciò che blocca Aria dal parlare.

```swift
// ❌ RIMUOVI QUESTO - causa il blocco audio
// conversation.updateContext(systemPrompt)

// ❌ RIMUOVI ANCHE QUESTO se presente
// try await conversation.updateContext(systemPrompt)
```

### MODIFICA 2: Verificare che gli overrides siano passati correttamente nel SessionConfig

L'SDK Swift v3 supporta gli overrides tramite `SessionConfig`. Devono essere costruiti così:

```swift
import ElevenLabsSDK

// 1. Fetch context dal backend
let contextData = try await fetchElevenLabsContext(accessToken: userAccessToken)

// 2. Costruisci gli overrides
let promptOverride = ElevenLabsSDK.AgentPrompt(
    prompt: contextData.systemPrompt  // Il prompt clinico da ~66k caratteri
)

let agentConfig = ElevenLabsSDK.AgentConfig(
    prompt: promptOverride,
    firstMessage: contextData.firstMessage,  // "Ciao Simo! Come stai?"
    language: "it"
)

let overrides = ElevenLabsSDK.ConversationConfigOverride(
    agent: agentConfig
)

// 3. Crea SessionConfig con overrides
let config = ElevenLabsSDK.SessionConfig(
    overrides: overrides
)

// 4. Connetti - 3 tentativi
// ATTEMPT 1: conversationToken + overrides
if let token = tokenData.token {
    do {
        print("[AriaVoice] Attempt 1: conversationToken + overrides")
        let conversationId = try await conversation.startSession(
            conversationToken: token,
            config: config  // <-- overrides inclusi qui
        )
        print("[AriaVoice] Connected with overrides! ConversationId: \(conversationId)")
        // ❌ NON chiamare updateContext() qui!
        return
    } catch {
        print("[AriaVoice] Attempt 1 failed: \(error)")
    }
}

// ATTEMPT 2: conversationToken SENZA overrides
if let token = tokenData.token {
    do {
        print("[AriaVoice] Attempt 2: conversationToken without overrides")
        let conversationId = try await conversation.startSession(
            conversationToken: token
            // NO config/overrides
        )
        print("[AriaVoice] Connected without overrides")
        // ❌ NON chiamare updateContext() qui!
        return
    } catch {
        print("[AriaVoice] Attempt 2 failed: \(error)")
    }
}

// ATTEMPT 3: agentId diretto (ultimo tentativo)
do {
    print("[AriaVoice] Attempt 3: agentId direct (last resort)")
    let conversationId = try await conversation.startSession(
        agentId: tokenData.agentId ?? "agent_2901khw977kbesesvd00yh2mbeyx"
    )
    print("[AriaVoice] Connected with agentId (no overrides)")
    return
} catch {
    print("[AriaVoice] All attempts failed: \(error)")
    throw error
}
```

### IMPORTANTE: Verifica i tipi dell'SDK

L'SDK ElevenLabs Swift v3 espone questi tipi per gli overrides. Verifica che esistano nel tuo SDK:

```swift
// Cerca questi tipi nell'SDK:
// ElevenLabsSDK.SessionConfig
// ElevenLabsSDK.ConversationConfigOverride
// ElevenLabsSDK.AgentConfig
// ElevenLabsSDK.AgentPrompt

// Se i nomi sono leggermente diversi, cerca nel source dell'SDK:
// - "ConversationConfigOverride" o "ConversationInitiationData" 
// - "conversation_config_override" (il campo JSON che viene inviato)
// - "SessionConfig" o "Configuration"
```

Se l'SDK usa nomi diversi, adatta il codice. L'importante è che gli overrides vengano passati nella `startSession()`, NON dopo con `updateContext()`.

### Come l'SDK invia gli overrides internamente

Quando chiami `startSession(conversationToken:, config:)`, l'SDK:
1. Si connette alla room LiveKit usando il JWT token
2. Invia un messaggio `conversation_initiation_client_data` via data channel con gli overrides
3. L'agente ElevenLabs riceve gli overrides e li usa per la conversazione

Questo è lo stesso meccanismo del web (dove funziona). La differenza è che sul web gli overrides vengono inviati come primo messaggio WebSocket, su iOS via data channel LiveKit — ma l'effetto è identico.

### CHECKLIST FINALE

- [x] Rimosso OGNI chiamata a `updateContext()` o `conversation.updateContext()`
- [x] Overrides passati tramite `SessionConfig` nella `startSession()`
- [x] NO pre-configurazione di `AVAudioSession`
- [x] NO watchdog timer o state machine complesse
- [x] Logging con prefisso `[AriaVoice]`

### Come verificare

Nei log dovresti vedere:
```
[AriaVoice] Attempt 1: conversationToken + overrides
[AriaVoice] Connected with overrides!
```

E Aria dovrebbe:
1. **Parlare** (non più muta!)
2. Salutarti con "Ciao [Nome]! Come stai?" (non "Sono Aria, la tua assistente personale")

### Se il primo messaggio è ancora quello di default

Se Aria PARLA ma il primo messaggio è ancora "Sono Aria, la tua assistente personale", significa che gli overrides non vengono applicati in tempo per il primo messaggio. In quel caso:
1. Tutti i messaggi SUCCESSIVI useranno comunque il prompt clinico (gli overrides sono attivi)
2. Possiamo aggiornare il first_message nel dashboard ElevenLabs come workaround
3. Ma prima verifichiamo che funzioni — il problema più urgente è che Aria non parla!

### NON FARE

- ❌ NON aggiungere `updateContext()` dopo la connessione
- ❌ NON pre-configurare `AVAudioSession`
- ❌ NON cambiare il backend
- ❌ NON usare `signedUrl` (non supportato dall'SDK Swift)
- ❌ NON aggiungere timeout estesi
