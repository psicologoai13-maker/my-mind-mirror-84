# ARIA AUDIT — PARTE 1: EDGE FUNCTIONS CORE

> Data analisi: 28 Febbraio 2026
> Branch: `claude/aria-functions-audit-o0F3N`
> Funzioni analizzate: 11 (ai-chat, ai-dashboard, ai-analysis, ai-insights, ai-checkins, home-context, process-session, real-time-context, elevenlabs-context, elevenlabs-conversation-token, aria-chat-ios)

---

## 1. AI-CHAT

**File:** `supabase/functions/ai-chat/index.ts`

### Scopo reale
Funzione terapeutica conversazionale multicontesto. Fornisce supporto psicologico personalizzato tramite AI, agendo come "migliore amica + psicologa clinica esperta". Inietta dinamicamente dati utente (memoria, obiettivi, metriche, eventi) nel prompt. Applica protocolli clinici avanzati (CBT, DBT, MI, SFBT, tecniche di grounding). Rileva crisi e attiva protocollo SOS con numeri telefonici.

### Input attesi

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|:---:|-------------|
| `messages` / `conversationHistory` | array | Si | `[{role: "user"\|"assistant", content: string}]` |
| `generateSummary` | boolean | No | Se true, genera riassunto JSON della sessione |
| `userId` | string | No | UUID utente (fallback auth) |
| `accessToken` | string | No | Token Supabase |
| `realTimeContext` | object | No | `{datetime, location, weather, news}` |
| `stream` | boolean | No | Default true. Abilita streaming SSE |

**Headers:** `Authorization: Bearer <JWT|accessToken>` (opzionale — 3 metodi auth in cascata)

### Output

**Se `generateSummary === true`:**
```json
{
  "summary": {
    "summary": "Breve riassunto 2 frasi",
    "mood_score": 1-10,
    "anxiety_score": 1-10,
    "tags": ["Tag1", "Tag2", "Tag3"]
  }
}
```

**Se `stream: false` (iOS):**
```json
{
  "reply": "Risposta testo dell'AI"
}
```
Header aggiuntivo: `X-Crisis-Alert: true` (se crisi rilevata)

**Se `stream: true` (default, web — SSE):**
```
data: {"choices":[{"delta":{"content":"testo delta"},"finish_reason":null}]}
data: [DONE]
```

### Modello AI + System Prompt

**Modello:** `gemini-2.5-flash-preview-04-17`
**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:streamGenerateContent`

**System Prompt (primi 500 caratteri):**
```
═══════════════════════════════════════════════
🆔 IDENTITÀ FONDAMENTALE (LEGGI PRIMA DI TUTTO!)
═══════════════════════════════════════════════

TU SEI ARIA, un'intelligenza artificiale amica.
L'UTENTE è la persona che ti scrive.

⛔ REGOLA #0 - ANTI-CONFUSIONE IDENTITARIA:
- Tu NON hai un corpo, NON pesi, NON mangi, NON dormi
- Tu NON stai lavorando su "un'app", NON sei stanca, NON sei dimagrita
- Tu NON hai esperienze fisiche o personali come un umano
- TUTTO ciò che l'utente dice riguarda LUI/LEI, mai te
```

**Componenti prompt dinamici iniettati in sequenza (prompt finale ~30-50KB):**
1. GOLDEN_RULES — regole d'oro (brevità, pertinenza, naturale)
2. EMOTIONAL_RUBRIC — valutazione 5 dimensioni emotive
3. ADVANCED_CLINICAL_TECHNIQUES — MI, DBT TIPP, SFBT, assessment psichiatrico
4. CLINICAL_KNOWLEDGE_BASE — enciclopedia disturbi (ansia, depressione, trauma, OCD, ecc.)
5. PSYCHOEDUCATION_LIBRARY — meccanismi psicologici + distorsioni cognitive CBT
6. User context block — nome, obiettivi, memoria, metriche prioritarie
7. MEMORY section — ultimi 50 ricordi strutturati (tagged: [PERSONA], [EVENTO], [HOBBY])
8. Objectives tracking — obiettivi attivi con progresso (current/target)
9. Interests block — sport, musica, lavoro, hobby, preferenze comunicative
10. Current state block — metriche di oggi (mood, anxiety, energy, sleep, emozioni, aree vita)
11. Recent sessions context — ultime 5 sessioni + regole saluto basate su tempo dall'ultima
12. Night mode override — (se 00:00-06:00) protocollo notturno con supporto specifico
13. Real-time context (se fornito) — data/ora, meteo, notizie, location
14. HealthKit data (se disponibile) — passi, sonno, FC media, HRV di oggi
15. Knowledge Base dinamica — max 2 documenti da `aria_knowledge_base` matching keywords
16. Crisis override — (se rilevato) sostituisce tutto con SOS protocol

### Tabelle DB lette

| Tabella | Colonne rilevanti |
|---------|-------------------|
| `user_profiles` | name, life_areas_scores, selected_goals, onboarding_answers, dashboard_config, gender, birth_date, height, therapy_status, occupation_context |
| `user_interests` | sports_followed, favorite_teams, favorite_athletes, music_genres, current_shows, industry, professional_interests, creative_hobbies, outdoor_activities, indoor_activities, pet_owner, pets, personal_values, nickname, humor_preference, emoji_preference, sensitive_topics |
| `user_objectives` | id, title, category, target_value, current_value, starting_value, unit, status, ai_feedback |
| `daily_habits` | habit_type, value, target_value, unit, date |
| `body_metrics` | weight, sleep_hours, steps, active_minutes, resting_heart_rate, date |
| `user_events` | id, title, event_type, location, event_date, event_time, status, follow_up_done, extracted_from_text |
| `user_memories` | id, category, fact, importance, last_referenced_at, is_active |
| `sessions` | id, start_time, type, ai_summary, transcript, emotion_tags, mood_score_detected, anxiety_score_detected, status |
| `session_context_snapshots` | key_topics, unresolved_issues, action_items, context_summary, dominant_emotion, follow_up_needed, session_quality_score, created_at |
| `conversation_topics` | topic, mention_count, is_sensitive, avoid_unless_introduced, last_mentioned_at |
| `habit_streaks` | habit_type, current_streak, longest_streak, last_completion_date |
| `aria_knowledge_base` | topic, title, content, keywords, priority, is_active |
| `healthkit_data` | steps, sleep_hours, heart_rate_avg, hrv_avg, user_id, date |

**RPC:** `get_daily_metrics(p_user_id, p_date)`

### Tabelle DB scritte

**NESSUNA.** La funzione è READ-ONLY.

### Logica cache

| Campo | Durata | Invalidazione |
|-------|--------|---------------|
| `habit_streaks.last_completion_date` | Indefinita (cache precalcolata) | Automatica quando `daily_habits` aggiornata |

Nessun TTL esplicito. La tabella `habit_streaks` è precalcolata.

### Problemi e limitazioni

1. **Token limit silenzioso** — Memory limitata a 50 su 80 nel DB. Se utente ha >80 ricordi, i vecchi vengono ignorati senza avviso
2. **System prompt ingestibile (~30-50KB)** — Nessun meccanismo di truncation dinamico per gestire overflow token Gemini
3. **Knowledge Base matching primitivo** — Solo substring matching case-insensitive, no embeddings/NLP
4. **Auth fallback chain vulnerabile** — 3 metodi in cascata; se falliscono tutti, profilo anonimo senza avviso. Auth method 3 usa service role key se userId fornito = rischio accesso profilo altrui
5. **Crisis detection semplicistico** — Solo regex su stringhe italiane specifiche. False negatives per phrasing diverso, false positives per menzioni casuali. Non valuta il contesto della frase
6. **Night mode override troppo aggressivo** — Sovrascrive tutte le istruzioni 00:00-06:00, potrebbe interferire con protocollo SOS
7. **Prompt injection via user memory** — Memoria iniettata direttamente nel prompt senza sanitizzazione
8. **Objectives tracking NON persiste valori** — AI legge progressi ma non scrive `current_value` aggiornato nel DB
9. **Events range fisso** — Solo 7 giorni passati + 30 futuri. Evento al giorno 31 ignorato
10. **Nessun timeout su fetch Gemini** — Può restare appeso indefinitamente
11. **Nessun rate limiting**
12. **No timestamp/timezone validation** — Server UTC vs mezzanotte utente locale

---

## 2. AI-DASHBOARD

**File:** `supabase/functions/ai-dashboard/index.ts`

### Scopo reale
Genera una configurazione dashboard personalizzata per la homepage. Assegna 4 metriche primarie ("focus") all'utente in base a obiettivi, dati storici e stato mentale. Mantiene i focus coerenti nel tempo, cambiandoli solo per motivi critici (trauma, obiettivo raggiunto, metriche critiche).

### Input attesi

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|:---:|-------------|
| Header `Authorization` | JWT | Si | Token Supabase |

Nessun body o query parameter. Solo GET autenticato.

### Output

```json
{
  "primary_metrics": [
    {
      "key": "mood",
      "value": 7,
      "label": "Umore",
      "icon": "😌",
      "priority": 1,
      "reason": "Il tuo umore generale"
    }
  ],
  "widgets": [
    {
      "type": "vitals_grid|goals_progress|radar_chart",
      "title": "string",
      "description": "string",
      "priority": 1,
      "visible": true
    }
  ],
  "ai_message": "",
  "focus_areas": ["anxiety", "love"],
  "wellness_score": 6.5,
  "wellness_message": "Ti stai riprendendo bene, un passo alla volta.",
  "goals_evaluation": [
    {
      "goal_id": "reduce_anxiety",
      "progress": 65,
      "status": "in_progress",
      "ai_feedback": "Progredisci in modo costante!"
    }
  ]
}
```

Per nuovi utenti: `wellness_score: null`, messaggio di benvenuto generico.

### Modello AI + System Prompt

**Modello:** `gemini-2.5-flash-preview-04-17` — Temperature: 0.7

**System Prompt (primi 500 caratteri):**
```
Sei un AI psicologo che personalizza la DASHBOARD HOME di un'app di benessere mentale.
La Dashboard è una vista ESSENZIALE che mostra solo ciò che è più importante PER L'UTENTE in questo momento.

═══════════════════════════════════════════════
⚠️ REGOLA CRITICA: STABILITÀ DEI FOCUS
═══════════════════════════════════════════════
I FOCUS devono essere STABILI - cambiali SOLO se c'è un motivo CRITICO:
1. Nuovo evento traumatico/significativo nelle sessioni
2. Un obiettivo è stato raggiunto o abbandonato
3. Una metrica è passata da critica a normale (o viceversa)
4. L'utente ha esplicitamente chiesto di monitorare qualcosa di nuovo
```

**Criteri di importanza nel prompt (in ordine):**
- PRIORITÀ 1: Obiettivi onboarding ATTIVI
- PRIORITÀ 2: Valori CRITICI (≤3 o ≥8)
- PRIORITÀ 3: Temi menzionati nelle sessioni recenti
- PRIORITÀ 4: Trend negativi significativi (>20% in 7 giorni)
- PRIORITÀ 5: Metriche correlate agli obiettivi

### Tabelle DB lette

| Tabella | Colonne | Filtro |
|---------|---------|--------|
| `user_profiles` | selected_goals, onboarding_answers, dashboard_config, ai_dashboard_cache | user_id |
| `daily_emotions` | * | user_id, date >= 30 giorni fa |
| `daily_life_areas` | * | user_id, date >= 30 giorni fa |
| `daily_psychology` | * | user_id, date >= 30 giorni fa |
| `sessions` | ai_summary, mood_score_detected, anxiety_score_detected | user_id, start_time >= 30 giorni fa (limit 10) |
| `sessions` | id (count) | user_id (count all-time) |

### Tabelle DB scritte

**NESSUNA** — READ-ONLY. Non salva il risultato in `ai_dashboard_cache`. Il frontend deve farlo separatamente.

### Logica cache

| Campo | Durata | Invalidazione |
|-------|--------|---------------|
| `user_profiles.ai_dashboard_cache` | ~24 ore (implicito) | Letto solo per stabilità focus. Non scritto da questa funzione |

### Problemi e limitazioni

1. **Energy calcolata come mood × 0.8** — Non esiste in nessuna tabella; approssimazione arbitraria
2. **Recovery da errori AI troppo generico** — Se JSON invalido, fallback con 4 metriche fisse non personalizzate
3. **Nessuna persistenza output** — La funzione non salva in `ai_dashboard_cache`, delegando al frontend
4. **Rate limiting nascosto** — Gestisce 429/402 ma non retenta
5. **Focus change detection solo logging** — Se cambiano >2 focus, logga un warning ma non previene il cambio
6. **CORS aperto** — `Access-Control-Allow-Origin: *`

---

## 3. AI-ANALYSIS

**File:** `supabase/functions/ai-analysis/index.ts` (353 righe)

### Scopo reale
Personalizza la pagina ANALISI aggregando TUTTI i dati storici dell'utente in un periodo configurabile. Usa AI per ordinare le sezioni per rilevanza, evidenziare 3-5 metriche critiche, suggerire 2-3 metriche per deep dive, e generare riassunto AI + focus insight che collega pattern tra metriche.

### Input attesi

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|:---:|-------------|
| Header `Authorization` | JWT | Si | Token Supabase |
| `timeRange` | string | No | `"day"\|"week"\|"month"\|"year"` (default: `"week"`) |

### Output

```json
{
  "sections": [
    {
      "id": "wellness_hero|vitals_grid|emotional_mix|life_areas|deep_psychology",
      "title": "string",
      "description": "string",
      "priority": 1-5,
      "visible": true,
      "metrics": ["string[]"],
      "chartType": "grid|bar|radar|line|mix"
    }
  ],
  "highlighted_metrics": [
    {
      "key": "anxiety",
      "label": "Ansia",
      "category": "vitali|emozioni|aree|psicologia",
      "icon": "😰",
      "priority": 1,
      "reason": "string personalizzato",
      "showChart": true,
      "showInSummary": true
    }
  ],
  "ai_summary": "Max 2 frasi sullo stato generale",
  "focus_insight": "Collega almeno 2 metriche fra loro",
  "recommended_deep_dive": ["metric1", "metric2"]
}
```

### Modello AI + System Prompt

**Modello:** `gemini-2.5-flash-preview-04-17` — Temperature: 0.7

**System Prompt (primi 500 caratteri):**
```
Sei un AI psicologo che personalizza la pagina ANALISI di un'app di benessere mentale.
La pagina Analisi è una vista COMPLETA che mostra TUTTI i dati storici dell'utente, non solo quelli prioritari.

IL TUO COMPITO:
1. Organizzare le sezioni in ordine di rilevanza per l'utente
2. Evidenziare 3-5 metriche che meritano attenzione speciale
3. Suggerire 2-3 metriche su cui l'utente dovrebbe fare un "deep dive"
4. Generare un breve riassunto AI dello stato generale
5. Generare un insight focale basato sui pattern rilevati
```

### Tabelle DB lette

| Tabella | Colonne | Filtro |
|---------|---------|--------|
| `user_profiles` | selected_goals, onboarding_answers | user_id |
| `daily_emotions` | * | user_id, date >= startDate |
| `daily_life_areas` | * | user_id, date >= startDate |
| `daily_psychology` | * | user_id, date >= startDate |
| `sessions` | ai_summary, mood_score_detected, anxiety_score_detected, sleep_quality | user_id, start_time >= startDate |

### Tabelle DB scritte

**NESSUNA** — READ-ONLY.

### Logica cache

**NESSUNA CACHE.** Ogni richiesta: query DB + chiamata Gemini API.

### Problemi e limitazioni

1. **Nessun timeout su AI API** — Nessun AbortController
2. **Parsing JSON fragile** — Regex `content.match(/\{[\s\S]*\}/)` potrebbe catturare troppo
3. **`energy` non presente nei dati** — Menzionata nel prompt ma non letta da nessuna tabella
4. **timeRange non validato** — Valore invalido → default 365 giorni senza warning
5. **Calcolo "media" ignora gli zeri** — `v > 0` esclude lo 0, che potrebbe essere valido
6. **Nessun rate limiting per endpoint**
7. **focus_insight non validato** — Non verifica che AI colleghi effettivamente 2+ metriche
8. **`onboarding_answers` letto ma non usato** nel prompt

---

## 4. AI-INSIGHTS

**File:** `supabase/functions/ai-insights/index.ts`

### Scopo reale
Genera esattamente 3 insight personalizzati (positivo, alert, suggerimento, correlazione, obiettivo-correlato) basati su metriche psicologiche, vitali e obiettivi personali.

### Input attesi

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|:---:|-------------|
| Header `Authorization` | JWT | Si | Token Supabase |

Nessun body o query parameter.

### Output

```json
{
  "insights": [
    {
      "type": "positive|alert|suggestion|correlation|goal",
      "title": "Max 15 parole",
      "message": "Max 30 parole"
    }
  ]
}
```

### Modello AI + System Prompt

**Modello:** `gemini-2.5-flash-preview-04-17` — Temperature: 0.7, maxOutputTokens: 500

**System Prompt completo:**
```
Sei uno psicologo clinico esperto che fornisce insight brevi e personalizzati.
Genera esattamente 3 insight per l'utente basandoti sui suoi dati.

Regole CRITICHE:
1. Ogni insight deve essere BREVE (max 15 parole per il titolo, max 30 parole per il messaggio)
2. Usa SOLO i dati forniti - non inventare metriche
3. Prioritizza insight legati agli obiettivi dell'utente
4. Sii empatico ma diretto
5. Suggerisci azioni concrete quando possibile
6. Per metriche negative alte (ansia, burnout, rumination > 6) mostra alert
7. Per metriche positive alte (gratitudine, coping > 7) celebra il successo

Tipi di insight disponibili:
- "positive": Per celebrare progressi o stati positivi (colore verde)
- "alert": Per segnalare metriche critiche che richiedono attenzione (colore arancione)
- "suggestion": Per suggerimenti pratici (colore blu)
- "correlation": Per pattern rilevati tra metriche (colore viola)
- "goal": Per insight legati agli obiettivi dell'utente (colore teal)

Rispondi SOLO con un JSON array valido, senza markdown, senza spiegazioni.
```

### Tabelle DB lette

| Tabella | Colonne | Metodo |
|---------|---------|--------|
| `user_profiles` | selected_goals, name, onboarding_answers | SELECT |
| `sessions` | ai_summary, emotion_tags, start_time | SELECT (ultime 5 completate) |
| RPC `get_daily_metrics` | vitals, emotions, life_areas, deep_psychology | RPC call |

### Tabelle DB scritte

**NESSUNA** — READ-ONLY.

### Logica cache

**NESSUNA.** Ogni richiesta genera query DB + chiamata Gemini.

### Problemi e limitazioni

1. **Nessuna cache** — Ogni chiamata = 3 query DB + 1 API call Gemini
2. **Logica anxiety invertita non documentata** — `(10 - value)` per anxiety, confuso
3. **Parsing fragile** — Regex per rimuovere markdown code blocks
4. **Se parse fallisce → `insights: []`** senza comunicare l'errore
5. **Nessuna validazione output** — Non verifica che Gemini abbia restituito esattamente 3 insight
6. **Timezone hardcoded** — `new Date().toISOString().split("T")[0]` = timezone server, non utente
7. **Nessun audit/logging delle insights generate**

---

## 5. AI-CHECKINS

**File:** `supabase/functions/ai-checkins/index.ts`

### Scopo reale
Generatore intelligente di check-in giornalieri personalizzati. Seleziona fino a 8 elementi tra metriche di salute mentale, abitudini e status di vita. Applica logica di frequenza intelligente (vitali giornalieri, aree settimanali). Include monitoraggio critico di sicurezza (ideazione suicidaria, autolesionismo, disperazione).

### Input attesi

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|:---:|-------------|
| Header `Authorization` | JWT | Si | Token Supabase |

Metodo HTTP: GET. Nessun body o query parameter.

### Output

```json
{
  "checkins": [
    {
      "key": "mood",
      "label": "Umore",
      "question": "Come ti senti emotivamente?",
      "type": "vital|life_area|emotion|psychology|habit|safety",
      "responseType": "emoji|intensity|slider|yesno|toggle|counter|numeric|timer|abstain|range|auto_sync",
      "reason": "Check giornaliero"
    },
    {
      "key": "habit_meditation",
      "label": "Meditazione",
      "question": "Hai meditato oggi?",
      "type": "habit",
      "responseType": "timer",
      "reason": "Habit giornaliera",
      "habitType": "meditation",
      "icon": "🧘",
      "unit": "min",
      "target": 10,
      "step": 1
    }
  ],
  "allCompleted": false,
  "aiGenerated": true,
  "cachedDate": "2026-02-28"
}
```

### Modello AI + System Prompt

**Modello:** `gemini-2.5-flash-preview-04-17` — Temperature: 0.3, maxOutputTokens: 200

**System Prompt completo:**
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

### Tabelle DB lette

| Tabella | Colonne | Filtro |
|---------|---------|--------|
| `user_profiles` | ai_checkins_cache, selected_goals, onboarding_answers, occupation_context, birth_date | user_id |
| `daily_emotions` | * | user_id, date >= 14 giorni fa |
| `daily_life_areas` | * | user_id, date >= 14 giorni fa |
| `daily_psychology` | * (inclusi suicidal_ideation, self_harm_urges, hopelessness) | user_id, date >= 14 giorni fa |
| `daily_checkins` | mood_value, notes, created_at | user_id |
| `user_habits_config` | habit_type, is_active, daily_target, unit | user_id |
| `daily_habits` | habit_type, value, date | user_id |
| `sessions` | ai_summary, emotion_tags, start_time, status | user_id (ultime 3 completate) |

### Tabelle DB scritte

| Tabella | Colonna | Cosa scrive |
|---------|---------|-------------|
| `user_profiles` | `ai_checkins_cache` | Oggetto CachedCheckinsData completo (checkins, allCompleted, aiGenerated, cachedAt, cachedDate, fixedDailyList) |

### Logica cache

| Campo | Durata | Invalidazione |
|-------|--------|---------------|
| `user_profiles.ai_checkins_cache` | **24 ore** (per data Roma) | Cambio data (`cachedDate !== today` in timezone Europe/Rome). Se `fixedDailyList` assente o vuota |

```typescript
if (existingCache?.cachedDate === today && existingCache?.fixedDailyList?.length > 0) {
  return new Response(fixedDailyList); // Cache valida, ritorno immediato
}
```

### Problemi e limitazioni

1. **Timezone inconsistente** — `getRomeDateString()` hardcoded Roma, ma `getMetricHistory()` usa `new Date(today)` senza timezone
2. **AI fallback silenzioso** — Se Gemini fallisce, ritorna lista senza avvisare; `aiGenerated` sarà false
3. **Safety indicators sottoutilizzati** — `suicidal_ideation`, `self_harm_urges` inclusi SOLO se hanno storico > 0. Non chiesti al primo accesso per baseline
4. **Soglie criticità non normalizzate** — anxiety threshold 6, burnout threshold 7, scale diverse non confrontabili
5. **Completamento abitudini inaccurato** — `meditation` con target 10 min, valore 1 min = considerata completa
6. **MAX_ITEMS = 8 hardcoded** — Non personalizzabile per engagement
7. **Nessun rate limiting** — Potenziale abuse con migliaia di richieste Gemini
8. **Discovery questions vs reason inconsistente** — Primo accesso: question = discovery, reason = undefined

---

## 6. HOME-CONTEXT

**File:** `supabase/functions/home-context/index.ts`

### Scopo reale
Fornisce contesto iniziale personalizzato per la home page. Aggrega dati da molteplici tabelle: saluto personalizzato per orario, info profilo (nome, livello, metriche), streak, esercizio consigliato basato su ansia e fascia oraria, follow-up sessioni, HealthKit, gamificazione. **NON usa AI** — funzione puramente aggregativa.

### Input attesi

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|:---:|-------------|
| `accessToken` | string | No | JWT token Supabase |
| `userId` | string (UUID) | No | Fallback auth method 3 |
| `offset` | number | No | Timezone offset in minuti (es: 60 per CET) |

### Output

```json
{
  "time_slot": "night|morning|afternoon|evening",
  "greeting": "string",
  "profile": {
    "name": "string|null",
    "current_level": 1,
    "active_dashboard_metrics": ["string"]
  },
  "streak": {
    "streak_today": true,
    "best_active": {
      "habit_type": "string",
      "current_streak": 5,
      "longest_streak": 10
    }
  },
  "suggested_exercise": {
    "slug": "breathing-478",
    "title": "Respirazione 4-7-8"
  },
  "follow_up": {
    "topic": "string",
    "unresolved_issue": "string"
  },
  "healthkit": {
    "sleep_hours": 7,
    "steps": 8000,
    "heart_rate_avg": 72
  },
  "level_progress": {
    "current_level": 3,
    "level_name": "Esploratore",
    "points": 450,
    "next_level_points": 500
  }
}
```

### Modello AI + System Prompt

**NESSUN MODELLO AI.** Funzione puramente deterministica di aggregazione dati.

### Tabelle DB lette

| Tabella | Colonne | Condizione |
|---------|---------|------------|
| `user_profiles` | name, current_level, active_dashboard_metrics | user_id |
| `daily_checkins` | id | user_id, created_at TODAY (limit 1) |
| `sessions` | id, anxiety_score_detected, start_time, status | user_id, status='completed' |
| `habit_streaks` | habit_type, current_streak, longest_streak | user_id, current_streak > 0 (top 1) |
| `session_context_snapshots` | key_topics, unresolved_issues, updated_at | user_id, follow_up_needed=true, updated_at >= 48h ago |
| `healthkit_data` | sleep_hours, steps, heart_rate_avg | user_id, date=TODAY |
| `user_reward_points` | total_points | user_id |
| `gamification_levels` | level, name, points_required | ORDER BY level ASC |
| `exercises` | slug, title | difficulty='beginner', is_active=true |

### Tabelle DB scritte

**NESSUNA** — READ-ONLY.

### Logica cache

**NESSUNA CACHE.** Ogni richiesta colpisce il database.

### Problemi e limitazioni

1. **Auth Method 3 pericolosa** — Accetta `userId` dal body con service role key, permette impersonazione
2. **Anon key detection rudimentale** — Compara solo primi 30 caratteri del token
3. **Esercizio random non-deterministico** — `Math.random()` varia ogni chiamata. Dovrebbe hashare userId + date + timeSlot
4. **Nessun caching** — Per 1000 utenti concurrent = 1000 query al database
5. **Livello corrente non sincrono** — Legge `current_level` da `user_profiles` ma ricalcola da `total_points`. Se non sincroni, livello incoerente
6. **Magic numbers hardcoded** — Soglie ansia (>6), slug esercizi specifici ("breathing-478", "muscle-relaxation"). Se slug cambiano nel DB, il codice si rompe silenziosamente
7. **Timezone offset affidato al client** — Potrebbe inviare valore errato intenzionalmente

---

## 7. PROCESS-SESSION

**File:** `supabase/functions/process-session/index.ts` (~2700 righe)

### Scopo reale
Analizzatore omnisciente di sessioni terapeutiche. Elabora trascrizioni delle conversazioni con Aria, esegue analisi clinica profonda usando Gemini, estrae e salva metriche psicologiche multi-dimensionali (vitali, emozioni, aree di vita, psicologia profonda — 32 parametri). Gestisce automaticamente obiettivi, abitudini, eventi e memoria strutturata. Rileva rischi di crisi e pattern psichiatrici.

### Input attesi

```json
{
  "session_id": "UUID della sessione (obbligatorio)",
  "user_id": "UUID dell'utente (obbligatorio)",
  "transcript": "string trascrizione conversazione (obbligatorio)",
  "is_voice": false,
  "user_context": {
    "selected_goals": ["array goal IDs"],
    "priority_metrics": ["array metriche prioritarie"],
    "primary_life_area": "string"
  },
  "incremental": false
}
```

### Output

```json
{
  "success": true,
  "crisis_alert": false,
  "analysis": {
    "vitals": { "mood": 7, "anxiety": 4, "energy": 6, "sleep": 8 },
    "emotions": {
      "joy": 6, "sadness": 2, "anger": 1, "fear": 3, "apathy": 1,
      "disgust": null, "surprise": null, "shame": null, "jealousy": null,
      "hope": 5, "frustration": 2, "nostalgia": null, "nervousness": 3,
      "overwhelm": null, "excitement": 4, "disappointment": null,
      "serenity": 5, "pride": 3, "affection": 4, "curiosity": 6
    },
    "life_areas": {
      "work": 6, "school": null, "love": 7, "family": 8,
      "health": 5, "social": 6, "growth": 7, "leisure": 4, "finances": null
    },
    "deep_psychology": {
      "rumination": 3, "self_efficacy": 6, "mental_clarity": 7,
      "suicidal_ideation": 0, "hopelessness": 1, "self_harm_urges": 0
    },
    "voice_analysis": null,
    "summary": "Riassunto 1-2 frasi",
    "emotion_tags": ["#tag1", "#tag2"],
    "crisis_risk": "low"
  }
}
```

### Modello AI + System Prompt

**Modello:** `gemini-2.5-flash-preview-04-17`

**System Prompt (primi 500 caratteri):**
```
SEI UN ANALISTA CLINICO OMNISCIENTE con formazione in Psichiatria, Psicologia Clinica e Neuroscienze.
Analizza la conversazione e restituisci SEMPRE un JSON valido.

🚨 CALIBRAZIONE GLOBALE ANTI-APPIATTIMENTO:
I modelli AI tendono sistematicamente a dare 7 quando il contesto è positivo. Questo APPIATTISCE i dati e rende l'analisi clinicamente INUTILE.
REGOLE OBBLIGATORIE per emozioni positive (joy, excitement, serenity, pride, hope, affection, curiosity):
- Se l'utente esprime positività con ENTUSIASMO (esclamazioni, superlativi, dettagli gioiosi) → punteggio 8-9
```

**Sezioni del prompt (~2700 righe):**
- Analisi personalizzata basata su obiettivi utente
- Regole semantiche per vitali (mood, anxiety, energy, sleep)
- Estrazione 20 emozioni (Ekman estese)
- Deep psychology (32 parametri inclusi indicatori di sicurezza)
- Life areas (9 aree con regole anti-allucinazione)
- Screening psichiatrico avanzato
- Rilevamento correzioni e gestione memoria
- Estrazione eventi futuri
- Tracciamento obiettivi e milestones

### Tabelle DB lette

| Tabella | Colonne |
|---------|---------|
| `user_profiles` | life_areas_scores, long_term_memory, selected_goals, dashboard_config |
| `user_objectives` | id, title, category, target_value, current_value, unit, status, starting_value, description, input_method, preset_type, ai_custom_description, ai_progress_estimate, ai_milestones |
| `diary_entries` | content_text, entry_date, diary_id, is_private, created_at |

### Tabelle DB scritte

| Tabella | Operazione | Cosa aggiorna |
|---------|------------|---------------|
| `sessions` | UPDATE | transcript, mood_score_detected, anxiety_score_detected, energy_score_detected, emotion_tags, ai_summary, life_balance_scores, emotion_breakdown, key_events, insights, crisis_alert, status, specific_emotions, clinical_indices, sleep_quality, deep_psychology |
| `daily_emotions` | UPSERT | 20 emozioni + source + session_id |
| `daily_life_areas` | UPSERT | 9 aree + source + session_id |
| `daily_psychology` | UPSERT | 32 metriche psicologiche + source + session_id |
| `user_profiles` | UPDATE | life_areas_scores, active_dashboard_metrics, selected_goals |
| `user_memories` | INSERT | category, fact, importance, source_session_id, is_active |
| `session_context_snapshots` | INSERT | key_topics, emotional_state, unresolved_issues, action_items, follow_up_needed, context_summary, dominant_emotion, session_quality_score |
| `conversation_topics` | UPSERT | topic, mention_count, session_ids, is_sensitive, last_mentioned_at, avoid_unless_introduced |
| `user_objectives` | INSERT/UPDATE | Per nuovi: category, title, description, target_value, ecc. Per aggiornamenti: current_value, progress_history, status, ai_feedback |
| `user_events` | INSERT | title, event_type, event_date, event_time, location, description, tags, extracted_from_text, source_session_id |

### Logica cache

**NESSUNA CACHE ESPLICITA.** Dati letti fresh a ogni sessione. Profilo utente letto e aggiornato nella stessa richiesta.

### Problemi e limitazioni

1. **N+1 query pattern** — Per ogni memoria e topic, fa una query separata (loop). Molto inefficiente
2. **Parsing JSON fragile** — Se Gemini non restituisce JSON valido, fallback con dati dummy che perdono informazioni
3. **Nessun retry logic su Gemini API** — Nessun fallback, nessun exponential backoff
4. **Gestione errori incompleta** — Se una DB operation fallisce, continua comunque. Nessun rollback
5. **Correlazioni forzate non universali** — Se anxiety ≥ 4, forza `fear >= anxiety * 0.6` — non clinicamente accurato
6. **Post-processing con regex semplicistici** — Pattern "madrid|rio|parigi" → forzatura excitement. Non tiene conto del contesto
7. **Habits e events rilevati ma NON salvati** — AI genera `habits_detected`, `habit_progress_updates`, `events_detected`, ma mancano INSERT statements. I dati vengono scartati
8. **Correzioni memoria troppo aggressive** — Disattiva TUTTE le memories con keyword match substring(0,30)
9. **No audit trail per crisis_alert** — Quando impostato a true, non c'è log dedicato
10. **Voice analysis solo euristica testuale** — Analizza lunghezza frasi, non audio reale
11. **Scala scoring incoerente** — Vitals 1-10, Emotions 0-10, non standardizzato

---

## 8. REAL-TIME-CONTEXT

**File:** `supabase/functions/real-time-context/index.ts`

### Scopo reale
Fornisce contesto temporale e ambientale real-time per personalizzare le risposte dell'app. Aggrega: data/ora/periodo/stagione/festività italiane, geolocalizzazione da GPS, meteo da OpenWeatherMap, notizie italiane da cache globale. **NON usa AI** — puramente logica di aggregazione.

### Input attesi

```json
{
  "lat": 41.9028,
  "lon": 12.4964,
  "user_id": "UUID (opzionale)",
  "timezone": "Europe/Rome (default)"
}
```

### Output

```json
{
  "datetime": {
    "date": "28 febbraio 2026",
    "day": "Sabato",
    "time": "14:30",
    "period": "pomeriggio",
    "season": "inverno",
    "holiday": "San Silvestro"
  },
  "location": {
    "city": "Roma",
    "region": "Lazio",
    "country": "Italia"
  },
  "weather": {
    "condition": "nuvole sparse",
    "temperature": 18,
    "feels_like": 17,
    "humidity": 65,
    "description": "nuvole sparse, umidità alta"
  },
  "news": {
    "headlines": ["Primo titolo", "Secondo titolo"]
  }
}
```

### Modello AI + System Prompt

**NESSUN MODELLO AI.** Funzione puramente deterministica.

### Tabelle DB lette

| Tabella | Colonne | Condizione |
|---------|---------|------------|
| `user_profiles` | realtime_context_cache, realtime_context_updated_at | user_id |
| `global_context_cache` | data, expires_at | cache_key = 'italy_news' |

### Tabelle DB scritte

| Tabella | Colonna | Cosa aggiorna |
|---------|---------|---------------|
| `user_profiles` | realtime_context_cache, realtime_context_updated_at | Contesto completo + timestamp aggiornamento |

### Logica cache

| Campo | Durata | Invalidazione |
|-------|--------|---------------|
| `user_profiles.realtime_context_cache` (meteo) | **2 ore** (`WEATHER_CACHE_DURATION = 2 * 60 * 60 * 1000`) | Scade automaticamente. Se `realtime_context_updated_at` null/mancante |
| `global_context_cache` (notizie) | Dinamica (`expires_at`) | Se `expires_at < now()`, ritorna null |

**Coordinate GPS arrotondate a 0.1°** (~11km) per migliorare cache hit ratio.

### Problemi e limitazioni

1. **Race condition sulla cache utente** — Lettura e riscrittura senza lock/versioning. Due richieste simultanee = inconsistenze
2. **Festività hardcoded** — Non include Pasqua/Pasquetta (mobili) e festività regionali
3. **Timezone default hardcoded a Europe/Rome** — Non usa timezone del dispositivo
4. **Nessuna validazione input** — lat/lon non verificati (-90/90, -180/180), user_id non validato UUID
5. **Cache meteo user-specific** — Due utenti nella stessa città hanno cache separate (inefficiente)
6. **Tre chiamate API esterne NON parallelizzate** — Nominatim + OpenWeatherMap sequenziali
7. **CORS completamente aperto** — `Access-Control-Allow-Origin: *`
8. **Nessun rate limiting** — Nominatim e OpenWeatherMap hanno limiti non implementati qui
9. **User-Agent "Serenity-App/1.0"** — Potrebbe violare TOS Nominatim per scraping

---

## 9. ELEVENLABS-CONTEXT

**File:** `supabase/functions/elevenlabs-context/index.ts`

### Scopo reale
Genera un contesto dinamico personalizzato (~5-10KB di testo) per la sessione vocale ElevenLabs. Raccoglie dati da 12 tabelle in parallelo, li struttura in un blocco contestuale che il modello vocale deve utilizzare. Genera anche il primo messaggio personalizzato. Il system prompt statico vive nel dashboard ElevenLabs, non qui.

### Input attesi

| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|:---:|-------------|
| Header `Authorization` | JWT | Si | Token Supabase |

Nessun body. Usa solo il token JWT per identificare l'utente.

### Output

```json
{
  "user_name": "Marco",
  "dynamic_context": "⏰ CONTESTO TEMPORALE: È sera...\n👤 UTENTE: Marco | Età: 28...\n🧠 MEMORIA PERSONALE:\n- [PERSONA] Suo padre...\n...",
  "first_message": "Ciao Marco! Come stai stasera?",
  "error": "string (solo in caso di errore)"
}
```

### Modello AI + System Prompt

**Modello:** ElevenLabs Conversational AI Agent V3 (voce sintetica, gestito esternamente)

**System Prompt nel dashboard ElevenLabs** (documentato in `docs/aria-elevenlabs-dashboard-prompt.md`, 499 righe):
```
═══════════════════════════════════════════════
🆔 IDENTITÀ FONDAMENTALE (LEGGI PRIMA DI TUTTO!)
═══════════════════════════════════════════════

TU SEI ARIA, un'intelligenza artificiale amica.
L'UTENTE è la persona che ti parla.

⛔ REGOLA #0 - ANTI-CONFUSIONE IDENTITARIA:
- Tu NON hai un corpo, NON pesi, NON mangi, NON dormi
- Tu NON stai lavorando su "un'app", NON sei stanca, NON sei dimagrita
- Tu NON hai esperienze fisiche o personali come un umano
- TUTTO ciò che l'utente dice riguarda LUI/LEI, mai te
```

Include sezioni su: prosodia vocale, vocabolario italiano colloquiale, modulazione emotiva, tecniche avanzate, blacklist vocale, switch dinamico registro, prosody markers per ElevenLabs.

### Tabelle DB lette (12 query parallele)

| Tabella | Colonne | Filtro |
|---------|---------|--------|
| `user_profiles` | name, long_term_memory, selected_goals, occupation_context, gender, birth_date, height, therapy_status, onboarding_answers, dashboard_config, life_areas_scores | user_id |
| `user_interests` | * | user_id |
| `user_objectives` | title, category, target_value, current_value, starting_value, unit | user_id, status='active' |
| RPC `get_daily_metrics` | vitals, emotions, life_areas, deep_psychology | p_user_id, p_date=today |
| `sessions` | start_time, ai_summary, transcript, mood_score_detected | user_id, status='completed', limit 5 |
| `daily_habits` | habit_type, value, target_value | user_id, date=today |
| `body_metrics` | weight, sleep_hours, steps, active_minutes, resting_heart_rate | user_id, limit 1 |
| `user_events` | id, title, event_type, location, event_date, event_time, status, follow_up_done | user_id, date between today-7 and today+30 |
| `user_memories` | id, category, fact, importance, last_referenced_at | user_id, is_active=true, limit 80 |
| `session_context_snapshots` | key_topics, unresolved_issues, action_items, context_summary, dominant_emotion, follow_up_needed | user_id, limit 5 |
| `conversation_topics` | topic, mention_count, is_sensitive, avoid_unless_introduced | user_id, limit 30 |
| `habit_streaks` | habit_type, current_streak, longest_streak | user_id |

### Tabelle DB scritte

**NESSUNA** — READ-ONLY.

### Logica cache

**NESSUNA.** Sempre dati freschi a ogni sessione vocale.

### Problemi e limitazioni

1. **Memoria limitata a 80 poi sliced a 60** — Nessun max length safety su `long_term_memory` legacy
2. **Session context snapshots incompleti** — Legge 5 ma usa solo `key_topics` e `unresolved_issues`. Ignora `action_items` e `dominant_emotion`
3. **Argomenti sensibili solo avviso** — Visualizza `⚠️ ARGOMENTI SENSIBILI` ma non impedisce realmente l'introduzione spontanea
4. **Time-based greeting non usa timezone utente** — Usa `new Date()` (server timezone)
5. **Memory deduplication case-insensitive ma imperfetta** — `.toLowerCase()` match con false positives
6. **Nessun retry su query fallite** — Se una delle 12 query fallisce, ritorna `defaultContext` intero
7. **Memory sorting senza freshness decay** — Importance DESC ma una memoria importante vecchia ha priorità su recente

---

## 10. ELEVENLABS-CONVERSATION-TOKEN

**File:** `supabase/functions/elevenlabs-conversation-token/index.ts`

### Scopo reale
Gateway tra client e API vocale ElevenLabs. Ottiene un token di conversazione (signed URL WebSocket o WebRTC token) per iniziare una sessione vocale. Flusso: 1) richiede signed URL, 2) se fallisce, richiede WebRTC token come fallback.

### Input attesi

```json
{
  "agentId": "string (opzionale, default da env ELEVENLABS_AGENT_ID)"
}
```

**Variabili d'ambiente:** `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`

### Output

```json
{
  "signed_url": "wss://...signed_url_token...",
  "token": "t_...webrtc_token...",
  "agent_id": "agent_2901khw977kbesesvd00yh2mbeyx"
}
```

### Modello AI + System Prompt

**NON APPLICABILE.** Funzione relay pura — il prompt è nel dashboard ElevenLabs.

### Tabelle DB lette

**NESSUNA** — Funzione completamente stateless.

### Tabelle DB scritte

**NESSUNA.**

### Logica cache

**NESSUNA.** Ogni invocazione fa fresh request a ElevenLabs API.

### Problemi e limitazioni

1. **SECURITY CRITICA: Nessuna verificazione identity dell'utente** — Non controlla JWT. Chiunque può ottenere un token per parlare con ARIA
2. **No validation su agentId** — Accetta qualsiasi stringa senza formato check
3. **Error message espone dettagli API** — `ElevenLabs API error: 401 - Invalid API key` ritornato al client
4. **No retry logic** — Una micro-interruzione = failure completo
5. **Token senza TTL noto** — Se sessione si interrompe, token rimane valido indefinitamente
6. **No differenziazione errori** — Sia "API key non configurata" che "network timeout" ritornano 500

---

## 11. ARIA-CHAT-IOS

**File:** `supabase/functions/aria-chat-ios/index.ts`

### Scopo reale
Proxy thin layer per compatibilità iOS. Risolve problemi iOS con streaming SSE forzando `stream: false` e ritornando JSON semplice `{ reply: "..." }`. Innesca fire-and-forget verso `process-session` per elaborazione asincrona metriche. NON è una vera funzione IA — è un adattatore che chiama `ai-chat` internamente.

### Input attesi

```json
{
  "messages": [{ "role": "user", "content": "..." }],
  "conversationHistory": [],
  "accessToken": "string (opzionale)",
  "userId": "string (opzionale)",
  "sessionId": "string (opzionale)",
  "session_id": "string (alternativo)",
  "realTimeContext": {},
  "generateSummary": false
}
```

Supporta doppi nomi campo: `messages`/`conversationHistory`, `sessionId`/`session_id`, `userId`/`user_id`.

### Output

```json
{
  "reply": "Risposta testo di Aria",
  "summary": "string (se richiesto)",
  "crisisAlert": true
}
```

### Modello AI + System Prompt

Identico a **ai-chat** (Gemini 2.5 Flash Preview) — questa funzione è un proxy trasparente.

### Tabelle DB lette

**NESSUNA DIRETTAMENTE** — Delega tutto a `ai-chat` che legge 13 tabelle (vedi sezione 1).

### Tabelle DB scritte

**NESSUNA DIRETTAMENTE** — Innesca fire-and-forget a `process-session`:
```javascript
fetch(`${supabaseUrl}/functions/v1/process-session`, {
  method: 'POST',
  body: JSON.stringify({
    session_id: sessionId,
    user_id: userId,
    transcript: fullTranscript,
    incremental: true
  })
});
```

### Logica cache

Identica a **ai-chat** — `habit_streaks` letta internamente.

### Problemi e limitazioni

1. **Fire-and-forget senza retry** — Se `process-session` fallisce, nessun retry. Metriche perse silenziosamente
2. **Transcript building fragile** — Assume `role = 'user'` o non-user. Non gestisce `role = 'system'`
3. **Error propagation incompleta** — Testo grezzo da ai-chat inoltrato al client (potrebbe contenere dettagli interni)
4. **userId senza fallback a JWT** — Se non nel body, non decodifica dal token
5. **Nessun throttling** — Nessun dedup di chat duplicati
6. **HealthKit data stale a mezzanotte** — Se richiesta a 00:01 con HealthKit aggiornato 23:59, dato perso
7. **Incremental processing senza size check** — Transcript >100k chars inviato senza validazione

---

## TABELLA RIEPILOGATIVA

| Funzione | AI Model | DB Read | DB Write | Cache | Problemi critici |
|----------|----------|:---:|:---:|:---:|---|
| **ai-chat** | Gemini 2.5 Flash | 13 tabelle | 0 | habit_streaks | Prompt 30-50KB, crisis detection regex, prompt injection via memory |
| **ai-dashboard** | Gemini 2.5 Flash | 6 tabelle | 0 | ai_dashboard_cache (read-only) | Energy = mood×0.8, non persiste output |
| **ai-analysis** | Gemini 2.5 Flash | 5 tabelle | 0 | Nessuna | Energy non esiste nei dati, parsing fragile |
| **ai-insights** | Gemini 2.5 Flash | 3 tabelle + RPC | 0 | Nessuna | Nessuna cache, timezone server |
| **ai-checkins** | Gemini 2.5 Flash | 8 tabelle | 1 (cache) | 24h per data Roma | Safety indicators non chiesti al primo accesso |
| **home-context** | Nessuno | 9 tabelle | 0 | Nessuna | Auth method 3 pericolosa, magic numbers hardcoded |
| **process-session** | Gemini 2.5 Flash | 3 tabelle | 10 tabelle | Nessuna | N+1 queries, habits/events rilevati ma scartati |
| **real-time-context** | Nessuno | 2 tabelle | 1 (cache) | 2h meteo | Race condition cache, festività incomplete |
| **elevenlabs-context** | ElevenLabs Agent V3 | 12 tabelle | 0 | Nessuna | Memory senza freshness decay |
| **elevenlabs-conversation-token** | Nessuno | 0 | 0 | Nessuna | **NO JWT VERIFICATION** |
| **aria-chat-ios** | (proxy → ai-chat) | 0 dirette | 0 dirette | (proxy) | Fire-and-forget fragile |
