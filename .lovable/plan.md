

# Migliorare la Voce di Aria con ElevenLabs

## Analisi del Sistema Attuale

| Componente | Tecnologia | Problema |
|------------|-----------|----------|
| `useRealtimeVoice.tsx` | OpenAI Realtime GPT-4o | Voce "shimmer" robotica |
| `openai-realtime-session/index.ts` | WebRTC + OpenAI | Latenza ok, ma voce innaturale |
| `useVoiceSession.tsx` | Web Speech API browser | TTS molto robotico (fallback) |

## Soluzione: ElevenLabs Conversational AI

ElevenLabs offre voci **indistinguibili da quelle umane** con supporto completo per l'italiano. L'integrazione usa WebRTC per latenza minima.

### Architettura Proposta

```text
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            ZenVoiceModal.tsx                             │  │
│  │                    │                                     │  │
│  │                    ▼                                     │  │
│  │         useElevenLabsVoice.tsx (NUOVO)                   │  │
│  │           │                                              │  │
│  │           │  @elevenlabs/react                           │  │
│  │           │  useConversation()                           │  │
│  │           │                                              │  │
│  └───────────┼──────────────────────────────────────────────┘  │
│              │                                                  │
└──────────────┼──────────────────────────────────────────────────┘
               │ WebRTC (bassa latenza)
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTION                                 │
│  elevenlabs-conversation-token/index.ts (NUOVO)                  │
│    - Genera token sicuro                                         │
│    - Inietta system prompt con memoria Aria                      │
│    - Real-time context                                           │
└──────────────────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    ELEVENLABS                                    │
│  Agent configurato con:                                          │
│    - Voce italiana naturale (es. "Laura" o custom)               │
│    - Persona Aria iniettata                                      │
│    - Bassa latenza via WebRTC                                    │
└──────────────────────────────────────────────────────────────────┘
```

## File da Creare/Modificare

### 1. Nuovo Hook: `useElevenLabsVoice.tsx`

```typescript
// Usa @elevenlabs/react useConversation
// - Richiede token da edge function
// - Gestisce microfono con permessi
// - Stato: isActive, isSpeaking, isListening
// - Passa memoria e contesto utente
```

### 2. Nuova Edge Function: `elevenlabs-conversation-token/index.ts`

```typescript
// Genera token WebRTC per ElevenLabs
// - Carica profilo utente e memoria
// - Costruisce system prompt Aria
// - Ritorna conversationToken
```

### 3. Aggiornare: `ZenVoiceModal.tsx`

- Switch da `useRealtimeVoice` a `useElevenLabsVoice`
- Mantenere stessa UI/UX

### 4. Configurare Agent ElevenLabs (Dashboard)

- Creare Agent con voce italiana
- Settare parametri voce naturale

## Configurazione Voce Naturale

### Parametri ElevenLabs Consigliati

| Parametro | Valore | Effetto |
|-----------|--------|---------|
| `stability` | 0.4-0.5 | Piu espressiva e variata |
| `similarity_boost` | 0.7 | Mantiene carattere voce |
| `style` | 0.3-0.5 | Aggiunge personalita |
| `speed` | 0.95 | Leggermente piu lento, naturale |

### Voci Italiane Consigliate

| Voce | ID | Carattere |
|------|-----|-----------|
| Laura | FGY2WhTYpPnrIDTdsKH5 | Femminile, calda, professionale |
| Alice | Xb7hH8MSUJpSbSDYk0k2 | Femminile, giovane, amichevole |
| Matilda | XrExE9yKIg1WjnnlVkGX | Femminile, matura, rassicurante |

## Miglioramenti al Prompt Vocale

Oltre a cambiare TTS, ottimizziamo le istruzioni per renderle piu naturali:

### Da Aggiungere al System Prompt

```text
STILE VOCALE NATURALE:
- Usa esclamazioni genuine: "Ah!", "Mamma mia!", "Dai!", "Oddio!"
- Pause pensierose: "Mmm... sai cosa penso?"
- Risate brevi quando appropriato: "Ahah", "Eh eh"
- Variazioni di tono: sussurato per momenti intimi, energico per incoraggiare
- Interiezioni italiane: "Insomma...", "Cioe...", "Ecco..."
- Mai elenchi puntati - parla in modo discorsivo
- Respiri naturali tra le frasi
```

## Dipendenze da Installare

```bash
npm install @elevenlabs/react
```

## Secrets Necessari

| Secret | Descrizione |
|--------|-------------|
| `ELEVENLABS_API_KEY` | API key da ElevenLabs dashboard |

## Riepilogo Modifiche

| File | Azione | Descrizione |
|------|--------|-------------|
| `src/hooks/useElevenLabsVoice.tsx` | NUOVO | Hook per ElevenLabs Conversational AI |
| `supabase/functions/elevenlabs-conversation-token/index.ts` | NUOVO | Edge function per token generation |
| `src/components/voice/ZenVoiceModal.tsx` | MODIFICA | Usa nuovo hook ElevenLabs |
| `supabase/config.toml` | MODIFICA | Aggiunge nuova function |

## Risultato Atteso

1. **Voce umana** - ElevenLabs produce voci indistinguibili da persone reali
2. **Bassa latenza** - WebRTC mantiene conversazione fluida
3. **Personalita Aria** - Stesso prompt, voce molto migliore
4. **Italiano nativo** - Voci italiane di alta qualita

