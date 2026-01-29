

# Piano: Integrazione Completa Valori Utente - Profilazione 360°

## Obiettivo
Aggiungere TUTTI i valori mancanti identificati e garantire che ogni singolo dato sia recuperabile attraverso almeno uno dei tre canali:
1. **Aria** (sessioni vocali/chat, diari tematici)
2. **Check-in** (domande dirette giornaliere)
3. **Sync Esterno** (API Apple Health/Google Fit, sistema telefono)

---

## PARTE 1: Modifiche Database

### 1.1 Nuove Colonne `daily_emotions`
Aggiungere 4 nuove emozioni:

| Campo | Tipo | Descrizione | Canale Dati |
|-------|------|-------------|-------------|
| `nervousness` | integer | Nervosismo/agitazione | Aria, Check-in |
| `overwhelm` | integer | Sopraffazione | Aria, Check-in |
| `excitement` | integer | Eccitazione/entusiasmo | Aria |
| `disappointment` | integer | Delusione | Aria |

```sql
ALTER TABLE daily_emotions 
ADD COLUMN IF NOT EXISTS nervousness integer,
ADD COLUMN IF NOT EXISTS overwhelm integer,
ADD COLUMN IF NOT EXISTS excitement integer,
ADD COLUMN IF NOT EXISTS disappointment integer;
```

### 1.2 Nuove Colonne `daily_psychology`
Aggiungere 4 nuovi parametri cognitivi:

| Campo | Tipo | Descrizione | Canale Dati |
|-------|------|-------------|-------------|
| `concentration` | integer | Livello di concentrazione | Aria, Check-in |
| `motivation` | integer | Livello di motivazione | Aria, Check-in |
| `intrusive_thoughts` | integer | Pensieri intrusivi | Aria |
| `self_worth` | integer | Autostima/valore di sé | Aria |

```sql
ALTER TABLE daily_psychology 
ADD COLUMN IF NOT EXISTS concentration integer,
ADD COLUMN IF NOT EXISTS motivation integer,
ADD COLUMN IF NOT EXISTS intrusive_thoughts integer,
ADD COLUMN IF NOT EXISTS self_worth integer;
```

### 1.3 Nuove Colonne `user_profiles`
Aggiungere dati demografici mancanti:

| Campo | Tipo | Descrizione | Canale Dati |
|-------|------|-------------|-------------|
| `height` | numeric | Altezza in cm | Onboarding, Manuale |
| `birth_date` | date | Data di nascita | Onboarding |
| `gender` | text | Genere (opzionale) | Onboarding |
| `therapy_status` | text | Segue terapia? (none/past/current) | Onboarding |

```sql
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS height numeric,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS therapy_status text DEFAULT 'none';
```

### 1.4 Nuove Colonne `body_metrics`
Aggiungere metriche fisiche mancanti:

| Campo | Tipo | Descrizione | Canale Dati |
|-------|------|-------------|-------------|
| `body_fat_percentage` | numeric | Percentuale grasso corporeo | Sync/Manuale |
| `muscle_mass` | numeric | Massa muscolare kg | Sync/Manuale |
| `hydration_level` | numeric | Livello idratazione % | Sync |
| `steps` | integer | Passi giornalieri | Sync |
| `active_minutes` | integer | Minuti attività | Sync |
| `calories_burned` | integer | Calorie bruciate | Sync |

```sql
ALTER TABLE body_metrics 
ADD COLUMN IF NOT EXISTS body_fat_percentage numeric,
ADD COLUMN IF NOT EXISTS muscle_mass numeric,
ADD COLUMN IF NOT EXISTS hydration_level numeric,
ADD COLUMN IF NOT EXISTS steps integer,
ADD COLUMN IF NOT EXISTS active_minutes integer,
ADD COLUMN IF NOT EXISTS calories_burned integer;
```

---

## PARTE 2: Aggiornamento Edge Function `process-session`

### 2.1 Nuova Interfaccia Emozioni Estesa

```typescript
interface SpecificEmotions {
  // Primary (esistenti)
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  apathy: number;
  // Secondary (esistenti)
  shame?: number;
  jealousy?: number;
  hope?: number;
  frustration?: number;
  nostalgia?: number;
  // NEW - Aggiunte
  nervousness?: number;   // Nervosismo
  overwhelm?: number;     // Sopraffazione
  excitement?: number;    // Eccitazione
  disappointment?: number; // Delusione
}
```

### 2.2 Nuova Interfaccia DeepPsychology Estesa

```typescript
interface DeepPsychology {
  // Esistenti (12)
  rumination: number | null;
  self_efficacy: number | null;
  mental_clarity: number | null;
  burnout_level: number | null;
  coping_ability: number | null;
  loneliness_perceived: number | null;
  somatic_tension: number | null;
  appetite_changes: number | null;
  sunlight_exposure: number | null;
  guilt: number | null;
  gratitude: number | null;
  irritability: number | null;
  // NEW - Aggiunte (4)
  concentration: number | null;    // Concentrazione
  motivation: number | null;       // Motivazione
  intrusive_thoughts: number | null; // Pensieri intrusivi
  self_worth: number | null;       // Autostima
}
```

### 2.3 Prompt AI Aggiornato per Estrarre Nuovi Valori

Aggiungere al prompt di analisi:

```text
═══════════════════════════════════════════════
😰 EMOZIONI AGGIUNTIVE - ESTRAZIONE SEMANTICA
═══════════════════════════════════════════════

**NERVOSISMO (nervousness):**
- "Sono nervoso", "agitato", "non riesco a stare fermo", "irrequieto" → 7-10
- Movimento continuo, mani sudate, parlare veloce → inferisci 5-7
- Diverso da ANSIA: il nervosismo è più fisico/superficiale, l'ansia è più profonda

**SOPRAFFAZIONE (overwhelm):**
- "Mi sento sopraffatto", "è troppo", "non ce la faccio", "troppe cose" → 7-10
- Menzione di liste infinite, scadenze multiple, responsabilità eccessive → 6-8
- CRITICO per burnout detection

**ECCITAZIONE (excitement):**
- "Sono elettrizzato", "non vedo l'ora", "entusiasta", "gasato" → 7-10
- Nuove opportunità, eventi positivi imminenti → inferisci
- Può coesistere con nervosismo (eccitazione nervosa)

**DELUSIONE (disappointment):**
- "Sono deluso", "mi aspettavo di più", "che peccato", "speravo meglio" → 7-10
- Aspettative non soddisfatte, promesse non mantenute → 5-7

═══════════════════════════════════════════════
🧠 PSICOLOGIA PROFONDA - NUOVI PARAMETRI
═══════════════════════════════════════════════

**CONCENTRAZIONE (concentration):**
- "Riesco a concentrarmi", "focus", "mente lucida sul task" → 8-10
- "Mi distraggo", "non riesco a focalizzarmi", "pensieri vagano" → 1-4
- Inferisci anche da come l'utente parla (coerente vs frammentato)

**MOTIVAZIONE (motivation):**
- "Sono motivato", "voglio farlo", "ci credo" → 8-10
- "Non ho voglia", "a che scopo", "perché dovrei" → 1-4
- CORRELATO ma diverso da energia: uno può avere energia ma non motivazione

**PENSIERI INTRUSIVI (intrusive_thoughts):**
- "Non riesco a togliermi dalla testa...", "pensiero che torna", "ossessione" → 7-10
- Diverso da RUMINAZIONE: i pensieri intrusivi sono ego-distonici (non li vuole)
- La ruminazione è ego-sintonica (ci pensa perché "deve")

**AUTOSTIMA (self_worth):**
- "Mi sento inutile", "non valgo niente", "sono un fallimento" → 1-3
- "Sono fiero di me", "ce l'ho fatta", "sono capace" → 8-10
- CORRELATO a self_efficacy ma più ampio (valore personale vs capacità)
```

---

## PARTE 3: Aggiornamento Frontend

### 3.1 File `src/hooks/useDailyMetrics.tsx`

Estendere le interfacce:

```typescript
export interface DeepPsychology {
  // Esistenti...
  // Nuovi
  concentration: number | null;
  motivation: number | null;
  intrusive_thoughts: number | null;
  self_worth: number | null;
}
```

### 3.2 File `src/components/analisi/AnalisiTabContent.tsx`

Aggiungere nuove emozioni nel mix emotivo e nuovi parametri psicologici nelle card.

### 3.3 File `src/hooks/useProfile.tsx`

Estendere l'interfaccia UserProfile:

```typescript
export interface UserProfile {
  // Esistenti...
  // Nuovi
  height?: number | null;
  birth_date?: string | null;
  gender?: string | null;
  therapy_status?: string | null;
}
```

### 3.4 File `src/hooks/useBodyMetrics.tsx`

Estendere l'interfaccia BodyMetric:

```typescript
export interface BodyMetric {
  // Esistenti...
  // Nuovi
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  hydration_level: number | null;
  steps: number | null;
  active_minutes: number | null;
  calories_burned: number | null;
}
```

---

## PARTE 4: Aggiornamento Onboarding

### 4.1 Nuovi Campi `PhysicalDataStep.tsx`

Aggiungere:
- Campo `gender` con opzioni: "Preferisco non dire", "Maschio", "Femmina", "Altro"
- Campo `birth_date` (già presente come birthYear, convertire a data completa)

### 4.2 Nuovo Step `TherapyStatusStep.tsx` (Opzionale)

Domanda: "Stai seguendo o hai seguito una terapia psicologica?"
- "No, mai"
- "In passato"
- "Attualmente"

---

## PARTE 5: Aggiornamento RPC `get_daily_metrics`

Estendere la funzione per includere le nuove colonne nelle query.

---

## MAPPA COMPLETA VALORI → CANALI DATI

### Legenda Canali:
- 🗣️ **Aria** = Estratto da sessioni/diari tramite AI
- ✅ **Check-in** = Domanda diretta all'utente
- 📱 **Sync** = App esterne / Sistema telefono
- 📝 **Manuale** = Input diretto utente (form)
- 🎯 **Onboarding** = Raccolto durante registrazione

### EMOZIONI (18 totali)

| Emozione | 🗣️ Aria | ✅ Check-in | Descrizione |
|----------|---------|-------------|-------------|
| joy | ✅ | ✅ | Gioia |
| sadness | ✅ | ✅ | Tristezza |
| anger | ✅ | ✅ | Rabbia |
| fear | ✅ | ✅ | Paura |
| apathy | ✅ | ❌ | Apatia (solo se esplicita) |
| shame | ✅ | ❌ | Vergogna |
| jealousy | ✅ | ❌ | Gelosia |
| hope | ✅ | ❌ | Speranza |
| frustration | ✅ | ✅ | Frustrazione |
| nostalgia | ✅ | ❌ | Nostalgia |
| **nervousness** | ✅ | ✅ | Nervosismo (NUOVO) |
| **overwhelm** | ✅ | ✅ | Sopraffazione (NUOVO) |
| **excitement** | ✅ | ❌ | Eccitazione (NUOVO) |
| **disappointment** | ✅ | ❌ | Delusione (NUOVO) |

### VITALI (4 totali)

| Vitale | 🗣️ Aria | ✅ Check-in | 📱 Sync |
|--------|---------|-------------|---------|
| mood | ✅ | ✅ | ❌ |
| anxiety | ✅ | ✅ | ❌ |
| energy | ✅ | ✅ | 📱 (inferito da attività) |
| sleep | ✅ | ✅ | 📱 (Apple Health) |

### AREE VITA (5 totali)

| Area | 🗣️ Aria | ✅ Check-in |
|------|---------|-------------|
| love | ✅ | ✅ |
| work | ✅ | ✅ |
| health | ✅ | ✅ |
| social | ✅ | ✅ |
| growth | ✅ | ✅ |

### PSICOLOGIA PROFONDA (16 totali)

| Parametro | 🗣️ Aria | ✅ Check-in | Descrizione |
|-----------|---------|-------------|-------------|
| rumination | ✅ | ❌ | Pensieri ossessivi |
| self_efficacy | ✅ | ❌ | Fiducia capacità |
| mental_clarity | ✅ | ✅ | Chiarezza mentale |
| burnout_level | ✅ | ✅ | Esaurimento |
| coping_ability | ✅ | ❌ | Resilienza |
| loneliness_perceived | ✅ | ✅ | Solitudine percepita |
| somatic_tension | ✅ | ✅ | Tensione fisica |
| appetite_changes | ✅ | ✅ | Cambi appetito |
| sunlight_exposure | ✅ | ✅ | Esposizione luce |
| guilt | ✅ | ❌ | Senso di colpa |
| gratitude | ✅ | ✅ | Gratitudine |
| irritability | ✅ | ✅ | Irritabilità |
| **concentration** | ✅ | ✅ | Concentrazione (NUOVO) |
| **motivation** | ✅ | ✅ | Motivazione (NUOVO) |
| **intrusive_thoughts** | ✅ | ❌ | Pensieri intrusivi (NUOVO) |
| **self_worth** | ✅ | ❌ | Autostima (NUOVO) |

### DATI PROFILO (8 totali)

| Campo | 🎯 Onboarding | 📝 Manuale | 🗣️ Aria |
|-------|---------------|------------|---------|
| name | ✅ | ✅ | ❌ |
| email | ✅ (auto) | ❌ | ❌ |
| **height** | ✅ | ✅ | ✅ (se menzionato) |
| **birth_date** | ✅ | ✅ | ✅ (se menzionato) |
| **gender** | ✅ | ✅ | ❌ |
| **therapy_status** | ✅ | ✅ | ✅ (se menzionato) |

### METRICHE CORPOREE (12 totali)

| Metrica | 📝 Manuale | 📱 Sync | 🗣️ Aria |
|---------|------------|---------|---------|
| weight | ✅ | 📱 | ✅ |
| waist_circumference | ✅ | ❌ | ❌ |
| sleep_hours | ✅ | 📱 | ✅ |
| resting_heart_rate | ❌ | 📱 | ❌ |
| blood_pressure_systolic | ✅ | 📱 | ❌ |
| blood_pressure_diastolic | ✅ | 📱 | ❌ |
| **body_fat_percentage** | ✅ | 📱 | ❌ |
| **muscle_mass** | ✅ | 📱 | ❌ |
| **hydration_level** | ❌ | 📱 | ❌ |
| **steps** | ❌ | 📱 | ❌ |
| **active_minutes** | ❌ | 📱 | ❌ |
| **calories_burned** | ❌ | 📱 | ❌ |

---

## RIEPILOGO IMPLEMENTAZIONE

### File da Modificare:

| File | Modifiche |
|------|-----------|
| `supabase/migrations/xxx_add_missing_values.sql` | Nuove colonne DB |
| `supabase/functions/process-session/index.ts` | Estrazione AI nuovi valori |
| `supabase/functions/ai-checkins/index.ts` | Nuove domande check-in |
| `src/hooks/useDailyMetrics.tsx` | Interfacce estese |
| `src/hooks/useProfile.tsx` | Campi profilo |
| `src/hooks/useBodyMetrics.tsx` | Metriche corporee |
| `src/components/onboarding/PhysicalDataStep.tsx` | Nuovi campi |
| `src/components/analisi/AnalisiTabContent.tsx` | Visualizzazione |
| RPC `get_daily_metrics` | Query estesa |

### Ordine di Esecuzione:
1. Migrazione DB (nuove colonne)
2. Aggiornamento RPC
3. Aggiornamento process-session (estrazione AI)
4. Aggiornamento ai-checkins (domande)
5. Aggiornamento frontend (interfacce + UI)
6. Aggiornamento onboarding

---

## TOTALE VALORI TRACCIABILI

| Categoria | Attuali | Nuovi | Totale |
|-----------|---------|-------|--------|
| Emozioni | 14 | 4 | **18** |
| Vitali | 4 | 0 | **4** |
| Aree Vita | 5 | 0 | **5** |
| Psicologia | 12 | 4 | **16** |
| Profilo | 4 | 4 | **8** |
| Corpo | 6 | 6 | **12** |
| **TOTALE** | **45** | **18** | **63** |

Con queste modifiche, l'app avrà **63 valori distinti** per la profilazione utente, tutti recuperabili attraverso almeno un canale.

