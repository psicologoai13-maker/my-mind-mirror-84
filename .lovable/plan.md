
# Piano: Rivoluzione Sistema Obiettivi - Dal Tema all'Obiettivo Reale

## Panoramica

Trasformare il sistema obiettivi da **temi generici** (es. "Mente", "Corpo") a **obiettivi REALI dell'utente** con target misurabili e tracking AI automatico.

## Cambiamenti Richiesti

### 1. Rimuovere dalla Home "I tuoi obiettivi"

**File:** `src/pages/Index.tsx`

Rimuovere completamente il widget `GoalsWidget` dalla Home, poiché ora gli obiettivi vivono nella sezione dedicata `/objectives`.

```
// RIMUOVERE dal switch dei widget:
case 'goals_progress':
  return (
    <div {...baseProps}>
      <GoalsWidget />
    </div>
  );
```

### 2. Ristrutturare la Pagina Obiettivi

**File:** `src/pages/Objectives.tsx`

**PRIMA (attuale):**
```
┌─────────────────────────────────────────┐
│  I Tuoi Obiettivi                   ➕  │
│  [🧠 Mente] [💪 Corpo] [📚 Studio] ...  │  ← CHIPS TEMI
│                                         │
│  Obiettivi Attivi                       │
│  ┌─────────────────────────────────┐   │
│  │ Obiettivo card...               │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**DOPO (nuovo design):**
```
┌─────────────────────────────────────────┐
│  I Tuoi Obiettivi                   ➕  │
│                                         │
│  ┌─────────────────────────────────┐   │  ← BOX OBIETTIVO REALE
│  │ 🎯 Perdere 5kg                  │   │
│  │ ████████░░░░░░░░ 60% • -3kg     │   │
│  │ "Continua così, stai andando    │   │
│  │  alla grande!" - Aria           │   │
│  │ ⏱ Scade: 15 Mar 2026           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📚 Superare esame Statistica    │   │
│  │ ████░░░░░░░░░░░░ 30%            │   │
│  │ "Hai detto che stai studiando   │   │
│  │  di più, ottimo!" - Aria        │   │
│  │ ⚠️ Obiettivo finale: non chiaro │   │  ← PROMPT AI
│  └─────────────────────────────────┘   │
│                                         │
│  ── Traguardi Raggiunti ────────────   │
│  ✅ Dormire 7h/notte (15 Gen)          │
└─────────────────────────────────────────┘
```

**Modifiche:**
- RIMUOVERE: `CategoryChips` (lista temi) 
- AGGIUNGERE: Box obiettivi reali dalla tabella `user_objectives`
- AGGIUNGERE: Indicatore "Obiettivo finale non chiaro" se `target_value` è null
- MIGLIORARE: ObjectiveCard con design premium e AI feedback

### 3. Aggiornare l'Onboarding

**File:** `src/pages/Onboarding.tsx`

Aggiungere uno step dove l'utente può inserire obiettivi CONCRETI (non solo temi):

```
Step 6: Obiettivi Specifici (nuovo)
┌─────────────────────────────────────────┐
│  Hai obiettivi specifici che vuoi      │
│  raggiungere?                          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 💪 Voglio perdere peso          │   │
│  │    Target: _______ kg           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📚 Devo superare un esame       │   │
│  │    Quale: __________________    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ + Aggiungi obiettivo custom     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Salta per ora]  [Continua →]         │
└─────────────────────────────────────────┘
```

### 4. Espandere l'AI Goal Detection

**File:** `supabase/functions/process-session/index.ts`

Attualmente l'AI rileva solo obiettivi PREDEFINITI (reduce_anxiety, improve_sleep, ecc.).

**Nuova logica:**
```
🎯 RILEVAMENTO OBIETTIVI CUSTOM (ESPANSO!)
═══════════════════════════════════════════════

OBIETTIVI NON-MENTALI DA RILEVARE:
- "Voglio dimagrire" → Crea obiettivo category: 'body', title: 'Perdere peso'
  - Se specifica "5kg" → target_value: 5, unit: 'kg'
  - Se NON specifica quanto → target_value: null (trigger prompt)
  
- "Devo superare l'esame di matematica" → category: 'study', title: 'Esame matematica'
  - target_value: null (esame è binario: passato/non passato)

- "Voglio una promozione" → category: 'work', title: 'Ottenere promozione'

- "Voglio risparmiare 5000€" → category: 'finance', target_value: 5000, unit: '€'

QUANDO TARGET NON È CHIARO:
Se AI rileva obiettivo ma NON il target finale, salvare con:
  - target_value: null
  - ai_feedback: "Qual è il tuo obiettivo finale? (es. quanti kg vuoi perdere?)"
```

### 5. Prompt AI per Obiettivi Incompleti

**File:** `supabase/functions/ai-chat/index.ts` e `supabase/functions/thematic-diary-chat/index.ts`

Aggiungere istruzioni per Aria di chiedere proattivamente:

```
═══════════════════════════════════════════════
🎯 PROACTIVE GOAL CLARIFICATION
═══════════════════════════════════════════════
Se l'utente ha obiettivi con target_value = null, DEVI chiedere:

Esempio 1: Obiettivo "Perdere peso" senza target
Aria: "Mi hai detto che vuoi perdere peso. Di quanti kg vorresti dimagrire? Così posso aiutarti a tracciare i progressi!"

Esempio 2: Obiettivo "Risparmiare" senza target  
Aria: "Qual è la cifra che vorresti mettere da parte? Avere un numero preciso aiuta tantissimo!"

NON essere invadente: chiedi UNA volta per sessione, massimo.
```

### 6. Aggiornare ObjectiveCard

**File:** `src/components/objectives/ObjectiveCard.tsx`

Aggiungere:
- Indicatore visivo se `target_value` è null ("⚠️ Definisci obiettivo")
- Pulsante per aggiornare progresso manualmente
- Mostrare `ai_feedback` in modo prominente
- Deadline countdown se presente

### 7. Creare Endpoint per Creazione Obiettivi da AI

Quando `process-session` rileva un nuovo obiettivo custom, deve:
1. Creare record in `user_objectives`
2. Impostare `ai_feedback` appropriato
3. Se target non chiaro, lasciare `target_value: null`

## Schema Database (già esistente, ma chiarimento)

La tabella `user_objectives` supporta già tutto:
```sql
user_objectives:
  - id, user_id
  - category: 'mind' | 'body' | 'study' | 'work' | 'relationships' | 'growth' | 'finance'
  - title: "Perdere 5kg"
  - description: "Voglio tornare in forma"
  - target_value: 70  -- Peso target
  - current_value: 75 -- Peso attuale
  - unit: "kg"
  - deadline: 2026-03-15
  - status: 'active' | 'achieved' | 'paused'
  - ai_feedback: "Stai andando alla grande!"
  - progress_history: [{date, value, note}]
```

## Flusso Completo Obiettivi

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ONBOARDING    │───▶│    SESSIONE     │───▶│   DASHBOARD     │
│  User aggiunge  │    │   AI rileva     │    │  Obiettivi      │
│  obiettivi      │    │   "voglio       │    │  mostrati in    │
│  durante quiz   │    │   dimagrire"    │    │  /objectives    │
└─────────────────┘    └────────┬────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  process-session│
                       │  Crea/Aggiorna  │
                       │  user_objectives│
                       └────────┬────────┘
                                │
         ┌──────────────────────┴──────────────────────┐
         ▼                                              ▼
┌─────────────────┐                           ┌─────────────────┐
│  TARGET CHIARO  │                           │ TARGET NON CHIARO│
│  Obiettivo      │                           │ target_value=null│
│  completo       │                           │ Aria chiede:     │
│                 │                           │ "Di quanto?"     │
└─────────────────┘                           └─────────────────┘
```

## File da Modificare

| File | Modifiche |
|------|-----------|
| `src/pages/Index.tsx` | Rimuovere GoalsWidget dalla renderWidget function |
| `src/pages/Objectives.tsx` | Rimuovere CategoryChips, mostrare solo obiettivi reali |
| `src/components/objectives/ObjectiveCard.tsx` | Design premium, indicator se target mancante |
| `src/components/objectives/CategoryChips.tsx` | ELIMINARE (non più usato) |
| `src/pages/Onboarding.tsx` | Aggiungere step per obiettivi specifici |
| `supabase/functions/process-session/index.ts` | Logica per creare obiettivi custom in DB |
| `supabase/functions/ai-chat/index.ts` | Prompt per chiedere target mancanti |

## Benefici

1. **Obiettivi REALI**: L'utente vede "Perdere 5kg" non "Categoria: Corpo"
2. **AI proattiva**: Rileva obiettivi dalle conversazioni automaticamente
3. **Target misurabili**: Se manca il target, Aria lo chiede
4. **Tracking intelligente**: Progress bars basate su valori reali
5. **Engagement**: Obiettivi concreti motivano di più

