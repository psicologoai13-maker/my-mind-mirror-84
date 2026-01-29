

# Piano: Unificazione Check-in + Habits + Objectives in Griglia Unica Intelligente

## Analisi dei Problemi Attuali

### Problemi Identificati dalla Screenshot

1. **"Focus" incrementa a ogni click** - Il `HabitTrackerSection` ignora l'`inputMethod` e fa sempre `+1`
2. **"social_time" e "no_nail_biting"** - Mostrano icone a barre generiche (📊) invece di icone sensate
3. **Griglia Home ha elementi misti senza senso** - Mix di check-in AI, habits e obiettivi senza coerenza
4. **Separazione artificiale** - Utente vede sezioni diverse ma sono tutti "check-in" per lui

### Architettura Attuale (Frammentata)

```text
HOME PAGE
├── SmartCheckinSection (Check-in AI)
│   └── mood, anxiety, life_areas, psychology...
│
├── HabitTrackerSection (Habits)
│   └── Tutte le habits attive (BUG: sempre +1)
│
└── (Objectives non mostrati in Home)
```

### Architettura Target (Unificata)

```text
HOME PAGE
└── UnifiedCheckinGrid (SINGOLA SEZIONE)
    ├── AI seleziona 4-8 item prioritari tra:
    │   ├── Vitals (mood, anxiety, sleep...)
    │   ├── Habits attive dell'utente
    │   ├── Objectives attivi dell'utente
    │   └── Life areas / Psychology
    │
    └── Ogni item ha inputMethod appropriato:
        ├── toggle → Switch Sì/No
        ├── numeric → Input numerico
        ├── counter → +/-
        ├── timer → Play/Stop
        ├── emoji → 5 emoji
        └── abstain → "Oggi OK" / "Ho ceduto"
```

---

## Modifiche Tecniche

### 1. Eliminare `HabitTrackerSection` dalla Home

La sezione habits separata viene rimossa. Le habits vengono integrate nei check-in AI.

**File**: `src/pages/Index.tsx`
- Rimuovere import e rendering di `HabitTrackerSection`
- Solo `SmartCheckinSection` rimane

### 2. Aggiornare Edge Function `ai-checkins`

L'AI deve includere habits e objectives nella generazione della lista giornaliera.

**File**: `supabase/functions/ai-checkins/index.ts`

```typescript
// Aggiungere:
// 1. Leggere user_habits_config per habits attive
// 2. Leggere user_objectives per obiettivi attivi
// 3. Convertire habits a formato CheckinItem con inputMethod
// 4. AI decide quali mostrare (max 8 items)

// Nuovo formato item:
interface UnifiedCheckinItem {
  key: string;
  label: string;
  question: string;
  type: 'vital' | 'life_area' | 'emotion' | 'psychology' | 'habit' | 'objective';
  responseType: 'emoji' | 'yesno' | 'intensity' | 'slider' | 'numeric' | 'counter' | 'toggle' | 'timer' | 'abstain';
  // Per habits:
  habitType?: string;
  inputMethod?: string;
  target?: number;
  unit?: string;
  // Per objectives:
  objectiveId?: string;
}
```

### 3. Aggiornare `usePersonalizedCheckins.tsx`

Il hook deve gestire i nuovi tipi di item (habits, objectives).

**File**: `src/hooks/usePersonalizedCheckins.tsx`
- Aggiungere icone per habits (da HABIT_TYPES)
- Mappare inputMethod corretto per ogni habit
- Gestire salvataggio in `daily_habits` invece di `daily_checkins`

### 4. Aggiornare `SmartCheckinSection.tsx`

Rendere la UI per tutti i tipi di input.

**File**: `src/components/home/SmartCheckinSection.tsx`

Aggiungere rendering per:
- `toggle` → Switch grande con label
- `counter` → Bottoni +/- con valore centrale
- `timer` → Play/Pause con cronometro
- `abstain` → "Oggi OK" verde + "Ho ceduto" grigio
- `numeric` → (già esiste)
- `emoji` → (già esiste)

### 5. Aggiornare Salvataggio Dati

Quando l'utente risponde a un check-in di tipo habit, salvare in `daily_habits`:

```typescript
// In SmartCheckinSection.tsx
if (activeItem.type === 'habit') {
  await supabase.from('daily_habits').upsert({
    user_id: profile?.user_id,
    date: today,
    habit_type: activeItem.habitType,
    value: value,
    target_value: activeItem.target,
    unit: activeItem.unit,
  }, { onConflict: 'user_id,date,habit_type' });
}
```

---

## Icone Corrette per Habits

Le habits devono usare icone Lucide coerenti con il design system, non emoji random.

**Mappatura in `usePersonalizedCheckins.tsx`**:

```typescript
const habitIconMap: Record<string, LucideIcon> = {
  // Fitness
  steps: Footprints,
  exercise: Dumbbell,
  stretching: Stretch,
  yoga: Activity,
  // Health
  sleep: Moon,
  water: Droplet,
  weight: Scale,
  vitamins: Pill,
  sunlight: Sun,
  // Mental
  meditation: Brain,
  journaling: PenLine,
  gratitude: Heart,
  breathing: Wind,
  // Bad habits
  cigarettes: Ban,
  alcohol: Wine,
  no_junk_food: Salad,
  // Social
  social_interaction: Users,
  call_loved_one: Phone,
  // ... etc
};
```

---

## Logica AI per Selezione Giornaliera

L'AI deve scegliere i check-in più rilevanti per l'utente oggi:

**Priorità**:
1. **Obiettivi attivi** con `input_method != auto_*` (max 2)
2. **Habits non completate oggi** (max 3)
3. **Vitali** (mood sempre, altri in base a contesto)
4. **Life areas/Psychology** in base a sessioni recenti

**Criteri AI**:
- Se utente ha obiettivo peso → mostrare peso come check-in
- Se streak habit sta per rompersi → prioritizzare quella habit
- Se sessione recente parlava di ansia → mostrare check-in ansia
- Limitare a 4-8 items totali

---

## Struttura File Modificati

| File | Azione |
|------|--------|
| `src/pages/Index.tsx` | Rimuovere HabitTrackerSection |
| `supabase/functions/ai-checkins/index.ts` | Integrare habits e objectives |
| `src/hooks/usePersonalizedCheckins.tsx` | Aggiungere supporto habits/objectives |
| `src/components/home/SmartCheckinSection.tsx` | Aggiungere UI per toggle/counter/timer/abstain |
| `src/components/habits/HabitTrackerSection.tsx` | Deprecare (usato solo in Progressi) |

---

## Flusso Utente Finale

### Prima (Confuso)
1. Utente vede 8+ box check-in
2. Alcuni sono vitali, alcuni habits, alcuni obiettivi
3. Tutti con stesso comportamento click → non ha senso
4. "Focus" incrementa a ogni click (??)

### Dopo (Unificato e Intelligente)
1. Utente vede 4-8 box personalizzati per LUI
2. AI sceglie i più rilevanti oggi
3. Click su box → apre input specifico:
   - Peso → input numerico "Kg"
   - Meditazione → timer
   - Sigarette → "Oggi OK" / "Ho ceduto"
   - Mood → 5 emoji
4. Completato → box scompare, check verde

---

## Risultato Atteso

- **Unica griglia** nella Home per tutti i tracciamenti
- **Input intelligente** per ogni tipo di dato
- **Personalizzazione AI** su quali mostrare
- **Coerenza visiva** con icone Lucide e design Liquid Glass
- **Nessuna duplicazione** - habits non appaiono due volte

