# PROMPT PER RORK MAX - Integrazione Completa Backend Supabase

## PROBLEMA
L'app iOS legge campi raw del database (es. `user_profiles.wellness_score` che è sempre 0) invece di usare le Edge Functions e le RPC che calcolano i dati reali. Inoltre Aria (chat e voce) non funziona.

## CONFIGURAZIONE SUPABASE
```
URL: https://yzlszvvhbcasbzsaastq.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bHN6dnZoYmNhc2J6c2Fhc3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY4ODg3MDUsImV4cCI6MjAzMjQ2NDcwNX0.8tYpQvH8yC96iG9Hsh9_rCoT4
```

**REGOLA CRITICA**: Ogni chiamata alle Edge Functions DEVE includere l'header:
```
Authorization: Bearer <access_token dalla sessione Supabase>
```

---

## 1. DASHBOARD & WELLNESS SCORE

### Problema attuale
L'app legge `user_profiles.wellness_score` → sempre 0.

### Soluzione
Il Wellness Score è un **giudizio AI** (non una media), calcolato dalla Edge Function `ai-dashboard` e salvato in `user_profiles.ai_dashboard_cache`.

### Implementazione
```typescript
// 1. Chiamare la Edge Function
const { data, error } = await supabase.functions.invoke('ai-dashboard');

// 2. Leggere i dati dalla cache nel profilo
const { data: profile } = await supabase
  .from('user_profiles')
  .select('ai_dashboard_cache, ai_cache_updated_at')
  .eq('user_id', userId)
  .single();

// 3. Usare i dati dalla cache
const dashboardData = profile.ai_dashboard_cache;
// dashboardData contiene:
// {
//   wellness_score: 7.5,        // <-- QUESTO è il vero punteggio
//   wellness_trend: "stable",
//   mood_summary: "...",
//   energy_summary: "...",
//   top_insights: [...],
//   suggested_actions: [...],
//   emotional_summary: "...",
//   life_areas_summary: {...}
// }
```

### Pattern Cache-First
```typescript
// Controlla se la cache è ancora valida (< 2 ore)
const cacheAge = Date.now() - new Date(profile.ai_cache_updated_at).getTime();
const TWO_HOURS = 2 * 60 * 60 * 1000;

if (!profile.ai_dashboard_cache || cacheAge > TWO_HOURS) {
  // Rigenera chiamando la Edge Function
  await supabase.functions.invoke('ai-dashboard');
  // Poi rileggi il profilo
}
```

---

## 2. METRICHE GIORNALIERE (Vitals)

### Problema attuale
Umore, ansia, energia, sonno tutti a 0.

### Soluzione
Usare la RPC `get_daily_metrics` che aggrega dati da checkins, sessioni ed emozioni.

```typescript
const { data: metrics } = await supabase.rpc('get_daily_metrics', {
  p_user_id: userId,
  p_date: new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'
});

// metrics ritorna:
// {
//   date: "2026-02-21",
//   vitals: { mood: 7, anxiety: 4, energy: 6, sleep: 8 },
//   emotions: { joy: 7, sadness: 2, anger: 0, fear: 1, apathy: 0, shame: null, ... },
//   life_areas: { work: 7, love: 6, family: 8, social: 5, health: 6, growth: 7, leisure: 4, finances: 5, school: null },
//   deep_psychology: { rumination: 3, self_efficacy: 7, mental_clarity: 6, burnout_level: 4, ... },
//   has_checkin: true,
//   has_sessions: true,
//   has_emotions: true,
//   has_life_areas: true,
//   has_psychology: true
// }
```

### Per storico (ultimi N giorni)
```typescript
const days = [];
for (let i = 0; i < 7; i++) {
  const date = new Date();
  date.setDate(date.getDate() - i);
  const dateStr = date.toISOString().split('T')[0];
  const { data } = await supabase.rpc('get_daily_metrics', {
    p_user_id: userId,
    p_date: dateStr
  });
  days.push(data);
}
```

---

## 3. ARIA CHAT (Testuale)

### Edge Function: `ai-chat`
Supporta **streaming SSE** (Server-Sent Events).

### Flusso completo

```typescript
// 1. Creare una sessione
const { data: session } = await supabase
  .from('sessions')
  .insert({
    user_id: userId,
    type: 'chat',
    status: 'active',
    start_time: new Date().toISOString()
  })
  .select()
  .single();

// 2. Salvare il messaggio utente
await supabase.from('chat_messages').insert({
  session_id: session.id,
  user_id: userId,
  role: 'user',
  content: userMessage
});

// 3. Chiamare ai-chat con streaming
const response = await fetch(
  'https://yzlszvvhbcasbzsaastq.supabase.co/functions/v1/ai-chat',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'apikey': ANON_KEY
    },
    body: JSON.stringify({
      message: userMessage,
      sessionId: session.id,
      conversationHistory: previousMessages.map(m => ({
        role: m.role,
        content: m.content
      }))
    })
  }
);

// 4. Leggere lo stream SSE
const reader = response.body.getReader();
const decoder = new TextDecoder();
let fullResponse = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;
      
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          // Aggiorna UI in tempo reale
        }
      } catch (e) {}
    }
  }
}

// 5. Salvare la risposta di Aria
await supabase.from('chat_messages').insert({
  session_id: session.id,
  user_id: userId,
  role: 'assistant',
  content: fullResponse
});
```

### Al termine della conversazione
```typescript
// 6. Chiudere la sessione
const endTime = new Date().toISOString();
const duration = Math.floor((new Date(endTime) - new Date(session.start_time)) / 1000);

await supabase
  .from('sessions')
  .update({
    status: 'completed',
    end_time: endTime,
    duration: duration,
    transcript: allMessages.map(m => `${m.role}: ${m.content}`).join('\n')
  })
  .eq('id', session.id);

// 7. OBBLIGATORIO: Processare la sessione per estrarre dati clinici
await supabase.functions.invoke('process-session', {
  body: { sessionId: session.id }
});
```

---

## 4. ARIA VOCE (ElevenLabs WebRTC)

### Agent ID: `agent_2901khw977kbesesvd00yh2mbeyx`

### Flusso in 2 step

```typescript
// STEP 1: Ottenere il token di conversazione
const { data: tokenData } = await supabase.functions.invoke(
  'elevenlabs-conversation-token'
);
const conversationToken = tokenData.token;

// STEP 2: Ottenere il contesto (system prompt + memoria)
const { data: contextData } = await supabase.functions.invoke(
  'elevenlabs-context'
);
// contextData contiene:
// {
//   system_prompt: "...",      // Il prompt clinico completo di Aria
//   first_message: "...",      // Messaggio di apertura personalizzato
//   memories: [...],           // Ricordi dell'utente
//   user_name: "Marco"
// }

// STEP 3: Connettersi a ElevenLabs con WebRTC
// Usare la libreria ElevenLabs React Native o il WebSocket nativo
// con il token ottenuto e gli override dal contesto:
const sessionConfig = {
  conversationToken: conversationToken,
  connectionType: 'webrtc',
  overrides: {
    agent: {
      prompt: { prompt: contextData.system_prompt },
      firstMessage: contextData.first_message,
      language: 'it'
    }
  }
};
```

### Fallback: Aria Agent Backend (senza ElevenLabs)
Se ElevenLabs non è disponibile, usare la Edge Function `aria-agent-backend`:

```typescript
const { data } = await supabase.functions.invoke('aria-agent-backend', {
  body: {
    message: userMessage,
    conversationHistory: [
      { role: 'user', text: 'Ciao' },
      { role: 'assistant', text: 'Ciao! Come stai?' }
    ]
  }
});
// data.response = "Risposta di Aria"
// data.crisis_detected = false
```

---

## 5. PROCESS-SESSION (Post-conversazione)

**OBBLIGATORIO** dopo ogni conversazione (chat o voce).

```typescript
await supabase.functions.invoke('process-session', {
  body: { sessionId: sessionId }
});
```

Questa funzione:
- Estrae emozioni → salva in `daily_emotions`
- Valuta aree vita → salva in `daily_life_areas`
- Analizza psicologia → salva in `daily_psychology`
- Estrae eventi/appuntamenti → salva in `user_events`
- Estrae ricordi → salva in `user_memories`
- Aggiorna `sessions` con: `mood_score_detected`, `anxiety_score_detected`, `energy_score_detected`, `emotion_breakdown`, `life_balance_scores`, `deep_psychology`, `ai_summary`, `emotion_tags`, `key_events`, `insights`

---

## 6. ANALISI & INSIGHTS

### ai-analysis (Tab Analisi)
```typescript
const { data } = await supabase.functions.invoke('ai-analysis');
// Risultato salvato in user_profiles.ai_analysis_cache
// Contiene: trend emotivi, pattern, correlazioni, suggerimenti clinici
```

### ai-insights (Insight rapidi)
```typescript
const { data } = await supabase.functions.invoke('ai-insights');
// Risultato salvato in user_profiles.ai_insights_cache
// Contiene: 3-5 insight personalizzati basati sui dati recenti
```

### ai-checkins (Domande personalizzate)
```typescript
const { data } = await supabase.functions.invoke('ai-checkins');
// Risultato salvato in user_profiles.ai_checkins_cache
// Contiene: domande di check-in personalizzate per l'utente
```

---

## 7. DAILY CHECK-IN

### Salvare un check-in
```typescript
await supabase.from('daily_checkins').insert({
  user_id: userId,
  mood_value: 4,        // 1-5
  mood_emoji: '😊',
  notes: JSON.stringify({
    anxiety: 3,          // 1-10
    energy: 7,           // 1-10
    sleep: 8             // 1-10
  })
});
```

---

## 8. ABITUDINI (Habits)

### Leggere configurazione abitudini
```typescript
const { data: habits } = await supabase
  .from('user_habits_config')
  .select('*')
  .eq('user_id', userId)
  .eq('is_active', true);
```

### Registrare completamento
```typescript
await supabase.from('daily_habits').upsert({
  user_id: userId,
  habit_type: 'meditation',  // tipo abitudine
  date: today,
  value: 1,
  target_value: 1,
  unit: 'sessions'
}, { onConflict: 'user_id,habit_type,date' });
```

### Leggere streak
```typescript
const { data: streaks } = await supabase
  .from('habit_streaks')
  .select('*')
  .eq('user_id', userId);
// Ogni streak ha: current_streak, longest_streak, total_completions
```

---

## 9. OBIETTIVI (Objectives)

### Leggere obiettivi attivi
```typescript
const { data: objectives } = await supabase
  .from('user_objectives')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'active');
```

### Creare obiettivo tramite AI
```typescript
const { data } = await supabase.functions.invoke('create-objective-chat', {
  body: {
    message: "Voglio meditare 10 minuti al giorno",
    conversationHistory: []
  }
});
```

### Aggiornare progresso obiettivo
```typescript
const { data } = await supabase.functions.invoke('update-objective-chat', {
  body: {
    objectiveId: objectiveId,
    message: "Ho meditato 15 minuti oggi",
    conversationHistory: []
  }
});
```

---

## 10. DIARI TEMATICI

### Leggere diari
```typescript
const { data: diaries } = await supabase
  .from('thematic_diaries')
  .select('*')
  .eq('user_id', userId)
  .order('last_updated_at', { ascending: false });
```

### Chat in un diario
```typescript
const { data } = await supabase.functions.invoke('thematic-diary-chat', {
  body: {
    diaryId: diaryId,
    theme: 'gratitudine',
    message: userMessage,
    conversationHistory: existingMessages
  }
});
```

---

## 11. SESSIONI PASSATE

### Leggere storico sessioni
```typescript
const { data: sessions } = await supabase
  .from('sessions')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'completed')
  .order('start_time', { ascending: false })
  .limit(20);
```

### Leggere messaggi di una sessione
```typescript
const { data: messages } = await supabase
  .from('chat_messages')
  .select('*')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: true });
```

---

## 12. PROFILO UTENTE

### Leggere profilo completo
```typescript
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', userId)
  .single();

// Campi importanti:
// - name: nome utente
// - birth_date: data di nascita
// - gender: genere
// - onboarding_completed: boolean
// - selected_goals: string[] (obiettivi selezionati in onboarding)
// - active_dashboard_metrics: string[] (metriche visibili)
// - premium_type: null | 'plus' | 'pro'
// - long_term_memory: string[] (ricordi legacy)
// - occupation_context: string (contesto lavorativo)
// - therapy_status: 'none' | 'active' | 'past'
```

### Ricordi strutturati (nuova tabella)
```typescript
const { data: memories } = await supabase
  .from('user_memories')
  .select('*')
  .eq('user_id', userId)
  .eq('is_active', true)
  .order('importance', { ascending: false });

// Ogni memoria ha: category, fact, importance (1-10), source_session_id
```

---

## 13. GAMIFICATION

### Punti ricompensa
```typescript
const { data: points } = await supabase
  .from('user_reward_points')
  .select('*')
  .eq('user_id', userId)
  .single();
// points.total_points, points.lifetime_points
```

### Achievement sbloccati
```typescript
const { data: achievements } = await supabase
  .from('user_achievements')
  .select('*')
  .eq('user_id', userId);
```

---

## 14. AREA CLINICA (Connessione Dottore)

### Codice connessione paziente
```typescript
const { data: profile } = await supabase
  .from('user_profiles')
  .select('connection_code')
  .eq('user_id', userId)
  .single();
// profile.connection_code = "ABC12345" (generato automaticamente)
```

---

## RIEPILOGO EDGE FUNCTIONS DISPONIBILI

| Funzione | Metodo | Descrizione |
|----------|--------|-------------|
| `ai-chat` | POST (streaming SSE) | Chat testuale con Aria |
| `ai-dashboard` | POST | Genera dashboard AI (wellness score, insight) |
| `ai-analysis` | POST | Analisi approfondita trend e pattern |
| `ai-insights` | POST | Insight rapidi personalizzati |
| `ai-checkins` | POST | Domande check-in personalizzate |
| `process-session` | POST | Processa sessione completata (OBBLIGATORIO) |
| `elevenlabs-conversation-token` | POST | Token WebRTC per voce |
| `elevenlabs-context` | POST | System prompt + memoria per voce |
| `aria-agent-backend` | POST | Fallback voce senza ElevenLabs |
| `create-objective-chat` | POST | Crea obiettivo via AI |
| `update-objective-chat` | POST | Aggiorna obiettivo via AI |
| `thematic-diary-chat` | POST | Chat nei diari tematici |
| `create-habit-chat` | POST | Crea abitudine via AI |
| `calculate-correlations` | POST | Calcola correlazioni tra metriche |
| `detect-emotion-patterns` | POST | Rileva pattern emotivi |
| `generate-clinical-report` | POST | Genera report clinico PDF |
| `real-time-context` | POST | Contesto real-time (meteo, ora, etc.) |
| `sync-habits-to-brain` | POST | Sincronizza abitudini nella memoria AI |

## NOTE IMPORTANTI

1. **NON leggere mai direttamente** `wellness_score`, `life_areas_scores` da `user_profiles` → usa sempre le cache AI o `get_daily_metrics`
2. **Ogni sessione completata** DEVE essere processata con `process-session`
3. **Il fuso orario** di riferimento è `Europe/Rome`
4. **Tutte le Edge Functions** richiedono l'header Authorization
5. **Lo streaming SSE** è supportato solo da `ai-chat`, tutte le altre ritornano JSON standard
