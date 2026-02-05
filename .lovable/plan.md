
# Piano: ElevenLabs Nativo con Variabili Dinamiche

## Panoramica

Convertiamo il sistema vocale da ibrido (STT browser + Gemini + TTS) a **ElevenLabs Nativo** per ottenere latenza <1s. Il prompt comportamentale di Aria è già configurato nella dashboard ElevenLabs con le variabili `user_name` e `user_context`.

## Architettura

```text
┌─────────────────────────────────────────────────────────────────────┐
│  PRIMA (Ibrido - 3-5s latenza)                                      │
│  STT Browser → Backend Gemini → ElevenLabs TTS → Play Audio         │
├─────────────────────────────────────────────────────────────────────┤
│  DOPO (Nativo - <1s latenza)                                        │
│                                                                     │
│  1. Utente preme "Chiama"                                           │
│     ↓                                                               │
│  2. Fetch contesto utente (nome, memoria, stato emotivo)            │
│     ↓                                                               │
│  3. Avvia sessione ElevenLabs con dynamicVariables:                 │
│     { user_name: "Marco", user_context: "Memoria: ..." }            │
│     ↓                                                               │
│  4. ElevenLabs gestisce TUTTO nativamente (WebRTC):                 │
│     STT → LLM (con prompt Aria dalla dashboard) → TTS               │
│     LATENZA: <1 secondo                                             │
│     ↓                                                               │
│  5. Fine chiamata → Salva transcript + process-session              │
│     (estrae 66 metriche cliniche in background)                     │
└─────────────────────────────────────────────────────────────────────┘
```

## File da Creare

### 1. Edge Function: `supabase/functions/elevenlabs-context/index.ts`

Recupera i dati utente per le variabili dinamiche:

- **Nome utente** dal profilo
- **Memoria a lungo termine** (ultimi 10 punti)
- **Stato emotivo recente** (metriche giornaliere)
- **Obiettivi selezionati**

Formato output:
```json
{
  "user_name": "Marco",
  "user_context": "Memoria: Ha iniziato nuovo lavoro 2 settimane fa. Dorme male ultimamente. Obiettivi: ridurre ansia, dormire meglio. Stato oggi: mood 6/10, ansia 7/10."
}
```

## File da Modificare

### 2. Hook: `src/hooks/useElevenLabsAgent.tsx`

Modifiche:
- **Rimuovere** il client tool `aria_respond` (non serve più)
- **Aggiungere** fetch del contesto prima di avviare
- **Passare** `dynamicVariables` a `startSession()`
- **Aggiornare** `stop()` per chiamare `process-session` con il transcript

```typescript
// Prima di avviare
const { data: contextData } = await supabase.functions.invoke('elevenlabs-context');

// Avvio sessione
await conversation.startSession({
  signedUrl: data.signed_url,
  dynamicVariables: {
    user_name: contextData.user_name,
    user_context: contextData.user_context
  }
});
```

### 3. Modal: `src/components/voice/ZenVoiceModal.tsx`

Modifiche:
- Cambiare import da `useHybridVoice` a `useElevenLabsAgent`
- L'interfaccia rimane identica (stesso API)

### 4. Config: `supabase/config.toml`

Aggiungere:
```toml
[functions.elevenlabs-context]
verify_jwt = false
```

## Flusso Dati Dettagliato

### Inizio Chiamata
1. Utente preme "Chiama"
2. App richiede permesso microfono
3. App chiama `elevenlabs-context` → recupera dati utente
4. App chiama `elevenlabs-conversation-token` → ottiene signed URL
5. App avvia sessione con `dynamicVariables`
6. ElevenLabs sostituisce `{{user_name}}` e `{{user_context}}` nel prompt

### Durante la Chiamata
- ElevenLabs gestisce tutto internamente (WebRTC)
- STT → LLM (con prompt Aria) → TTS in tempo reale
- Latenza: <1 secondo per risposta
- L'hook raccoglie transcript tramite `onMessage`

### Fine Chiamata
1. Utente preme "Termina"
2. App salva sessione nel database
3. App chiama `process-session` con il transcript completo
4. `process-session` estrae tutte le 66 metriche cliniche
5. Aggiorna memoria a lungo termine
6. Rileva nuovi obiettivi/habits menzionati

## Vantaggi

| Aspetto | Prima (Ibrido) | Dopo (Nativo) |
|---------|----------------|---------------|
| Latenza | 3-5 secondi | <1 secondo |
| Chiamate REST | Ogni turno | Solo inizio/fine |
| Interruzioni | Possibili errori | Native WebRTC |
| Stabilità | Media | Alta |
| Voce | ElevenLabs TTS | ElevenLabs Native |
| Analisi clinica | Non presente | Post-sessione completa |

## Sezione Tecnica

### Struttura Contesto Utente

```typescript
interface UserContext {
  user_name: string;
  user_context: string; // Max ~500 caratteri per efficienza
}

// Esempio user_context generato:
// "Memoria: Nuovo lavoro da 2 settimane. Problemi sonno. Ansia pre-riunioni.
// Obiettivi: ridurre ansia, dormire meglio.
// Oggi: mood 6/10, ansia 7/10, energia 5/10.
// Ultimo check-in: si sentiva stressato per deadline."
```

### API ElevenLabs - Dynamic Variables

Le variabili vengono passate a `startSession()`:
```typescript
await conversation.startSession({
  signedUrl: data.signed_url,
  dynamicVariables: {
    user_name: "Marco",
    user_context: "..."
  }
});
```

ElevenLabs sostituisce `{{user_name}}` e `{{user_context}}` nel prompt configurato nella dashboard.

### Gestione Transcript

```typescript
// onMessage handler
if (message?.type === 'user_transcript') {
  const text = message?.user_transcription_event?.user_transcript;
  transcriptRef.current.push({ role: 'user', text, timestamp: new Date() });
}

if (message?.type === 'agent_response') {
  const text = message?.agent_response_event?.agent_response;
  transcriptRef.current.push({ role: 'assistant', text, timestamp: new Date() });
}
```

### Post-Processing

A fine sessione:
```typescript
await supabase.functions.invoke('process-session', {
  body: {
    session_id: sessionIdRef.current,
    user_id: user.id,
    transcript: fullTranscript,
    is_voice: true
  }
});
```

`process-session` analizza il transcript ed estrae:
- 4 vitali (mood, ansia, energia, sonno)
- 20 emozioni
- 9 aree della vita
- 32+ parametri psicologia profonda
- Aggiornamenti memoria a lungo termine
- Nuovi obiettivi/habits rilevati

---

# Piano: Pubblicazione App Nativa (Fase B)

## Stato Attuale
- ✅ Capacitor configurato nel progetto
- ✅ Android testabile su Windows con Android Studio
- ⏳ iOS: in attesa di accesso a Mac

## iOS: GitHub Actions + TestFlight

**Quando disponibile un Mac**, configurare:

### Requisiti
1. **Account Apple Developer** ($99/anno) - https://developer.apple.com
2. **Certificati e Provisioning Profiles** creati in Apple Developer Portal
3. **App Store Connect** - creare l'app per TestFlight

### Pipeline CI/CD
```yaml
# .github/workflows/ios-testflight.yml
name: iOS TestFlight Build

on:
  push:
    branches: [main]
    paths:
      - 'ios/**'
      - 'src/**'

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build web
        run: npm run build
      
      - name: Sync Capacitor
        run: npx cap sync ios
      
      - name: Build & Upload to TestFlight
        uses: apple-actions/upload-testflight-build@v1
        with:
          app-path: ios/App/build/App.ipa
          issuer-id: ${{ secrets.APPLE_ISSUER_ID }}
          api-key-id: ${{ secrets.APPLE_API_KEY_ID }}
          api-private-key: ${{ secrets.APPLE_API_PRIVATE_KEY }}
```

### Flusso
1. Push su GitHub (branch main)
2. GitHub Actions compila su macOS cloud (gratuito per repo pubblici)
3. Build iOS automatica
4. Upload automatico su TestFlight
5. Tester ricevono notifica nell'app TestFlight

### Secrets da Configurare su GitHub
- `APPLE_ISSUER_ID` - dal Apple Developer Portal
- `APPLE_API_KEY_ID` - App Store Connect API Key
- `APPLE_API_PRIVATE_KEY` - chiave privata .p8

## Android: Play Store

Per pubblicazione su Google Play Store:
1. Account Google Play Developer ($25 una tantum)
2. Generare signed APK/AAB con Android Studio
3. Caricare su Play Console

## Timeline
- **Fase A (attuale)**: Web/PWA completa al 100%
- **Fase B (futura)**: 
  - Android su Play Store
  - iOS su App Store via TestFlight → produzione
  - Integrazioni native (Apple Health, Google Fit, Push Notifications)
