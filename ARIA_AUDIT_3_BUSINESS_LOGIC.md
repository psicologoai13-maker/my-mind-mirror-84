# ARIA AUDIT — PARTE 3: BUSINESS LOGIC DETAIL

> Data analisi: 28 Febbraio 2026
> Branch: `claude/aria-functions-audit-o0F3N`

---

## 1. LOGICA CHECK-IN

### Prompt esatto completo

**System Prompt (`ai-checkins/index.ts` righe 747-759):**
```
Sei uno psicologo che sceglie quali check-in mostrare oggi.

REGOLE:
- Scegli MAX 8 items dalla lista, ORDINATI per importanza
- PRIORITÀ 1: Vitali giornalieri (mood, anxiety, sleep, energy) se non ancora risposti oggi
- PRIORITÀ 2: Metriche nuove da scoprire (prima volta)
- PRIORITÀ 3: Metriche critiche da monitorare
- PRIORITÀ 4: Bilancia categorie (1-2 life areas, 1-2 psychology)
- PRIORITÀ 5: Habits attive
- NON includere troppe life areas insieme (max 2)
- Rispondi SOLO con JSON array di "key" nell'ordine giusto

Esempio: ["mood", "anxiety", "family", "motivation", "habit_meditation"]
```

**User Prompt (righe 765-773):**
```
Obiettivi utente: ${goals.join(", ") || "Non specificati"}
Contesto sessioni: ${sessionContext || "Nessuna"}
Emozioni recenti: ${emotionTags.join(", ") || "Non rilevate"}
Metriche nuove da scoprire: ${firstTimeMetrics || "Nessuna"}

Check-in disponibili (ordinati per urgenza):
${itemsText}

Scegli i 8 più importanti IN ORDINE, privilegiando vitali giornalieri e metriche nuove:
```

**Contesto dinamico iniettato:**
- Obiettivi selezionati dall'utente
- Riassunti AI (ai_summary) delle ultime 3 sessioni completate
- Emotion tags dalle ultime 3 sessioni
- Prime 5 metriche mai registrate prima
- Fino a 15 item candidati ordinati per urgenza con score

### Come vengono scelte e ordinate le domande

**Flusso completo:**

```
1. Controlla cache immutabile 24h → SE VALIDO: ritorna cache
2. Fetch dati paralleli (8 tabelle)
3. Calcola DYNAMIC SCORE per ogni item
4. Ordina per score e prendi top 15
5. Chiama AI (Gemini 2.5 Flash, temp 0.3) per selezionare max 8
6. Personalizza domande (discovery vs standard)
7. Salva in user_profiles.ai_checkins_cache (immutabile 24h)
```

**Funzione di scoring dinamico (righe 470-510):**

```typescript
function calculateDynamicScore(item, history): number {
  let score = item.baseScore || 50;
  const changeRate = METRIC_CHANGE_RATES[item.key] || 'fast';
  const daysSince = history?.daysSinceRecorded ?? 999;
  const isFirstTime = daysSince >= 999 || history?.lastRecordedDate === null;

  // FIRST TIME DISCOVERY - high priority
  if (isFirstTime) {
    score += changeRate === 'fast' ? 60 : 40;
    return score;
  }

  // FREQUENCY-BASED SCORING
  if (changeRate === 'fast') {
    if (daysSince >= 1) score += 30;  // Chiedi se non oggi
    if (daysSince >= 2) score += 20;  // Boost se 2+ giorni
  } else {
    if (daysSince >= 3) score += 15;  // Leggero boost dopo 3 giorni
    if (daysSince >= 5) score += 20;  // Più boost dopo 5 giorni
    if (daysSince >= 7) score += 30;  // Full boost dopo una settimana
  }

  // Critical monitoring bonus
  if (history?.isCritical) score += 40;

  // Safety indicators sempre inclusi se mai rilevati
  if (item.safetyCritical && history?.historicalAvg > 0) score += 80;

  return score;
}
```

**Metriche FAST-CHANGING (giornaliere):**
```
mood, anxiety, energy, sleep, joy, sadness, anger, fear, hope,
frustration, rumination, burnout_level, somatic_tension, irritability,
gratitude, sunlight_exposure, hopelessness, suicidal_ideation, self_harm_urges
```

**Metriche SLOW-CHANGING (settimanali):**
```
love, family, finances, leisure, work, school, social, health,
growth, concentration, self_worth, motivation, coping_ability,
mental_clarity, loneliness_perceived, procrastination
```

**Esclusioni intelligenti (riga 701-704):**
```typescript
// Metriche slow risposte di recente vengono saltate
if (changeRate === 'slow' && daysSince < 3 && !item.safetyCritical && !history?.isCritical) {
  return; // Salta questo item
}
```

**Personalizzazione domande (riga 707-710):**
```typescript
// Prima volta o assente >7gg → domanda "discovery" conversazionale
const question = (isFirstTime || daysSince >= 7)
  ? (DISCOVERY_QUESTIONS[item.key] || item.question)
  : item.question;
```

Esempio DISCOVERY_QUESTIONS: `"Come va la tua vita sentimentale ultimamente?"` invece di `"Come va l'amore?"`

### Struttura risposta e salvataggio nel DB

**Tabella:** `user_profiles`
**Campo:** `ai_checkins_cache`

**Struttura salvata:**
```typescript
{
  checkins: [                          // Array di check-in items (max 8)
    {
      key: "mood",
      label: "Umore",
      question: "Come ti senti emotivamente?",
      type: "vital|life_area|emotion|psychology|habit|safety",
      responseType: "emoji|intensity|slider|yesno|toggle|counter|numeric|timer|abstain|range",
      reason: "Check giornaliero",
      // Campi habit-specifici:
      habitType?: "meditation",
      icon?: "🧘",
      unit?: "min",
      target?: 10,
      step?: 1
    }
  ],
  allCompleted: false,                  // Se tutti completati
  aiGenerated: true,                    // Se generato da AI
  cachedAt: "2026-02-28T10:00:00Z",    // Timestamp creazione
  cachedDate: "2026-02-28",            // Data Roma (immutabile per 24h)
  fixedDailyList: [/* stesso array */]  // Lista fissa immutabile
}
```

**Validazione cache (righe 600-611):**
```typescript
if (existingCache?.cachedDate === today && existingCache?.fixedDailyList?.length > 0) {
  // Cache valida → ritorno immediato senza ricalcolo
  return new Response(JSON.stringify({
    checkins: existingCache.fixedDailyList,
    allCompleted: false,
    aiGenerated: existingCache.aiGenerated || false,
    cachedDate: existingCache.cachedDate,
  }));
}
```

---

## 2. LOGICA WELLNESS SCORE

### Formula esatta di calcolo 0-100

**NON esiste una formula matematica nel codice.** Il wellness_score è generato interamente dall'AI (Gemini 2.5 Flash) come parte della risposta dashboard.

**Schema DB (`migrations/20251224153218_*.sql`):**
```sql
wellness_score INTEGER DEFAULT 0 CHECK (wellness_score >= 0 AND wellness_score <= 100)
```

**Nel prompt di `ai-dashboard/index.ts`, il wellness_score è richiesto su scala 1-10 (NON 0-100):**

```
═══════════════════════════════════════════════
🏆 WELLNESS SCORE (1-10)
═══════════════════════════════════════════════
- Valuta lo stato ATTUALE dell'utente, non la media storica
- Se evento negativo grave: 1-3
- Se difficoltà moderate ma gestibili: 4-6
- Se stato positivo: 7-10
- Il messaggio deve essere empatico e breve (max 15 parole)
```

**INCOERENZA RILEVATA:** Il DB definisce `wellness_score` come INTEGER 0-100, ma il prompt AI lo richiede su scala 1-10. Nessuna conversione nel codice.

### Metriche usate e pesi

Il wellness_score non ha pesi specifici. L'AI valuta lo "stato attuale" dell'utente basandosi su tutti i dati passati nel prompt:

| Dato passato all'AI | Tipo | Uso |
|---------------------|------|-----|
| Valori ATTUALI (più recenti) di mood, anxiety, energy, sleep | Vitali | Stato corrente |
| Medie del periodo (30 giorni) di tutte le metriche | Emozioni, Aree, Psicologia | Trend |
| Ultimi 3 riassunti di sessioni AI | Testo | Contesto narrativo |
| Obiettivi selezionati | Array | Personalizzazione |
| Focus precedenti (da cache) | Array | Stabilità |

**Nessun peso numerico esplicito.** La valutazione è interamente affidata al modello AI senza formula deterministica.

### Prompt per la frase descrittiva

Il `wellness_message` è generato dall'AI come parte della stessa risposta JSON:

**Nel prompt di `ai-dashboard/index.ts`:**
```
"wellness_message": "Messaggio personalizzato breve"
```

**Regole nel prompt:**
- Massimo 15 parole
- Empatico e breve
- Basato sullo stato attuale
- Se evento negativo grave: tono di supporto
- Se stato positivo: tono di celebrazione

**Fallback per nuovi utenti (hardcoded, riga 214):**
```typescript
wellness_message: 'Iniziamo questo percorso insieme: ogni piccolo passo conta per il tuo benessere.'
```

**Fallback per utenti senza dati sufficienti (hardcoded, riga 490):**
```typescript
wellness_score: 5,
wellness_message: 'Parla con me per iniziare a monitorare il tuo benessere.'
```

### Casi particolari

| Caso | wellness_score | wellness_message |
|------|:-:|---|
| Nuovo utente (0 sessioni, 0 check-in) | `null` | "Iniziamo questo percorso insieme: ogni piccolo passo conta per il tuo benessere." |
| Utente con dati ma no AI response | `5` | "Parla con me per iniziare a monitorare il tuo benessere." |
| Utente con dati + AI funzionante | 1-10 (da AI) | Frase personalizzata (da AI) |

---

## 3. FUNZIONE SINTESI/SUMMARY

### Esiste una funzione sintesi/summary dedicata?

**NO.** Non esiste una edge function dedicata chiamata "summary" o "sintesi". Il testo descrittivo viene generato in modi diversi da funzioni diverse:

### Dove e come viene generato il testo descrittivo

#### A. Summary di sessione (`ai-chat/index.ts`, generateSummary)

Quando `generateSummary === true`, la funzione ai-chat genera un riassunto della conversazione:

**Prompt esatto (righe 4781-4792):**
```
Analizza la seguente conversazione e genera un JSON con questo formato esatto:
{
  "summary": "Breve riassunto di 2 frasi della conversazione",
  "mood_score": (numero intero da 1 a 10),
  "anxiety_score": (numero intero da 1 a 10),
  "tags": ["Tag1", "Tag2", "Tag3"]
}

Rispondi SOLO con il JSON.

Conversazione:
${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}
```

**Output:** JSON con summary (2 frasi), mood_score, anxiety_score, tags.

#### B. AI Summary di sessione (`process-session/index.ts`)

Il campo `ai_summary` nella tabella `sessions` viene generato automaticamente da process-session come parte dell'analisi clinica completa. È un campo del JSON restituito da Gemini:

```
"summary": "Riassunto 1-2 frasi della sessione"
```

Salvato in: `sessions.ai_summary`

#### C. Wellness Message (`ai-dashboard/index.ts`)

Frase descrittiva dello stato benessere generata dall'AI come parte del layout dashboard:

```
"wellness_message": "Ti stai riprendendo bene, un passo alla volta."
```

Salvato in: risposta JSON (non persistito in DB da questa funzione).

#### D. Context Summary (`process-session/index.ts`)

Snapshot del contesto della sessione per continuità narrativa:

Salvato in: `session_context_snapshots.context_summary`

#### E. Clinical Summary (`doctor-view-data/index.ts` e `generate-clinical-report/index.ts`)

Report clinico professionale generato per medici/psicologi. Non è una "sintesi" per l'utente ma un report per professionisti.

---

## 4. LOGICA OBIETTIVI

### Come Aria rileva nuovi obiettivi durante la chat

Il rilevamento avviene in `process-session/index.ts` tramite la funzione `buildPriorityAnalysisInstructions()` (righe 253-329):

**Prompt per rilevamento automatico (dal system prompt di process-session):**
```
═══════════════════════════════════════════════
🎯 RILEVAMENTO AUTOMATICO NUOVI OBIETTIVI (CRITICO!)
═══════════════════════════════════════════════
DEVI analizzare la conversazione per rilevare NUOVI OBIETTIVI che l'utente potrebbe avere.
```

**Obiettivi PREDEFINITI (ID fissi, righe 260-266):**
```
📌 OBIETTIVI MENTALI (ID predefiniti):
- "Vorrei dormire meglio" → improve_sleep
- "Devo gestire la mia ansia" → reduce_anxiety
- "Voglio migliorare le mie relazioni" → find_love
- "Ho bisogno di più energia" → boost_energy
- "Voglio stabilità emotiva" → emotional_stability
- "Ho bisogno di sfogarmi" → express_feelings
```

**Obiettivi CUSTOM (righe 268-329):**
```
📌 OBIETTIVI CUSTOM — Aggiungi a "custom_objectives_detected":
CATEGORIE:
- BODY: "Voglio dimagrire", "Prendere peso", "Fare più sport"
- FINANCE (5 tipi specifici):
  1. "accumulation" - Accumulare una cifra
  2. "periodic_saving" - Risparmio periodico
  3. "spending_limit" - Limite di spesa
  4. "periodic_income" - Obiettivo guadagno
  5. "debt_reduction" - Riduzione debiti
- STUDY: "Superare l'esame", "Studiare 20h/settimana"
- WORK: "Voglio una promozione"
- RELATIONSHIPS: "Trovare partner"
- GROWTH: "Leggere di più", "Meditare"
```

**Regola fondamentale per rilevamento semantico (da update-objective-chat):**
```
Se l'utente PARLA di un argomento correlato a uno degli obiettivi, DEVI aggiornare il progresso!
NON serve che dica esplicitamente "il mio obiettivo" - basta che parli dell'ARGOMENTO.

ESEMPI:
- Obiettivo "Sviluppare un'app" + utente dice "sto lavorando all'app" → AGGIORNA!
- Obiettivo "Migliorare al lavoro" + utente parla di progetti lavorativi → AGGIORNA!
```

### Formula esatta di calcolo della % di completamento

**Per OBIETTIVI NUMERICI (`update-objective-chat/index.ts`, righe 74-81):**

```typescript
if (starting_value !== target_value) {
  progress = Math.min(100, Math.max(0, ((current - starting) / (target - starting)) * 100));
} else {
  progress = 0;
}
```

**Formula:** `progress = clamp(0, 100, ((current_value - starting_value) / (target_value - starting_value)) * 100)`

**Esempio (dimagrimento):**
```
starting_value = 85 kg
current_value  = 80 kg
target_value   = 70 kg

progress = min(100, max(0, ((80 - 85) / (70 - 85)) * 100))
         = min(100, max(0, (-5 / -15) * 100))
         = min(100, 33.33%)
         = 33%
```

**Per OBIETTIVI QUALITATIVI/MILESTONE:**

Non esiste formula matematica. L'AI stima manualmente basandosi su una scala (da `process-session`, righe 615-624):

```
Scala generale:
- 0-20%: Solo idea, discussione iniziale
- 20-40%: Prime azioni concrete
- 40-60%: Lavoro attivo, progressi visibili
- 60-80%: Buoni risultati, quasi completo
- 80-100%: Obiettivo raggiunto

Incrementi tipici:
- Parlare dell'obiettivo = +5-10%
- Azione concreta = +10-20%
- Risultato tangibile = +15-25%
```

### Campi di user_objectives aggiornati, quando e da quale funzione

#### Da `process-session/index.ts` (analisi automatica post-sessione)

**Obiettivi NUMERICI (righe 2584-2660):**

| Campo | Quando | Logica |
|-------|--------|--------|
| `current_value` | Sempre se nuovo valore rilevato | Valore numerico estratto dalla conversazione |
| `starting_value` | Solo se primo valore e `starting_value === null` | Imposta il punto di partenza |
| `progress_history` | Sempre | Append `{date, value, source: 'aria_detection'}` |
| `status` | Se `update.completed === true` | Cambia da `'active'` a `'achieved'` |
| `ai_feedback` | Se primo valore | `'Punto di partenza registrato!'` |
| `updated_at` | Sempre | Timestamp ISO |

**Obiettivi QUALITATIVI/MILESTONE (righe 2662-2739):**

| Campo | Quando | Logica |
|-------|--------|--------|
| `ai_custom_description` | Se AI genera nuova descrizione | Descrizione personalizzata aggiornata |
| `ai_progress_estimate` | Se AI stima progresso | `clamp(0, 100, valore)`. Se >= 100 → status='achieved' |
| `ai_milestones` | Se AI rileva nuova milestone | Append `{milestone, achieved_at, note}` |
| `status` | Se `ai_progress_estimate >= 100` | Cambia a `'achieved'` |
| `updated_at` | Sempre | Timestamp ISO |

#### Da `update-objective-chat/index.ts` (aggiornamento durante chat dedicata)

| Campo | Quando | Logica |
|-------|--------|--------|
| `current_value` | Se valore numerico fornito | Aggiornamento diretto |
| `ai_progress_estimate` | Se stima fornita | `clamp(0, 100, valore)` |
| `ai_feedback` | Sempre | Feedback motivazionale 60-120 char |
| `ai_milestones` | Se nuova milestone | Append (SENZA deduplicazione) |
| `updated_at` | Sempre | Timestamp ISO |

#### Da `create-objective-chat/index.ts` (creazione durante chat)

**NON scrive nel DB.** Restituisce JSON al client che deve salvare.

---

## 5. ESERCIZI CONSIGLIATI

### Logica esatta di selezione degli esercizi personalizzati

La selezione avviene in `home-context/index.ts` (righe 246-283):

```typescript
// 1. Determina lo slug dell'esercizio basato su contesto
const lastAnxiety = lastSession?.anxiety_score_detected ?? 0;
let suggestedSlug: string;

if (lastAnxiety > 6) {
  // Ansia alta → respirazione 4-7-8 (sempre)
  suggestedSlug = "breathing-478";
} else if (timeSlot === "night" || timeSlot === "evening") {
  // Sera/notte → random tra respirazione e rilassamento muscolare
  suggestedSlug = Math.random() < 0.5 ? "breathing-478" : "muscle-relaxation";
} else if (timeSlot === "morning") {
  // Mattina → random tra box breathing e mindfulness 1min
  suggestedSlug = Math.random() < 0.5 ? "box-breathing" : "mindfulness-1min";
} else {
  // Pomeriggio o fallback → esercizio random tra i beginner
  suggestedSlug = "__random_beginner__";
}

// 2. Recupera l'esercizio dal DB
if (suggestedSlug === "__random_beginner__") {
  const { data: beginnerExercises } = await supabase
    .from("exercises")
    .select("slug, title")
    .eq("difficulty", "beginner")
    .eq("is_active", true);

  if (beginnerExercises?.length > 0) {
    const pick = beginnerExercises[Math.floor(Math.random() * beginnerExercises.length)];
    suggestedExercise = { slug: pick.slug, title: pick.title };
  }
} else {
  const { data: exerciseRow } = await supabase
    .from("exercises")
    .select("slug, title")
    .eq("slug", suggestedSlug)
    .single();

  if (exerciseRow) {
    suggestedExercise = { slug: exerciseRow.slug, title: exerciseRow.title };
  }
}
```

### La selezione è personalizzata o statica/casuale?

**SEMI-PERSONALIZZATA con logica semplice:**

| Condizione | Esercizio | Personalizzazione |
|-----------|-----------|:-:|
| `anxiety_score_detected > 6` | `breathing-478` (sempre) | Si (basato su ansia) |
| Sera/notte + ansia normale | Random: `breathing-478` o `muscle-relaxation` | No (50/50 casuale) |
| Mattina + ansia normale | Random: `box-breathing` o `mindfulness-1min` | No (50/50 casuale) |
| Pomeriggio + ansia normale | Random tra tutti gli esercizi beginner attivi | No (completamente casuale) |

**Livello di personalizzazione: BASSO.**
- Solo 1 criterio di personalizzazione: l'ansia dell'ultima sessione
- Solo 1 soglia: `> 6`
- Solo 4 esercizi hardcoded come slug nel codice
- Il timeSlot (fascia oraria) influenza ma NON è personalizzato sull'utente
- `Math.random()` → risultato non deterministico, stessa richiesta = risultato diverso

### Quale funzione gestisce la selezione e con quale criterio

**Funzione principale:** `home-context/index.ts`
- Gestisce la selezione dell'esercizio suggerito nella home page

**Funzione secondaria:** `get-exercises/index.ts`
- Restituisce TUTTI gli esercizi attivi (con filtri opzionali per categoria/difficoltà)
- NON fa selezione personalizzata — è un endpoint di listing generico

**Funzione AI:** `ai-chat/index.ts`
- Aria può SUGGERIRE esercizi durante la conversazione tramite tag `[EXERCISE:slug]`
- La selezione è affidata al modello AI basandosi sul contesto della conversazione
- NON ha logica di selezione hardcoded per gli esercizi

### Limitazioni della selezione esercizi

1. **Solo 4 slug hardcoded** — `breathing-478`, `muscle-relaxation`, `box-breathing`, `mindfulness-1min`. Se cambiano nel DB, il codice si rompe silenziosamente
2. **Nessun tracking di esercizi già fatti** — Non evita di suggerire lo stesso esercizio ripetutamente
3. **Nessuna considerazione per preferenze utente** — Non tiene conto degli esercizi completati positivamente (mood_after > mood_before)
4. **Random non deterministico** — `Math.random()` produce risultati diversi ad ogni chiamata. Dovrebbe hashare userId + date per coerenza
5. **Solo livello "beginner"** — Non suggerisce mai esercizi intermedi/avanzati anche se l'utente li ha completati molte volte
6. **Nessuna correlazione con metriche psicologiche** — Oltre all'ansia, non considera mood basso, burnout, rumination, somatic_tension
7. **Nessuna rotazione** — Potrebbe suggerire `breathing-478` 30 giorni di fila se l'utente ha ansia > 6 costante

---

## TABELLA RIEPILOGATIVA BUSINESS LOGIC

| Area | Personalizzazione | AI-driven | Formula esplicita | Problemi principali |
|------|:-:|:-:|:-:|---|
| Check-in | Alta | Si (Gemini) | Score dinamico | Timezone inconsistente, safety indicators non al primo accesso |
| Wellness Score | Media | Si (Gemini) | **NESSUNA** (tutto AI) | Scala 1-10 nel prompt vs 0-100 nel DB |
| Summary/Sintesi | N/A | Si (Gemini) | N/A | Nessuna funzione dedicata, distribuita su più endpoint |
| Obiettivi | Alta | Si (Gemini) | `((current-start)/(target-start))*100` | ai_milestones senza dedup, race condition |
| Esercizi | Bassa | No | Slug hardcoded + random | Solo ansia come criterio, 4 slug fissi, no tracking |
