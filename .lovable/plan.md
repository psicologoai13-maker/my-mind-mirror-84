# Piano Integrazione Completa: Database Avanzato Aria

## Stato Attuale (Aggiornato: 2026-02-09)

| Tabella | Stato DB | Integrazione |
|---------|----------|--------------|
| `user_memories` | ✅ Creata | ✅ **INTEGRATA** in ai-chat, aria-voice-chat, process-session |
| `session_context_snapshots` | ✅ Creata | ✅ **INTEGRATA** - Popolata in process-session, iniettata in ai-chat/voice |
| `emotion_patterns` | ✅ Creata | ✅ **INTEGRATA** - Edge Function detect-emotion-patterns creata |
| `user_correlations` | ✅ Creata | ✅ **INTEGRATA** - Edge Function calculate-correlations creata |
| `habit_streaks` | ✅ Creata + Trigger | ✅ **INTEGRATA** - Letta da UI e iniettata in chat context |
| `smart_notifications` | ✅ Creata | ⏳ **FASE 3** - Engine da implementare (cron job) |
| `conversation_topics` | ✅ Creata | ✅ **INTEGRATA** - Popolata in process-session, usata per sensitivity |
| `aria_response_feedback` | ✅ Creata | ⏳ **FASE 3** - Feedback loop da implementare |

## Implementazioni Completate

### FASE 1: Integrazioni CRITICHE ✅

**1.1 session_context_snapshots in process-session** ✅
- Salva automaticamente: key_topics, unresolved_issues, action_items
- Calcola emotional_state con mood, anxiety, dominant_emotion
- Determina follow_up_needed basato su crisis_risk e hopelessness
- Calcola session_quality_score (1-10)

**1.2 Iniezione in ai-chat e aria-voice-chat** ✅
- Recupera ultimi 3-5 snapshot
- Inietta nel prompt per continuità narrativa
- Usa unresolved_issues per follow-up proattivo

**1.3 conversation_topics tracking** ✅
- Estrae argomenti da emotion_tags
- Marca argomenti sensibili (trauma, abuso, lutto, etc.)
- Traccia mention_count e avoid_unless_introduced
- Iniettato nel prompt per rispetto sensibilità

### FASE 2: Analytics Avanzati ✅

**2.1 Edge Function calculate-correlations** ✅
- Calcola correlazioni Pearson tra metriche
- Coppie: sleep↔mood, exercise↔anxiety, meditation↔mental_clarity, etc.
- Genera insight testuali automatici
- Salva in user_correlations con is_significant flag

**2.2 Edge Function detect-emotion-patterns** ✅
- Rileva pattern temporali:
  - `morning_dip`: Umore basso al mattino
  - `weekend_boost`: Miglioramento nel weekend
  - `monday_blues`: Lunedì problematici
  - `anxiety_spikes`: Picchi di ansia ricorrenti
- Salva in emotion_patterns con confidence e recommendations

**2.3 habit_streaks cache integrata** ✅
- UI (StreakCounter, ProfileStatsRow) legge dalla cache
- Contesto chat riceve streak significativi (≥3 giorni)
- Aria celebra streak importanti

### FASE 3: Personalizzazione Avanzata (TODO)

**3.1 Engine smart_notifications** ⏳
- Cron job per schedulazione notifiche contestuali
- Tipi: event_reminder, streak_at_risk, mood_follow_up

**3.2 Feedback Loop aria_response_feedback** ⏳
- Tracking implicito reazioni utente
- Cambio topic rapido → risposta non gradita
- Continuazione → risposta efficace

---

## File Modificati/Creati

| File | Stato |
|------|-------|
| `supabase/functions/process-session/index.ts` | ✅ Modificato: salvataggio snapshot + topics |
| `supabase/functions/ai-chat/index.ts` | ✅ Modificato: fetch + inject snapshots, topics, streaks |
| `supabase/functions/aria-voice-chat/index.ts` | ✅ Modificato: stessa logica di ai-chat |
| `supabase/functions/calculate-correlations/index.ts` | ✅ **CREATO** |
| `supabase/functions/detect-emotion-patterns/index.ts` | ✅ **CREATO** |
| `supabase/config.toml` | ✅ Aggiornato con nuove funzioni |
| `src/components/home/StreakCounter.tsx` | ✅ Modificato: usa cache habit_streaks |
| `src/components/profile/ProfileStatsRow.tsx` | ✅ Modificato: usa cache habit_streaks |

---

## Architettura Memoria Aria (Completa)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARIA INTELLIGENCE SYSTEM                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐    │
│  │ user_       │   │ session_    │   │ conversation_       │    │
│  │ memories    │   │ context_    │   │ topics              │    │
│  │             │   │ snapshots   │   │                     │    │
│  │ • Facts     │   │ • Topics    │   │ • Sensitivity       │    │
│  │ • Category  │   │ • Issues    │   │ • Frequency         │    │
│  │ • Importance│   │ • Actions   │   │ • Avoid flags       │    │
│  └──────┬──────┘   └──────┬──────┘   └──────────┬──────────┘    │
│         │                 │                      │               │
│         └────────────────┬┴─────────────────────┘               │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    PROMPT INJECTION                        │  │
│  │   ai-chat / aria-voice-chat                                │  │
│  │   • Formatted memories by category                         │  │
│  │   • Session continuity context                             │  │
│  │   • Sensitive topics awareness                             │  │
│  │   • Habit streaks celebration                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐    │
│  │ user_       │   │ emotion_    │   │ habit_              │    │
│  │ correlations│   │ patterns    │   │ streaks             │    │
│  │             │   │             │   │                     │    │
│  │ • Pearson r │   │ • morning_  │   │ • Current           │    │
│  │ • Insights  │   │   dip       │   │ • Longest           │    │
│  │ • Signific. │   │ • weekend_  │   │ • Broken count      │    │
│  │             │   │   boost     │   │                     │    │
│  └──────┬──────┘   └──────┬──────┘   └──────────┬──────────┘    │
│         │                 │                      │               │
│         └────────────────┬┴─────────────────────┘               │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 ANALYTICS EDGE FUNCTIONS                   │  │
│  │   calculate-correlations / detect-emotion-patterns         │  │
│  │   • Weekly/on-demand execution                             │  │
│  │   • Actionable insights                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Come Usare le Nuove Funzioni

### Calcolare Correlazioni (manuale o schedulato)
```javascript
// Call from frontend or cron
await supabase.functions.invoke('calculate-correlations', {
  body: { user_id: 'uuid-here' }
});
```

### Rilevare Pattern Emotivi
```javascript
await supabase.functions.invoke('detect-emotion-patterns', {
  body: { user_id: 'uuid-here' }
});
```

---

## Prossimi Step (Fase 3)

1. **smart_notifications engine**: Cron job per push notifiche contestuali
2. **aria_response_feedback**: Tracking implicito qualità risposte
3. **UI per visualizzare correlazioni e pattern**: Dashboard analitica
4. **Trigger automatico analytics**: Post-session o settimanale
