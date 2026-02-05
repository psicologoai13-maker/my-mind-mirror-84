
# Piano di Correzione: Aria Chat + Aria Voice

## 🔍 Diagnosi Confermata

### Problema 1: Aria Chat - Errore di Connessione
**Causa**: Gli header CORS in `ai-chat/index.ts` sono **incompleti**.

**Attualmente** (linee 4-7):
```javascript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

**Dovrebbe essere**:
```javascript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

I nuovi client Supabase inviano header aggiuntivi che non sono permessi dalla configurazione attuale → il browser blocca la richiesta.

---

### Problema 2: Aria Voice - Non Ricorda le Conversazioni
**Causa**: La query delle sessioni in `aria-voice-chat/index.ts` (linee 817-822) **non include il campo `transcript`**.

```javascript
// ATTUALE - linea 817-822
supabase
  .from('sessions')
  .select('start_time, ai_summary, mood_score_detected')  // ← MANCA transcript!
  .eq('user_id', user.id)
  .eq('status', 'completed')
  .order('start_time', { ascending: false })
  .limit(5),
```

Inoltre, l'interfaccia `RecentSession` (linee 353-357) non include `transcript`:
```typescript
interface RecentSession {
  start_time: string;
  ai_summary: string | null;
  mood_score_detected: number | null;
  // MANCA: transcript: string | null;
}
```

Il risultato: quando `ai_summary` non è ancora disponibile (la generazione è asincrona), Aria non ha accesso ai contenuti delle conversazioni recenti.

---

### Problema 3: iOS Safari - Non Funziona
**Stato**: Richiede ulteriore investigazione con log specifici della console Safari. Le modifiche precedenti per sbloccare l'audio potrebbero non essere sufficienti.

---

## 🛠️ Correzioni da Implementare

### Correzione 1: ai-chat CORS Headers
**File**: `supabase/functions/ai-chat/index.ts`
**Modifica**: Aggiornare gli header CORS alle linee 4-7

### Correzione 2: aria-voice-chat Memoria Sessioni
**File**: `supabase/functions/aria-voice-chat/index.ts`
**Modifiche**:
1. Aggiungere `transcript` all'interfaccia `RecentSession` (linea 353-357)
2. Aggiungere `transcript` alla query `.select()` (linea 818)
3. Nel blocco di costruzione delle sessioni recenti, usare `transcript` come fallback quando `ai_summary` è null

### Correzione 3: iOS Safari (Fase 2)
**Richiesta**: Per diagnosticare questo problema correttamente, ho bisogno dei log della console Safari su iPhone. Puoi:
1. Collegare l'iPhone al Mac
2. Aprire Safari su Mac → Sviluppo → [nome iPhone] → [pagina dell'app]
3. Riprodurre l'errore e condividere i log

---

## 📋 Riepilogo Tecnico

| Problema | Causa | File | Fix |
|----------|-------|------|-----|
| Chat errore connessione | CORS headers incompleti | ai-chat/index.ts | Aggiungere headers mancanti |
| Voice non ricorda | Query senza transcript | aria-voice-chat/index.ts | Includere transcript nella query e interfaccia |
| iOS non funziona | Da diagnosticare | useHybridVoice.tsx | Servono log Safari |
