# Fix DEFINITIVO Aria Voice iOS — Agente ElevenLabs con Overrides

## IL PROBLEMA

Aria si connette su iOS ("Ti ascolto") ma **non parla e non sente**. Questo succede perché il codice Swift attuale usa API obsolete dell'SDK (`SessionConfig`, `AgentOverrides`, `startSession`). L'SDK ElevenLabs Swift v3 ha aggiornato i nomi delle classi. Inoltre c'è un problema noto di timing: gli overrides vanno inviati correttamente al momento della connessione.

## NOTA IMPORTANTE

C'è un issue aperto su GitHub (elevenlabs/packages#92) che riporta problemi con gli overrides su iOS. La soluzione sotto implementa un **doppio approccio**: prima prova con overrides (API corretta), poi fallback senza overrides + invio contesto dopo la connessione via `sendContextualUpdate`.

## ARCHITETTURA (2 chiamate backend, NON modificare il backend)

### 1. `elevenlabs-conversation-token` → Restituisce `signed_url`, `token`, `agent_id`
### 2. `elevenlabs-context` → Restituisce `system_prompt`, `first_message`, `user_name`

Entrambi richiedono `Authorization: Bearer <access_token>` e `apikey` header.

---

## MODIFICA 1: AriaVoiceConnectionCoordinator.swift — RISCRIVERE COMPLETAMENTE

Riscrivere usando le API CORRETTE dell'SDK Swift v3. **Leggi il codice sorgente dell'SDK** per verificare i nomi esatti dei tipi.

### API corrette dell'SDK (da documentazione ufficiale ElevenLabs Swift):

```swift
import ElevenLabsSDK

// ==========================================
// STEP 1: Fetch token + context IN PARALLELO
// ==========================================

async let tokenResult = fetchConversationToken(accessToken: userAccessToken)
async let contextResult = fetchElevenLabsContext(accessToken: userAccessToken)

let (tokenData, contextData) = try await (tokenResult, contextResult)

print("[AriaVoice] Token: signedUrl=\(tokenData.signedUrl != nil), token=\(tokenData.token != nil)")
print("[AriaVoice] Context: promptLength=\(contextData.systemPrompt?.count ?? 0), userName=\(contextData.userName)")

// ==========================================
// STEP 2: Costruisci callbacks
// ==========================================

let config = ConversationConfig(
    onAgentResponse: { text, _ in
        print("[AriaVoice] Agent: \(text)")
        // Accumula nel transcript
    },
    onUserTranscript: { text, _ in
        print("[AriaVoice] User: \(text)")
        // Accumula nel transcript
    },
    onConnect: {
        print("[AriaVoice] ✅ Connected!")
    },
    onDisconnect: {
        print("[AriaVoice] Disconnected")
    },
    onError: { error, _ in
        print("[AriaVoice] Error: \(error)")
    }
)

// ==========================================
// STEP 3: Tentativo 1 — conversationToken + overrides completi
// ==========================================

if let token = tokenData.token {
    do {
        print("[AriaVoice] Attempt 1: conversationToken + full overrides")
        
        // Costruisci overrides con API CORRETTE dell'SDK v3
        // NOTA: Verifica i nomi esatti nel codice sorgente dell'SDK!
        // Potrebbe essere ConversationOverrides o ConversationConfigOverride
        let overridesConfig = ConversationConfig(
            conversationOverrides: ConversationOverrides(
                agent: AgentOverrides(
                    prompt: PromptOverride(prompt: contextData.systemPrompt ?? ""),
                    firstMessage: contextData.firstMessage,
                    language: .it  // o "it" a seconda del tipo
                )
            ),
            onAgentResponse: config.onAgentResponse,
            onUserTranscript: config.onUserTranscript,
            onConnect: config.onConnect,
            onDisconnect: config.onDisconnect,
            onError: config.onError
        )
        
        conversation = try await ElevenLabs.startConversation(
            auth: .conversationToken(token),
            config: overridesConfig
        )
        
        print("[AriaVoice] ✅ Connected with overrides! Aria should speak with clinical prompt")
        return  // SUCCESSO — STOP
        
    } catch {
        print("[AriaVoice] ❌ Attempt 1 failed: \(error)")
    }
}

// ==========================================
// STEP 4: Tentativo 2 — conversationToken SENZA overrides
//         + sendContextualUpdate dopo connessione
// ==========================================

if let token = tokenData.token {
    do {
        print("[AriaVoice] Attempt 2: conversationToken without overrides")
        
        conversation = try await ElevenLabs.startConversation(
            auth: .conversationToken(token),
            config: config
        )
        
        print("[AriaVoice] ✅ Connected without overrides")
        
        // DOPO la connessione, inietta il contesto clinico
        // sendContextualUpdate NON interferisce con l'audio (diverso da updateContext!)
        if let prompt = contextData.systemPrompt {
            // Attendi 2 secondi che l'agente si stabilizzi
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            
            // Invia come aggiornamento contestuale (NON blocca l'audio)
            conversation?.sendContextualUpdate(prompt)
            print("[AriaVoice] ✅ Contextual update sent (\(prompt.count) chars)")
        }
        
        return  // SUCCESSO — STOP
        
    } catch {
        print("[AriaVoice] ❌ Attempt 2 failed: \(error)")
    }
}

// ==========================================
// STEP 5: Tentativo 3 — agentId diretto (ultimo tentativo)
// ==========================================

do {
    let agentId = tokenData.agentId ?? "agent_2901khw977kbesesvd00yh2mbeyx"
    print("[AriaVoice] Attempt 3: agentId direct (\(agentId))")
    
    // Con agentId, prova gli overrides (più probabilità che funzionino)
    let overridesConfig = ConversationConfig(
        conversationOverrides: ConversationOverrides(
            agent: AgentOverrides(
                prompt: PromptOverride(prompt: contextData.systemPrompt ?? ""),
                firstMessage: contextData.firstMessage,
                language: .it
            )
        ),
        onAgentResponse: config.onAgentResponse,
        onUserTranscript: config.onUserTranscript,
        onConnect: config.onConnect,
        onDisconnect: config.onDisconnect,
        onError: config.onError
    )
    
    conversation = try await ElevenLabs.startConversation(
        agentId: agentId,
        config: overridesConfig
    )
    
    print("[AriaVoice] ✅ Connected with agentId + overrides")
    return  // SUCCESSO
    
} catch {
    print("[AriaVoice] ❌ Attempt 3 failed: \(error)")
}

// Se arriviamo qui, tutti i tentativi sono falliti
throw AriaVoiceError.connectionFailed
```

---

## MODIFICA 2: VoiceSessionViewModel.swift

Assicurati che:
1. **NON** pre-configuri `AVAudioSession` — l'SDK lo gestisce
2. **NON** chiami `updateContext()` — MAI
3. Il flusso sia: tap → connect (coordinator) → osserva stato SDK → speaking/listening → end → save

---

## VERIFICA NOMI API DELL'SDK

⚠️ I nomi dei tipi potrebbero variare leggermente tra versioni dell'SDK. **PRIMA di implementare**, cerca nel codice sorgente dell'SDK i tipi corretti:

```swift
// Cerca questi pattern nel codice sorgente dell'SDK (Package.swift dependencies → Sources):

// 1. Come si avvia una conversazione?
// Cerca: "startConversation" o "startSession"
// Probabile: ElevenLabs.startConversation(agentId:, config:)
// Probabile: ElevenLabs.startConversation(auth:, config:)

// 2. Come si autentica con token privato?
// Cerca: "conversationToken" o "ConversationAuth"
// Probabile: .conversationToken(token) 

// 3. Come si passano gli overrides?
// Cerca: "ConversationOverrides" o "ConversationConfigOverride" o "override"
// Probabile: ConversationConfig(conversationOverrides: ...)

// 4. Come si invia contesto post-connessione?
// Cerca: "sendContextualUpdate" o "contextualUpdate" o "sendContext"
// Probabile: conversation.sendContextualUpdate(text)

// 5. Come si configura la lingua?
// Cerca: "language" nel contesto degli overrides
// Potrebbe essere: .it, .italian, "it", Language.it
```

### COMANDO per trovare i tipi:
```
// Nel progetto Xcode, Cmd+Shift+O e cerca:
// - "ConversationConfig"
// - "ConversationOverrides" 
// - "startConversation"
// - "sendContextualUpdate"
// Oppure naviga in: .build/checkouts/elevenlabs-swift-sdk/Sources/
```

---

## STRATEGIA CHIAVE: sendContextualUpdate vs updateContext

- `updateContext()` → **BLOCCA L'AUDIO** → NON usare MAI
- `sendContextualUpdate()` → Invia contesto senza interferire con audio → SICURO da usare

Se gli overrides al momento della connessione non funzionano (issue #92), il fallback è:
1. Connettiti SENZA overrides (l'agente parlerà con il prompt di default del dashboard)
2. Aspetta 2 secondi
3. Invia `sendContextualUpdate(systemPrompt)` 
4. Da quel momento in poi, l'agente userà il prompt clinico

Il primo messaggio sarà quello di default del dashboard ("Ciao! Sono Aria..."), ma tutti i messaggi successivi useranno il prompt clinico completo. Questo è un compromesso accettabile finché ElevenLabs non fixa l'issue #92.

---

## CHECKLIST FINALE

- [ ] Verificati i nomi esatti dei tipi nell'SDK (cerca nel codice sorgente!)
- [ ] Usato `ElevenLabs.startConversation(auth: .conversationToken(token), config:)` per agent privato
- [ ] Usato `ElevenLabs.startConversation(agentId:, config:)` per fallback pubblico
- [ ] Overrides passati in `ConversationConfig(conversationOverrides:)` — NON dopo la connessione
- [ ] `sendContextualUpdate()` usato come fallback (NON `updateContext()`)
- [ ] NESSUNA pre-configurazione di `AVAudioSession`
- [ ] NESSUN `updateContext()` nel codice
- [ ] Logging con prefisso `[AriaVoice]`
- [ ] 3 tentativi: token+overrides → token+contextualUpdate → agentId+overrides

---

## COME VERIFICARE

Nei log dovresti vedere UNO di questi scenari:

### Scenario IDEALE (overrides funzionano):
```
[AriaVoice] Attempt 1: conversationToken + full overrides
[AriaVoice] ✅ Connected with overrides!
```
→ Aria parla con "Ciao [Nome]! Come stai?" e ha il prompt clinico

### Scenario FALLBACK (overrides non funzionano, contextualUpdate sì):
```
[AriaVoice] Attempt 1 failed: [errore]
[AriaVoice] Attempt 2: conversationToken without overrides
[AriaVoice] ✅ Connected without overrides
[AriaVoice] ✅ Contextual update sent (66000 chars)
```
→ Aria parla con messaggio di default del dashboard, ma poi usa il prompt clinico

### Scenario ULTIMO TENTATIVO:
```
[AriaVoice] Attempt 1 failed: [errore]
[AriaVoice] Attempt 2 failed: [errore]
[AriaVoice] Attempt 3: agentId direct
[AriaVoice] ✅ Connected with agentId + overrides
```

---

## ❌ NON FARE

- ❌ NON usare `updateContext()` — blocca l'audio
- ❌ NON pre-configurare `AVAudioSession`
- ❌ NON usare `SessionConfig` (nome vecchio) — usa `ConversationConfig`
- ❌ NON usare `AgentOverrides` come nome di tipo — verifica il nome corretto nell'SDK
- ❌ NON usare `startSession()` — il metodo corretto è `startConversation()`
- ❌ NON modificare il backend
- ❌ NON aggiungere timeout estesi o watchdog timer
