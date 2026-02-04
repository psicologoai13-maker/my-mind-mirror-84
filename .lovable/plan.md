
# Piano: Sistema Focus AI Basato su Importanza (Non Valori)

## Problema Identificato

Il componente "I Tuoi Focus" nella Home mostra solo 2 metriche invece di 4 perche:

1. **L'AI non ha memoria dei focus precedenti**: ogni refresh giornaliero l'AI genera focus da zero senza sapere cosa c'era prima
2. **Il sistema non passa il contesto di stabilita**: il prompt dice "mantieni stabili" ma l'AI non sa quali ERANO i focus ieri
3. **Manca la logica di "importanza" vs "valore"**: l'AI tende a scegliere basandosi sui valori numerici invece che sull'importanza per l'utente

## Architettura Attuale (Corretta ma Incompleta)

```text
[Onboarding Goals] --> [ai-dashboard Edge Function] --> [primary_metrics]
                                    |
                       [AI Gemini genera 4 focus]
                                    |
                       [Cache in user_profiles.ai_dashboard_cache]
                                    |
              [AdaptiveVitalsSection mostra i 4 focus]
```

## Soluzione Proposta

### 1. Modificare Edge Function `ai-dashboard/index.ts`

**A) Passare i focus precedenti all'AI:**
- Leggere `ai_dashboard_cache.primary_metrics` dalla cache esistente
- Includere nel prompt: "FOCUS PRECEDENTI: mood, anxiety, love, growth"
- Istruire l'AI: "Mantieni questi focus a meno di cambiamento significativo (>20% variazione o nuovo evento critico)"

**B) Aggiungere contesto di "importanza":**
- Calcolare score di importanza per ogni metrica basato su:
  - Collegamento agli obiettivi onboarding (peso alto)
  - Frequenza di menzione nelle sessioni recenti (peso medio)
  - Valori critici (<4 o >8) che richiedono attenzione (peso medio)
  - Trend negativo negli ultimi 7 giorni (peso basso)

**C) Validazione post-AI:**
- Se l'AI cambia >2 focus rispetto a ieri, loggare il motivo
- Se non c'e un "evento significativo" rilevato, forzare mantenimento

### 2. Migliorare il System Prompt

Aggiungere sezione esplicita:
```
FOCUS PRECEDENTI (da mantenere se possibile):
${previousFocusKeys.join(', ')}

REGOLA CRITICA: Cambia i focus SOLO se:
1. C'e un nuovo evento traumatico/significativo nelle sessioni
2. Un obiettivo e stato raggiunto o abbandonato
3. Una metrica e passata da critica a normale (o viceversa)
4. L'utente ha esplicitamente chiesto di monitorare qualcosa di nuovo
```

### 3. Logica di Selezione Focus

**Priorita (dalla piu alta alla piu bassa):**

| Priorita | Criterio | Esempio |
|----------|----------|---------|
| 1 | Obiettivi onboarding attivi | Se goal="reduce_anxiety" -> ansia e sempre focus |
| 2 | Metriche con valori critici | rumination=8 -> rimuginazione diventa focus |
| 3 | Aree menzionate in sessioni recenti | "problemi al lavoro" -> work diventa focus |
| 4 | Trend negativi significativi | mood -3 in 7 giorni -> umore diventa focus |
| 5 | Metriche correlate agli obiettivi | goal="sleep" -> energy (correlato) |

### 4. Esempio di Output Atteso

**Utente con obiettivi: "anxiety", "relationships"**
**Sessioni recenti: "stress lavorativo", "litigio con partner"**

Focus selezionati (stabili):
1. **Ansia** (obiettivo primario)
2. **Amore** (obiettivo relationships + litigio menzionato)
3. **Lavoro** (stress lavorativo nelle sessioni)
4. **Umore** (metrica fondamentale sempre presente)

Questi focus rimangono FISSI finche:
- L'utente non raggiunge l'obiettivo "anxiety"
- Non emerge un nuovo problema critico
- L'utente non chiede esplicitamente di cambiare

## File da Modificare

| File | Modifica |
|------|----------|
| `supabase/functions/ai-dashboard/index.ts` | Passare cache precedente, migliorare prompt, aggiungere validazione |

## Implementazione Tecnica

```typescript
// Nella edge function, prima della chiamata AI:
const { data: profile } = await supabase
  .from('user_profiles')
  .select('ai_dashboard_cache, selected_goals')
  .eq('user_id', user.id)
  .single();

// Estrarre focus precedenti dalla cache
const previousCache = profile?.ai_dashboard_cache as DashboardLayout | null;
const previousFocusKeys = previousCache?.primary_metrics?.map(m => m.key) || [];

// Aggiungere al prompt utente:
const previousFocusSection = previousFocusKeys.length > 0
  ? `\nFOCUS ATTUALI DA MANTENERE: ${previousFocusKeys.join(', ')}\nCambia SOLO se c'e un motivo critico.`
  : '';
```

## Risultato Atteso

- I 4 focus vengono mostrati correttamente
- I focus sono basati su IMPORTANZA per l'utente, non sui valori numerici
- I focus rimangono stabili nel tempo (cambiano solo con eventi significativi)
- Le cose recenti (sessioni, diari) hanno piu peso di quelle vecchie
- Il sistema rispetta gli obiettivi onboarding come priorita massima
