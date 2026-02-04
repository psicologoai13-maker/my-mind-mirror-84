# Piano: Sistema Focus AI Basato su Importanza (Non Valori)

## ✅ IMPLEMENTATO

### Modifiche Effettuate

#### 1. Edge Function `ai-dashboard/index.ts`

**A) Memoria dei Focus Precedenti:**
- Aggiunto fetch di `ai_dashboard_cache` nel profilo utente
- Estratti `previousFocusKeys` dalla cache esistente
- Passati al prompt AI come "FOCUS ATTUALI DA MANTENERE"

**B) Criteri di Importanza nel Prompt AI:**
- PRIORITÀ 1: Obiettivi onboarding attivi
- PRIORITÀ 2: Valori critici (≤3 o ≥8)
- PRIORITÀ 3: Temi menzionati nelle sessioni recenti
- PRIORITÀ 4: Trend negativi significativi (>20%)
- PRIORITÀ 5: Metriche correlate agli obiettivi

**C) Regole di Stabilità:**
- L'AI mantiene i focus SOLO se cambia un motivo critico:
  - Nuovo evento traumatico/significativo
  - Obiettivo raggiunto/abbandonato
  - Metrica passata da critica a normale (o viceversa)
  - Utente richiede esplicitamente nuovo monitoraggio

**D) Logging per Debug:**
- Aggiunto logging quando l'AI cambia >2 focus vs precedenti

#### 2. Componente Frontend

- `AdaptiveVitalsSection` già usa correttamente `useAIDashboard()`
- Visualizza i 4 focus decisi dall'AI in ordine di priorità
- `FocusTopics.tsx` (componente duplicato non usato) può essere rimosso

### Architettura Finale

```text
[Onboarding Goals] ─┐
[Previous Focus]   ─┼─> [ai-dashboard Edge Function] ─> [primary_metrics]
[Session Data]     ─┘             │
                                  ▼
                      [Gemini AI con regole stabilità]
                                  │
                                  ▼
                      [Cache in user_profiles.ai_dashboard_cache]
                                  │
                                  ▼
                      [AdaptiveVitalsSection mostra 4 focus]
```

### Risultati Attesi

- ✅ I 4 focus vengono mostrati correttamente
- ✅ I focus sono basati su IMPORTANZA per l'utente, non sui valori numerici
- ✅ I focus rimangono stabili nel tempo (cambiano solo con eventi significativi)
- ✅ Le cose recenti (sessioni, diari) hanno più peso rispetto a cose vecchie
- ✅ Il sistema rispetta gli obiettivi onboarding come priorità massima
