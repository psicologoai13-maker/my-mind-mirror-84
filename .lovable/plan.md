
# Piano Integrazione Completa: Database Avanzato Aria

## Analisi Situazione Attuale

Ho analizzato l'intero ecosistema e ho identificato lo stato di ogni tabella creata:

| Tabella | Stato DB | Integrazione |
|---------|----------|--------------|
| `user_memories` | ✅ Creata | ✅ Integrata in ai-chat, aria-voice-chat, process-session |
| `session_context_snapshots` | ✅ Creata | ❌ **NON POPOLATA** - Nessuna funzione la usa |
| `emotion_patterns` | ✅ Creata | ❌ **NON POPOLATA** - Nessun rilevamento pattern |
| `user_correlations` | ✅ Creata | ❌ **NON POPOLATA** - Nessun calcolo correlazioni |
| `habit_streaks` | ✅ Creata + Trigger | ⚠️ Trigger presente ma **NON LETTA** da Aria |
| `smart_notifications` | ✅ Creata | ❌ **NON POPOLATA** - Nessun engine notifiche |
| `conversation_topics` | ✅ Creata | ❌ **NON POPOLATA** - Nessun tracking argomenti |
| `aria_response_feedback` | ✅ Creata | ❌ **NON POPOLATA** - Nessun feedback loop |

## Piano di Implementazione Completo

### FASE 1: Integrazioni CRITICHE (Alta Priorità)

**1.1 Popolare `session_context_snapshots` in `process-session`**
- A fine elaborazione sessione, salvare automaticamente:
  - `key_topics`: Argomenti principali discussi (da `emotion_tags`)
  - `unresolved_issues`: Problemi lasciati aperti (da analisi AI)
  - `action_items`: Cose da fare menzionate
  - `emotional_state`: Stato emotivo snapshot (vitals + emozioni dominanti)
  - `follow_up_needed`: Flag se richiede follow-up
  - `context_summary`: Riassunto breve per continuità
  - `dominant_emotion`: Emozione più intensa
  - `session_quality_score`: Valutazione 1-10

**1.2 Iniettare `session_context_snapshots` in `ai-chat` e `aria-voice-chat`**
- Recuperare gli snapshot delle ultime 3-5 sessioni
- Iniettare nel prompt: "L'ultima volta stavamo parlando di X, come è andata?"
- Usare `unresolved_issues` per follow-up proattivo

**1.3 Tracking `conversation_topics` in `process-session`**
- Estrarre argomenti dalla conversazione
- Tracciare sentiment medio per ogni argomento
- Marcare argomenti sensibili (`is_sensitive: true`)
- Iniettare in ai-chat per evitare argomenti delicati

### FASE 2: Analytics Avanzati (Media Priorità)

**2.1 Creare Edge Function `calculate-correlations`**
- Calcola correlazioni tra metriche (sonno vs umore, esercizio vs ansia)
- Usa formula Pearson per calcolo statistico
- Genera insight testuale automatico
- Esegue settimanalmente o su richiesta

**2.2 Creare Edge Function `detect-emotion-patterns`**
- Analizza emozioni per rilevare pattern temporali:
  - `morning_dip`: Umore basso al mattino
  - `weekend_boost`: Umore migliore nel weekend
  - `monday_blues`: Lunedì problematici
  - `seasonal_affect`: Variazioni stagionali
- Salva pattern in `emotion_patterns` con confidence score

**2.3 Integrare `habit_streaks` cache in UI**
- Usare la tabella cache invece di calcolare dinamicamente
- Mostrare "record personale" e "streak a rischio"
- Far celebrare Aria gli streak importanti

### FASE 3: Personalizzazione Avanzata (Bassa Priorità)

**3.1 Engine `smart_notifications`**
- Generare notifiche contestuali:
  - `event_reminder`: "Tra 30 min hai il medico"
  - `streak_at_risk`: "Manca solo X per oggi!"
  - `mood_follow_up`: "Com'è andato l'evento di ieri?"
  - `habit_check`: "Hai fatto la meditazione?"
- Cron job per schedulazione

**3.2 Feedback Loop `aria_response_feedback`**
- Tracciare implicitamente reazioni utente:
  - Cambio topic rapido → risposta non gradita
  - Continuazione conversazione → risposta efficace
  - Correzione esplicita → risposta errata
- Usare per personalizzare stile risposte

---

## Dettaglio Tecnico per Fase 1

### 1.1 Modifiche a `process-session/index.ts`

Dopo il salvataggio in `daily_psychology`, aggiungere:

```text
// ═══════════════════════════════════════════════
// 📸 SESSION CONTEXT SNAPSHOT
// ═══════════════════════════════════════════════

// Determina emozione dominante
const emotionScores = Object.entries(analysis.emotions)
  .filter(([k, v]) => v !== null && v > 0)
  .sort((a, b) => (b[1] as number) - (a[1] as number));
const dominantEmotion = emotionScores[0]?.[0] || null;

// Calcola session quality score
const qualityFactors = [
  analysis.vitals.mood ? analysis.vitals.mood : 5,
  analysis.deep_psychology.mental_clarity || 5,
  10 - (analysis.vitals.anxiety || 5),
];
const sessionQualityScore = Math.round(
  qualityFactors.reduce((a, b) => a + b, 0) / qualityFactors.length
);

// Determina se serve follow-up
const needsFollowUp = 
  analysis.crisis_risk !== 'low' ||
  analysis.key_events?.length > 0 ||
  (analysis.deep_psychology.hopelessness || 0) >= 6;

const snapshot = {
  session_id: session_id,
  user_id: user_id,
  key_topics: analysis.emotion_tags?.slice(0, 5) || [],
  emotional_state: {
    mood: analysis.vitals.mood,
    anxiety: analysis.vitals.anxiety,
    dominant_emotion: dominantEmotion,
    crisis_risk: analysis.crisis_risk
  },
  unresolved_issues: analysis.key_events?.filter(e => 
    /problem|difficolt|crisi|stress/i.test(e)
  ) || [],
  action_items: analysis.key_events?.filter(e => 
    /devo|dovrei|voglio|obiettivo/i.test(e)
  ) || [],
  follow_up_needed: needsFollowUp,
  context_summary: analysis.summary,
  dominant_emotion: dominantEmotion,
  session_quality_score: sessionQualityScore
};

await supabase.from('session_context_snapshots').insert(snapshot);
```

### 1.2 Modifiche a `ai-chat/index.ts`

Nella funzione `getUserProfile`:

```text
// Fetch session context snapshots
supabase
  .from('session_context_snapshots')
  .select('key_topics, unresolved_issues, action_items, context_summary, dominant_emotion, follow_up_needed')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(3)
```

Nel prompt system, iniettare:

```text
═══════════════════════════════════════════════
📝 CONTESTO SESSIONI PRECEDENTI
═══════════════════════════════════════════════

${snapshots.map((s, i) => `
SESSIONE ${i+1}:
- Argomenti: ${s.key_topics.join(', ')}
- Emozione dominante: ${s.dominant_emotion}
- Problemi aperti: ${s.unresolved_issues.join('; ') || 'Nessuno'}
- Da fare: ${s.action_items.join('; ') || 'Niente'}
${s.follow_up_needed ? '⚠️ RICHIEDE FOLLOW-UP' : ''}
`).join('\n')}

USA QUESTI DATI PER:
- Continuare discorsi lasciati aperti
- Chiedere "Com'è andata quella cosa di cui parlavamo?"
- Ricordare problemi irrisolti e offrire supporto
```

### 1.3 Tracking `conversation_topics` in `process-session`

```text
// ═══════════════════════════════════════════════
// 🏷️ CONVERSATION TOPICS TRACKING
// ═══════════════════════════════════════════════

const topics = analysis.emotion_tags || [];
const sensitivePatterns = /trauma|abuso|lutto|morte|suicid|autolesion/i;

for (const topic of topics) {
  const isSensitive = sensitivePatterns.test(topic);
  
  // Upsert topic
  const { data: existing } = await supabase
    .from('conversation_topics')
    .select('id, mention_count, sentiment_avg, session_ids')
    .eq('user_id', user_id)
    .eq('topic', topic.toLowerCase())
    .maybeSingle();

  if (existing) {
    // Update existing
    await supabase.from('conversation_topics').update({
      mention_count: existing.mention_count + 1,
      last_mentioned_at: new Date().toISOString(),
      session_ids: [...existing.session_ids, session_id],
      is_sensitive: isSensitive || existing.is_sensitive
    }).eq('id', existing.id);
  } else {
    // Insert new
    await supabase.from('conversation_topics').insert({
      user_id: user_id,
      topic: topic.toLowerCase(),
      session_ids: [session_id],
      is_sensitive: isSensitive,
      mention_count: 1
    });
  }
}
```

---

## Nuove Edge Functions da Creare

### `calculate-correlations/index.ts`

Calcola correlazioni statistiche tra metriche salvandole in `user_correlations`.

**Correlazioni da calcolare:**
- `sleep` vs `mood` (sonno → umore)
- `exercise` vs `anxiety` (esercizio → ansia)
- `social` vs `loneliness` (socialità → solitudine)
- `meditation` (habit) vs `anxiety`
- `water` (habit) vs `energy`

### `detect-emotion-patterns/index.ts`

Rileva pattern emozionali temporali e li salva in `emotion_patterns`.

**Pattern da rilevare:**
- `morning_dip`: Analisi metriche mattutine vs serali
- `weekend_boost`: Confronto weekend vs giorni feriali
- `monday_blues`: Specifico per lunedì
- `work_stress_cycle`: Pattern settimanale legato a lavoro

---

## Riepilogo File da Modificare/Creare

| File | Azione |
|------|--------|
| `supabase/functions/process-session/index.ts` | Modificare: aggiungere salvataggio snapshot, topics |
| `supabase/functions/ai-chat/index.ts` | Modificare: fetch e inject snapshots, topics nel prompt |
| `supabase/functions/aria-voice-chat/index.ts` | Modificare: stesso di ai-chat |
| `supabase/functions/calculate-correlations/index.ts` | Creare: Edge Function correlazioni |
| `supabase/functions/detect-emotion-patterns/index.ts` | Creare: Edge Function pattern |
| `supabase/config.toml` | Aggiornare: nuove funzioni |
| `.lovable/plan.md` | Aggiornare: tracking progresso |

---

## Ordine di Esecuzione

1. **process-session** - Popolare `session_context_snapshots` e `conversation_topics`
2. **ai-chat** - Iniettare snapshots e topics nel contesto
3. **aria-voice-chat** - Stessa logica di ai-chat
4. **calculate-correlations** - Nuova Edge Function
5. **detect-emotion-patterns** - Nuova Edge Function
6. **Aggiornare plan.md**

Questa implementazione darà ad Aria una memoria strutturata completa, continuità narrativa tra sessioni, e intelligenza avanzata per personalizzare l'esperienza utente al massimo.
