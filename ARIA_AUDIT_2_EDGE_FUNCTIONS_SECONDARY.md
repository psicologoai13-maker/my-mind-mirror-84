# ARIA AUDIT — PARTE 2: EDGE FUNCTIONS SECONDARY

> Data analisi: 28 Febbraio 2026
> Branch: `claude/aria-functions-audit-o0F3N`
> Funzioni analizzate: 18

---

## 1. GET-EXERCISES

**File:** `supabase/functions/get-exercises/index.ts`

### Scopo reale
Recupera un elenco filtrato di esercizi attivi dal database, ordinati per difficoltà e durata. Implementa triple-fallback di autenticazione (JWT header, accessToken body, userId + service role).

### Input attesi
- **Header:** `Authorization: Bearer <JWT>` (opzionale)
- **Body:** `{ "category": "string?", "difficulty": "string?", "accessToken": "string?", "userId": "UUID?" }`

### Output
```json
[
  {
    "id": "UUID",
    "is_active": true,
    "category": "string",
    "difficulty": "string",
    "duration_minutes": 10,
    "slug": "breathing-478",
    "title": "Respirazione 4-7-8",
    "points_reward": 5
  }
]
```

### Modello AI
**Nessuno.** Solo query database.

### Tabelle DB lette
| Tabella | Colonne | Filtri |
|---------|---------|--------|
| `exercises` | * | is_active=true, +category/difficulty opzionali. ORDER BY difficulty ASC, duration_minutes ASC |

### Tabelle DB scritte
**Nessuna** — READ-ONLY.

### Logica cache
**Nessuna.**

### Problemi e limitazioni
1. **Auth Method 3 pericoloso** — Accetta userId dal body con service role key senza validare ownership
2. **Nessuna paginazione** — Se migliaia di esercizi, risposta enorme
3. **CORS permissivo** — `Access-Control-Allow-Origin: *`
4. **Nessun rate limiting**
5. **Anon key detection rudimentale** — Confronta solo primi 30 char del token

---

## 2. LOG-EXERCISE

**File:** `supabase/functions/log-exercise/index.ts`

### Scopo reale
Registra l'esecuzione di un esercizio, assegna punti ricompensa tramite trigger DB (`award_exercise_points`), aggiorna progresso sfide, notifica cambio dati profilo.

### Input attesi
```json
{
  "exercise_id": "UUID (obbligatorio)",
  "duration_actual": "number?",
  "mood_before": "number?",
  "mood_after": "number?",
  "triggered_by": "string (obbligatorio: manual|scheduled|suggestion)",
  "session_id": "string?",
  "accessToken": "string?",
  "userId": "UUID?"
}
```

### Output
```json
{
  "success": true,
  "points_awarded": 5,
  "total_points": 1250
}
```

### Modello AI
**Nessuno.**

### Tabelle DB lette
| Tabella | Colonne |
|---------|---------|
| `exercises` | id, slug, points_reward |
| `user_reward_points` | total_points |

### Tabelle DB scritte
| Tabella | Operazione | Cosa scrive |
|---------|------------|-------------|
| `user_exercise_sessions` | INSERT | user_id, exercise_id, duration_actual, mood_before, mood_after, triggered_by, session_id |
| `user_profiles` | UPDATE | last_data_change_at = NOW() |
| `user_reward_points` | (indiretto via trigger) | total_points |

### Logica cache
| Campo | Durata | Invalidazione |
|-------|--------|---------------|
| `user_profiles.last_data_change_at` | N/A (timestamp) | Aggiornato ad ogni log esercizio |

### Problemi e limitazioni
1. **Race condition nei punti** — Read points_reward e INSERT non sono atomici
2. **Trigger DB nascosto** — `award_exercise_points` non visibile nel codice TS
3. **RPC update_challenge_progress ignorato se fallisce** — Try-catch con log, nessun rollback
4. **Nessuna validazione range** — mood_before/after e duration_actual possono avere valori assurdi
5. **Nessuna idempotency** — Richieste duplicate creano sessioni duplicate
6. **triggered_by non validato** — Accetta qualsiasi stringa

---

## 3. GENERATE-WRAPPED

**File:** `supabase/functions/generate-wrapped/index.ts`

### Scopo reale
Genera i dati del "Wrapped" (resoconto personalizzato mensile/annuale): sessioni totali, emozione dominante, streak, badge, punti e messaggio AI motivazionale. Persiste nel DB.

### Input attesi
```json
{
  "period_type": "monthly|yearly (obbligatorio)",
  "period_key": "YYYY-MM|YYYY (obbligatorio)",
  "accessToken": "string?",
  "userId": "UUID?"
}
```

### Output
```json
{
  "success": true,
  "data": {
    "total_sessions": 42,
    "total_minutes": 630,
    "total_checkins": 89,
    "dominant_emotion": "joy",
    "longest_streak": 15,
    "top_topics": ["ansia", "lavoro", "relazioni"],
    "wellness_start": 55,
    "wellness_end": 72,
    "hardest_week": 3,
    "best_week": 8,
    "badges_unlocked": ["primo_checkin", "streak_7"],
    "points_earned": 450,
    "aria_message": "Messaggio motivazionale di Aria"
  }
}
```

### Modello AI + System Prompt
**Modello:** `gemini-2.5-flash`

**System Prompt (completo, ~280 char):**
```
Sei Aria, companion di benessere psicologico. Genera un messaggio di 2-3 frasi caldo e personale
per {userName} basato su questi dati del periodo {period_key}: sessioni: {totalSessions},
emozione dominante: {dominantEmotion}, streak più lungo: {longestStreak} giorni.
Incoraggialo per il prossimo periodo. Solo il messaggio, niente altro.
```

### Tabelle DB lette
| Tabella | Colonne |
|---------|---------|
| `sessions` | id, duration, mood_score_detected, start_time |
| `daily_checkins` | id, created_at |
| `daily_emotions` | 20 emozioni (joy, sadness, anger, fear, apathy, shame, jealousy, hope, frustration, nostalgia, nervousness, overwhelm, excitement, disappointment, disgust, surprise, serenity, pride, affection, curiosity) |
| `habit_streaks` | current_streak |
| `conversation_topics` | topic, mention_count |
| `user_achievements` | badge, unlocked_at |
| `reward_transactions` | points, created_at |
| `user_profiles` | name |

### Tabelle DB scritte
| Tabella | Operazione | Cosa scrive |
|---------|------------|-------------|
| `aria_wrapped_data` | UPSERT | user_id, period_type, period_key, data (JSON blob), generated_at. Conflict key: (user_id, period_type, period_key) |

### Logica cache
**Nessuna** in questa funzione. Cache delegata a `get-wrapped`.

### Problemi e limitazioni
1. **Query sequenziali non parallelizzate** — Performance lenta per grandi periodi
2. **Calcolo settimana ISO impreciso** — Formula manuale con edge case al cambio anno
3. **No retry su Gemini** — Se fallisce, aria_message resta vuoto
4. **Valori NULL scartati senza alert**

---

## 4. GET-WRAPPED

**File:** `supabase/functions/get-wrapped/index.ts`

### Scopo reale
Recupera dati Wrapped già generati. Cache 24h: se freschi, li restituisce; se scaduti, chiama internamente `generate-wrapped`.

### Input attesi
```json
{
  "period_type": "monthly|yearly (obbligatorio)",
  "period_key": "YYYY-MM|YYYY (obbligatorio)",
  "accessToken": "string?",
  "userId": "UUID?"
}
```

### Output
```json
{
  "success": true,
  "data": { /* stessa struttura generate-wrapped */ },
  "cached": true
}
```

### Modello AI
**Nessuno** direttamente. Delega a `generate-wrapped`.

### Tabelle DB lette
| Tabella | Colonne |
|---------|---------|
| `aria_wrapped_data` | data, generated_at |

### Tabelle DB scritte
**Nessuna** — Scritture delegate a `generate-wrapped`.

### Logica cache
| Campo | Durata | Invalidazione |
|-------|--------|---------------|
| `aria_wrapped_data.generated_at` | **24 ore** (86.400.000 ms) | Automatica dopo 24h. Se assente o scaduto → chiama generate-wrapped |

### Problemi e limitazioni
1. **Race condition** — Due richieste per dati scaduti triggerano entrambe generate-wrapped
2. **Cascading error** — Se generate-wrapped fallisce, nessun fallback ai dati stantii
3. **No retry logic**

---

## 5. TRANSCRIBE-DIARY-VOICE

**File:** `supabase/functions/transcribe-diary-voice/index.ts`

### Scopo reale
Trascrive file audio vocale in italiano usando OpenAI Whisper per dettare voci di diario.

### Input attesi
- **Body (multipart/form-data):** `audio` (File, max 25MB), `accessToken?`, `userId?`
- **Header:** `Authorization: Bearer <JWT>` (opzionale)

### Output
```json
{ "transcript": "testo trascritto del file audio" }
```

### Modello AI
**OpenAI Whisper-1** — language="it", response_format="text". Nessun system prompt.

### Tabelle DB lette
**Nessuna.**

### Tabelle DB scritte
**Nessuna.**

### Logica cache
**Nessuna.**

### Problemi e limitazioni
1. **Nessuna validazione formato audio** — Accetta qualsiasi file fino a 25MB
2. **Lingua hardcoded** — Fisso a italiano "it"
3. **Nessun rate limiting** — Costi OpenAI illimitati
4. **Nessuna idempotency**
5. **Auth Method 3 fragile** — UUID senza ownership verification

---

## 6. GET-DIARY-PROMPT

**File:** `supabase/functions/get-diary-prompt/index.ts`

### Scopo reale
Genera domanda personalizzata e calda per invitare l'utente a scrivere nel diario. Usa Gemini per creare domanda intelligente basata su contesto sessione e ultime voci.

### Input attesi
```json
{
  "diary_id": "UUID (obbligatorio)",
  "diary_name": "string?",
  "accessToken": "string?",
  "userId": "UUID?"
}
```

### Output
```json
{ "prompt": "Che cosa ti ha fatto sorridere oggi?" }
```

### Modello AI + System Prompt
**Modello:** `gemini-2.5-flash`

**System Prompt (completo):**
```
Sei Aria. Genera UNA domanda aperta di massimo 15 parole come spunto per scrivere
nel diario "{diaryName}". Contesto recente: {recentContext}.
La domanda deve essere calda, non invasiva, invitare la riflessione.
Rispondi solo con la domanda, niente altro.
```

### Tabelle DB lette
| Tabella | Colonne | Note |
|---------|---------|------|
| `diary_entries` | content_text, entry_date, created_at | Ultime 3 voci. **BUG: caricate ma NON usate nel prompt** |
| `diaries` | name | Solo se diary_name non fornito |
| `session_context_snapshots` | key_topics, unresolved_issues | Ultimo snapshot |

### Tabelle DB scritte
**Nessuna** — READ-ONLY.

### Logica cache
**Nessuna.**

### Problemi e limitazioni
1. **BUG: diary_entries caricate ma ignorate** — 3 query DB sprecate
2. **Nessuna cache** — Ogni richiesta = query DB + Gemini
3. **Non valida proprietà diario** — Non controlla ownership diary_id
4. **Nessun vincolo max 15 parole** — Non validato post-generazione
5. **Nessun rate limiting**

---

## 7. GET-GAMIFICATION-STATUS

**File:** `supabase/functions/get-gamification-status/index.ts`

### Scopo reale
Recupera stato completo gamificazione: punti, livello, badge, sfide attive, shop items disponibili, streak, sessioni totali e check-in totali. Funzione aggregativa read-only.

### Input attesi
- **Header:** `Authorization: Bearer <JWT>` (opzionale)
- **Body:** `{ "accessToken": "string?", "userId": "UUID?" }`

### Output
```json
{
  "total_points": 1250,
  "current_level": 3,
  "level_name": "Esploratore",
  "level_emoji": "🧭",
  "points_to_next_level": 750,
  "level_progress_pct": 45,
  "badges": [
    { "id": "achievement_1", "name": "Nome", "emoji": "🏅", "description": "...", "unlocked_at": "ISO" }
  ],
  "active_challenges": [
    { "slug": "breathing-7days", "title": "7 giorni di respirazione", "current_count": 3, "target_count": 7, "expires_at": "ISO", "points_reward": 100 }
  ],
  "available_shop_items": [
    { "slug": "trial-premium", "points_cost": 150, "reward_description": "3 giorni Premium", "days_premium": 3 },
    { "slug": "week-premium", "points_cost": 300, "reward_description": "1 settimana Premium", "days_premium": 7 },
    { "slug": "month-premium", "points_cost": 1000, "reward_description": "1 mese Premium", "days_premium": 30 },
    { "slug": "sixmonths-premium", "points_cost": 5000, "reward_description": "6 mesi Premium", "days_premium": 180 },
    { "slug": "year-premium", "points_cost": 10000, "reward_description": "1 anno Premium", "days_premium": 365 }
  ],
  "streak_days": 15,
  "total_sessions": 42,
  "total_checkins": 89
}
```

### Modello AI
**Nessuno.**

### Tabelle DB lette
| Tabella | Colonne |
|---------|---------|
| `user_reward_points` | total_points |
| `user_profiles` | current_level, premium_until |
| `gamification_levels` | name, emoji, points_required |
| `user_achievements` | achievement_id, unlocked_at, metadata |
| `user_challenges` | challenge_slug, challenge_title, current_count, target_count, expires_at, points_reward |
| `habit_streaks` | current_streak |
| `sessions` | id (count) |
| `daily_checkins` | id (count) |

### Tabelle DB scritte
**Nessuna** — READ-ONLY.

### Logica cache
**Nessuna.**

### Problemi e limitazioni
1. **N+1 query pattern** — 8 query separate al DB
2. **SHOP_ITEMS hardcoded** — Modifiche richiedono redeploy
3. **Nessun LIMIT su badge/sfide** — Potenzialmente migliaia di record
4. **Auth fallback pericoloso**

---

## 8. REDEEM-POINTS

**File:** `supabase/functions/redeem-points/index.ts`

### Scopo reale
Riscatto punti per acquistare premium (3 giorni → 1 anno). Deduce punti, registra transazione, calcola nuova scadenza premium estendendo quella esistente se attiva.

### Input attesi
```json
{
  "shop_item_slug": "trial-premium|week-premium|month-premium|sixmonths-premium|year-premium (obbligatorio)",
  "accessToken": "string?",
  "userId": "UUID?"
}
```

### Output
```json
{
  "success": true,
  "new_expiry": "2025-04-30T12:45:30Z",
  "remaining_points": 1100
}
```

### Modello AI
**Nessuno.**

### Tabelle DB lette
| Tabella | Colonne |
|---------|---------|
| `user_reward_points` | total_points |
| `user_profiles` | premium_until |

### Tabelle DB scritte
| Tabella | Operazione | Cosa scrive |
|---------|------------|-------------|
| `reward_transactions` | INSERT | user_id, points (negativo), type="redemption", source_id=slug, description |
| `user_reward_points` | UPDATE | total_points, updated_at |
| `user_profiles` | UPDATE | premium_until, premium_type="points" |

### Logica cache
**Nessuna.**

### Problemi e limitazioni
1. **RACE CONDITION CRITICA** — Check punti e deduzione NON atomici. Due riscatti simultanei possono entrambi passare
2. **SHOP_ITEMS hardcoded** — Non estensibile senza redeploy
3. **Nessun audit trail completo** — Solo delta, non vecchio/nuovo saldo
4. **Errori in lingua mista** — "Punti insufficienti" in italiano, resto in inglese

---

## 9. START-CHALLENGE

**File:** `supabase/functions/start-challenge/index.ts`

### Scopo reale
Avvia una sfida gamificata (es. "7 giorni di respirazione"). Verifica che non esista sfida attiva dello stesso tipo, crea record con target, scadenza e ricompensa.

### Input attesi
```json
{
  "challenge_slug": "breathing-7days|checkin-30days|sessions-10|diary-7days|exercises-5 (obbligatorio)",
  "accessToken": "string?",
  "userId": "UUID?"
}
```

### Output
```json
{
  "success": true,
  "challenge_id": "UUID",
  "expires_at": "2025-03-30T23:59:59Z"
}
```

### Modello AI
**Nessuno.**

### Tabelle DB lette
| Tabella | Colonne |
|---------|---------|
| `user_challenges` | id, expires_at |

### Tabelle DB scritte
| Tabella | Operazione | Cosa scrive |
|---------|------------|-------------|
| `user_challenges` | INSERT | user_id, challenge_slug, challenge_title, target_count, current_count, expires_at, points_reward, badge_id |

### Logica cache
**Nessuna.**

### Problemi e limitazioni
1. **CHALLENGES hardcoded** — Aggiungere nuove sfide richiede redeploy
2. **expires_days sempre 30** — Nessuna flessibilità per sfide a tempo variabile
3. **badge_id salvato ma mai usato** — Non sblocca automaticamente il badge al completamento
4. **Nessun limite sfide attive** — Utente può accumulare infinite sfide diverse
5. **Usa `.single()` invece di `.maybeSingle()`** — Lancia eccezione se 0 risultati

---

## 10. SYNC-HEALTHKIT

**File:** `supabase/functions/sync-healthkit/index.ts`

### Scopo reale
Sincronizza dati HealthKit iOS nel database. Riceve metriche di salute (passi, sonno, FC, HRV, peso, ciclo mestruale) e le persiste su healthkit_data, daily_habits e body_metrics.

### Input attesi
```json
{
  "date": "YYYY-MM-DD (obbligatorio)",
  "steps": 5000,
  "sleep_hours": 7.5,
  "sleep_quality_hk": "good",
  "heart_rate_avg": 72,
  "hrv_avg": 45.5,
  "active_energy": 250,
  "exercise_minutes": 30,
  "weight_kg": 75.5,
  "body_fat_pct": 18.5,
  "menstrual_cycle_phase": "luteal",
  "accessToken": "string?",
  "userId": "UUID?"
}
```

### Output
```json
{
  "success": true,
  "synced_fields": ["steps", "sleep_hours", "heart_rate_avg", "weight_kg"]
}
```

### Modello AI
**Nessuno.**

### Tabelle DB lette
**Nessuna** — Solo scritture.

### Tabelle DB scritte
| Tabella | Operazione | Cosa scrive |
|---------|------------|-------------|
| `healthkit_data` | UPSERT (user_id,date) | steps, sleep_hours, sleep_quality_hk, heart_rate_avg, hrv_avg, active_energy, exercise_minutes, weight_kg, body_fat_pct, menstrual_cycle_phase |
| `daily_habits` (steps) | UPSERT (user_id,habit_type,date) | habit_type="steps", value, target_value=10000, unit="steps" |
| `daily_habits` (sleep) | UPSERT (user_id,habit_type,date) | habit_type="sleep", value, target_value=8, unit="hours" |
| `body_metrics` | UPSERT (user_id,date) | weight |
| `user_profiles` | UPDATE | last_data_change_at |

### Logica cache
**Nessuna.**

### Problemi e limitazioni
1. **Auth Method 3 — GRAVE RISCHIO** — Un client può upsertare dati per QUALSIASI user_id
2. **Partial write success silenzioso** — Se uno dei 5 upsert fallisce, risposta resta `success: true`
3. **Nessuna validazione input** — Range numerici non verificati (steps negativi? weight 0.001?)
4. **Target values hardcoded** — steps=10000, sleep=8 senza considerare preferenze utente
5. **5 upsert NON atomici** — Se uno fallisce a metà, database inconsistente

---

## 11. CALCULATE-CORRELATIONS

**File:** `supabase/functions/calculate-correlations/index.ts`

### Scopo reale
Calcola correlazioni di Pearson tra coppie di metriche psico-fisiche (16 coppie) su 60 giorni. Genera insight testuali in italiano e persiste risultati nella tabella `user_correlations`.

### Input attesi
```json
{
  "user_id": "UUID (obbligatorio)"
}
```

**NOTA:** Nessuna autenticazione richiesta. Usa SUPABASE_SERVICE_ROLE_KEY direttamente.

### Output
```json
{
  "success": true,
  "total_correlations": 16,
  "significant_correlations": 3,
  "top_insights": [
    "Forte correlazione positiva tra sonno e umore.",
    "Correlazione moderata negativa tra ansia e esercizio fisico."
  ]
}
```

### Modello AI
**Nessuno.** Insight generati da funzione deterministica `generateInsight()`:
- |r| >= 0.7: "Forte correlazione"
- 0.4 <= |r| < 0.7: "Correlazione moderata"
- 0.2 <= |r| < 0.4: "Leggera correlazione"

### Tabelle DB lette
| Tabella | Colonne | Periodo |
|---------|---------|---------|
| `sessions` | start_time, mood_score_detected, anxiety_score_detected, energy_score_detected, sleep_quality | 60 giorni, status='completed' |
| `daily_habits` | date, habit_type, value | 60 giorni |
| `daily_psychology` | date, mental_clarity, burnout_level, loneliness_perceived, somatic_tension, rumination | 60 giorni |
| `daily_life_areas` | date, work, social | 60 giorni |
| `healthkit_data` | date, sleep_hours, steps, hrv_avg, heart_rate_avg | 60 giorni |
| `daily_checkins` | date, mood_value | 60 giorni |

### Tabelle DB scritte
| Tabella | Operazione | Cosa scrive |
|---------|------------|-------------|
| `user_correlations` | UPSERT (user_id,metric_a,metric_b) | correlation_type, strength, sample_size, is_significant, insight_text, last_calculated_at |

### Logica cache
**Nessuna.** Ricalcolo completo ogni volta.

### Problemi e limitazioni
1. **GRAVE: Nessuna autenticazione** — Qualsiasi attacker può calcolare correlazioni per qualsiasi user_id via brute-force UUID
2. **Mood da 2 fonti mescolate** — `sessions.mood_score_detected` e `daily_checkins.mood_value` sovrascritti nello stesso bucket
3. **Minimo campione basso** — 5 punti per calcolare, 10 per "significanza". Non statisticamente rigoroso
4. **Nessun test p-value** — Soglia |r| >= 0.3 arbitraria e non basata su significatività statistica
5. **Nessun handling outlier** — Pearson sensibile a outlier
6. **Performance pessima** — 6 query parallele + ricalcolo ad ogni invocazione, zero cache

---

## 12. DETECT-EMOTION-PATTERNS

**File:** `supabase/functions/detect-emotion-patterns/index.ts`

### Scopo reale
Rileva pattern ricorrenti nell'umore e ansia analizzando 90 giorni di sessioni: dip mattutino, boost weekend, blues del lunedì, picchi ansia. Algoritmi statistici ed euristiche hardcoded, raccomandazioni pre-scritte in italiano.

### Input attesi
```json
{
  "user_id": "UUID (obbligatorio)"
}
```

### Output
```json
{
  "success": true,
  "patterns_detected": 2,
  "patterns": [
    {
      "type": "morning_dip|weekend_boost|monday_blues|anxiety_spikes",
      "description": "Il tuo umore tende ad essere più basso al mattino...",
      "confidence": 0.78,
      "recommendations": [
        "Prova a fare 10 minuti di stretching al risveglio",
        "Esponi gli occhi alla luce naturale appena possibile"
      ]
    }
  ]
}
```

### Modello AI
**Nessuno.** Pattern rilevati con algoritmi deterministici + threshold hardcoded.

### Tabelle DB lette
| Tabella | Colonne | Periodo |
|---------|---------|---------|
| `sessions` | start_time, mood_score_detected, anxiety_score_detected, energy_score_detected | 90 giorni, status='completed' |

### Tabelle DB scritte
| Tabella | Operazione | Cosa scrive |
|---------|------------|-------------|
| `emotion_patterns` | UPDATE o INSERT | pattern_type, description, confidence, data_points, trigger_factors, recommendations, last_validated_at, is_active |

### Logica cache
**Nessuna.** Ricalcolo completo da zero ogni volta.

### Problemi e limitazioni
1. **Nessun caching** — Query 90 giorni + 4 loop O(n) ad ogni richiesta
2. **Threshold hardcoded non adattivi** — morning_dip diff>=1.5, weekend_boost diff>=1.0, monday_blues diff>=1.2
3. **Timezone ignorato** — `new Date(session.start_time).getHours()` assume timezone server = utente
4. **energy_score_detected letto ma MAI usato** — Colonna scaricata e ignorata
5. **Solo 4 pattern** — Non rileva cicli multisettimanali, correlazione meteo/stagione, trend lungo termine
6. **Recommendations statiche** — Sempre le stesse per ogni pattern
7. **Nessun test significatività statistica** — Confidence calcolata con formula semplicistica
8. **Race condition** — Due processi simultanei possono entrambi fare INSERT

---

## 13. CREATE-OBJECTIVE-CHAT

**File:** `supabase/functions/create-objective-chat/index.ts`

### Scopo reale
Conversazione AI assistita per creare obiettivi personalizzati. Aria guida l'utente a definire categoria, tipo, valori numerici, deadline. Restituisce JSON strutturato per il client. Non salva nel DB.

### Input attesi
```json
{
  "messages": [{ "role": "user|assistant", "content": "..." }]
}
```

### Output
```json
{
  "message": "Perfetto! Ho aggiunto il tuo obiettivo: Dimagrire 🎉",
  "objective": {
    "category": "body|mind|study|work|relationships|growth|finance",
    "title": "Dimagrire",
    "description": "string?",
    "target_value": 75,
    "starting_value": 85,
    "current_value": 85,
    "unit": "kg",
    "input_method": "numeric|milestone",
    "deadline": "2026-06-30",
    "objective_type": "counter|transformation|milestone",
    "ai_custom_description": "Il tuo percorso verso un fisico sano",
    "ai_feedback": "Pronto a iniziare!"
  },
  "createNow": true
}
```

### Modello AI + System Prompt
**Modello:** `gemini-2.5-flash-preview-04-17` — Temperature: 0.7, maxOutputTokens: 500

**System Prompt (primi 500 char):**
```
Sei Aria, un'assistente che aiuta a creare obiettivi personalizzati.
Il tuo UNICO scopo è raccogliere informazioni per creare un obiettivo, NON fare conversazione.

IMPORTANTE: L'utente ti descrive direttamente il suo obiettivo. Tu DEVI determinare
AUTONOMAMENTE la categoria più appropriata in base al contenuto.

CATEGORIE OBIETTIVI (assegna tu quella giusta):
- mind: Mente, benessere mentale, meditazione, ridurre ansia, gestire stress
- body: Corpo, fitness, perdere peso, muscoli, sport, salute fisica
- study: Studio, scuola, università, voti, esami, apprendimento
```

### Tabelle DB lette / scritte
**Nessuna.** Funzione puramente conversazionale, salvataggio delegato al client.

### Logica cache
**Nessuna.**

### Problemi e limitazioni
1. **Nessuna autenticazione** — Chiunque può chiamare
2. **Client-side persistence** — Fiducia completa nel client per salvare
3. **Parsing JSON fragile** — Regex `/\{[\s\S]*\}/`
4. **Nessun rate limiting**
5. **Zero input validation**

---

## 14. UPDATE-OBJECTIVE-CHAT

**File:** `supabase/functions/update-objective-chat/index.ts`

### Scopo reale
Conversazione AI per aggiornare progressi di obiettivi esistenti. Riceve obiettivi attivi, estrae aggiornamenti numerici/qualitativi dalla conversazione, genera feedback motivazionale e **salva direttamente nel DB**.

### Input attesi
```json
{
  "messages": [{ "role": "user|assistant", "content": "..." }],
  "activeObjectives": [
    {
      "id": "UUID",
      "title": "Dimagrire",
      "category": "body",
      "current_value": 85,
      "target_value": 75,
      "starting_value": 85,
      "unit": "kg",
      "ai_progress_estimate": 10,
      "ai_milestones": []
    }
  ]
}
```
**Header:** `Authorization: Bearer <JWT>` **(obbligatorio)**

### Output
```json
{
  "message": "Bellissimo! Sei a 83kg, hai già perso 2kg 💪",
  "updates": [
    {
      "id": "UUID",
      "current_value": 83,
      "ai_progress_estimate": 40,
      "ai_feedback": "Sei a 83kg, hai già perso 2kg dei 10kg totali",
      "updated_at": "2026-02-28T10:30:00.000Z"
    }
  ]
}
```

### Modello AI + System Prompt
**Modello:** `gemini-2.5-flash-preview-04-17` — Temperature: 0.7, maxOutputTokens: 500

**System Prompt (primi 500 char):**
```
Sei Aria, l'assistente AI di supporto emotivo. Stai aiutando l'utente ad aggiornare
i progressi dei suoi obiettivi.

═══════════════════════════════════════════════
📋 OBIETTIVI ATTIVI DELL'UTENTE:
═══════════════════════════════════════════════
📌 OBIETTIVO #1:
   ID: {id}
   Titolo: "{title}"
   Categoria: {category}
   Tipo: Numerico
   NUMERICO - Attuale: {current_value}{unit} / Target: {target_value}{unit} ({progress}%)
```

### Tabelle DB lette
Obiettivi ricevuti dal client (non query diretta). Validazione ID vs `activeObjectives`.

### Tabelle DB scritte
| Tabella | Operazione | Cosa scrive |
|---------|------------|-------------|
| `user_objectives` | UPDATE | current_value, ai_progress_estimate, ai_feedback, ai_milestones (append), updated_at. WHERE id AND user_id |

### Logica cache
**Nessuna.**

### Problemi e limitazioni
1. **Race condition** — Due sessioni simultanee sovrascrivono lo stesso obiettivo
2. **ai_milestones sempre append** — Nessuna deduplicazione, stessa milestone aggiunta più volte
3. **No atomicity** — Se 1 di N obiettivi fallisce update, altri salvati (transazione parziale)
4. **Parsing JSON fragile** — Regex per markdown code blocks

---

## 15. CREATE-HABIT-CHAT

**File:** `supabase/functions/create-habit-chat/index.ts`

### Scopo reale
Conversazione AI per creare abitudini tracciabili. Aria guida a definire categoria, metodo input (toggle/counter/abstain/numeric), obiettivo giornaliero. Restituisce JSON strutturato per il client.

### Input attesi
```json
{
  "messages": [{ "role": "user|assistant", "content": "..." }]
}
```

### Output
```json
{
  "message": "Fatto! 🎉 Ho aggiunto 'Acqua 💧'",
  "createNow": true,
  "habit": {
    "habit_type": "water",
    "label": "Acqua 💧",
    "icon": "💧",
    "category": "health|fitness|mental|nutrition|bad_habits|productivity|social|self_care",
    "daily_target": 8,
    "unit": "bicchieri",
    "streak_type": "daily|abstain",
    "input_method": "toggle|counter|abstain|numeric|timer",
    "update_method": "checkin|chat|auto_sync",
    "requires_permission": false
  }
}
```

### Modello AI + System Prompt
**Modello:** `gemini-2.5-flash-preview-04-17`

**System Prompt (primi 500 char):**
```
Sei Aria, un'assistente AI che aiuta gli utenti a creare abitudini personalizzate
per il loro benessere.

## IL TUO COMPITO
Aiutare l'utente a definire un'abitudine da tracciare. Devi:
1. Capire cosa vuole tracciare
2. Determinare la categoria e il tipo di input appropriato
3. Chiedere l'obiettivo giornaliero (se applicabile)
4. Chiedere come preferisce aggiornare l'abitudine
5. Creare l'abitudine

## CATEGORIE DISPONIBILI
- health: Salute (sonno, acqua, vitamine, farmaci)
```

### Tabelle DB lette / scritte
**Nessuna.** Salvataggio delegato al client.

### Logica cache
**Nessuna.**

### Problemi e limitazioni
1. **Nessuna autenticazione** — Chiunque può chiamare
2. **Parsing JSON fragile** — `JSON.parse(content)` diretto senza regex fallback
3. **habit_type non validato** — Se AI genera tipo non previsto, nessun controllo
4. **Temperature e maxTokens non configurati** — Usa default Gemini
5. **Nessun rate limiting**

---

## 16. DOCTOR-VIEW-DATA

**File:** `supabase/functions/doctor-view-data/index.ts`

### Scopo reale
Endpoint protetto per medici/psicologi per visualizzare dati anonimizzati del paziente tramite token di accesso condiviso. Calcola metriche cliniche, estrae temi, genera report AI e traccia audit trail.

### Input attesi
- **Header:** `Authorization: Bearer <JWT_DOCTOR>` (obbligatorio)
- **Body:** `{ "token": "SHARED_ACCESS_TOKEN (obbligatorio)" }`

### Output
```json
{
  "patient": {
    "firstName": "string",
    "memberSince": "ISO",
    "wellnessScore": 72,
    "lifeAreasScores": { "love": 7, "work": 5 },
    "lastSessionDate": "ISO"
  },
  "metrics": {
    "totalSessions": 42,
    "totalCheckins": 89,
    "avgMood": "6.5",
    "avgAnxiety": "4.2",
    "peakAnxiety": 8,
    "estimatedSleepQuality": "Buona|Moderata|Scarsa",
    "periodDays": 30
  },
  "topThemes": [{ "tag": "ansia", "count": 15 }],
  "recentEvents": [{ "date": "28/02", "event": "..." }],
  "moodTrend": [{ "date": "28 Feb", "mood": 7, "anxiety": 3 }],
  "clinicalSummary": "Report AI max 400 parole",
  "riskStatus": "stable|attention|critical",
  "accessInfo": {
    "expiresAt": "ISO",
    "accessCount": 5,
    "accessedBy": "doctor_uuid"
  }
}
```

### Modello AI + System Prompt
**Modello:** `gemini-2.5-flash-preview-04-17`

**System Prompt (dinamico):**
```
Sei uno psicologo clinico che deve redigere un report professionale per un collega medico.
DATI DEL PAZIENTE (ultimi 30 giorni):
- Media umore: {avgMood}/10
- Media ansia: {avgAnxiety}/10
- Picco ansia: {peakAnxiety}/10
- Sessioni totali: {count}
- Temi principali: {themes}
[Include events, session summaries]
ISTRUZIONI: Genera un report clinico STRUTTURATO (max 400 parole)...
```

### Tabelle DB lette
| Tabella | Colonne |
|---------|---------|
| `user_roles` | role, user_id |
| `shared_access` | token, is_active, expires_at, access_count, last_accessed_at, user_id, id |
| `doctor_patient_access` | doctor_id, patient_id, is_active |
| `user_profiles` | name, wellness_score, life_areas_scores, created_at |
| `sessions` | id, start_time, mood_score_detected, anxiety_score_detected, emotion_tags, ai_summary, life_balance_scores, key_events, status, crisis_alert |
| `daily_checkins` | id, created_at, mood_value, mood_emoji, notes |

### Tabelle DB scritte
| Tabella | Operazione | Cosa scrive |
|---------|------------|-------------|
| `shared_access` | UPDATE | access_count (+1), last_accessed_at |

### Logica cache
**Nessuna.**

### Problemi e limitazioni
1. **Security — Relazione doctor-patient opzionale** — Controlla `doctor_patient_access` ma NON blocca se non esiste. Qualsiasi medico con token valido accede a qualsiasi paziente
2. **Sleep quality stimata** — Non basata su dati reali di sonno, solo mood/anxiety
3. **Periodo 30 giorni hardcoded** — Nessuna flessibilità
4. **Mood trend limitato a 14 ultimi** — `slice(0, 14)` anche se richiesti tutti
5. **clinicalSummary vuoto se no GOOGLE_API_KEY**

---

## 17. GENERATE-CLINICAL-REPORT

**File:** `supabase/functions/generate-clinical-report/index.ts`

### Scopo reale
Genera report clinico professionale per l'utente su periodi customizzabili. Aggrega sessioni, check-in, diari tematici e li passa a Gemini per report strutturato multi-paragrafo. Esportazione PDF-ready.

### Input attesi
- **Header:** `Authorization: Bearer <JWT>` (obbligatorio)
- **Body:** `{ "days": 30 }`

### Output
```json
{
  "userName": "Marco",
  "periodDays": 30,
  "generatedAt": "ISO",
  "stats": {
    "avgMood": "6.5",
    "avgAnxiety": "4.2",
    "totalSessions": 42,
    "totalCheckins": 89,
    "wellnessScore": 72
  },
  "keyEvents": ["string array, max 10"],
  "topEmotions": ["string array, max 3"],
  "topThemes": ["string array, max 3"],
  "clinicalSummary": "Report AI professionale 400-800 parole"
}
```

### Modello AI + System Prompt
**Modello:** `gemini-2.5-flash-preview-04-17`

**System Prompt completo (~1100 char):**
```
Agisci come un ASSISTENTE CLINICO ESPERTO con formazione in psicologia clinica e psichiatria.
Il tuo compito è generare un REPORT TECNICO PROFESSIONALE destinato a un medico/psicoterapeuta.

STILE DI LINGUAGGIO (OBBLIGATORIO):
- Usa SEMPRE terminologia medica professionale:
  • "Il paziente manifesta..." (non "L'utente dice...")
  • "Umore deflesso" (non "Si sente giù")
  • "Ideazione ansiosa persistente" (non "È ansioso")
  • "Ruminazione cognitiva" (non "Pensa troppo")
  • "Anedonia" (non "Non prova piacere")

STRUTTURA DEL REPORT:
1. PANORAMICA CLINICA (2-3 frasi)
2. PROFILO EMOTIVO (andamento, ansia, pattern temporali)
3. AREE TEMATICHE PREDOMINANTI
4. EVENTI STRESSOGENI IDENTIFICATI
5. INDICAZIONI CLINICHE (diagnosi differenziali, segnali allarme)
6. RACCOMANDAZIONI PER IL FOLLOW-UP
```

### Tabelle DB lette
| Tabella | Colonne |
|---------|---------|
| `user_profiles` | name, wellness_score |
| `sessions` | * (all) |
| `daily_checkins` | * (all) |
| `thematic_diaries` | * (all) |

### Tabelle DB scritte
**Nessuna** — READ-ONLY.

### Logica cache
**Nessuna.**

### Problemi e limitazioni
1. **SELECT * su thematic_diaries** — Nessun filtro per user_id nella select (presente nel .eq() ma inefficiente)
2. **Mood scaling arbitrario** — Checkins mood_value (1-5) moltiplicato per 2 = 1-10. Non verificato
3. **Ansia solo da sessions** — Non da checkins. Inconsistente con mood
4. **Nessun generationConfig** — Temperature, topK, topP non specificati
5. **Zero caching** — Ogni richiesta rilegge tutto e chiama Gemini

---

## 18. ARIA-PUSH-NOTIFICATION

**File:** `supabase/functions/aria-push-notification/index.ts`

### Scopo reale
Notifiche push proattive iOS (APNs) con messaggi contestuali AI. Genera messaggi personalizzati come "un'amica che scrive su WhatsApp". Monitora streak, mood recente, eventi e argomenti conversazionali. Traccia invii e disattiva token invalidi.

### Input attesi
```json
{
  "userId": "UUID? (se presente, solo questo utente; altrimenti TUTTI)",
  "triggerType": "string? (default 'scheduled', mai usato nel codice)"
}
```

### Output
```json
{
  "sent": 5
}
```

### Modello AI + System Prompt
**Modello:** `gemini-2.5-flash-preview-04-17`

**System Prompt (completo):**
```
Sei Aria, la migliore amica dell'utente {name}.
Devi scrivere UN SINGOLO messaggio push notification proattivo.

CONTESTO:
- Ultimo check-in: {lastSessionDaysAgo} giorni fa
- Streak attuale: {currentStreak} giorni
- Ultimo umore: {lastMood}/10
- Argomenti recenti: {topics}
- Ora: {hour}
- Eventi in arrivo: {pendingEvents}

REGOLE:
- Max 50 caratteri per il titolo
- Max 100 caratteri per il body
- Tono da AMICA, non da app/robot
- Deve sembrare un messaggio WhatsApp da un'amica vera
- USA il nome dell'utente
- NO emoji eccessivi (max 1)
- NO frasi da terapeuta

Rispondi SOLO in JSON: {"title": "...", "body": "...", "triggerType": "..."}
```

### Tabelle DB lette
| Tabella | Colonne |
|---------|---------|
| `device_push_tokens` | user_id, device_token, is_active, platform |
| `user_profiles` | name, notification_settings |
| `sessions` | start_time, mood_score_detected |
| `habit_streaks` | current_streak, habit_type |
| `user_events` | title, status, event_date |
| `conversation_topics` | topic, last_mentioned_at |

### Tabelle DB scritte
| Tabella | Operazione | Cosa scrive |
|---------|------------|-------------|
| `device_push_tokens` | UPDATE | is_active=false (quando APNs ritorna 410/400) |
| `smart_notifications` | INSERT | user_id, trigger_type, content, title, priority, scheduled_for, sent_at |

### Logica cache
**Nessuna.** APNs JWT ricostruito ogni volta.

### Problemi e limitazioni
1. **JWT APNs costruito manualmente** — Conversione DER → raw r||s potenzialmente non standard
2. **Nessuna autenticazione endpoint** — Chiunque può triggerare notifiche per tutti gli utenti
3. **Nessun timeout su APNs fetch** — Può bloccarsi indefinitamente
4. **Parsing Gemini fragile** — Regex `/\{[\s\S]*\}/` fallisce silenziosamente
5. **N+1 query** — 5 query per ogni utente
6. **Timezone hardcoded Europe/Rome**
7. **Nessun rate limiting** — Può spammare utenti
8. **triggerType nel body mai usato** — Parametro accettato ma ignorato

---

## TABELLA RIEPILOGATIVA

| Funzione | AI | DB Read | DB Write | Cache | Autenticazione | Problema critico |
|----------|:--:|:---:|:---:|:---:|:---:|---|
| get-exercises | No | 1 | 0 | No | Triple fallback | Auth method 3 |
| log-exercise | No | 2 | 3 | Timestamp | Triple fallback | Race condition punti |
| generate-wrapped | Gemini | 8 | 1 | No | Triple fallback | Query sequenziali |
| get-wrapped | No | 1 | 0 | 24h | Triple fallback | Race condition |
| transcribe-diary-voice | Whisper | 0 | 0 | No | Triple fallback | No validation audio |
| get-diary-prompt | Gemini | 3 | 0 | No | Triple fallback | **BUG: diary_entries ignorate** |
| get-gamification-status | No | 8 | 0 | No | Triple fallback | N+1 queries |
| redeem-points | No | 2 | 3 | No | Triple fallback | **Race condition critica** |
| start-challenge | No | 1 | 1 | No | Triple fallback | Challenges hardcoded |
| sync-healthkit | No | 0 | 5 | No | Triple fallback | **Auth bypass per any user** |
| calculate-correlations | No | 6 | 1 | No | **NESSUNA** | **Zero auth, any user_id** |
| detect-emotion-patterns | No | 1 | 1 | No | Nessuna | Timezone ignorato |
| create-objective-chat | Gemini | 0 | 0 | No | **NESSUNA** | No auth, no persistence |
| update-objective-chat | Gemini | 0 (param) | 1 | No | JWT | Race condition |
| create-habit-chat | Gemini | 0 | 0 | No | **NESSUNA** | No auth, no persistence |
| doctor-view-data | Gemini | 6 | 1 | No | JWT + token | **Doctor access bypass** |
| generate-clinical-report | Gemini | 4 | 0 | No | JWT | SELECT * inefficiente |
| aria-push-notification | Gemini | 6 | 2 | No | **NESSUNA** | **Chiunque triggerare notifiche** |
