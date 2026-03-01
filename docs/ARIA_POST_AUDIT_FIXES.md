# ARIA — Post-Audit Fixes (1 Marzo 2026)

> Registro correzioni applicate dopo l'audit del 28 Febbraio 2026.
> I 4 file di audit (ARIA_AUDIT_1/2/3/4) restano come archivio storico e NON vanno modificati.

---

## Bug Corretti

| # | Bug | Severità | Fix applicato | File |
|---|---|:---:|---|---|
| 1 | Trigger livello WHERE id = user_id | P0 | WHERE user_id + usa lifetime_points | SQL migration |
| 2 | ElevenLabs token senza auth | P0 | Auth JWT obbligatoria | elevenlabs-conversation-token |
| 3 | sync-healthkit scrive per chiunque | P0 | Solo JWT, userId dal token | sync-healthkit |
| 4 | Push notification senza auth | P0 | Auth JWT + check utente | aria-push-notification |
| 5 | calculate-correlations zero auth | P0 | Auth JWT + userId dal token | calculate-correlations |
| 6 | Wellness score scala sbagliata | P1 | Conversione ×10 | ai-dashboard |
| 7 | Doctor access bypass | P1 | Check relazione obbligatorio | doctor-view-data |
| 8 | Livello scende spendendo punti | P2 | lifetime_points | SQL migration |
| 9 | redeem-points race condition | P2 | atomic_redeem_points con FOR UPDATE | redeem-points + SQL |
| 10 | Habits/eventi rilevati ma non salvati nel DB | P3 | `habits_detected` e `habit_progress_updates` ora salvati in `user_habits_config` + `daily_habits` | process-session |
| 11 | process-session scrive 10 tabelle senza transazione | P3 | Ogni scrittura wrappata in try-catch con graceful degradation, errori tracciati e loggati | process-session |
| 12 | Timezone hardcoded Europe/Rome | P3 | Colonna `timezone` in user_profiles + parametro in get_daily_metrics + ai-checkins/aria-push | ai-checkins, aria-push, SQL migration |
| 13 | ai_milestones append senza deduplicazione | P3 | Check duplicati per milestone name (case-insensitive) | update-objective-chat |
| 14 | get-diary-prompt carica diary_entries ma le ignora | P3 | Ultime 5 entries incluse nel prompt Gemini | get-diary-prompt |
| 15 | get_daily_metrics ridefinita 10+ volte | P3 | Versione definitiva unica con parametro timezone | SQL migration |
| 16 | check_and_award_badges esegue 8 COUNT ogni volta | P3 | Early-exit + skip badge già sbloccati | SQL migration |
| 17 | Validazione input mancante in 5 edge functions | P3 | Validazione range/tipo aggiunta dopo parsing body | log-exercise, sync-healthkit, redeem-points, start-challenge, generate-wrapped |

## Funzioni Eliminate

| Funzione | Motivo |
|---|---|
| create-objective-chat | Zero auth, zero persistenza server |
| create-habit-chat | Zero auth, zero persistenza server |
| thematic-diary-chat | Deprecata V1.6, eliminata V1.7 |

## Pulizia Database

- Migrazione diari V1 → V2 completata
- 7 trigger duplicati rimossi
- 3 funzioni SQL duplicate rimosse
- Nuova colonna: user_reward_points.lifetime_points
- Nuova funzione: atomic_redeem_points()

## Bug Ancora Aperti

| # | Bug | Severità |
|---|---|:---:|
| ~~1~~ | ~~process-session scrive 10 tabelle senza transazione~~ | ~~P3~~ ✅ |
| ~~2~~ | ~~Habits/eventi rilevati ma non salvati nel DB~~ | ~~P3~~ ✅ |
| 3 | Sfide scadute restano attive (no cron job) | P3 |
| 4 | System prompt ai-chat ~30-50KB | P3 |
| ~~5~~ | ~~Timezone hardcoded Europe/Rome~~ | ~~P3~~ ✅ |
| ~~6~~ | ~~ai_milestones append senza deduplicazione~~ | ~~P3~~ ✅ |
| ~~7~~ | ~~get-diary-prompt carica diary_entries ma le ignora~~ | ~~P3~~ ✅ |
| 8 | Triple-fallback auth duplicata in 15+ funzioni | P3 |
| ~~9~~ | ~~get_daily_metrics ridefinita 10+ volte~~ | ~~P3~~ ✅ |
| ~~10~~ | ~~check_and_award_badges esegue 8 COUNT ogni volta~~ | ~~P3~~ ✅ |
