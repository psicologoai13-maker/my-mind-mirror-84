
# Report Completo: Miglioramenti Architetturali per Aria

## Situazione Attuale Analizzata

Ho analizzato a fondo l'intero ecosistema di Aria, comprendente:
- 15+ Edge Functions (ai-chat, aria-voice-chat, process-session, ai-dashboard, ai-analysis, ai-checkins, ai-insights, real-time-context, etc.)
- 25+ tabelle database con 104+ punti dati
- Sistema di memoria a lungo termine basato su array di testo
- Nuovo sistema `user_events` per eventi strutturati

---

## 1. MEMORIA STRUTTURATA (Alta Priorità)

### Problema Attuale
La `long_term_memory` è un semplice array di stringhe con tag testuali:
```
["[PERSONA] Maria è la fidanzata", "[HOBBY] Ama giocare a calcio", "[VIAGGIO] Agosto va a Ibiza"]
```

**Limiti:**
- Ricerca inefficiente (regex su array)
- Nessun timestamp per rilevanza temporale
- Limite a 60 elementi con logica FIFO che perde fatti importanti
- Impossibile filtrare per categoria o data

### Soluzione Proposta
Creare tabella `user_memories` strutturata:

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK |
| category | text | `persona`, `hobby`, `viaggio`, `lavoro`, `evento`, `preferenza` |
| fact | text | Il contenuto della memoria |
| importance | int | 1-10 per prioritizzare |
| source_session_id | uuid | Da quale sessione è stata estratta |
| extracted_at | timestamp | Quando è stata estratta |
| last_referenced_at | timestamp | Ultimo utilizzo (per decay) |
| is_active | boolean | Per soft-delete |

**Benefici:**
- Query rapide per categoria: `WHERE category = 'persona'`
- Decay temporale: memorie non usate da 30gg hanno priorità bassa
- Capacità illimitata con paginazione intelligente
- Analytics su quali memorie Aria usa di più

---

## 2. CONTESTO SESSIONI MIGLIORATO (Alta Priorità)

### Problema Attuale
Le sessioni precedenti sono recuperate solo come `ai_summary` (testo breve). Se il riassunto AI è vuoto, viene usato un fallback di 300 caratteri dal transcript.

### Soluzione Proposta
Creare tabella `session_context_snapshots`:

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | uuid | PK |
| session_id | uuid | FK a sessions |
| user_id | uuid | FK |
| key_topics | text[] | Array di argomenti discussi |
| emotional_state | jsonb | Stato emotivo a fine sessione |
| unresolved_issues | text[] | Problemi lasciati aperti |
| action_items | text[] | Cose da fare menzionate |
| follow_up_needed | boolean | Richiede follow-up |
| context_summary | text | Riassunto strutturato |

**Benefici:**
- Aria può iniziare dicendo "L'ultima volta stavamo parlando di X, come è andata?"
- Tracking di problemi irrisolti per follow-up proattivo
- Identificazione di pattern cross-sessione

---

## 3. EMOTION ANALYTICS AVANZATO (Media Priorità)

### Problema Attuale
Le emozioni sono salvate in `daily_emotions` come valori giornalieri aggregati. Si perde la granularità temporale (mattina vs sera).

### Soluzione Proposta
Aggiungere colonna `recorded_at` con timestamp preciso invece di solo `date`:

```sql
ALTER TABLE daily_emotions 
ADD COLUMN recorded_at timestamptz DEFAULT now();
```

E creare una tabella `emotion_patterns`:

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK |
| pattern_type | text | `morning_dip`, `weekend_boost`, `seasonal_sad` |
| description | text | Descrizione del pattern |
| detected_at | timestamp | Quando rilevato |
| confidence | float | 0.0-1.0 |
| data_points | int | Quanti dati hanno generato il pattern |

**Benefici:**
- Aria può dire "Noto che i tuoi lunedì mattina sono sempre difficili"
- Correlazioni temporali (umore vs ora del giorno)
- Predizioni proattive

---

## 4. CORRELAZIONI AUTOMATICHE (Media Priorità)

### Problema Attuale
Le correlazioni (sonno → umore, esercizio → ansia) sono calcolate on-the-fly dall'AI senza storicizzazione.

### Soluzione Proposta
Creare tabella `user_correlations`:

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK |
| metric_a | text | Prima metrica (es: `sleep`) |
| metric_b | text | Seconda metrica (es: `mood`) |
| correlation_type | text | `positive`, `negative`, `none` |
| strength | float | -1.0 a +1.0 |
| sample_size | int | Numero di datapoint |
| last_calculated_at | timestamp | Ultima ricalcolazione |
| insight_text | text | "Quando dormi bene, il tuo umore migliora del 40%" |

**Benefici:**
- Insights personalizzati basati su dati reali
- Aria può dare consigli mirati ("Prova a dormire di più, di solito ti aiuta")
- Dashboard con correlazioni personali

---

## 5. HABIT STREAKS OTTIMIZZATO (Media Priorità)

### Problema Attuale
Lo streak delle abitudini viene calcolato contando i giorni consecutivi da `daily_habits`. Query pesante ripetuta spesso.

### Soluzione Proposta
Creare tabella `habit_streaks` per caching:

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK |
| habit_type | text | Tipo di abitudine |
| current_streak | int | Streak attuale |
| longest_streak | int | Streak record |
| last_completion_date | date | Ultima data completata |
| streak_broken_count | int | Quante volte rotto |

**Benefici:**
- Query istantanee per mostrare streak
- Tracking del "record personale"
- Aria può celebrare: "Stai per battere il tuo record di 15 giorni!"

---

## 6. NOTIFICHE INTELLIGENTI (Bassa Priorità)

### Problema Attuale
Le notifiche sono basate su orari fissi (`reminder_time` in `user_habits_config`). Non c'è intelligenza.

### Soluzione Proposta
Creare tabella `smart_notifications`:

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK |
| trigger_type | text | `event_reminder`, `habit_check`, `mood_follow_up`, `streak_at_risk` |
| scheduled_for | timestamp | Quando inviare |
| content | text | Contenuto personalizzato |
| priority | text | `low`, `medium`, `high` |
| source_id | uuid | ID dell'evento/habit che l'ha generato |
| sent_at | timestamp | Quando inviata (null se pending) |

**Benefici:**
- Notifiche contestuali: "Tra 30 min hai il medico, come ti senti?"
- Streak a rischio: "Manca solo la meditazione per oggi!"
- Follow-up eventi: "Com'è andato il colloquio di ieri?"

---

## 7. CONVERSATION TOPICS TRACKING (Bassa Priorità)

### Problema Attuale
Non c'è modo di sapere quali argomenti sono stati discussi e quali evitati.

### Soluzione Proposta
Creare tabella `conversation_topics`:

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK |
| topic | text | Argomento (es: `lavoro`, `famiglia`, `ex`) |
| first_mentioned_at | timestamp | Prima menzione |
| last_mentioned_at | timestamp | Ultima menzione |
| sentiment_avg | float | Sentimento medio quando menzionato |
| mention_count | int | Quante volte menzionato |
| is_sensitive | boolean | Argomento delicato |

**Benefici:**
- Aria evita argomenti sensibili a meno che l'utente non li introduca
- Tracking di temi ricorrenti
- Insight: "Noto che ultimamente parli molto di lavoro"

---

## 8. AI RESPONSE QUALITY TRACKING (Bassa Priorità)

### Problema Attuale
Non c'è feedback loop per migliorare le risposte di Aria.

### Soluzione Proposta
Creare tabella `aria_response_feedback`:

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | uuid | PK |
| session_id | uuid | FK |
| response_text | text | Risposta di Aria |
| user_reaction | text | `continued`, `topic_changed`, `corrected`, `ignored` |
| explicit_feedback | text | Feedback esplicito se dato |
| response_length | int | Lunghezza risposta |
| response_type | text | `empathy`, `question`, `advice`, `celebration` |

**Benefici:**
- A/B testing implicito su stili di risposta
- Identificazione di risposte che funzionano
- Personalizzazione dello stile per utente

---

## Priorità di Implementazione Consigliata

| # | Feature | Priorità | Complessità | Impatto |
|---|---------|----------|-------------|---------|
| 1 | `user_memories` strutturata | Alta | Media | Alto |
| 2 | `session_context_snapshots` | Alta | Media | Alto |
| 3 | Emotion timestamp granulare | Media | Bassa | Medio |
| 4 | `user_correlations` | Media | Media | Alto |
| 5 | `habit_streaks` cache | Media | Bassa | Medio |
| 6 | `smart_notifications` | Bassa | Alta | Alto |
| 7 | `conversation_topics` | Bassa | Media | Medio |
| 8 | `aria_response_feedback` | Bassa | Bassa | Basso |

---

## Osservazioni Architetturali Aggiuntive

### Duplicazione di Codice
Le Edge Functions `ai-chat` e `aria-voice-chat` condividono ~70% del codice (Golden Rules, tecniche cliniche, parsing temporale). Sarebbe utile:
- Creare una libreria condivisa `supabase/functions/_shared/aria-core.ts`
- Importare le costanti e funzioni comuni

### Cache AI Sottoutilizzata
I campi `ai_dashboard_cache`, `ai_analysis_cache`, `ai_insights_cache` in `user_profiles` esistono ma il TTL non è gestito uniformemente. Suggerisco:
- Aggiungere `cache_ttl_seconds` per ogni tipo di cache
- Invalidazione automatica quando `last_data_change_at` cambia

### Follow-Up Events
La tabella `user_events` appena creata ha `follow_up_done` ma nessun meccanismo automatico per marcarlo come `done` dopo che Aria ha chiesto. Suggerisco:
- Aggiungere trigger in `ai-chat`/`aria-voice-chat` per marcare eventi come followed-up quando menzionati
