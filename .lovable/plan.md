
# Onboarding 2026 - Redesign Completo "User-Friendly & Stimolante"

## Problemi Identificati

| Problema | Soluzione |
|----------|-----------|
| 11 schermate troppe | Riduzione a **5 schermate** |
| Grafica vecchia (non glassmorphism) | Applicare **Liquid Glass 2026** |
| "Quali abitudini vuoi tracciare" confusionario | **Rimuovere** - habits suggeriti post-onboarding |
| Physical/Vices/Lifestyle troppo invasivi | **Rimuovere** - raccolti dopo da Aria |
| Progress bar lineare vecchio stile | **Dot indicators** animati |
| Chip piccoli poco coinvolgenti | **Card grandi glassmorphism** |
| Manca gamification | **Animazioni, feedback, celebrazione** |

---

## Nuovo Flusso: 5 Schermate (~40 secondi)

```text
   [1]           [2]           [3]           [4]           [5]
   
  SPLASH    →   NOME      →   FOCUS     →   ABOUT YOU →   PRONTO!
  (Aria)       (Chi sei?)    (3 goals)    (Mood+Info)   (Celebra)
  
  3 sec         8 sec         12 sec        10 sec        5 sec
```

---

## Dettaglio Schermate

### 1. WelcomeStep - REDESIGN
**Stile:** Aurora gradient + Avatar Aria pulsante

- Background: `bg-gradient-aria-subtle` con particelle fluttuanti
- Avatar Aria: Ring animato con glow viola/indigo
- Testo: "Ciao! Sono Aria" - grande, bold
- Sottotitolo: "3 domande veloci per conoscerti meglio"
- CTA: Button con `shadow-aria-glow`, effetto pulse
- **NO** lista feature (troppo testo)

### 2. NameInputStep - REDESIGN  
**Stile:** Minimal + feedback immediato

- Avatar/emoji che "parla" in alto
- "Come posso chiamarti?"
- Input: `bg-glass backdrop-blur-xl`, glow border on focus
- Feedback: "Piacere, {nome}!" animato sotto input
- Button: appare solo quando nome valido (2+ caratteri)
- Transizione fluida al prossimo step

### 3. GoalsStep - NUOVO COMPONENTE
**Stile:** Card grandi glassmorphism

- "Su cosa vuoi concentrarti, {nome}?"
- **6 card grandi** (non chip piccoli):
  - `bg-glass backdrop-blur-xl`
  - Emoji 48px prominente
  - Label chiara sotto
  - Bordo `border-primary` + `shadow-glass-glow` quando selezionato
- **Max 3 selezioni** con counter animato
- Opzioni:
  1. Gestire ansia/stress
  2. Dormire meglio
  3. Più energia
  4. Relazioni
  5. Crescita personale
  6. Autostima

### 4. AboutYouStep - NUOVO COMPONENTE UNIFICATO
**Stile:** Sezioni collassate glassmorphism

Combina mood + info base in modo elegante:

```text
┌────────────────────────────────────────┐
│  "Come ti senti in questo periodo?"    │
│                                        │
│        [😔] [😕] [😐] [🙂] [😊]         │
│              ↑ Grande al centro        │
│            "Così così"                 │
│                                        │
│  ─────────── Un po' su di te ──────── │
│                                        │
│  Fascia d'età  (chips singola riga)    │
│  [18-24] [25-34] [35-44] [45-54] [55+] │
│                                        │
│  In terapia?   (opzionale)             │
│  [No] [In passato] [Attualmente]       │
│                                        │
│  [Continua]                            │
└────────────────────────────────────────┘
```

- Emoji mood: card grandi touch-friendly
- Età/terapia: chips piccoli opzionali
- Tutto skippabile tranne mood

### 5. ReadyScreen - NUOVO COMPONENTE
**Stile:** Celebration con confetti

- Background: Aurora gradient animato
- Confetti/sparkles particles
- Avatar Aria con espressione felice
- "Perfetto, {nome}! Siamo pronti"
- Mini-card: mostra i goals scelti con icone
- CTA: "Inizia il tuo percorso" → Home
- Haptic feedback forte sul tap

---

## Cosa Rimuoviamo

| Step Rimosso | Perché | Quando lo raccogliamo |
|--------------|--------|----------------------|
| `VicesStep` | Troppo invasivo all'inizio | Aria chiede in chat |
| `LifestyleStep` | Non essenziale | Inferito dalle conversazioni |
| `PhysicalDataStep` | Troppi campi | Sezione Corpo nel profilo |
| `HabitsSelectionStep` | Confusionario | Suggeriti dopo primo check-in |
| `AnalyzingScreen` | Fake delay inutile | Rimosso |
| `ResultScreen` | Troppo lungo | Sostituito da ReadyScreen |

---

## Design System Applicato

### Glassmorphism Cards
```css
.onboarding-card {
  background: hsl(var(--glass-bg));
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid hsl(var(--glass-border));
  border-radius: 24px;
  box-shadow: var(--shadow-glass);
}

.onboarding-card.selected {
  border-color: hsl(var(--primary) / 0.5);
  box-shadow: var(--shadow-glass-glow);
}
```

### Progress Dots (sostituisce barra)
```text
Prima:  [████████░░░░] 4/8

Dopo:   ● ● ● ○ ○   (glow pulse sul corrente)
```

### Spring Animations (Framer Motion)
```typescript
const spring = {
  type: "spring",
  stiffness: 400,
  damping: 25
};
```

### Aurora Gradient per Aria
```css
.aurora-bg {
  background: linear-gradient(
    135deg,
    hsl(270 60% 65% / 0.15),
    hsl(240 80% 65% / 0.1),
    hsl(280 70% 70% / 0.12)
  );
  animation: aurora-shift 8s ease infinite;
}
```

---

## Implementazione Tecnica

### File da Modificare
| File | Azione |
|------|--------|
| `Onboarding.tsx` | **REWRITE** - Nuovo flusso 5 step |
| `OnboardingLayout.tsx` | **UPDATE** - Dot progress indicators |
| `WelcomeStep.tsx` | **REDESIGN** - Aurora, avatar, no features list |
| `NameInputStep.tsx` | **REDESIGN** - Glass input, feedback |

### File da Creare
| File | Descrizione |
|------|-------------|
| `GoalsStep.tsx` | 6 card glassmorphism, max 3 selezioni |
| `AboutYouStep.tsx` | Mood emoji + età/terapia opzionali |
| `ReadyScreen.tsx` | Celebration con confetti |

### File da Rimuovere (non più usati)
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
  currentMood: number;     // 0-4
  ageRange?: string;       // opzionale
  therapyStatus?: string;  // opzionale
}
```

---

## UX Micro-Interazioni

1. **Welcome** → Avatar pulsa con glow Aurora
2. **Name input** → Glow border + feedback "Piacere!"
3. **Goal tap** → Scale bounce + haptic + ring glow
4. **Mood tap** → Emoji zoom + particle burst
5. **Progress dots** → Pulse glow sul corrente
6. **Transitions** → Slide + fade spring (400 stiffness)
7. **Ready** → Confetti burst + haptic forte

---

## Metriche Attese

| Metrica | Prima | Dopo |
|---------|-------|------|
| Schermate | 11 | **5** |
| Tempo completamento | ~4 min | **~40 sec** |
| Tap richiesti | ~15+ | **~8** |
| Completion rate | ~60% | **~95%** |
| Cognitive load | Alto | **Minimo** |

---

## Dati Essenziali Raccolti

| Dato | Uso | Obbligatorio |
|------|-----|--------------|
| `name` | Personalizzazione UI e conversazioni | Si |
| `primaryGoals[]` | Dashboard metrics + prompt AI | Si (min 1) |
| `currentMood` | Baseline emotiva iniziale | Si |
| `ageRange` | Contesto generazionale per AI | No |
| `therapyStatus` | Safety flags per AI | No |

Tutto il resto (vizi, lifestyle, dati fisici, habits) viene raccolto progressivamente da Aria durante le conversazioni o nelle sezioni dedicate del profilo.
