# ARIA — Guida Tecnica Backend Completa

> Versione: 1.7 | Aggiornato: 1 Marzo 2026
> V1.7: Backend V2.0 + Post-audit fix. 26 edge functions, 39+ tabelle.
>
> Destinatario: Sviluppatore backend senza accesso al repository GitHub
> Scope: Database PostgreSQL, Edge Functions (Deno), API, Autenticazione, RLS

---

## Indice

1. [Panoramica Architetturale](#1-panoramica-architetturale)
2. [Database — Schema Completo](#2-database--schema-completo)
3. [Row Level Security (RLS)](#3-row-level-security-rls)
4. [Funzioni e Trigger PL/pgSQL](#4-funzioni-e-trigger-plpgsql)
5. [Autenticazione](#5-autenticazione)
6. [Edge Functions — Catalogo Completo](#6-edge-functions--catalogo-completo)
7. [Secrets e Variabili d'Ambiente](#7-secrets-e-variabili-dambiente)
8. [Flussi di Dati Principali](#8-flussi-di-dati-principali)
9. [API Esterne Integrate](#9-api-esterne-integrate)
10. [Configurazione e Deploy](#10-configurazione-e-deploy)

---

## 1. Panoramica Architetturale

Il backend di Aria è costruito interamente su **Supabase Standalone** (PostgreSQL + Edge Functions Deno + Auth + Realtime).

> **V1.6**: Migrato da Lovable Cloud a progetto Supabase indipendente.
> - **Progetto**: `pcsoranahgoinljvgmtl`
> - **URL**: `https://pcsoranahgoinljvgmtl.supabase.co`
> - **Regione**: EU Frankfurt
> - **GRANT permissions**: aggiunte esplicitamente per PostgREST su 30 tabelle (ruoli: `anon`, `authenticated`, `service_role`)

```
┌─────────────────────────────────────────────────┐
│                   CLIENT                         │
│         (Web, Android, iOS nativo)               │
└──────────┬──────────────────────┬───────────────┘
           │ REST/Realtime        │ Edge Functions
           ▼                      ▼
┌──────────────────┐   ┌─────────────────────────┐
│   PostgreSQL DB   │   │   Deno Edge Functions    │
│   31+ tabelle     │   │   22+ funzioni           │
│   RLS completo    │   │   AI, Processing, Auth   │
│   GRANT permissions│  │   Google API diretta     │
└──────────────────┘   └──────────┬──────────────┘
                                  │
                       ┌──────────▼──────────────┐
                       │    API Esterne           │
                       │  Gemini (diretta),       │
                       │  ElevenLabs, OpenWeather, │
                       │  WorldNews               │
                       └─────────────────────────┘
```

### Principi
- **Ogni tabella ha RLS**: nessun dato accessibile senza autenticazione
- **GRANT permissions esplicite**: su 30 tabelle per ruoli `anon`, `authenticated`, `service_role` (necessario per PostgREST su Supabase standalone)
- **Edge Functions stateless**: ogni chiamata è indipendente
- **verify_jwt = false** su tutte le Edge Functions: l'autenticazione è gestita internamente via header `Authorization` o fallback nel body
- **Service Role**: usato solo nelle Edge Functions per operazioni cross-utente (mai esposto al client)
- **Google API diretta**: tutte le chiamate Gemini passano per `generativelanguage.googleapis.com` con `GOOGLE_API_KEY` (rimossa dipendenza Lovable AI proxy)

---

## 2. Database — Schema Completo

### 2.1 Tabelle Core Utente

#### `user_profiles`
Tabella principale del profilo utente. Creata automaticamente dal trigger `handle_new_user` al signup.

| Colonna | Tipo | Default | Note |
|---------|------|---------|------|
| id | uuid | gen_random_uuid() | PK |
| user_id | uuid | — | FK logica verso auth.users (no FK esplicita) |
| name | text | null | Nome utente |
| email | text | null | Email |
| wellness_score | integer | 0 | Score calcolato da ai-dashboard |
| life_areas_scores | jsonb | `{"love":0,"work":0,...}` | Score per area |
| onboarding_completed | boolean | false | Flag onboarding |
| onboarding_answers | jsonb | `{}` | Risposte onboarding |
| long_term_memory | text[] | `{}` | Legacy — sostituito da user_memories |
| connection_code | varchar | auto-generato | Codice 8 char per connessione dottore |
| active_dashboard_metrics | text[] | `{mood,anxiety,energy,sleep}` | Metriche visibili in dashboard |
| selected_goals | text[] | `{}` | Obiettivi selezionati |
| ai_dashboard_cache | jsonb | null | Cache calcoli dashboard AI |
| ai_analysis_cache | jsonb | null | Cache analisi AI |
| ai_insights_cache | jsonb | null | Cache insight AI |
| ai_checkins_cache | jsonb | null | Cache check-in AI |
| ai_cache_updated_at | timestamptz | null | Timestamp ultimo aggiornamento cache |
| last_data_change_at | timestamptz | now() | Aggiornato via trigger ad ogni modifica dati |
| location_permission_granted | boolean | false | Permesso GPS |
| realtime_context_cache | jsonb | null | Cache contesto real-time |
| realtime_context_updated_at | timestamptz | null | Timestamp contesto |
| referral_code | text | auto-generato | Codice referral 6 char |
| premium_until | timestamptz | null | Scadenza premium |
| premium_type | text | null | Tipo abbonamento |
| notification_settings | jsonb | `{checkin_reminder:true,...}` | Preferenze notifiche |
| appearance_settings | jsonb | `{theme:"system",...}` | Preferenze aspetto |
| height | numeric | null | Altezza cm |
| birth_date | date | null | Data nascita |
| gender | text | null | Genere |
| therapy_status | text | 'none' | Stato terapia |
| occupation_context | text | null | student/worker/both |
| dashboard_config | jsonb | `{theme:"default",...}` | Config dashboard |
| created_at | timestamptz | now() | — |

#### `user_roles`
Ruoli utente (enum `app_role`: `patient`, `doctor`).

| Colonna | Tipo | Default |
|---------|------|---------|
| id | uuid | gen_random_uuid() |
| user_id | uuid | — |
| role | app_role | 'patient' |
| created_at | timestamptz | now() |

#### `user_interests`
Preferenze dettagliate dell'utente (~50 campi). Include: hobby, musica, sport, valori personali, stile comunicativo, sensibilità a topic specifici, situazione sentimentale, animali domestici, etc.

#### `user_memories`
Sistema di memoria strutturata che sostituisce il legacy `long_term_memory`.

| Colonna | Tipo | Default | Note |
|---------|------|---------|------|
| id | uuid | gen_random_uuid() | PK |
| user_id | uuid | — | — |
| category | text | — | relazione, lavoro, salute, etc. |
| fact | text | — | Il fatto memorizzato |
| importance | integer | 5 | 1-10, priorità di iniezione |
| source_session_id | uuid | null | Sessione di origine |
| extracted_at | timestamptz | now() | — |
| last_referenced_at | timestamptz | now() | Decay temporale |
| is_active | boolean | true | Soft delete |
| metadata | jsonb | `{}` | Dati extra |

### 2.2 Tabelle Sessioni e Chat

#### `sessions`
Ogni interazione (chat o voce) genera una sessione.

| Colonna | Tipo | Default | Note |
|---------|------|---------|------|
| id | uuid | gen_random_uuid() | PK |
| user_id | uuid | — | — |
| type | text | 'chat' | chat, voice |
| status | text | 'scheduled' | scheduled, active, completed |
| start_time | timestamptz | now() | — |
| end_time | timestamptz | null | — |
| duration | integer | null | Secondi |
| transcript | text | null | Transcript completo |
| ai_summary | text | null | Riassunto generato da AI |
| mood_score_detected | integer | null | 1-10 |
| anxiety_score_detected | integer | null | 1-10 |
| energy_score_detected | integer | null | 1-10 |
| sleep_quality | integer | null | 1-10 |
| emotion_tags | text[] | `{}` | Tag emozioni |
| emotion_breakdown | jsonb | `{}` | Dettaglio emozioni |
| specific_emotions | jsonb | `{joy:0,fear:0,...}` | Emozioni specifiche |
| life_balance_scores | jsonb | `{love:null,work:null,...}` | Score aree vita |
| clinical_indices | jsonb | `{rumination:null,...}` | Indici clinici |
| deep_psychology | jsonb | `{}` | Psicologia profonda |
| crisis_alert | boolean | false | Flag crisi |
| key_events | text[] | `{}` | Eventi chiave |
| insights | text | null | Insight generati |

#### `chat_messages`
Messaggi individuali di una sessione chat.

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| session_id | uuid | FK → sessions |
| user_id | uuid | — |
| role | text | 'user' o 'assistant' |
| content | text | Contenuto messaggio |
| created_at | timestamptz | — |

#### `session_context_snapshots`
Snapshot di contesto per continuità narrativa tra sessioni.

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| session_id | uuid | FK → sessions |
| user_id | uuid | — |
| context_summary | text | Riassunto sessione |
| dominant_emotion | text | Emozione dominante |
| key_topics | text[] | Temi chiave |
| unresolved_issues | text[] | Problemi aperti |
| action_items | text[] | Azioni suggerite |
| follow_up_needed | boolean | Flag follow-up |
| session_quality_score | integer | 1-10 |
| emotional_state | jsonb | Stato emotivo |

#### `conversation_topics`
Tracking degli argomenti di conversazione nel tempo.

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| user_id | uuid | — |
| topic | text | Argomento |
| mention_count | integer | Quante volte menzionato |
| sentiment_avg | numeric | Sentiment medio |
| is_sensitive | boolean | Topic sensibile |
| avoid_unless_introduced | boolean | Non sollevare proattivamente |
| session_ids | uuid[] | Sessioni correlate |
| related_topics | text[] | Argomenti correlati |

### 2.3 Tabelle Metriche Giornaliere

Tutte con struttura simile: `user_id`, `date`, `session_id` (opzionale), `source` ('session' o 'checkin'), `created_at`, `updated_at`.

#### `daily_emotions` — 20 colonne emotive (integer 1-10)
joy, sadness, anger, fear, apathy, shame, jealousy, hope, frustration, nostalgia, nervousness, overwhelm, excitement, disappointment, disgust, surprise, serenity, pride, affection, curiosity

#### `daily_life_areas` — 9 aree della vita (integer 1-10)
work, school, love, family, social, health, growth, leisure, finances

#### `daily_psychology` — 32 metriche psicologiche (integer 1-10)
rumination, self_efficacy, mental_clarity, concentration, burnout_level, coping_ability, loneliness_perceived, somatic_tension, appetite_changes, sunlight_exposure, guilt, gratitude, irritability, motivation, intrusive_thoughts, self_worth, suicidal_ideation, hopelessness, self_harm_urges, dissociation, confusion, racing_thoughts, avoidance, social_withdrawal, compulsive_urges, procrastination, sense_of_purpose, life_satisfaction, perceived_social_support, emotional_regulation, resilience, mindfulness

#### `daily_checkins` — Check-in manuali giornalieri

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| user_id | uuid | — |
| mood_value | integer | 1-5 |
| mood_emoji | text | Emoji selezionata |
| notes | text | JSON opzionale con anxiety, energy, sleep |
| created_at | timestamptz | — |

#### `daily_habits` — Tracking abitudini giornaliere

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| user_id | uuid | — |
| habit_type | text | Tipo abitudine (es. water, exercise) |
| date | date | — |
| value | numeric | Valore registrato |
| target_value | numeric | Obiettivo giornaliero |
| unit | text | Unità di misura |

#### `body_metrics` — Metriche corporee

Peso, body fat, massa muscolare, passi, calorie, frequenza cardiaca, pressione, idratazione, ore sonno, minuti attivi, circonferenza vita.

### 2.4 Tabelle Analytics

#### `user_correlations` — Correlazioni statistiche

| Colonna | Tipo | Note |
|---------|------|------|
| metric_a | text | Prima metrica |
| metric_b | text | Seconda metrica |
| strength | numeric | Coefficiente Pearson (-1 a 1) |
| p_value | numeric | P-value |
| is_significant | boolean | p < 0.05 |
| sample_size | integer | N data points |
| correlation_type | text | Tipo correlazione |
| insight_text | text | Descrizione testuale |

#### `emotion_patterns` — Pattern emotivi rilevati

| Colonna | Tipo | Note |
|---------|------|------|
| pattern_type | text | morning_dip, weekend_boost, etc. |
| description | text | Descrizione del pattern |
| confidence | numeric | Confidenza 0-1 |
| data_points | integer | Punti dati usati |
| trigger_factors | text[] | Fattori scatenanti |
| recommendations | text[] | Raccomandazioni |

#### `habit_streaks` — Cache streak abitudini

Aggiornata automaticamente dal trigger `update_habit_streak`. Contiene: current_streak, longest_streak, last_completion_date, streak_broken_count, total_completions.

### 2.5 Tabelle Configurazione e Abitudini

#### `user_habits_config` — Configurazione abitudini utente

habit_type, is_active, daily_target, unit, reminder_enabled, reminder_time, auto_sync_enabled, data_source ('manual'/'auto'), update_method ('checkin'/'manual').

#### `user_objectives` — Obiettivi utente

~30 colonne per gestione obiettivi con supporto AI: title, description, category, target_value, current_value, deadline, progress_history, ai_milestones, ai_progress_estimate, ai_feedback, linked_habit, linked_body_metric, etc.

### 2.6 Tabelle Engagement

#### `user_reward_points`
total_points, lifetime_points per utente.

#### `reward_transactions`
Log transazioni punti: type, points, description, source_id.

#### `user_achievements`
Achievement sbloccati: achievement_id, unlocked_at, metadata.

#### `smart_notifications`
Notifiche intelligenti: title, content, trigger_type, priority, scheduled_for, sent_at, read_at, action_taken.

#### `device_push_tokens`
Token dispositivi per push: device_token, platform, is_active.

### 2.7 Tabelle Sistema Doctor/Patient

#### `doctor_patient_access`
doctor_id, patient_id, is_active, access_granted_at.

#### `doctor_share_codes`
code (varchar), user_id, expires_at, is_active.

### 2.5 Tabelle Esercizi (V1.7)

#### `exercises`
Catalogo esercizi: slug (unique), title, category, difficulty (beginner/intermediate/advanced), duration_minutes, points_reward, is_active.

#### `user_exercise_sessions`
Log completamenti: user_id, exercise_id, duration_actual, mood_before, mood_after, triggered_by (manual/scheduled/suggestion), session_id.

### 2.6 Tabelle Gamification (V1.7)

#### `gamification_levels`
Livelli definiti: level_number, name, emoji, points_required.

#### `user_challenges`
Sfide attive: user_id, challenge_type, started_at, expires_at, progress, target, status.

#### `user_reward_points`
Punti utente: user_id, total_points (spendibili), lifetime_points (totali, mai decrementati).

#### `reward_transactions`
Log transazioni punti: user_id, points, action, description, created_at.

#### `user_achievements`
Badge sbloccati: user_id, badge (slug), unlocked_at.

#### `aria_wrapped_data`
Cache Wrapped mensile/annuale: user_id, period_type, period_key, data (jsonb), generated_at.

### 2.7 Tabelle HealthKit (V1.7)

#### `healthkit_data`
Dati sincronizzati da Apple Salute: user_id, date, steps, sleep_hours, heart_rate_avg, hrv_avg, weight, sleep_quality_hk, menstrual_cycle_phase.

### 2.8 Tabelle Diari V2 (V1.7)

#### `diaries`
Quaderni personali: user_id, name, icon_emoji, color_hex, description, is_active, weekly_prompt.

#### `diary_entries`
Voci diario: diary_id, user_id, entry_date, content_text, content_audio_url, content_transcript, entry_type, prompt_used, mood_at_entry, is_private, word_count.

#### `thematic_diaries`
**ELIMINATA in V1.7.** Dati migrati in `diaries` + `diary_entries`. Backup: `thematic_diaries_v1_backup`.

### 2.9 Tabella Rate Limiting (V1.7)

#### `rate_limits` (V1.7)
Rate limiting per utente/funzione: user_id, function_name, window_start, request_count. Pulizia automatica dopo 24h.

### 2.10 Tabelle Varie

#### `thematic_diaries`
**ELIMINATA in V1.7.** Dati migrati in `diaries` + `diary_entries`. Tabella backup: `thematic_diaries_v1_backup`.

#### `aria_knowledge_base`
54 documenti clinici: topic, category, title, content, keywords, priority, is_active.

#### `aria_response_feedback`
Feedback sulle risposte AI: response_text, was_helpful, user_reaction, context_appropriateness.

#### `global_context_cache`
Cache globale (news, etc.): cache_key, data (jsonb), fetched_at, expires_at.

#### `shared_access`
Token di accesso condiviso: token, expires_at, access_count.

#### `user_events`
Eventi utente estratti dalle conversazioni: title, event_date, event_type, location, tags, reminder settings, follow_up tracking.

---

## 3. Row Level Security (RLS)

### 3.1 Pattern Standard (Applicato a ~25 tabelle)

```sql
-- SELECT: solo i propri dati
CREATE POLICY "Users can view their own X"
ON public.table_name FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: solo per sé
CREATE POLICY "Users can insert their own X"
ON public.table_name FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: solo i propri
CREATE POLICY "Users can update their own X"
ON public.table_name FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: solo i propri
CREATE POLICY "Users can delete their own X"
ON public.table_name FOR DELETE
USING (auth.uid() = user_id);
```

### 3.2 Pattern Doctor (Aggiunto su tabelle cliniche)

```sql
CREATE POLICY "Doctors can view patient X"
ON public.table_name FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM doctor_patient_access
    WHERE patient_id = table_name.user_id
    AND doctor_id = auth.uid()
    AND is_active = true
  )
);
```

Tabelle con accesso dottore: sessions, daily_emotions, daily_psychology, daily_life_areas, daily_checkins, daily_habits, habit_streaks, user_memories, user_achievements, user_events, emotion_patterns, conversation_topics, session_context_snapshots, user_correlations, chat_messages.

### 3.3 Tabelle Speciali

- **global_context_cache**: `SELECT` pubblico (`true`), `ALL` solo per service_role
- **aria_knowledge_base**: `ALL` solo per service_role
- **user_roles**: solo `SELECT` e `INSERT` per l'utente (no UPDATE/DELETE)
- **reward_transactions**: solo `SELECT` e `INSERT` (no UPDATE/DELETE)

---

## 4. Funzioni e Trigger PL/pgSQL

### 4.1 Funzioni

#### `handle_new_user()` — Trigger su auth.users
Crea automaticamente un record in `user_profiles` al signup.
```sql
INSERT INTO user_profiles (user_id, email, name)
VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
```

#### `set_connection_code()` — Trigger su user_profiles
Genera `connection_code` (8 char) se null.

#### `set_referral_code()` — Trigger su user_profiles
Genera `referral_code` (6 char) se null.

#### `generate_connection_code()` / `generate_referral_code()`
Generano codici alfanumerici casuali (charset: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`).

#### `update_habit_streak()` — Trigger su daily_habits
Aggiorna `habit_streaks` ad ogni INSERT in `daily_habits`:
- Se giorno consecutivo → incrementa streak
- Se gap > 1 giorno → reset streak, incrementa broken_count
- Se stesso giorno → solo incrementa total

#### `update_user_data_change_timestamp()` — Trigger su tabelle dati
Aggiorna `user_profiles.last_data_change_at` quando i dati dell'utente cambiano (usato per invalidazione cache AI).

#### `update_daily_tables_timestamp()` / `update_correlation_timestamp()`
Aggiornano `updated_at` sulle rispettive tabelle.

#### `has_role(uuid, app_role)` → boolean
Verifica se un utente ha un ruolo specifico. `SECURITY DEFINER`.

#### `get_user_role(uuid)` → app_role
Restituisce il ruolo di un utente. `SECURITY DEFINER`.

#### `find_patient_by_code(varchar)` → TABLE(user_id, name)
Cerca un paziente tramite `connection_code`. `SECURITY DEFINER`.

#### `add_reward_points(uuid, integer)` → void
Aggiunge punti con upsert atomico. `SECURITY DEFINER`.

#### `get_daily_metrics(uuid, date)` → json
Funzione complessa che aggrega tutte le metriche giornaliere (vitali, emozioni, aree vita, psicologia) da tutte le fonti (check-in, sessioni) con logica di priorità e merge. Restituisce un JSON strutturato completo.

### 4.5 Funzioni Gamification (V1.7)

#### `add_reward_points(p_user_id, p_points, p_action, p_description)`
Aggiunge/sottrae punti. Incrementa `lifetime_points` solo per punti positivi. Log in `reward_transactions`.

#### `atomic_redeem_points(p_user_id, p_cost, p_reward_type)`
Riscatto atomico con SELECT FOR UPDATE. Ritorna jsonb con success/error.

#### `calculate_user_level(p_user_id)`
Calcola livello basato su `lifetime_points` (con fallback a `total_points`). Ritorna level_number, name, emoji, points_for_next.

#### `update_user_level_on_points_change()` — TRIGGER
Scatta su INSERT/UPDATE di `user_reward_points`. Ricalcola livello e aggiorna `user_profiles`.

#### `award_exercise_points()` — TRIGGER
Scatta BEFORE INSERT su `user_exercise_sessions`. Assegna punti dell'esercizio completato.

#### `check_and_award_badges()` — TRIGGER
Scatta dopo attività (check-in, sessione, esercizio). Verifica e assegna 16 badge automatici.

#### `update_habit_streak()` — TRIGGER
Scatta su INSERT di `daily_habits`. Aggiorna streak corrente e più lungo.

#### `calculate_diary_word_count()` — TRIGGER
Scatta su INSERT di `diary_entries`. Calcola e salva conteggio parole.

---

## 5. Autenticazione

### 5.1 Metodi Supportati
- **Email/Password**: signup con conferma email (auto-confirm DISABILITATO)
- **Google OAuth**: "Continue with Google"
- **Password Recovery**: via `resetPasswordForEmail` + pagina dedicata

### 5.2 Modulo Condiviso `_shared/auth.ts` (V1.7)

Tutte le edge functions importano l'autenticazione da `_shared/auth.ts`:
- `authenticateUser(req)` — verifica JWT, restituisce userId + client Supabase
- `handleCors(req)` — gestisce preflight OPTIONS
- `checkRateLimit(admin, userId, functionName, max, window)` — rate limiting per utente

Pattern di implementazione nelle Edge Functions:
```typescript
import { authenticateUser, handleCors, corsHeaders } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  try {
    const { userId, supabaseClient, supabaseAdmin } = await authenticateUser(req);
    // ... business logic
  } catch (error) {
    if (error instanceof Response) return error;
    // ... error handling
  }
});
```

> **Nota**: la precedente "Triple Authentication Fallback" (livello 1: header JWT, livello 2: body accessToken, livello 3: body userId) è stata rimossa in V1.7 per sicurezza. Solo l'header `Authorization: Bearer <jwt>` è ora supportato.

---

## 6. Edge Functions — Catalogo Completo

Tutte le Edge Functions sono in `supabase/functions/` e usano Deno runtime. Tutte hanno `verify_jwt = false` nel `config.toml`.

### 6.1 CORS Headers (Standard per tutte)

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

### 6.2 Funzioni AI Conversazionali

#### `ai-chat` (~4900+ righe)
**Scopo**: Chat testuale principale con Aria.
**Input**: POST `{ messages: [...], sessionId?, userId?, accessToken?, realTimeContext? }`
**Output**: Streaming text/event-stream (SSE)
**Modello AI**: Google Gemini 2.5 Flash (chiamata diretta a `generativelanguage.googleapis.com`)
**Logica**:
1. Autenticazione (triple fallback)
2. Caricamento profilo utente, memorie, obiettivi, abitudini
3. Composizione prompt clinico (~2500 righe) con Human Conversation Engine
4. Iniezione contesto real-time (data, meteo, news)
5. Streaming risposta via SSE
6. Salvataggio messaggio in `chat_messages`

#### `aria-chat-ios`
**Scopo**: Proxy chat per client nativi (risposte JSON non-streaming).
**Input**: POST `{ messages, accessToken, userId, sessionId }`
**Output**: JSON `{ reply, crisisAlert, summary }`
**Differenze da ai-chat**: Non-streaming, processing clinico incrementale, nessuna chiusura sessione permanente.

#### `thematic-diary-chat` — ⛔ DEPRECATED
**Stato**: DEPRECATA — risponde HTTP 410 (Gone)
**Motivo**: Sostituita dal sistema diari personali senza AI (V1.6).

#### `diary-save-entry` — **Nuova V1.6**
**Scopo**: Salva una nuova entry in un diario personale.
**Input**: POST `{ diaryId, text }`
**Output**: JSON `{ success, entry }`

#### `diary-get-entries` — **Nuova V1.6**
**Scopo**: Recupera le entries di un diario personale.
**Input**: POST `{ diaryId }`
**Output**: JSON `{ entries: [...] }`

### 6.3 Funzioni Voce

#### `elevenlabs-conversation-token`
**Scopo**: Genera token per sessioni vocali ElevenLabs.
**Input**: POST `{ agentId? }`
**Output**: JSON `{ token?, signed_url?, agent_id }`
**Logica**:
1. Usa `ELEVENLABS_API_KEY` per chiamare ElevenLabs API
2. Tenta prima signed URL (WebSocket): `GET /v1/convai/conversation/get_signed_url?agent_id=X`
3. Poi token WebRTC: `GET /v1/convai/conversation/token?agent_id=X`
4. Restituisce entrambi quando disponibili

#### `elevenlabs-context`
**Scopo**: Prepara contesto dinamico per sessioni vocali.
**Input**: POST (con auth)
**Output**: JSON `{ first_message, dynamic_context }`
**Logica**:
1. Recupera profilo utente (nome, memorie recenti, obiettivi attivi)
2. Compone `first_message` personalizzato (saluto con nome + riferimento contestuale)
3. Compone `dynamic_context` compatto (~600 char) con memorie e stato

#### `aria-voice-chat` (~2235 righe)
**Scopo**: Gestione sessioni vocali avanzate.

#### `gemini-voice-native`
**Scopo**: Voce via Gemini nativo (alternativa/legacy).

### 6.4 Funzioni Processing

#### `process-session`
**Scopo**: Estrae metriche cliniche da una sessione completata.
**Input**: POST `{ session_id, user_id, transcript, is_voice? }`
**Output**: JSON `{ success }`
**Logica**:
1. Analizza transcript con Gemini per estrarre tutte le metriche
2. UPSERT in `daily_emotions` (20 metriche)
3. UPSERT in `daily_life_areas` (9 metriche)
4. UPSERT in `daily_psychology` (32 metriche)
5. UPDATE `sessions` con scores e breakdown
6. Genera `session_context_snapshot`
7. Estrae e salva nuove `user_memories`
8. Aggiorna `conversation_topics`
9. **V1.6**: Estrae eventi futuri dalla conversazione e li salva in `user_events` con `follow_up_done = false`
10. **V1.6**: Aggiorna automaticamente eventi con data passata a status `passed`
11. Aggiorna `user_profiles.last_data_change_at`

### 6.5 Funzioni Dashboard e Analytics

#### `ai-dashboard`
**Scopo**: Calcola Wellness Score e metriche focus.
**Input**: POST (con auth)
**Output**: JSON con score, metriche, consigli
**Logica**: Media pesata temporalmente (30 giorni) delle metriche vitali e psicologiche. Risultato cachato in `user_profiles.ai_dashboard_cache`.

#### `ai-analysis`
**Scopo**: Analisi approfondita per sezione Analisi.
**Output**: Cachato in `ai_analysis_cache`.

#### `ai-insights`
**Scopo**: Insight personalizzati.
**Output**: Cachato in `ai_insights_cache`.

#### `ai-checkins`
**Scopo**: Genera domande check-in personalizzate basate su storia utente.
**Output**: Cachato in `ai_checkins_cache`.

#### `calculate-correlations`
**Scopo**: Calcola correlazioni di Pearson tra metriche.
**Output**: UPSERT in `user_correlations`.

#### `detect-emotion-patterns`
**Scopo**: Identifica pattern emotivi temporali.
**Output**: UPSERT in `emotion_patterns`.

### 6.6 Funzioni Contesto

#### `real-time-context`
**Scopo**: Recupera contesto real-time (meteo, news, geolocalizzazione).
**Input**: POST `{ latitude?, longitude? }`
**Output**: JSON `{ weather, news, datetime }`
**Cache**: Meteo per 2h per utente, news globale per 12h.

#### `refresh-global-context`
**Scopo**: Aggiorna cache globale news (scheduled 2x/giorno).
**Output**: Aggiorna `global_context_cache`.

### 6.7 Funzioni Obiettivi e Abitudini

#### `create-objective-chat`
**Input**: POST `{ objective data }`
**Output**: Obiettivo creato con milestones AI.

#### `update-objective-chat`
**Input**: POST `{ objectiveId, update data }`
**Output**: Obiettivo aggiornato con feedback AI.

#### `create-habit-chat`
**Input**: POST `{ habit data }`
**Output**: Abitudine creata.

#### `sync-habits-to-brain`
**Scopo**: Sincronizza stato abitudini nel contesto AI.

### 6.8 Funzioni Doctor

#### `doctor-view-data`
**Scopo**: Recupera dati paziente per dashboard dottore.
**Input**: POST `{ patientId }`
**Output**: JSON aggregato con tutte le metriche del paziente.

#### `generate-clinical-report`
**Scopo**: Genera report clinico strutturato.
**Input**: POST `{ patientId, period }`
**Output**: Dati per generazione PDF.

### 6.9 Funzioni Notifiche

#### `aria-push-notification`
**Scopo**: Invia push notification.
**Input**: POST `{ userId, title, body }`
**Logica**: Recupera token da `device_push_tokens`, invia via APNs/FCM.

### 6.10 Funzioni Agente

#### `aria-agent-backend`
**Scopo**: Backend per l'agente Aria (logica avanzata).

### 6.4 Edge Functions Homepage (V1.7)

#### `home-context`
Aggregatore dati per homepage. NO AI — solo query DB. Legge 9 tabelle, restituisce: saluto, check-in non completati, esercizio suggerito, streak, punti, livello, HealthKit oggi.

### 6.5 Edge Functions Esercizi (V1.7)

#### `get-exercises`
Lista esercizi dal DB con filtri opzionali (category, difficulty). Ordinati per difficoltà e durata. READ-ONLY.

#### `log-exercise`
Registra completamento esercizio. Scrive su user_exercise_sessions. Trigger DB `award_exercise_points` assegna punti automatici.

### 6.6 Edge Functions Gamification (V1.7)

#### `get-gamification-status`
Stato completo gamification utente: livello attuale, badge sbloccati, sfide in corso, punti, prossimo livello. Legge 8 tabelle.

#### `redeem-points`
Riscatto punti per premium. Usa RPC `atomic_redeem_points` con SELECT FOR UPDATE (race condition fixata V1.7).

#### `start-challenge`
Avvia una sfida gamificata. Sfide attualmente hardcoded nel codice.

#### `generate-wrapped`
Genera dati Wrapped (resoconto periodico): statistiche + messaggio AI motivazionale con Gemini. Salva in aria_wrapped_data.

#### `get-wrapped`
Recupera Wrapped con cache 24h. Se scaduto, chiama generate-wrapped.

### 6.7 Edge Functions HealthKit (V1.7)

#### `sync-healthkit`
Sincronizza dati HealthKit dall'app iOS nel DB. Auth: solo JWT (fixato V1.7). Scrive su healthkit_data + body_metrics + daily_habits.

### 6.8 Edge Functions Diari V2 (V1.7)

#### `diary-save-entry`
Salva una nuova voce in un diario.

#### `diary-get-entries`
Recupera le voci di un diario.

#### `transcribe-diary-voice`
Trascrizione audio con OpenAI Whisper-1. Lingua: italiano. Max 25MB.

#### `get-diary-prompt`
Genera domanda personalizzata per invitare a scrivere nel diario. Usa Gemini con contesto sessioni + ultime voci.

### 6.9 Edge Function `cron-expire-challenges` (V1.7)

Chiamata da cron job giornaliero (00:05). Marca come "expired" le sfide attive con `expires_at` passato. Richiede auth service_role. Esegue anche pulizia automatica della tabella `rate_limits` (record > 24h).

### 6.10 Edge Functions Eliminate (V1.7)
- `create-objective-chat` — eliminata (zero auth, zero persistenza)
- `create-habit-chat` — eliminata (zero auth, zero persistenza)
- `thematic-diary-chat` — eliminata (era già deprecata HTTP 410)

---

## 7. Secrets e Variabili d'Ambiente

### 7.1 Secrets Configurati (Edge Functions)

| Secret | Uso |
|--------|-----|
| SUPABASE_URL | URL istanza Supabase |
| SUPABASE_ANON_KEY | Chiave pubblica (client) |
| SUPABASE_SERVICE_ROLE_KEY | Chiave admin (solo server) |
| SUPABASE_PUBLISHABLE_KEY | Alias anon key |
| SUPABASE_DB_URL | Connection string DB |
| GOOGLE_API_KEY | Google Gemini AI |
| OPENAI_API_KEY | OpenAI (fallback/legacy) |
| ELEVENLABS_API_KEY | ElevenLabs Voice AI |
| ELEVENLABS_AGENT_ID | ID agente vocale (`agent_2901khw977kbesesvd00yh2mbeyx`) |
| OPENWEATHER_API_KEY | OpenWeather meteo |
| WORLDNEWS_API_KEY | World News API |
| ~~LOVABLE_API_KEY~~ | ~~Lovable AI proxy~~ — **RIMOSSA in V1.6** (sostituita da GOOGLE_API_KEY diretta) |

### 7.2 Variabili Frontend (.env)

```
VITE_SUPABASE_URL=https://pcsoranahgoinljvgmtl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_JGcjU6yk4Fc9ffH45b0oOA_4vyklzEF
VITE_SUPABASE_PROJECT_ID=pcsoranahgoinljvgmtl
```

---

## 8. Flussi di Dati Principali

### 8.1 Flusso Chat Testuale

```
Client → POST /ai-chat
  ↓ Auth (triple fallback)
  ↓ Load: profile, memories, objectives, habits, context
  ↓ Compose prompt (~2500 lines HCE)
  ↓ Gemini Flash streaming
  ↓ SSE → Client
  ↓ Save chat_messages
  ↓ (async) process-session → extract 66 metrics → update daily_* tables
```

### 8.2 Flusso Sessione Vocale

```
Client → POST /elevenlabs-conversation-token → { token, signed_url }
Client → POST /elevenlabs-context → { first_message, dynamic_context }
Client → startSession({ conversationToken, connectionType: 'webrtc' })
  ↓ ElevenLabs WebRTC stream (peer-to-peer audio)
  ↓ onMessage: collect transcript entries
  ↓ After first user_transcript → sendContextualUpdate(dynamic_context)
  ↓ User ends session
  ↓ INSERT sessions (type: 'voice', transcript)
  ↓ (async) POST /process-session → extract metrics
```

### 8.3 Flusso Dashboard

```
Client → POST /ai-dashboard
  ↓ Check ai_cache_updated_at vs last_data_change_at
  ↓ If stale: recalculate with Gemini Pro
     ↓ Load 30 days of daily_* data
     ↓ Time-weighted averaging
     ↓ Cache in ai_dashboard_cache
  ↓ Return cached data
```

### 8.4 Flusso Doctor Connection

```
Patient → generates connection_code (auto via trigger)
Doctor → POST /doctor-view-data { code }
  ↓ find_patient_by_code(code)
  ↓ INSERT doctor_patient_access
  ↓ RLS policies grant read access to patient data
  ↓ Doctor dashboard shows patient metrics
```

---

## 9. API Esterne Integrate

### 9.1 Google Gemini (AI primaria)

> **V1.6**: Migrato da Lovable AI Proxy a chiamate dirette Google API.

| Endpoint | Modello | Uso |
|----------|---------|-----|
| `generativelanguage.googleapis.com` | `gemini-2.5-flash` | Chat, processing, check-in |
| `generativelanguage.googleapis.com` | `gemini-2.5-pro` | Report clinici, analisi complesse |

Autenticazione: header `x-goog-api-key` con `GOOGLE_API_KEY` (rimossa `LOVABLE_API_KEY`).

### 9.2 ElevenLabs (Voce)

| Endpoint | Metodo | Uso |
|----------|--------|-----|
| `/v1/convai/conversation/token` | GET | Token WebRTC |
| `/v1/convai/conversation/get_signed_url` | GET | Signed URL WebSocket |
| Agent ID: `agent_2901khw977kbesesvd00yh2mbeyx` | — | Agente vocale Aria |

### 9.3 OpenWeather

| Endpoint | Cache | Limite |
|----------|-------|--------|
| `/data/2.5/weather` | 2h per coordinate (0.1° grid) | ~1000/giorno |

### 9.4 World News API

| Endpoint | Cache | Limite |
|----------|-------|--------|
| `/api/search-news` | Globale, refresh 8:00 e 18:00 | 50 punti/giorno |

---

## 10. Configurazione e Deploy

### 10.1 config.toml

Ogni Edge Function è dichiarata nel file `supabase/config.toml`:

```toml
[functions.nome-funzione]
verify_jwt = false
```

Tutte le funzioni hanno `verify_jwt = false` perché l'autenticazione è gestita internamente.

### 10.2 Deploy Edge Functions

Le Edge Functions sono deployate su Supabase standalone (migrazione da Lovable Cloud completata in V1.6):

```bash
supabase functions deploy nome-funzione --project-ref pcsoranahgoinljvgmtl
```

### 10.3 Migrazioni Database

Le migrazioni SQL sono in `supabase/migrations/` (~50 file) e devono essere eseguite in ordine cronologico. Ogni file è prefissato con un timestamp.

### 10.4 Secrets Setup (Supabase Standalone)

```bash
supabase secrets set GOOGLE_API_KEY=xxx          # Gemini AI (chiamate dirette)
supabase secrets set ELEVENLABS_API_KEY=xxx       # ElevenLabs Voice AI
supabase secrets set ELEVENLABS_AGENT_ID=agent_2901khw977kbesesvd00yh2mbeyx
supabase secrets set OPENWEATHER_API_KEY=xxx      # Contesto meteo
supabase secrets set WORLDNEWS_API_KEY=xxx        # Contesto news
supabase secrets set OPENAI_API_KEY=xxx           # OpenAI (fallback/legacy)
# LOVABLE_API_KEY — RIMOSSA in V1.6, non più necessaria
```

---

> **Nota**: Questo documento copre l'intero backend al 27 Febbraio 2026 (V1.6). Per modifiche successive, consultare le migrazioni SQL, i changelog delle Edge Functions e `ARIA_DECISIONI_CHANGELOG.md`.
