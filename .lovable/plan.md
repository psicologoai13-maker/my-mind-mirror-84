

# Fix: Errore connessione vocale ElevenLabs

## Problema
L'errore "could not establish signal connection: Encountered websocket error during connection establishment" si verifica dopo aver ottenuto il token con successo. Le edge function funzionano correttamente (token e contesto vengono caricati senza errori).

La causa probabile e' il conflitto tra le `overrides` passate a `startSession` e la connessione WebRTC con `conversationToken`. C'e' un bug noto nella SDK ElevenLabs React (Issue #92) dove le overrides possono abortire la connessione.

## Soluzione

### Strategia: fallback WebSocket + fix formato overrides

1. **Rimuovere `connectionType`** dal `sessionOptions` quando si usa `conversationToken` -- la SDK lo deduce automaticamente
2. **Usare `signedUrl` (WebSocket) come metodo primario** invece di WebRTC -- piu' compatibile con le overrides
3. **Aggiungere un try/catch con fallback**: se la connessione con overrides fallisce, riprovare senza overrides (usando il prompt di default configurato nella dashboard)

## Dettaglio tecnico

### File: `src/hooks/useElevenLabsAgent.tsx`

- Invertire la priorita': provare prima `signedUrl` (WebSocket) che e' piu' compatibile con overrides
- Rimuovere il campo `connectionType` esplicito -- lasciare che la SDK lo deduca da `conversationToken` vs `signedUrl`
- Aggiungere fallback: se `startSession` con overrides fallisce, riprovare senza overrides

### File: `supabase/functions/elevenlabs-conversation-token/index.ts`

- Invertire la priorita': provare prima la signed URL (WebSocket), poi il token WebRTC come fallback
- Oppure restituire entrambi e lasciare al client la scelta

### Flusso aggiornato

```text
Utente preme "Parla"
       |
       v
[Token + Context in parallelo]
       |
       v
[Prova signedUrl + overrides]
       |
   Successo? --> Sessione attiva
       |
       No
       v
[Prova conversationToken senza overrides]
       |
   Successo? --> Sessione attiva (prompt da dashboard)
       |
       No
       v
[Errore mostrato all'utente]
```

Questo approccio garantisce che la voce funzioni sempre, anche se le overrides non sono compatibili con la versione corrente della SDK.

