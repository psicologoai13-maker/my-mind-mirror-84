
# Piano Ottimizzato: Aria Real-Time Context Awareness

## Obiettivo
Rendere Aria consapevole del contesto in tempo reale (data/ora, meteo, news, posizione) con architettura a **costo zero** rispettando i limiti delle API gratuite.

## Limiti API da Rispettare

| API | Limite Giornaliero | Strategia |
|-----|-------------------|-----------|
| **World News API** | 50 points/day | Cache globale condivisa: **2 chiamate/giorno** (mattina + sera) |
| **OpenWeather API** | 1,000 calls/day | Cache per utente: **1 chiamata ogni 2 ore** max 12/utente/giorno |

## Calcolo Budget

### World News API (50 points/day)
- **Strategia**: Cache globale per TUTTI gli utenti (stesse news Italia)
- Refresh: 2 volte al giorno (08:00 e 18:00)
- **Consumo**: 2 points/day
- **Margine**: 48 points di riserva

### OpenWeather API (1,000 calls/day)
- **Strategia**: Cache per utente basata su coordinate (arrotondate a 0.1°)
- Refresh: ogni 2 ore max
- Con 50 utenti attivi: 50 × 12 = 600 calls/day
- **Margine**: 400 calls di riserva

## Architettura Finale

```
FRONTEND                           BACKEND
┌─────────────────┐               ┌─────────────────────────────────┐
│ useUserLocation │──── GPS ────►│ real-time-context Function      │
│ useRealTimeContext │            │   ├─ datetime (sempre gratis)   │
└─────────────────┘               │   ├─ weather → user_profiles    │
                                  │   └─ news → global_news_cache   │
                                  └─────────────────────────────────┘
                                              │
                                              ▼
                                  ┌─────────────────────────────────┐
                                  │ Prompt Injection in:            │
                                  │  • ai-chat                      │
                                  │  • gemini-voice                 │
                                  │  • thematic-diary-chat          │
                                  │  • openai-realtime-session      │
                                  └─────────────────────────────────┘
```

---

## Step di Implementazione

### Step 1: Database Migration
Creare tabella cache globale per le news (condivisa tra tutti gli utenti):

```sql
CREATE TABLE IF NOT EXISTS global_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- RLS: lettura pubblica (dati non sensibili)
ALTER TABLE global_context_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read global cache" ON global_context_cache
  FOR SELECT USING (true);
```

### Step 2: Nuova Edge Function - refresh-global-context
Funzione dedicata per refreshare la cache globale news (chiamata da cron o manualmente):

**File**: `supabase/functions/refresh-global-context/index.ts`

Funzionalità:
- Chiama World News API
- Salva in `global_context_cache` con `cache_key = 'italy_news'`
- Scadenza: 12 ore (per 2 refresh/giorno)

### Step 3: Modificare real-time-context 
Aggiornare l'edge function esistente per usare la cache intelligente:

**Logica ottimizzata**:
1. **DateTime**: Sempre calcolato (gratis)
2. **News**: Legge da `global_context_cache` (MAI chiama API direttamente)
3. **Weather**: 
   - Arrotonda coordinate a 0.1° (grid-based caching)
   - Controlla cache in `user_profiles.realtime_context_cache`
   - Se cache < 2 ore, usa cache
   - Se cache > 2 ore, chiama OpenWeather e aggiorna cache

### Step 4: Setup Cron Job per News
Configurare pg_cron per chiamare `refresh-global-context` 2 volte al giorno:

```sql
SELECT cron.schedule(
  'refresh-news-morning',
  '0 8 * * *',
  $$ SELECT net.http_post(...) $$
);

SELECT cron.schedule(
  'refresh-news-evening', 
  '0 18 * * *',
  $$ SELECT net.http_post(...) $$
);
```

### Step 5: Integrare Context in Tutte le Edge Functions AI

**gemini-voice/index.ts**:
- Riceve `realTimeContext` via query params o WebSocket setup
- Inietta nel system prompt

**thematic-diary-chat/index.ts**:
- Riceve `realTimeContext` nel body
- Inietta nel system prompt

**openai-realtime-session/index.ts** (se usato):
- Passa context nelle instructions WebRTC

### Step 6: Modificare Frontend per Passare Context

**Chat.tsx**: Già implementato ✓

**Aria.tsx / VoiceModal**: 
- Passare `realTimeContext` alla sessione voice via query params

**ThematicChatInterface.tsx**:
- Passare `realTimeContext` a thematic-diary-chat

### Step 7: Ottimizzare useRealTimeContext
Aggiornare l'hook per:
- Estendere cache a 2 ore (da 30 min)
- Non chiamare mai direttamente news API (solo backend)
- Fallback graceful se nessun dato disponibile

---

## Dettagli Tecnici

### Formato Cache News (global_context_cache)
```json
{
  "headlines": [
    "Titolo notizia 1",
    "Titolo notizia 2",
    "..."
  ],
  "fetched_at": "2026-01-28T08:00:00Z"
}
```

### Formato Cache Weather (user_profiles.realtime_context_cache)
```json
{
  "datetime": { ... },
  "location": { "city": "Milano", "region": "Lombardia" },
  "weather": { "condition": "Nuvoloso", "temperature": 8, ... },
  "weather_fetched_at": "2026-01-28T10:30:00Z"
}
```

### Grid-Based Weather Caching
Arrotondare coordinate per condividere cache tra utenti vicini:
```javascript
const gridLat = Math.round(lat * 10) / 10; // 45.123 → 45.1
const gridLon = Math.round(lon * 10) / 10; // 9.456 → 9.5
```

---

## File da Creare

| File | Descrizione |
|------|-------------|
| `supabase/functions/refresh-global-context/index.ts` | Cron job per refresh news |

## File da Modificare

| File | Modifica |
|------|----------|
| `supabase/functions/real-time-context/index.ts` | Cache intelligente weather + lettura news da cache globale |
| `supabase/functions/gemini-voice/index.ts` | Inject realTimeContext nel system prompt |
| `supabase/functions/thematic-diary-chat/index.ts` | Inject realTimeContext nel system prompt |
| `src/hooks/useRealTimeContext.tsx` | Estendere cache a 2 ore |
| `src/components/diary/ThematicChatInterface.tsx` | Passare context a edge function |
| `src/components/voice/ZenVoiceModal.tsx` | Passare context a gemini-voice |

---

## Risultato Finale

### Costi
| API | Calls/Giorno | Limite | Status |
|-----|--------------|--------|--------|
| World News | 2 | 50 | ✅ 4% utilizzo |
| OpenWeather | ~600 (50 utenti) | 1,000 | ✅ 60% utilizzo |

**Costo mensile: €0**

### Funzionalità
- Aria conosce data, ora, stagione, festività italiane
- Aria conosce il meteo locale dell'utente
- Aria conosce le principali notizie italiane del giorno
- Tutto disponibile in Chat, Voice e Diari Tematici
