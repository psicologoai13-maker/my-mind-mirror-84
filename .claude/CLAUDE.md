# ARIA — Backend Supabase Project Rules

## Progetto
- **App**: Aria — app di supporto al benessere psicologico con voce AI
- **Repo**: my-mind-mirror-84
- **Backend**: Supabase Edge Functions (Deno/TypeScript)
- **Progetto Supabase**: pcsoranahgoinljvgmtl (EU Frankfurt)
- **AI**: Google Gemini API diretta (gemini-2.5-flash per chat, gemini-2.5-pro per analisi)

## Architettura

### Edge Functions principali
| Funzione | Scopo |
|----------|-------|
| `ai-chat` | Chat testuale con prompt clinico completo (~30KB) |
| `aria-chat-ios` | Proxy per iOS (JSON non-streaming) |
| `aria-voice-setup` | Prepara sessione Gemini Live Voice |
| `process-session` | Analizza transcript, estrae 66 metriche cliniche |
| `ai-dashboard` | Calcola Wellness Score e metriche focus |
| `ai-checkins` | Genera check-in personalizzati (max 8/giorno) |
| `ai-analysis` | Analisi approfondita per sezione Analisi |
| `ai-insights` | Insight personalizzati |
| `calculate-correlations` | Correlazioni di Pearson tra metriche |
| `detect-emotion-patterns` | Pattern emotivi temporali |
| `real-time-context` | Meteo, news, geolocalizzazione |
| `aria-push-notification` | Push notifications proattive iOS |

### Cervello condiviso
- `supabase/functions/_shared/aria-brain.ts` — cervello unificato usato da `ai-chat`, `aria-chat-ios`, `aria-voice-setup`
- `buildAriaBrain(userId, client, admin, channel, history, context)` — genera il system prompt
- `channel`: `'chat'` o `'voice'` — unica differenza è nelle OUTPUT_RULES
- Carica: profilo, memorie (80), obiettivi, abitudini, sessioni recenti (5 completed + 1 in_progress), messaggi chat recenti (20, ultime 24h), check-in di oggi, eventi calendario, contesto real-time

### Knowledge Base
- `_shared/aria-knowledge-base-complete.md` — 54 documenti clinici
- Selezione per keyword matching (max 2-3 docs per conversazione)

## Regole CRITICHE

### Autenticazione triple-fallback (in tutte le edge functions):
1. Header `Authorization: Bearer JWT`
2. Body `accessToken`
3. Body `userId` con service role

### Deploy: supabase functions deploy NOME_FUNZIONE --project-ref pcsoranahgoinljvgmtl

Se una funzione usa `_shared/aria-brain.ts`, deployare TUTTE le funzioni che lo importano: ai-chat, aria-chat-ios, aria-voice-setup

### Non modificare MAI:
- La struttura del prompt clinico in `aria-brain.ts` senza conferma esplicita
- Le tabelle database (solo aggiungere, mai rimuovere colonne)
- Il modello AI senza conferma (`gemini-2.5-flash-preview-04-17`)

### Pattern da seguire:
- `verify_jwt = false` in config.toml per tutte le funzioni (auth gestita internamente)
- CORS headers in ogni risposta
- Errori: sempre `console.error` con contesto, mai silenziare
- Cache: usare `ai_dashboard_cache`, `ai_checkins_cache` in `user_profiles` (jsonb)
- Timezone: `Europe/Rome` con reset logico alle 6:00 per data giornaliera
- `process-session`: scrive in sessions + daily_emotions + daily_life_areas + daily_psychology + user_memories + conversation_topics
- Check-in: `source = 'checkin'` per risposte manuali, `source = 'session'` per rilevamenti da chat/voce

### Trigger DB da conoscere:
- `trigger_award_points_session` — assegna 25 punti quando sessions.status diventa 'completed'
- `update_user_level_on_points_change` — aggiorna livello utente (usa `gamification_levels.level`, NON `id`)
- Questi trigger possono causare errori se le colonne referenziate non esistono

## API esterne
- **Google Gemini**: `generativelanguage.googleapis.com` — chiave in `GOOGLE_API_KEY`
- **ElevenLabs**: per agent vocale legacy — chiave in `ELEVENLABS_API_KEY`
- **OpenWeather**: meteo — chiave in `OPENWEATHER_API_KEY`
- **World News API**: notizie — chiave in `WORLDNEWS_API_KEY`
