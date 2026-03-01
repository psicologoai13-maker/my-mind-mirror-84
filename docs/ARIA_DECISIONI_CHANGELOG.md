# ARIA — Decisioni e Changelog

> Registro cronologico delle decisioni architetturali, modifiche significative e stato di implementazione.

---

## 1 Mar 2026 — Batch V5.1: Messaggio Aria + Sintesi breve

### Implementazioni
- **Messaggio Aria nella Home**: `home-context` ora genera un messaggio personalizzato con Gemini Flash. Cache 4h in `user_profiles.aria_home_message`. Invalidato automaticamente da `process-session` dopo ogni sessione completata. Fallback testuale se API down.
- **Sintesi AI breve**: prompt `ai-analysis` modificato con vincolo 100 char per `ai_summary`. Aggiunto truncation fallback a 120 char nel parsing. Box Riepilogo ora sempre visibile (non espandibile).

### Colonne DB aggiunte
- `user_profiles.aria_home_message` (text)
- `user_profiles.aria_home_message_at` (timestamptz)

### File modificati
- `supabase/functions/home-context/index.ts` — +query user_memories, +generateAriaHomeMessage(), +aria_message nel response
- `supabase/functions/process-session/index.ts` — +invalidazione cache aria_home_message alla fine
- `supabase/functions/ai-analysis/index.ts` — +vincolo lunghezza prompt, +truncation fallback

### Decisioni architetturali
- process-session NON rigenera il messaggio (evita chiamata Gemini extra) — invalida solo la cache. Rigenerazione delegata a home-context alla prossima apertura app.
- Strategia cache ibrida: <4h → usa cache (0ms), >4h → genera al volo (1-2s), post-sessione → invalida per freschezza.

---

## 1 Mar 2026 — Fix P3 Batch 2

### Completate
- **Modulo auth condiviso**: creato `_shared/auth.ts` con `authenticateUser()`, `handleCors()`, `checkRateLimit()`. Refactorate 15 edge functions per usarlo
- **Cron sfide scadute**: nuova edge function `cron-expire-challenges` + cron job giornaliero. Sfide con `expires_at` passato vengono marcate come `expired`
- **Rate limiting**: nuova tabella `rate_limits` + funzione SQL `check_rate_limit()`. Applicato a 6 funzioni costose (Gemini/Whisper) con limiti per utente/ora

---

## 1 Mar 2026 — Fix P3 Batch 1

### Completate
- **Milestones dedup**: `update-objective-chat` ora controlla duplicati prima di aggiungere milestone
- **Diary prompt fix**: `get-diary-prompt` ora include le ultime 5 voci nel prompt Gemini
- **get_daily_metrics consolidata**: versione definitiva unica, con parametro timezone opzionale
- **Badge ottimizzati**: `check_and_award_badges` ora salta badge già sbloccati (ridotto fino a 8 query inutili)
- **Validazione input**: aggiunta a 5 edge functions (log-exercise, sync-healthkit, redeem-points, start-challenge, generate-wrapped)
- **Timezone parametrico**: aggiunta colonna `timezone` a user_profiles (default Europe/Rome), get_daily_metrics accetta timezone

---

## 1 Mar 2026 — Fix process-session

### Completate
- **Salvataggio habits**: habits rilevati da Gemini (`habits_detected`) ora vengono salvati in `user_habits_config` + `daily_habits` con dedup tramite upsert su `(user_id, habit_type, date)`
- **Salvataggio progressi habits**: `habit_progress_updates` rilevati da Gemini ora vengono salvati in `daily_habits` con lookup `target_value`/`unit` da `user_habits_config`
- **Salvataggio eventi**: eventi rilevati da Gemini (`events_detected`) già funzionanti, verificato e confermato
- **Error handling migliorato**: ogni scrittura DB (10+ tabelle) è wrappata in try-catch con logging chiaro. Se una fallisce, le altre continuano (graceful degradation). Errori tracciati in `dbErrors[]` e loggati in summary finale
- **Rimosso throw fatale**: la sessione update non fa più `throw` se fallisce — logga l'errore e continua con le altre scritture

### Decisioni prese
- Scelto Opzione A (graceful degradation) per la transazione perché le 10+ scritture sono molto diverse tra loro e complesse da serializzare in un singolo JSONB per una RPC SQL
- La risposta JSON include `db_errors` se ci sono stati errori parziali

---

## 1 Mar 2026 — Sessione Post-Audit Fix

### Completate

#### Fase 1 — Fix sicurezza P0 (4 edge functions)
- `elevenlabs-conversation-token`: aggiunta autenticazione JWT obbligatoria. Prima chiunque poteva ottenere token vocali gratis
- `aria-push-notification`: aggiunta auth JWT + check che utente non può triggerare notifiche per altri
- `sync-healthkit`: rimossa triple fallback auth, solo JWT. userId forzato dal token, ignorato dal body
- `calculate-correlations`: aggiunta auth JWT + userId forzato dal token

#### Fase 2 — Fix correttezza P1
- Trigger `update_user_level_on_points_change`: fixato `WHERE id = NEW.user_id` → `WHERE user_id = NEW.user_id`. Ora usa anche `COALESCE(NEW.lifetime_points, NEW.total_points)`
- `ai-dashboard`: wellness score ora moltiplicato ×10 prima del salvataggio (scala 1-10 Gemini → 0-100 DB)
- `doctor-view-data`: aggiunto check obbligatorio relazione `doctor_patient_access` attiva
- Nuova colonna `user_reward_points.lifetime_points`: punti totali guadagnati, non decrementati alla spesa
- `add_reward_points()`: ora incrementa anche lifetime_points
- `calculate_user_level()`: ora usa lifetime_points con fallback a total_points
- `redeem-points`: usa nuova RPC `atomic_redeem_points` con SELECT FOR UPDATE (fix race condition)

#### Fase 3 — Pulizia
- Eliminata `create-objective-chat` (zero auth, zero persistenza)
- Eliminata `create-habit-chat` (zero auth, zero persistenza)
- Eliminata `thematic-diary-chat` (già deprecata HTTP 410)
- Rimosse da `config.toml`
- Migrazione diari V1 → V2: dati da `thematic_diaries` migrati in `diaries` + `diary_entries`. Tabella V1 rinominata a `thematic_diaries_v1_backup`
- `generate-clinical-report`: aggiornato a usare `diary_entries` V2 invece di `thematic_diaries`
- Rimossi 7 trigger duplicati per cache invalidation
- Rimosse funzioni SQL duplicate: `generate_referral_code`, `set_referral_code`, `update_correlation_timestamp`

### Decisioni prese
- Diari V1 (`thematic_diaries`) eliminati definitivamente. Solo V2 (`diaries` + `diary_entries`) attivo
- Il livello utente si basa su `lifetime_points` (punti guadagnati totali), non su `total_points` (saldo spendibile)

### Conteggio aggiornato
- Edge functions: da 29 a 26
- Funzioni SQL eliminate: 3
- Trigger rimossi: 7 duplicati
- Bug critici corretti: 9

---

## 28 Feb 2026 — Backend V2.0 Implementato

### 8 nuove tabelle database
- `exercises` — catalogo esercizi con slug, categoria, difficoltà, punti
- `user_exercise_sessions` — log esercizi completati (mood_before/after, duration_actual)
- `gamification_levels` — livelli con nome, emoji, punti necessari
- `user_challenges` — sfide attive degli utenti
- `diaries` — diari personali V2 (name, icon_emoji, color_hex, description, weekly_prompt)
- `diary_entries` — voci dei diari (content_text, content_audio_url, entry_type, mood_at_entry, word_count)
- `healthkit_data` — dati HealthKit iOS (passi, sonno, FC, HRV, peso, ciclo mestruale)
- `aria_wrapped_data` — dati Wrapped mensile/annuale cachati

### 11 nuove edge functions
- `home-context` — aggregatore dati homepage (NO AI, solo query DB)
- `get-exercises` — lista esercizi filtrati per categoria/difficoltà
- `log-exercise` — registra esercizio completato + punti via trigger
- `get-gamification-status` — stato completo gamification utente (livello, badge, sfide, punti)
- `redeem-points` — riscatto punti per premium (ora con RPC atomica)
- `start-challenge` — avvia sfida gamificata
- `sync-healthkit` — sincronizza dati HealthKit nel DB
- `generate-wrapped` — genera dati Wrapped con messaggio AI Gemini
- `get-wrapped` — recupera Wrapped con cache 24h
- `transcribe-diary-voice` — trascrizione audio diario con OpenAI Whisper
- `get-diary-prompt` — genera domanda personalizzata per diario con Gemini

### 3 edge functions modificate
- `ai-chat` — aggiunto tag esercizi `[EXERCISE:slug]` + contesto HealthKit
- `calculate-correlations` — aggiunge correlazioni con dati HealthKit
- `process-session` — aggiunto contesto diari

### Logica automatica (trigger SQL)
- Punti automatici: +5 check-in, +15 chat, +25 voice, +10 diario
- 16 badge automatici (first_checkin, streak_7, sessions_10, ecc.)
- Calcolo livello automatico basato su punti

### Audit completo eseguito
- 4 file di audit dettagliati creati (ARIA_AUDIT_1/2/3/4)
- Trovati 9 bug critici (tutti corretti il 1 Mar)
- Trovate 3 funzioni da eliminare (eliminate il 1 Mar)
- Identificati 15 feature incomplete e 20 gap funzionali

---

## 27 Feb 2026 — Sessione V1.5 → V1.6

### Completate

#### Migrazione Supabase standalone
- Migrazione completa da Lovable Cloud a progetto Supabase indipendente
- Nuovo progetto: `pcsoranahgoinljvgmtl` (regione EU Frankfurt)
- GRANT permissions aggiunte per PostgREST su 30 tabelle (anon, authenticated, service_role)
- Tutti i dati migrati e testati

#### 17 Edge Functions migrate a Google API diretta
- Tutte le edge functions che usavano Lovable AI proxy ora chiamano direttamente `generativelanguage.googleapis.com`
- Modelli corretti: `gemini-2.5-flash` (chat/processing) e `gemini-2.5-pro` (analisi complesse)
- `LOVABLE_API_KEY` rimossa, sostituita da `GOOGLE_API_KEY` diretta

#### Sistema diari personali implementato
- Nuova edge function `diary-save-entry` per salvataggio entries
- Nuova edge function `diary-get-entries` per recupero entries
- `thematic-diary-chat` deprecata (risponde HTTP 410)
- Tabella `thematic_diaries` aggiornata con colonne: title, entries (jsonb array), color, icon
- Diari = quaderni personali liberi, zero interazione AI
- Aria legge diari in background per contesto conversazionale

#### 4 Fix comportamento chat Aria deployati
1. **Transcript grezzo risolto**: il messaggio di apertura non espone più il transcript grezzo della sessione precedente
2. **Tono notturno risolto**: tono notturno 00:00-06:00 ora con priorità assoluta su qualsiasi altra regola
3. **Modalità primo incontro implementata**: quando user_memories < 3, Aria si presenta senza riferimenti a sessioni inesistenti
4. **Regola anti-interrogatorio**: max 1 domanda ogni 2 risposte, 60% risposte senza domanda

#### System Prompt ElevenLabs riscritto V1.6
- Prompt completamente riscritto con adattamento per età (6 fasce: Teen → Elder)
- Consapevolezza temporale attiva con ora e giorno corrente
- Modalità primo incontro
- Umorismo e battute affettuose contestuali
- Stesse regole anti-interrogatorio della chat

#### elevenlabs-context arricchito
- Aggiunto: tempo dall'ultima sessione
- Aggiunto: stato emotivo ultima sessione
- Aggiunto: eventi imminenti ±12h da user_events
- Aggiunto: ora in formato Aria ("sono le 15:30 di giovedì pomeriggio")

#### Personalità HCE riscritta
- Più amica, meno assistente
- Umorismo contestuale
- Follow-up proattivo su temi precedenti
- Memoria attiva con riferimenti espliciti
- Lista anti-pattern aggiornata (frasi da chatbot bandite)

#### process-session potenziato
- Aggiunta estrazione eventi futuri dalla conversazione
- Salvataggio in user_events con follow_up_done = false
- Aggiornamento automatico eventi passati a status 'passed'

### Da implementare

#### OpenAI TTS come alternativa economica
- OpenAI TTS (Nova/Shimmer) + Whisper come alternativa a ElevenLabs
- Costo stimato: ~$0.12/sessione vs ElevenLabs
- Architettura: loop Swift con AVAudioRecorder + edge functions openai-tts e openai-stt
- Toggle Premium/Standard nelle impostazioni utente

#### Sessione giornaliera unica
- Una sessione per giorno che si chiude per contesto, non per timer
- Permette conversazioni più naturali e continuità nel dialogo giornaliero

### Da valutare

#### user_interests non presente nel nuovo DB
- La tabella user_interests (~50 campi di preferenze) non è stata inclusa nelle migrazioni del nuovo DB
- Opzioni: ricreare con migrazione dedicata, integrare in user_memories, raccogliere organicamente via conversazione

---
