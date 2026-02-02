
# Piano: Sistema di Tracking Intelligente con Gestione Temporale

## Problemi Identificati

1. **Confusione Traguardi vs Daily Tracker**: Non è chiaro quando usare uno o l'altro
2. **Pagina troppo lunga**: Ogni habit ha una card separata
3. **Timing errato**: "Hai fatto cardio oggi?" alle 7 di mattina non ha senso
4. **Dati mancanti = "No"**: Se l'utente non apre l'app, perdiamo informazioni
5. **Obbligo multipli accessi**: Non possiamo pretendere accesso mattina E sera

## Soluzione Proposta

### Fase 1: Sistema Temporale Intelligente

**1.1 Domande Contestuali per Orario**

```text
┌─────────────────────────────────────────────────────────────┐
│  MATTINA (6:00 - 14:00)                                     │
│  ─────────────────────                                      │
│  Domande su:                                                │
│  • Sonno di stanotte ("Quante ore hai dormito?")           │
│  • Habits mattutine ("Hai preso le vitamine?")             │
│  • Recap IERI ("Ieri hai fatto esercizio? Meditazione?")   │
│                                                             │
│  POMERIGGIO/SERA (14:00 - 6:00)                             │
│  ───────────────────────────────                            │
│  Domande su:                                                │
│  • Attività di OGGI ("Hai fatto cardio oggi?")             │
│  • Habits giornaliere ("Quanti bicchieri d'acqua?")        │
│  • Abstain ("Hai evitato il junk food?")                   │
└─────────────────────────────────────────────────────────────┘
```

**1.2 Recap Giornaliero**
- Se l'utente non ha risposto ieri, mostrare prima un mini-recap
- "Come è andata ieri?" con le habits più importanti
- Permette di recuperare dati retroattivamente

### Fase 2: UI Compatta per Daily Tracker

**2.1 Griglia Compatta invece di Cards Singole**

Invece di:
```text
┌────────────────────┐
│ 🧘 Meditazione     │
│ Hai meditato oggi? │
│ [Sì] [No]          │
└────────────────────┘
┌────────────────────┐
│ 🏃 Esercizio       │
│ ...                │
└────────────────────┘
(ripetuto 20 volte)
```

Mostrare:
```text
┌────────────────────────────────────────────┐
│  📊 Le Tue Habits (5/12 completate)        │
├────────────────────────────────────────────┤
│  ✅ 🧘 Meditazione     │  ⏳ 💪 Esercizio  │
│  ✅ 💊 Vitamine        │  ⏳ 💧 Acqua 5/8  │
│  ❌ 🍔 No Junk Food    │  ⏳ 🧘 Yoga       │
│  [Espandi per dettagli]                    │
└────────────────────────────────────────────┘
```

**2.2 Modal di Inserimento Batch**
- Cliccando sulla griglia si apre un modal veloce
- Tutte le habits in una lista scrollabile
- Toggle/Counter rapidi per ogni voce
- Un solo "Salva tutto" alla fine

### Fase 3: Chiarimento Traguardi vs Habits

**3.1 Tooltip/Info Esplicativo**

```text
┌─────────────────────────────────────────────────────────────┐
│  🎯 TRAGUARDI                                               │
│  Obiettivi a lungo termine con un punto di arrivo          │
│  Es: "Perdere 5kg", "Risparmiare €2000", "Smettere fumare" │
│                                                             │
│  📊 DAILY TRACKER                                           │
│  Abitudini ricorrenti da fare ogni giorno                  │
│  Es: "Meditare", "8 bicchieri d'acqua", "No social media"  │
└─────────────────────────────────────────────────────────────┘
```

**3.2 Suggerimento Automatico**
- Quando l'utente crea qualcosa, Aria suggerisce la categoria giusta
- "Fumare meno" → Traguardo (obiettivo decrescente)
- "Non fumare oggi" → Habit (abstain giornaliero)

### Fase 4: Raccolta Dati Proattiva via Chat

**4.1 Weekly Summary Questions**
Per habits con update_method='chat', Aria chiede durante le sessioni:

```text
Aria: "A proposito, come sta andando con il cardio? 
       Quante volte l'hai fatto questa settimana?"
```

**4.2 Backfill Intelligente**
Se l'utente non ha loggato per 2-3 giorni:

```text
Aria: "Non ti ho sentito per qualche giorno! 
       Vuoi fare un rapido recap di come sono andati 
       questi giorni con le tue abitudini?"
```

### Fase 5: Schema Database (Retroattività)

**5.1 Nuova Colonna per Status**
```sql
ALTER TABLE daily_habits 
ADD COLUMN entry_source TEXT DEFAULT 'same_day';
-- Values: 'same_day', 'next_day_recap', 'weekly_summary', 'chat_detected'
```

Questo permette di distinguere dati "certi" (inseriti lo stesso giorno) da dati "ricordati" (inseriti dopo).

## Dettagli Tecnici

### File da Modificare

1. `src/hooks/usePersonalizedCheckins.tsx`
   - Aggiungere logica temporale (mattina vs sera)
   - Generare domande su IERI se è mattina

2. `src/components/objectives/DailyTrackerTabContent.tsx`
   - Sostituire cards individuali con griglia compatta
   - Aggiungere modal batch input

3. `supabase/functions/ai-checkins/index.ts`
   - Modificare prompt per considerare l'ora del giorno
   - Generare domande retroattive per ieri

4. `src/pages/Objectives.tsx`
   - Aggiungere tooltip esplicativo per le due tab

### Nuovi Componenti

1. `src/components/habits/HabitBatchModal.tsx` - Modal per inserimento multiplo
2. `src/components/habits/CompactHabitGrid.tsx` - Griglia compatta habits
3. `src/components/home/YesterdayRecapSection.tsx` - Sezione recap ieri

## Risultato Atteso

**Per l'utente:**
1. Apre app alle 7am → Vede domande su IERI + sonno/vitamine
2. Apre app alle 19pm → Vede domande su OGGI
3. Non apre app per 2 giorni → Aria chiede recap in chat
4. Daily Tracker → Pagina compatta con griglia, non 20 cards separate
5. Chiara distinzione: Traguardi = obiettivi finali, Habits = routine quotidiane

**Per i dati:**
1. Più dati raccolti grazie al sistema retroattivo
2. Dati taggati per fonte (stesso giorno vs recap)
3. Habits con update_method='chat' vengono chieste durante conversazioni
