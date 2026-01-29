
# Piano: Ristrutturazione Habits + Architettura Dati Unificata al "Cervello"

## Analisi del Problema Attuale

### Problemi Identificati nelle Habits

1. **Input Method Non Intelligente**
   - Tutte le habits usano +/- indiscriminatamente
   - "Tempo con altri" chiede di incrementare minuti manualmente → assurdo
   - Nessuna differenziazione per tipo di dato

2. **Habits Poco Sensate per Categoria**
   - `social_time`: "30 minuti" come target giornaliero con +/- è innaturale
   - `steps`: dovrebbe essere auto-sync, non manuale
   - `weight`: dovrebbe essere numerico diretto, non +/-
   - `sleep`: ore con decimali, non +/-

3. **Mancanza di Input Methods Intelligenti**
   - Non esistono: toggle (sì/no), input numerico diretto, sincronizzazione automatica
   - Tutto è ricondotto a +/- o slider

4. **Nessuna Integrazione con Dati Esterni**
   - Predisposizione DB esiste (`data_source`, `auto_sync_enabled`) ma mai implementata
   - Nessun collegamento con Apple Health / Google Fit / wearables

---

## Architettura Dati Attuale vs. Obiettivo

### Flussi Dati ATTUALI (Già Collegati al Cervello ✅)
```
                    ┌─────────────────────────────────────┐
                    │         UNIFIED BRAIN              │
                    │    (process-session Edge Fn)       │
                    └─────────────────────────────────────┘
                              ▲        ▲        ▲
                              │        │        │
              ┌───────────────┼────────┼────────┼───────────────┐
              │               │        │        │               │
        ╔═══════════╗   ╔══════════╗   ╔═══════════╗   ╔═══════════╗
        ║ Sessions  ║   ║ Diaries  ║   ║ Check-ins ║   ║ Real-Time ║
        ║ (Chat/    ║   ║ Tematici ║   ║ (Home)    ║   ║ Context   ║
        ║  Voice)   ║   ╚══════════╝   ╚═══════════╝   ║ (Meteo/   ║
        ╚═══════════╝                                   ║ News/Loc) ║
              │               │              │         ╚═══════════╝
              ▼               ▼              ▼               │
        ┌─────────────────────────────────────┐              │
        │    Tabelle Unificate (daily_*)      │◄─────────────┘
        │ - daily_emotions                    │
        │ - daily_life_areas                  │
        │ - daily_psychology                  │
        │ - sessions                          │
        └─────────────────────────────────────┘
```

### Flussi Dati MANCANTI (Da Collegare ❌)
```
    ╔═══════════════════════════════════╗
    ║     DATI NON COLLEGATI AL         ║
    ║     CERVELLO ATTUALMENTE          ║
    ╠═══════════════════════════════════╣
    ║ • daily_habits (abitudini)        ║  ← Non elaborati da AI
    ║ • body_metrics (peso, sonno)      ║  ← Non elaborati da AI
    ║ • user_objectives (progressi)     ║  ← Parzialmente collegati
    ║ • External APIs (Health/Fit)      ║  ← Non esistono
    ╚═══════════════════════════════════╝
```

---

## Soluzione Strutturale: Input Methods Intelligenti

### Nuovo Sistema di Input per Habits

Ogni habit deve avere un `inputMethod` appropriato:

| Input Method | Uso | Esempio |
|--------------|-----|---------|
| `toggle` | Sì/No binario | "Hai meditato oggi?", "Hai preso le vitamine?" |
| `numeric` | Valore diretto | "Quanto pesi?", "Ore dormite?" |
| `counter` | +/- con target | "Bicchieri d'acqua" (0→8) |
| `abstain` | Obiettivo zero | "Sigarette fumate" (0 = successo) |
| `timer` | Avvio/Stop tempo | "Tempo meditazione" |
| `auto_sync` | Da fonte esterna | "Passi" (da Apple Health) |

### Libreria Habits Ristrutturata (40+ habits)

**FITNESS - Con Input Intelligente**
```typescript
steps: { 
  inputMethod: 'auto_sync',  // ← Da Health app
  fallbackMethod: 'numeric', // ← Manuale se no permessi
  label: 'Passi',
  unit: 'passi',
  defaultTarget: 10000,
  autoSyncSource: 'health_kit|google_fit'
}

exercise: {
  inputMethod: 'timer',  // ← Avvia/ferma cronometro
  label: 'Esercizio',
  unit: 'min',
  defaultTarget: 30
}
```

**HEALTH - Valori Numerici Diretti**
```typescript
sleep: {
  inputMethod: 'numeric',  // ← Input ore diretto (es. 7.5)
  label: 'Ore Sonno',
  unit: 'ore',
  defaultTarget: 8,
  step: 0.5,  // incrementi di mezz'ora
  min: 0,
  max: 14
}

weight: {
  inputMethod: 'numeric',
  label: 'Peso',
  unit: 'kg',
  defaultTarget: null,  // no target giornaliero
  syncToObjective: true  // collega automaticamente a obiettivi body
}
```

**SOCIAL - Toggle e Contatori**
```typescript
social_interaction: {
  inputMethod: 'toggle',  // ← "Hai socializzato oggi?" Sì/No
  label: 'Interazione Sociale',
  question: 'Hai trascorso tempo con qualcuno oggi?'
}

call_friend: {
  inputMethod: 'counter',  // ← +1 ogni chiamata
  label: 'Chiamate',
  unit: 'chiamate',
  defaultTarget: 1
}
```

**BAD HABITS - Astinenza con Celebrazione**
```typescript
cigarettes: {
  inputMethod: 'abstain',  // ← Default 0, bottone "Ho fumato" se slip
  label: 'Sigarette',
  unit: 'sigarette',
  defaultTarget: 0,
  streakCelebration: true  // Mostra "🔥 7 giorni senza!" 
}
```

---

## Nuova Architettura: Tutto al Cervello

### Fase 1: Habits → Cervello

Creare edge function `sync-habits-to-brain` che:
1. Legge `daily_habits` dell'utente
2. Traduce in metriche comprensibili dall'AI
3. Salva in formato processabile (o invia a `process-session`)

```typescript
// Mapping habits → metriche cervello
const HABITS_TO_BRAIN_METRICS = {
  sleep: { type: 'vital', metric: 'sleep_quality' },
  water: { type: 'health', metric: 'hydration' },
  exercise: { type: 'health', metric: 'physical_activity' },
  meditation: { type: 'psychology', metric: 'mindfulness_practice' },
  cigarettes: { type: 'behavior', metric: 'smoking_status' },
  steps: { type: 'fitness', metric: 'daily_activity' }
};
```

### Fase 2: External Data Sources

1. **Apple Health (HealthKit)** - Richiede app nativa (Phase B)
   - Passi, battito cardiaco, sonno, calorie

2. **Google Fit** - Richiede app nativa (Phase B)
   - Stesso set di dati

3. **Web-Based Fallback** (Phase A - ORA)
   - Input manuale intelligente
   - Importazione CSV da export Health
   - Integrazione Strava/Garmin via OAuth (futuro)

### Fase 3: Unified Data Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED DATA HUB                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Sessions │ │ Diaries  │ │ Check-in │ │ External Sources │   │
│  │ (Chat/   │ │ Tematici │ │ (Home)   │ │ • Health Apps    │   │
│  │  Voice)  │ │          │ │          │ │ • Wearables      │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ │ • Manual Entry   │   │
│       │            │            │       └────────┬─────────┘   │
│       │            │            │                │             │
│       ▼            ▼            ▼                ▼             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              UNIFIED INGESTION LAYER                    │   │
│  │  • Normalizza tutti i dati a formato comune             │   │
│  │  • Tagga con timestamp, source, reliability_score       │   │
│  │  • Deduplica (es. sonno da check-in E da Health)        │   │
│  └─────────────────────────────┬───────────────────────────┘   │
│                                │                               │
│                                ▼                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  AI BRAIN (process-session)             │   │
│  │  • Analizza TUTTI i dati unificati                      │   │
│  │  • Genera insights cross-category                       │   │
│  │  • Aggiorna objectives progress                         │   │
│  │  • Rileva pattern (es. "dormi poco = mood basso")       │   │
│  └─────────────────────────────┬───────────────────────────┘   │
│                                │                               │
│                                ▼                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    OUTPUT LAYERS                         │   │
│  │  • Dashboard metrics (ai_dashboard_cache)                │   │
│  │  • Radar chart life areas                                │   │
│  │  • Objectives progress                                   │   │
│  │  • Flash insights                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementazione Tecnica

### File da Modificare/Creare

**1. Ristrutturazione HABIT_TYPES** (`src/hooks/useHabits.tsx`)

Aggiungere `inputMethod` a ogni habit con logica intelligente:

```typescript
export type InputMethod = 
  | 'toggle'      // Sì/No
  | 'numeric'     // Input diretto (peso, ore sonno)
  | 'counter'     // +/- con target (bicchieri acqua)
  | 'abstain'     // Goal = 0 (sigarette)
  | 'timer'       // Cronometro
  | 'auto_sync';  // Da fonte esterna

export interface HabitMeta {
  label: string;
  icon: string;
  unit: string;
  defaultTarget: number;
  streakType: 'daily' | 'abstain';
  category: HabitCategory;
  description: string;
  inputMethod: InputMethod;        // NUOVO
  autoSyncSource?: string;         // NUOVO
  fallbackMethod?: InputMethod;    // NUOVO
  step?: number;                   // Per numeric (es. 0.5 ore)
  min?: number;                    // Validazione
  max?: number;                    // Validazione
  question?: string;               // Per toggle (domanda)
  syncToObjective?: boolean;       // Collega a obiettivi
}
```

**2. Nuovo HabitCard Intelligente** (`src/components/habits/HabitCard.tsx`)

Renderizza UI diversa in base a `inputMethod`:

- `toggle` → Switch grande con testo "Sì/No"
- `numeric` → Input campo numerico con unità
- `counter` → +/- con display centrale
- `abstain` → Grande check "✓ Oggi OK" + pulsante "Ho ceduto"
- `timer` → Play/Pause con contatore

**3. Edge Function Habits Sync** (`supabase/functions/sync-habits-to-brain/index.ts`)

Nuova funzione che:
1. Raccoglie `daily_habits` del giorno
2. Li converte in formato compatibile con il cervello
3. Aggiorna `daily_psychology`, `body_metrics`, o tabelle appropriate
4. Triggera refresh degli insights

**4. Modifiche a process-session** (`supabase/functions/process-session/index.ts`)

Aggiungere sezione che legge anche:
- `daily_habits` per contesto comportamentale
- `body_metrics` per dati fisici
- Correla con stato emotivo

**5. Database Migration**

Aggiungere colonne a `user_habits_config`:
```sql
ALTER TABLE user_habits_config 
ADD COLUMN input_method text DEFAULT 'counter',
ADD COLUMN sync_source text,
ADD COLUMN last_external_value numeric;
```

### Lista Habits Definitiva (40+)

**FITNESS (8 habits)**
- `steps` - Passi (auto_sync/numeric)
- `exercise` - Esercizio (timer)
- `stretching` - Stretching (timer)
- `strength` - Pesi (timer)
- `cardio` - Cardio (timer)
- `yoga` - Yoga (timer)
- `swimming` - Nuoto (numeric minuti)
- `cycling` - Ciclismo (numeric km)

**HEALTH (8 habits)**
- `sleep` - Ore sonno (numeric)
- `water` - Acqua litri (counter con step 0.25)
- `weight` - Peso (numeric, sync to objectives)
- `heart_rate` - Battito (auto_sync/numeric)
- `vitamins` - Vitamine (toggle)
- `medication` - Farmaci (toggle)
- `sunlight` - Sole 15min (toggle)
- `doctor_visit` - Visite mediche (toggle)

**MENTAL (8 habits)**
- `meditation` - Meditazione (timer)
- `journaling` - Diario (toggle - "Hai scritto?")
- `breathing` - Respirazione (timer)
- `gratitude` - Gratitudine (counter 1-3 cose)
- `therapy` - Terapia (toggle)
- `mindfulness` - Mindfulness (timer)
- `affirmations` - Affermazioni (toggle)
- `digital_detox` - No smartphone (toggle)

**NUTRITION (6 habits)**
- `healthy_meals` - Pasti sani (counter)
- `no_junk_food` - No cibo spazzatura (abstain)
- `fruits_veggies` - Frutta/verdura (counter porzioni)
- `meal_prep` - Pasti preparati (toggle)
- `no_sugar` - No zuccheri (abstain)
- `intermittent_fasting` - Digiuno (toggle)

**BAD_HABITS (6 habits)**
- `cigarettes` - Sigarette (abstain)
- `alcohol` - Alcol (abstain)
- `caffeine` - Caffeina (counter max 2)
- `social_media` - Social (timer max 60min)
- `nail_biting` - Unghie (abstain)
- `late_snacking` - Snack notturni (abstain)

**PRODUCTIVITY (5 habits)**
- `reading` - Lettura (timer)
- `learning` - Studio (timer)
- `deep_work` - Focus (timer)
- `no_procrastination` - Task completati (counter)
- `morning_routine` - Routine mattutina (toggle)

**SOCIAL (5 habits)**
- `social_interaction` - Socializzato? (toggle)
- `call_loved_one` - Chiamata affetti (toggle)
- `quality_time` - Tempo qualità (toggle)
- `kindness` - Atto gentilezza (toggle)
- `networking` - Networking (toggle)

**SELF_CARE (5 habits)**
- `skincare` - Skincare (toggle)
- `hobby` - Hobby (timer)
- `nature` - Natura (toggle)
- `self_care_routine` - Self-care (toggle)
- `creative_time` - Creatività (timer)

---

## Collegamento Completo al Cervello

### Dati che Arrivano al Cervello (DOPO questa implementazione)

| Fonte | Tipo Dato | Frequenza | Già Collegato? |
|-------|-----------|-----------|----------------|
| Sessions (Chat) | Trascritto + Emozioni | Per sessione | ✅ |
| Sessions (Voice) | Trascritto + Voce | Per sessione | ✅ |
| Diari Tematici | Messaggi + Contesto | Continuo | ✅ |
| Check-ins Home | Vitali + Emozioni | Giornaliero | ✅ |
| Real-Time Context | Meteo/News/Posizione | Caching 2h | ✅ |
| **Habits** | Comportamenti giornalieri | Giornaliero | ❌ → ✅ |
| **Body Metrics** | Peso, Sonno, Battito | Giornaliero | ❌ → ✅ |
| **External Health** | Steps, Sleep, Heart | Auto-sync | ❌ (Phase B) |

### Correlazioni che l'AI Potrà Fare

Con tutti i dati unificati, il cervello potrà:

1. **Correlazione Sonno-Mood**
   - "Quando dormi <6 ore, il tuo umore cala del 30% il giorno dopo"

2. **Correlazione Esercizio-Ansia**
   - "Nei giorni in cui fai esercizio, la tua ansia è 40% più bassa"

3. **Pattern Sigarette-Stress**
   - "Fumi di più quando il lavoro va male (correlazione 0.7)"

4. **Trend Peso-Obiettivo**
   - "Stai guadagnando 0.3kg/settimana, a questo ritmo raggiungi l'obiettivo in 12 settimane"

---

## Priorità Implementazione

1. **FASE 1 - Input Methods** (Immediato)
   - Aggiungere `inputMethod` a HABIT_TYPES
   - Modificare HabitCard per renderizzare UI diversa
   - Migliorare UX input

2. **FASE 2 - Habits → Cervello** (Dopo Fase 1)
   - Edge function `sync-habits-to-brain`
   - Integrazione in `process-session`
   - Aggiornamento dashboard insights

3. **FASE 3 - Body Metrics → Cervello** (Dopo Fase 2)
   - Collegare `body_metrics` al processo
   - Correlazioni peso/sonno

4. **FASE 4 - External Sources** (Phase B - Post Native)
   - Apple Health via Capacitor
   - Google Fit via Capacitor
   - Wearables API

---

## Note Tecniche

**Performance**
- Sync habits → brain eseguito 1x/giorno a mezzanotte Roma
- Caching aggressivo per non rallentare UI
- Batch processing per multiple habits

**Accessibilità**
- Input numerici con stepper accessibili
- Toggle con etichette chiare
- Feedback haptic su completamento

**Retrocompatibilità**
- Habits esistenti mantengono funzionamento
- `inputMethod` fallback a 'counter' se non specificato
- Migrazione graduale utenti esistenti
