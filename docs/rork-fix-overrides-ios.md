# Fix Aria Voice: Override non funzionano su iOS

## PROBLEMA

Aria si connette ma risponde con il prompt di default del dashboard ElevenLabs ("Ciao! Sono Aria, la tua assistente personale. Come posso aiutarti oggi?") invece del prompt clinico personalizzato da ~66k caratteri.

**Causa:** Il codice attuale usa `conversationToken` (JWT/WebRTC) per tutti e 3 i tentativi di connessione. Ma **`conversationToken` NON supporta gli overrides**. Solo `signedUrl` (WebSocket) supporta gli overrides.

Sul web funziona perché il primo tentativo usa `signedUrl` + overrides, non `conversationToken`.

## FIX RICHIESTO

### In `AriaVoiceConnectionCoordinator.swift`

Cambiare la sequenza di connessione così:

```swift
// Il backend restituisce DUE valori:
// - signed_url: URL WebSocket (wss://...) — SUPPORTA overrides
// - token: JWT token — NON supporta overrides

// ATTEMPT 1 (PRIMARIO): signedUrl + overrides
// Questo è l'unico modo per iniettare il system_prompt personalizzato
if let signedUrl = tokenData.signedUrl {
    do {
        print("[AriaVoice] Attempt 1: signedUrl (WebSocket) + overrides")
        try await conversation.startSession(
            signedUrl: signedUrl,    // <-- USA signedUrl, NON conversationToken!
            overrides: overrides     // <-- overrides con system_prompt + firstMessage + language
        )
        print("[AriaVoice] Connected with full clinical prompt!")
        return // SUCCESSO
    } catch {
        print("[AriaVoice] Attempt 1 failed: \(error)")
    }
}

// ATTEMPT 2: conversationToken SENZA overrides (fallback)
// Userà il prompt configurato nel dashboard ElevenLabs
if let token = tokenData.token {
    do {
        print("[AriaVoice] Attempt 2: conversationToken (WebRTC) without overrides")
        try await conversation.startSession(
            conversationToken: token
            // NO overrides - non sono supportati con conversationToken
        )
        print("[AriaVoice] Connected with dashboard prompt (no overrides)")
        return // SUCCESSO
    } catch {
        print("[AriaVoice] Attempt 2 failed: \(error)")
    }
}

// ATTEMPT 3: signedUrl SENZA overrides (ultimo tentativo)
if let signedUrl = tokenData.signedUrl {
    do {
        print("[AriaVoice] Attempt 3: signedUrl without overrides (last resort)")
        try await conversation.startSession(
            signedUrl: signedUrl
            // NO overrides
        )
        print("[AriaVoice] Connected (no overrides, last resort)")
        return
    } catch {
        print("[AriaVoice] All ElevenLabs attempts failed: \(error)")
    }
}
```

### Cosa cambia rispetto al codice attuale

| Prima (BUG) | Dopo (FIX) |
|---|---|
| Attempt 1: `conversationToken` + overrides | Attempt 1: `signedUrl` + overrides |
| Attempt 2: `conversationToken` senza overrides | Attempt 2: `conversationToken` senza overrides |
| Attempt 3: `agentId` diretto | Attempt 3: `signedUrl` senza overrides |

**L'unica modifica è nel tentativo 1:** usare `signedUrl` invece di `conversationToken`.

### Verifica in VoiceService.swift

Assicurati che `fetchConversationToken()` restituisca ENTRAMBI i campi dal backend:

```swift
struct ConversationTokenResponse {
    let signedUrl: String?   // wss://... — da signed_url nel JSON
    let token: String?       // JWT — da token nel JSON  
    let agentId: String?     // agent ID
}
```

Il backend (`elevenlabs-conversation-token`) restituisce:
```json
{
  "signed_url": "wss://...",   // ← QUESTO serve per overrides
  "token": "xxx",              // ← Questo è il JWT per WebRTC
  "agent_id": "agent_2901khw977kbesesvd00yh2mbeyx"
}
```

### Come verificare che funziona

Nei log dovresti vedere:
```
[AriaVoice] Attempt 1: signedUrl (WebSocket) + overrides
[AriaVoice] Connected with full clinical prompt!
```

E Aria dovrebbe salutarti con il messaggio personalizzato tipo:
"Ciao [Nome]! Come stai?" (non "Sono Aria, la tua assistente personale")

### REGOLA CHIAVE

```
signedUrl → WebSocket → SUPPORTA overrides ✅
conversationToken → WebRTC/LiveKit → NON supporta overrides ❌
```

Il web funziona perché usa `signedUrl` + overrides come primo tentativo. iOS deve fare lo stesso.

### NON MODIFICARE

- ❌ NON cambiare il backend (elevenlabs-conversation-token, elevenlabs-context)
- ❌ NON aggiungere updateContext() o strategie complesse
- ❌ NON pre-configurare AVAudioSession
- ✅ Cambia SOLO il primo tentativo da conversationToken → signedUrl
