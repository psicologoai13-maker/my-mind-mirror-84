
# Piano: Sistema Obiettivi Pre-impostati + Sincronizzazione Cervello

## Problema Attuale

Attualmente gli obiettivi:
- **Sono completamente liberi** → L'utente deve inventare tutto
- **Nessuna libreria predefinita** → Confusione su cosa tracciare
- **Input dati non intelligente** → Tutti usano lo stesso slider generico
- **Nessuna sincronizzazione cervello** → I dati non fluiscono automaticamente

## Soluzione: Pattern Parallelo alle Habits

Come per le habits, creiamo un sistema con:
1. **Libreria pre-impostata** di 40+ obiettivi tipici
2. **InputMethod intelligente** per ogni obiettivo
3. **Auto-aggiornamento dal cervello** dove possibile
4. **Input manuali via check-in** con tipo appropriato
5. **Quiz guidato** per obiettivi custom (l'AI determina il tipo)

---

## Architettura Dati degli Obiettivi

### Input Methods per Obiettivi

| InputMethod | Uso | Esempio Obiettivo |
|-------------|-----|-------------------|
| `auto_body` | Da habits peso/body_metrics | "Perdere 5kg" |
| `auto_habit` | Da habits correlate | "Meditare 30min/giorno" |
| `numeric` | Input diretto check-in | "Risparmiare 5000€" |
| `milestone` | Check qualitativo | "Superare esame" |
| `counter` | Conteggio progressivo | "Leggere 12 libri" |
| `time_based` | Timer/durata | "Correre 5km" |
| `session_detected` | Rilevato da Aria | "Migliorare autostima" |

### Flusso Dati: Cervello → Obiettivi

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUSSO DATI OBIETTIVI                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   HABITS     │    │   SESSIONS   │    │   CHECK-INS  │  │
│  │ (peso, passi │    │ (chat/voice) │    │  (manuali)   │  │
│  │  sonno, ...)│    │              │    │              │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │          │
│         ▼                   ▼                   ▼          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            CERVELLO (process-session)               │   │
│  │  • Rileva menzioni obiettivi                        │   │
│  │  • Estrae valori numerici                           │   │
│  │  • Aggiorna current_value automaticamente           │   │
│  └─────────────────────────┬───────────────────────────┘   │
│                            │                               │
│                            ▼                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  user_objectives                     │   │
│  │  • current_value aggiornato                          │   │
│  │  • progress_history con timestamp                    │   │
│  │  • source: 'habit' | 'session' | 'checkin'          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Libreria Obiettivi Pre-impostati (OBJECTIVE_TYPES)

### Struttura Tipo Obiettivo

```typescript
export type ObjectiveInputMethod = 
  | 'auto_body'        // Sync da weight/body_metrics
  | 'auto_habit'       // Sync da habit correlata
  | 'numeric'          // Input numerico diretto
  | 'milestone'        // Traguardo qualitativo (sì/raggiunto)
  | 'counter'          // Conteggio incrementale
  | 'time_based'       // Tempo/durata
  | 'session_detected'; // Rilevato da AI nelle conversazioni

export interface ObjectiveMeta {
  label: string;
  icon: string;
  category: ObjectiveCategory;
  description: string;
  inputMethod: ObjectiveInputMethod;
  unit?: string;
  defaultTarget?: number;
  // Sincronizzazione
  linkedHabit?: string;       // Es: 'weight' per obiettivo peso
  linkedBodyMetric?: string;  // Es: 'weight' da body_metrics
  brainDetectable?: boolean;  // L'AI può rilevare progressi
  // Validazione
  requiresStartingValue?: boolean;
  step?: number;
  min?: number;
  max?: number;
}
```

### Catalogo Obiettivi (40+)

**BODY - Corpo (8 obiettivi)**
- `lose_weight` - Perdere peso (auto_body, kg, requires starting)
- `gain_weight` - Prendere peso (auto_body, kg, requires starting)  
- `gain_muscle` - Aumentare massa muscolare (auto_body, kg)
- `run_distance` - Correre X km (time_based, km)
- `complete_marathon` - Completare maratona (milestone)
- `flexibility_goal` - Migliorare flessibilità (session_detected)
- `body_composition` - Ridurre % grasso (numeric, %)
- `physical_strength` - Aumentare forza (counter, reps/peso)

**MIND - Mente (8 obiettivi)**
- `reduce_anxiety` - Ridurre ansia (session_detected)
- `improve_sleep` - Dormire meglio (auto_habit → sleep)
- `emotional_stability` - Stabilità emotiva (session_detected)
- `meditation_habit` - Meditare regolarmente (auto_habit → meditation)
- `stress_management` - Gestire stress (session_detected)
- `self_esteem` - Migliorare autostima (session_detected)
- `mindfulness` - Praticare mindfulness (auto_habit)
- `therapy_progress` - Progresso in terapia (milestone)

**STUDY - Studio (6 obiettivi)**
- `pass_exam` - Superare esame (milestone)
- `study_hours` - Studiare X ore/settimana (counter, ore)
- `read_books` - Leggere X libri (counter, libri)
- `learn_language` - Imparare lingua (milestone)
- `complete_course` - Completare corso (milestone)
- `academic_grade` - Raggiungere voto (numeric, voto)

**WORK - Lavoro (6 obiettivi)**
- `get_promotion` - Ottenere promozione (milestone)
- `change_job` - Cambiare lavoro (milestone)
- `productivity` - Aumentare produttività (session_detected)
- `work_life_balance` - Bilanciare vita-lavoro (session_detected)
- `project_completion` - Completare progetto (milestone)
- `skill_development` - Sviluppare competenza (milestone)

**FINANCE - Finanze (6 obiettivi)**
- `save_money` - Risparmiare (numeric, €, requires starting)
- `pay_debt` - Estinguere debito (numeric, €, requires starting)
- `emergency_fund` - Fondo emergenza (numeric, €)
- `investment_goal` - Obiettivo investimento (numeric, €)
- `income_increase` - Aumentare entrate (numeric, €)
- `spending_reduction` - Ridurre spese (numeric, €)

**RELATIONSHIPS - Relazioni (4 obiettivi)**
- `find_partner` - Trovare partner (milestone)
- `improve_relationship` - Migliorare relazione (session_detected)
- `social_connections` - Più connessioni sociali (counter)
- `family_time` - Più tempo famiglia (auto_habit)

**GROWTH - Crescita (4 obiettivi)**
- `new_hobby` - Iniziare hobby (milestone)
- `public_speaking` - Parlare in pubblico (milestone)
- `creative_project` - Progetto creativo (milestone)
- `personal_brand` - Costruire personal brand (milestone)

---

## Sincronizzazione Automatica dal Cervello

### 1. Habits → Obiettivi (Automatico)

Quando una habit ha `syncToObjective: true`, il valore aggiorna l'obiettivo correlato:

```typescript
// In sync-habits-to-brain o process-session
if (habit.type === 'weight' && habit.value) {
  // Trova obiettivo peso attivo
  const weightObjective = activeObjectives.find(o => 
    o.category === 'body' && 
    (o.title.includes('peso') || o.linkedHabit === 'weight')
  );
  
  if (weightObjective) {
    await updateObjectiveProgress(weightObjective.id, habit.value, 'habit');
  }
}
```

### 2. Sessions → Obiettivi (AI Detection)

Il cervello già rileva progressi nelle conversazioni. Espandiamo:

- **Obiettivi `session_detected`**: L'AI valuta il progresso qualitativo
- **Esempio**: "Mi sento meno ansioso" → aggiorna `reduce_anxiety` con +10 score

### 3. Check-ins → Obiettivi (Manuale)

Per obiettivi che richiedono input manuale:

- `numeric`: Input diretto (es. "Quanto hai risparmiato oggi?")
- `counter`: +1/-1 (es. "Libri letti questo mese")
- `milestone`: Checkbox (es. "Hai superato l'esame?")

---

## Modifiche ai Check-in

### Logica Intelligente per Tipo Input

```typescript
// In ai-checkins Edge Function
const generateObjectiveCheckin = (objective: Objective, meta: ObjectiveMeta) => {
  switch (meta.inputMethod) {
    case 'auto_body':
    case 'auto_habit':
      // Non generare check-in, viene sincronizzato automaticamente
      return null;
      
    case 'numeric':
      return {
        key: `obj_${objective.id}`,
        question: getNumericQuestion(objective, meta),
        responseType: 'numeric',
        unit: meta.unit,
      };
      
    case 'counter':
      return {
        key: `obj_${objective.id}`,
        question: `Quanti ${meta.unit} per "${objective.title}"?`,
        responseType: 'counter',
      };
      
    case 'milestone':
      return {
        key: `obj_${objective.id}`,
        question: `Hai fatto progressi su "${objective.title}"?`,
        responseType: 'yesno',
      };
      
    case 'session_detected':
      // Nessun check-in, l'AI rileva nelle conversazioni
      return null;
  }
};
```

---

## Quiz per Obiettivi Custom

Quando l'utente vuole creare un obiettivo personalizzato:

### Flusso Quiz (5 step)

1. **Cosa vuoi raggiungere?** (Input libero)
2. **In quale area?** (Selezione categoria)
3. **È misurabile?** (Sì/No → determina inputMethod)
4. **Qual è il target?** (Se numerico)
5. **Punto di partenza?** (Se richiesto)

### AI Determination

```typescript
// L'AI analizza l'input libero e suggerisce:
const analyzeCustomObjective = async (description: string) => {
  // Prompt AI per determinare:
  return {
    suggestedCategory: 'body' | 'mind' | ...,
    suggestedInputMethod: 'numeric' | 'milestone' | ...,
    suggestedUnit: 'kg' | '€' | null,
    needsStartingValue: true | false,
    matchingPreset: 'lose_weight' | null, // Se esiste preset simile
  };
};
```

---

## Modifiche Database

### Colonne da Aggiungere a user_objectives

```sql
ALTER TABLE user_objectives 
ADD COLUMN input_method text DEFAULT 'numeric',
ADD COLUMN linked_habit text,
ADD COLUMN linked_body_metric text,
ADD COLUMN preset_type text,  -- Es: 'lose_weight', null se custom
ADD COLUMN auto_sync_enabled boolean DEFAULT false,
ADD COLUMN last_auto_sync_at timestamptz,
ADD COLUMN progress_source text DEFAULT 'manual'; -- 'habit' | 'session' | 'checkin' | 'manual'
```

---

## File da Modificare/Creare

### Core Sistema Obiettivi

1. **`src/hooks/useObjectives.tsx`**
   - Aggiungere `OBJECTIVE_TYPES` (libreria predefinita)
   - Aggiungere `ObjectiveMeta` interface
   - Funzione `getObjectiveMeta(type)` 
   - Logica per sync da habits

2. **`src/components/objectives/NewObjectiveModal.tsx`** → **Rifare completamente**
   - Step 1: Scegli da libreria O "Personalizzato"
   - Step 2: Se libreria → configura target
   - Step 3: Se custom → quiz guidato
   - Design quiz-style con animazioni

3. **`src/components/objectives/ObjectiveCard.tsx`**
   - Mostrare badge "Auto-sync" se collegato a habit
   - UI diversa in base a `inputMethod`

4. **`src/components/objectives/ObjectiveSelectionGrid.tsx`** (NUOVO)
   - Griglia selezione obiettivi predefiniti
   - Filtri per categoria
   - Ricerca

### Check-in Integration

5. **`supabase/functions/ai-checkins/index.ts`**
   - Saltare obiettivi `auto_body` e `auto_habit`
   - Generare check-in appropriati per `numeric`, `counter`, `milestone`

### Cervello / Sync

6. **`supabase/functions/sync-habits-to-brain/index.ts`**
   - Aggiungere logica sync habits → objectives
   - Es: peso da habit → obiettivo peso

7. **`supabase/functions/process-session/index.ts`**
   - Migliorare rilevamento progressi `session_detected`
   - Aggiornare obiettivi qualitativi (ansia, autostima)

### Database

8. **Migration SQL**
   - Nuove colonne su `user_objectives`

---

## Priorità Implementazione

### Fase 1: Libreria + Modal Quiz
- Creare `OBJECTIVE_TYPES` in useObjectives
- Rifare NewObjectiveModal come quiz
- Griglia selezione obiettivi

### Fase 2: Auto-sync Habits → Objectives  
- Modificare sync-habits-to-brain
- Collegare peso/sonno/esercizio a obiettivi

### Fase 3: Check-in Intelligenti
- Aggiornare ai-checkins per skip auto-sync
- Input appropriati per ogni tipo

### Fase 4: Session Detection Migliorato
- Espandere process-session per obiettivi qualitativi
- Progressi per ansia, autostima, relazioni

---

## Esempio Flusso Utente

### Scenario 1: Obiettivo Peso (Auto-sync)

1. Utente seleziona "Perdere peso" dalla libreria
2. Sistema chiede: "Quanto pesi ora?" → 80kg
3. Sistema chiede: "Obiettivo?" → 70kg
4. Obiettivo creato con `input_method: 'auto_body'`
5. Quando utente registra peso nella habit → obiettivo si aggiorna automaticamente
6. Check-in NON chiede il peso (già sincronizzato)

### Scenario 2: Obiettivo Studio (Counter)

1. Utente seleziona "Leggere X libri"
2. Sistema chiede: "Quanti libri?" → 12
3. Obiettivo creato con `input_method: 'counter'`
4. Check-in mostra: "Hai finito un libro?" con +1
5. Aria nelle sessioni: "Ho finito di leggere..." → +1 automatico

### Scenario 3: Obiettivo Ansia (Session Detected)

1. Utente seleziona "Ridurre ansia"
2. Nessun target numerico richiesto
3. Obiettivo creato con `input_method: 'session_detected'`
4. Nelle sessioni, Aria rileva: "Mi sento più calmo" → progresso aggiornato
5. Check-in NON chiede (troppo intrusivo)

---

## Risultato Finale

- **40+ obiettivi predefiniti** organizzati per categoria
- **6 tipi di input** intelligenti per ogni obiettivo
- **Auto-sync** da habits e body_metrics dove possibile
- **AI detection** per obiettivi qualitativi
- **Check-in** solo dove necessario, con tipo appropriato
- **Quiz guidato** per obiettivi custom
- **Tutto collegato al cervello** per insights cross-category
