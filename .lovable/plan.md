
# Piano: Ripristino Completo del Contesto di Aria per ElevenLabs

## Diagnosi del Problema

### Problema 1: Contesto Perso
L'agente ElevenLabs utilizza il suo LLM interno con il prompt base configurato nella dashboard. **Non ha accesso a:**
- Memoria a lungo termine dell'utente
- Contesto in tempo reale (meteo, data, notizie)
- Knowledge base clinica completa (~2500 righe di istruzioni)
- Profilo utente (obiettivi, sfide, risposte onboarding)
- Sessioni precedenti
- Abitudini del giorno
- Metriche corporee e giornaliere
- Obiettivi attivi

### Problema 2: Connessione Bloccata su "Connessione..."
I log mostrano che il token viene generato correttamente. Il problema probabilmente sta nella gestione del flusso nel hook client-side.

---

## Soluzione Tecnica

### Fase 1: Aggiornare Edge Function per Costruire il System Prompt Completo

**File:** `supabase/functions/elevenlabs-conversation-token/index.ts`

L'edge function deve:
1. Recuperare TUTTI i dati dell'utente da Supabase (come fa `gemini-voice`):
   - `user_profiles` (memoria, nome, obiettivi, wellness_score, onboarding_answers, dashboard_config)
   - `daily_life_areas` (aree vita del giorno)
   - `user_objectives` (obiettivi attivi)
   - `sessions` (ultime 3 sessioni)
   - `daily_habits` (abitudini del giorno)
   - `body_metrics` (metriche corporee)
   - `user_interests` (interessi per personalizzazione)

2. Costruire il system prompt completo con:
   - Persona "Best Friend + Expert" (da `BEST_FRIEND_VOICE`)
   - Contesto in tempo reale (weather, date, location, news)
   - Memoria delle sessioni precedenti
   - Knowledge base clinica (CBT, ACT, DBT, MI, SFBT)
   - Stile personalizzato basato su preferenze utente
   - Istruzioni Data Hunter per metriche mancanti
   - Obiettivi attivi e tracking
   - Regole vocali (brevita, naturale)

3. Restituire sia `signedUrl` che `systemPrompt` al client

### Fase 2: Aggiornare Hook per Usare Dynamic Overrides

**File:** `src/hooks/useElevenLabsVoice.tsx`

Modifiche:
1. Ricevere `systemPrompt` dall'edge function
2. Usare il parametro `overrides` in `conversation.startSession()`:

```typescript
await conversation.startSession({
  signedUrl: data.signedUrl,
  overrides: {
    agent: {
      prompt: {
        prompt: data.systemPrompt, // Full context injected here
      },
      language: "it",
    },
  },
});
```

3. Aggiungere logging migliorato per debug connessione
4. Gestire meglio gli errori con toast informativi

### Fase 3: Fix Connessione

Verifiche e correzioni:
1. Assicurarsi che `conversation.startSession()` sia chiamato correttamente
2. Verificare che lo stato `status` del hook ElevenLabs venga aggiornato
3. Aggiungere timeout per gestire connessioni bloccate
4. Logging dettagliato per tracciare il flusso

### Fase 4: Configurazione Dashboard ElevenLabs (Richiesta Utente)

L'utente deve abilitare "Client Overrides" nella dashboard ElevenLabs:
1. Aprire l'agente su ElevenLabs
2. Andare in Settings/Advanced
3. Abilitare "Allow client overrides" per:
   - System Prompt
   - First Message
   - Language

---

## Struttura del System Prompt Iniettato

Il prompt completo includera le seguenti sezioni (adattate per voce):

```text
[IDENTITA: Migliore Amica + Psicologa Esperta]

[CONTESTO TEMPO REALE]
- Data/Ora corrente
- Posizione utente (se condivisa)
- Meteo attuale
- Notizie rilevanti

[PROFILO UTENTE]
- Nome: {userName}
- Obiettivi: {selectedGoals}
- Sfida principale: {mainChallenge}
- Stile supporto preferito: {supportType}
- Metriche prioritarie: {priorityMetrics}

[MEMORIA SESSIONI PRECEDENTI]
- {longTermMemory entries}

[OBIETTIVI ATTIVI]
- {activeObjectives with progress}

[DATA HUNTER - METRICHE MANCANTI]
- Aree vita senza dati: {missingAreas}

[CONOSCENZE CLINICHE - Compact]
- CBT, ACT, DBT, MI, SFBT
- Riconoscimento pattern: GAD, Panico, Depressione, PTSD
- Tecniche: Grounding, TIPP, Respirazione

[REGOLE VOCALI]
- 2-3 frasi max
- Tono naturale da amica
- Risate e reazioni genuine
- No meta-commenti
- Protocollo sicurezza per crisi
```

---

## File da Modificare

| File | Modifiche |
|------|-----------|
| `supabase/functions/elevenlabs-conversation-token/index.ts` | Rebuild completo con fetch dati + costruzione system prompt |
| `src/hooks/useElevenLabsVoice.tsx` | Aggiunta overrides + fix connessione + logging |
| `src/components/voice/ZenVoiceModal.tsx` | Eventuale integrazione hook real-time context |

---

## Prerequisito Utente

Prima di implementare, l'utente deve abilitare "Client Overrides" nella dashboard ElevenLabs per l'agente Aria. Senza questo, il prompt iniettato verra ignorato.

---

## Risultato Atteso

Dopo l'implementazione:
1. Aria avra accesso a TUTTE le informazioni precedenti
2. Ricordera le sessioni passate
3. Conoscera gli obiettivi dell'utente
4. Usera tecniche cliniche appropriate
5. Sara personalizzata in base a preferenze e contesto
6. La connessione funzionera correttamente
