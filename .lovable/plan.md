

# Onboarding 2026 - Redesign Completo "Incontra Aria"

## Problemi Attuali Identificati

| Problema | Impatto |
|----------|---------|
| **11 schermate** | Troppo lungo, abbandono alto |
| **Chip grids ripetitivi** | Vices, Lifestyle, Habits - tutti simili, confonde |
| **Progress bar lineare** | Non comunica "dove sono?" |
| **Tono freddo/questionario** | Non sembra una conversazione |
| **AnalyzingScreen finto** | 3.5 sec di attesa inutile |
| **Troppe domande opzionali** | Confonde su cosa è importante |

---

## Nuovo Flusso: 4 Schermate (30 secondi)

```text
   [1]           [2]           [3]           [4]
   
  SPLASH    →   NOME      →   FOCUS     →   PRONTO!
  (Aria)       (Chi sei?)    (3 goals)    (Celebra)
  
  3 sec         8 sec         15 sec        4 sec
```

### Schermata 1: Splash - "Incontra Aria"
- Avatar Aria grande con gradiente Aurora animato
- Testo: "Ciao! Sono Aria" 
- Sottotitolo: "2 domande veloci per personalizzare la tua esperienza"
- **NO** elenco feature (rimuove friction)
- CTA: Pulsante con glow pulsante

### Schermata 2: Nome
- Grande emoji/avatar che "parla"
- "Come posso chiamarti?"
- Input centrale con bordo glow on focus
- Feedback: "Piacere, {nome}!" appare sotto
- **Auto-avanza dopo 1.2 secondi** dal nome valido

### Schermata 3: Focus (Goals Unificati)
- "Su cosa vuoi concentrarti, {nome}?"
- **6 card grandi** (non chip piccoli) con:
  - Emoji prominente (48px)
  - Label chiara
  - Effetto glass quando selezionato
- **Max 3 selezioni** con counter visibile
- Opzioni:
  1. Gestire ansia/stress
  2. Dormire meglio
  3. Più energia
  4. Relazioni
  5. Crescita personale
  6. Autostima

### Schermata 4: Pronto! (Celebration)
- Confetti/particelle animate
- Avatar Aria con espressione felice
- "Perfetto, {nome}! Ora ti conosco meglio"
- Mini-card: mostra i 3 goals scelti
- CTA: "Esplora con Aria" → Home

---

## Cosa Rimuoviamo (Raccolti Dopo)

| Dato | Quando lo raccogliamo |
|------|----------------------|
| Vices | Aria chiede nel primo check-in se rilevante |
| Lifestyle | Inferito dalle conversazioni |
| Physical data | Sezione Corpo nel profilo |
| Habits | Suggeriti dopo primo check-in |
| Situation | Aria lo capisce dal mood nei check-in |
| Mood iniziale | Primo check-in sulla home |

---

## Design System

### Progress: Dot Indicators
```text
Attuale:  [████████░░░░] 4/8

Nuovo:    ● ● ○ ○   (4 dots, glow pulse sul corrente)
```

### Card Goals (Glass Premium)
```css
.goal-card {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 20px;
}

.goal-card.selected {
  background: rgba(var(--primary), 0.12);
  border-color: hsl(var(--primary) / 0.4);
  box-shadow: 0 0 30px rgba(var(--primary), 0.15);
}
```

### Animazioni Spring
```typescript
// Framer Motion config
const spring = {
  type: "spring",
  stiffness: 400,
  damping: 25
};
```

### Aurora Background
Gradiente animato dietro avatar Aria:
- Colori: Primary (viola) + Indigo + Cyan
- Animazione: shift 8s infinite

---

## Implementazione Tecnica

### File da Creare/Modificare

| File | Azione |
|------|--------|
| `Onboarding.tsx` | **REWRITE** - 4 step flow |
| `WelcomeStep.tsx` | **UPDATE** - Aurora bg, no feature list |
| `NameInputStep.tsx` | **UPDATE** - Auto-advance, avatar |
| `GoalsStep.tsx` | **NEW** - 6 card grandi glassmorphism |
| `ReadyScreen.tsx` | **NEW** - Celebration con confetti |
| `OnboardingLayout.tsx` | **UPDATE** - Dot indicators |

### File da NON Usare Piu

- `QuizStep.tsx`
- `ChipGridStep.tsx`
- `EmojiSlider.tsx`
- `VicesStep.tsx`
- `LifestyleStep.tsx`
- `PhysicalDataStep.tsx`
- `HabitsSelectionStep.tsx`
- `AnalyzingScreen.tsx`
- `ResultScreen.tsx`

### Struttura Dati Semplificata

```typescript
interface OnboardingData {
  name: string;
  primaryGoals: string[];  // max 3
}

// Salvataggio in user_profiles
{
  name: data.name,
  onboarding_completed: true,
  onboarding_answers: { name: data.name, primaryGoals: data.primaryGoals },
  selected_goals: data.primaryGoals,
  active_dashboard_metrics: buildMetricsFromGoals(data.primaryGoals)
}
```

---

## UX Micro-Interazioni

1. **Welcome** → Aria avatar pulsa leggermente, particelle fluttuano
2. **Name input** → Glow border animato, feedback immediato
3. **Goal tap** → Scale bounce + haptic + ring glow
4. **Transition** → Slide orizzontale + fade (spring physics)
5. **Ready** → Confetti burst + avatar celebration

---

## Metriche Attese

| Metrica | Prima | Dopo |
|---------|-------|------|
| Tempo completamento | ~4 min | ~30 sec |
| Completion rate | ~60% | ~95% |
| Tap richiesti | ~15+ | ~6 |
| Schermate | 11 | 4 |
| Cognitive load | Alto | Minimo |

---

## Flusso Visivo

```text
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   [1] SPLASH              [2] NOME              [3] FOCUS       │
│   ┌──────────────┐       ┌──────────────┐      ┌──────────────┐│
│   │              │       │              │      │  ┌────┐┌────┐││
│   │    ( ◠‿◠ )   │       │   Ciao!      │      │  │ :) ││ :D │││
│   │     Aria     │  →    │   Come ti    │  →   │  │Ansia││Sleep│││
│   │              │       │   chiami?    │      │  └────┘└────┘││
│   │  "Ciao!"     │       │              │      │  ┌────┐┌────┐││
│   │              │       │  [________]  │      │  │ ⚡ ││ 💕 │││
│   │  [Iniziamo]  │       │              │      │  │Energy│Relaz│││
│   └──────────────┘       └──────────────┘      │  └────┘└────┘││
│                                                │ [Continua 2/3]│
│                                                └──────────────┘│
│                                                                 │
│   [4] PRONTO!                                                   │
│   ┌──────────────┐                                              │
│   │   🎉 🎊 ✨   │                                              │
│   │              │                                              │
│   │  Perfetto,   │                                              │
│   │   Marco!     │                                              │
│   │              │                                              │
│   │  [Esplora]   │                                              │
│   └──────────────┘                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

