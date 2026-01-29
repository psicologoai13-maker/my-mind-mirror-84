

# Piano: Fix Habits - Input Intelligenti, Icone Corrette, Flusso Apparizione

## Problemi Identificati (Screenshot Analysis)

| Habit | Problema | Causa | Fix |
|-------|----------|-------|-----|
| **social_time** | Icona 📊, counter manuale minuti | Non esiste in HABIT_TYPES | Rimuovere o rinominare a habit valida |
| **new_connection** | Icona 📊, counter | Non esiste in HABIT_TYPES | Usare `networking` o `social_interaction` |
| **no_smoking** | Counter invece di abstain | HabitTrackerSection ignora inputMethod | Fix rendering nella sezione |
| **no_nail_biting** | Counter invece di abstain | Stesso bug | Stesso fix |
| **Esercizio** | Timer che parte nell'app | Timer non ha senso per web (serve sync app esterna) | Cambiare a `toggle` per web o nascondere |
| **Battito** | Mostra fallback "sync nativa" | Corretto ma UX confusa | Migliorare messaggio |

---

## Problema 1: Habits Mancanti in HABIT_TYPES

### Habit non definite che appaiono nella screenshot:
- `social_time` → Non esiste
- `new_connection` → Non esiste
- `no_smoking` → Non esiste (esiste `cigarettes`)
- `no_nail_biting` → Non esiste (esiste `nail_biting`)

### Fix: Normalizzazione Nomi

```typescript
// Mappatura alias per retrocompatibilità
const HABIT_ALIASES: Record<string, string> = {
  'social_time': 'social_media', // O rimuovere
  'new_connection': 'networking',
  'no_smoking': 'cigarettes',
  'no_nail_biting': 'nail_biting',
  'no-smoking': 'cigarettes', // Variante con trattino
};
```

**File da modificare**: `src/hooks/useHabits.tsx`

---

## Problema 2: DailyTrackerTabContent Ignora inputMethod

### Codice Attuale (BUG):
```typescript
onClick={() => {
  if (isAbstain) {
    handleLogHabit(habit.habit_type, 0);
  } else {
    handleLogHabit(habit.habit_type, habit.todayValue + 1); // SEMPRE +1!
  }
}}
```

### Fix: Usare HabitCard invece di button inline

Il `HabitCard.tsx` già gestisce correttamente tutti gli inputMethod. Il problema è che `DailyTrackerTabContent` **non usa HabitCard** per la griglia compatta, ma render custom inline che fa sempre +1.

**Soluzione**: 
1. La griglia compatta della Home dovrebbe andare via (già rimossa in SmartCheckinSection)
2. La pagina Progressi → Daily Tracker usa già `HabitCard` correttamente

---

## Problema 3: Habits che Richiedono Dati Esterni

### Categorie di Dati:

| Tipo | Sorgente | Input Web | Input Nativo |
|------|----------|-----------|--------------|
| **Passi/Steps** | Contapassi telefono | ❌ Nascondere | Auto-sync |
| **Battito cardiaco** | Smartwatch/Health | ❌ Nascondere | Auto-sync |
| **Esercizio** | App fitness esterne | Toggle "Hai fatto esercizio?" | Auto-sync durata |
| **Sonno** | Sleep tracker | Numeric input ore | Auto-sync |
| **Peso** | Bilancia smart o manuale | Numeric input kg | ✓ Manuale OK |
| **Sigarette** | Utente sa se ha fumato | Abstain "Oggi OK" / "Ceduto" + range | ✓ Manuale OK |
| **Social Time** | Screen Time telefono | ❌ Nascondere | Auto-sync |

### Nuovo Flag: `requiresExternalSync`

```typescript
interface HabitMeta {
  // ... esistenti
  requiresExternalSync?: boolean;  // Nasconde su web, richiede app nativa
  webFallback?: InputMethod;       // Se presente, usa questo metodo su web
}
```

### Aggiornamento HABIT_TYPES:

```typescript
steps: {
  // ...
  inputMethod: 'auto_sync',
  requiresExternalSync: true,
  // No webFallback = non appare su web
},

exercise: {
  // ...
  inputMethod: 'auto_sync',
  requiresExternalSync: true,
  webFallback: 'toggle', // Su web: "Hai fatto esercizio oggi?"
},

cigarettes: {
  // ...
  inputMethod: 'abstain',
  // webFallback non necessario, abstain funziona su web
},
```

---

## Problema 4: Sigarette con Range Preimpostati

L'utente chiede che "smoking dovrebbe avere risposte preimpostate: 0, meno di 5, 5-10, 10-20, 20+"

### Nuovo inputMethod: `range`

```typescript
export type InputMethod = 
  | 'toggle'
  | 'numeric'
  | 'counter'
  | 'abstain'
  | 'timer'
  | 'auto_sync'
  | 'range';  // NEW

// Range configuration
interface RangeOption {
  label: string;
  value: number;
}

cigarettes: {
  label: 'Sigarette',
  inputMethod: 'range',
  rangeOptions: [
    { label: 'Nessuna 🎉', value: 0 },
    { label: '1-5', value: 3 },
    { label: '6-10', value: 8 },
    { label: '11-20', value: 15 },
    { label: '20+', value: 25 },
  ],
  question: 'Quante sigarette oggi?',
},
```

### UI per Range Input:
```text
┌─────────────────────────────────────┐
│  Quante sigarette oggi?             │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │  0   │ │ 1-5  │ │ 6-10 │        │
│  │  🎉  │ │      │ │      │        │
│  └──────┘ └──────┘ └──────┘        │
│  ┌──────┐ ┌──────┐                 │
│  │11-20 │ │ 20+  │                 │
│  └──────┘ └──────┘                 │
└─────────────────────────────────────┘
```

---

## Problema 5: Flusso Apparizione Habits/Obiettivi

### Come DEVONO comparire (da requisiti):

1. **Utente lo dice ad Aria** → AI rileva e propone di aggiungere
2. **Aggiunta manuale** → Sezione Progressi → + Aggiungi
3. **Quiz onboarding** → Selezione iniziale
4. **Aria rileva potenziale habit** → Chiede conferma

### Implementazione:

**1. Rilevamento da Aria (process-session):**
```typescript
// Nel process-session, dopo analisi transcript:
if (detectedNewHabit && !userHasHabit(detectedNewHabit)) {
  // Salva in user_profiles.pending_habit_suggestions
  await savePendingHabitSuggestion(userId, {
    habitType: detectedNewHabit,
    reason: "Hai menzionato che vuoi...",
    detectedAt: new Date(),
  });
}
```

**2. UI per Suggerimenti Pending:**
```text
┌─────────────────────────────────────┐
│  💡 Aria ha notato qualcosa         │
│                                     │
│  Hai menzionato di voler smettere   │
│  di fumare. Vuoi tracciare questa   │
│  habit?                             │
│                                     │
│  [Sì, aggiungi] [No, ignora]        │
└─────────────────────────────────────┘
```

---

## Problema 6: Icone Fallback a Bar Chart

### Causa:
Quando `habit_type` non esiste in HABIT_TYPES, il fallback è `'📊'`

### Fix:
1. Usare aliases per nomi varianti
2. Icona di fallback più sensata (`Activity` invece di bar chart)
3. Log warning per habit non mappate

```typescript
const getHabitMeta = (habitType: string): HabitMeta | null => {
  // Check direct match
  if (HABIT_TYPES[habitType]) {
    return HABIT_TYPES[habitType];
  }
  
  // Check aliases
  const aliased = HABIT_ALIASES[habitType];
  if (aliased && HABIT_TYPES[aliased]) {
    return HABIT_TYPES[aliased];
  }
  
  console.warn(`[Habits] Unknown habit type: ${habitType}`);
  return null;
};
```

---

## File da Modificare

### 1. `src/hooks/useHabits.tsx`
- Aggiungere `HABIT_ALIASES`
- Aggiungere `requiresExternalSync` e `webFallback`
- Aggiungere `range` input method con `rangeOptions`
- Funzione `getHabitMeta()` con alias resolution

### 2. `src/components/habits/HabitCard.tsx`
- Aggiungere `RangeInput` component per sigarette
- Gestire `requiresExternalSync` (mostrare messaggio "Disponibile con app nativa")
- Usare `webFallback` se presente

### 3. `src/components/home/SmartCheckinSection.tsx`
- Aggiungere rendering per `range` responseType
- Gestire habits con `requiresExternalSync`

### 4. `supabase/functions/ai-checkins/index.ts`
- Aggiornare HABIT_METADATA con `range` e nuovi campi
- Filtrare habits `requiresExternalSync: true` senza `webFallback`

### 5. `src/hooks/usePersonalizedCheckins.tsx`
- Aggiungere mapping per `range` responseType
- Aggiungere icone per nuove habits

### 6. `supabase/functions/process-session/index.ts`
- Aggiungere rilevamento nuove habits/obiettivi da conversazione
- Salvare in `pending_habit_suggestions`

### 7. Nuovo: `src/components/home/HabitSuggestionCard.tsx`
- UI per mostrare suggerimenti Aria
- Bottoni "Aggiungi" / "Ignora"

---

## Risultato Atteso

| Prima | Dopo |
|-------|------|
| social_time con 📊 e +/- | Nascosto (richiede sync) o rinominato |
| no_smoking con counter | "Quante sigarette?" con 0, 1-5, 6-10... |
| Esercizio con timer | Toggle "Fatto esercizio?" o nascosto |
| Habits random appaiono | Solo quelle scelte da utente o suggerite da Aria |
| Tutto usa +1 | Input method appropriato per ogni habit |

---

## Priorità Implementazione

1. **Alta**: Fix input methods (abstain, range per sigarette)
2. **Alta**: Aggiungere HABIT_ALIASES per retrocompatibilità
3. **Media**: Flag `requiresExternalSync` per nascondere habits non tracciabili su web
4. **Media**: UI RangeInput per sigarette
5. **Bassa**: Rilevamento habits da Aria in process-session

