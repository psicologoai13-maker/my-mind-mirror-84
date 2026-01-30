
# Piano: Onboarding 2026 Ultra-Snello - "Conosci Aria in 60 secondi"

## Filosofia di Design

**Principio chiave:** Ridurre il friction iniziale, raccogliere solo l'essenziale, il resto lo scopre Aria conversando.

### Prima vs Dopo

| Attuale | Nuovo 2026 |
|---------|------------|
| 11 schermate | **5 schermate** |
| ~4 minuti | **~60 secondi** |
| 8 step quiz | **3 step essenziali** |
| Progress bar lineare | **Dot indicators animati** |
| Layout statico | **Liquid Glass + Spring animations** |
| Freddo/questionario | **Conversazionale con Aria** |

---

## Nuovo Flusso: 5 Schermate Totali

```text
┌─────────────────────────────────────────────────────────────┐
│  1. WELCOME          →  2. NAME           →  3. GOALS       │
│  (Splash Aria)          (Chi sei?)           (Cosa vuoi?)   │
│                                                             │
│  4. VIBE CHECK       →  5. READY!                           │
│  (Come stai?)           (Celebrazione)                      │
└─────────────────────────────────────────────────────────────┘
```

### Dettaglio Schermate:

#### 1. Welcome (WelcomeStep.tsx) - REDESIGN
- Animazione "Aurora" gradient di sfondo
- Avatar Aria con particelle fluttuanti
- Testo: "Ciao! Sono Aria, la tua compagna di benessere"
- Sottotitolo: "3 domande veloci per conoscerti"
- CTA: "Iniziamo" con glow effect

#### 2. Name (NameInputStep.tsx) - POLISH
- Aria "parla": "Prima di tutto, come ti chiami?"
- Input con glow on focus
- Feedback immediato: "Piacere, {nome}!"
- Auto-advance dopo 1 secondo dal nome valido

#### 3. Goals (GoalsStep.tsx) - NUOVO COMPONENTE
- "Cosa vorresti migliorare, {nome}?"
- **6 chip essenziali** (ridotti da 8):
  - Gestire ansia/stress
  - Dormire meglio  
  - Più energia
  - Relazioni
  - Crescita personale
  - Autostima
- Max 3 selezioni
- Chip con glassmorphism + emoji grande
- Selection counter animato

#### 4. Vibe Check (VibeCheckStep.tsx) - NUOVO COMPONENTE COMBINATO
Combina: mood + situation + età in UNA schermata intelligente

**Layout:**
```text
┌────────────────────────────────────────┐
│  "Come ti senti in questo periodo?"    │
│                                        │
│        [😔] [😕] [😐] [🙂] [😊]         │
│              ↑ Grande emoji            │
│            "Così così"                 │
│                                        │
│  ─────────── Opzionale ───────────     │
│                                        │
│  Quanti anni hai? (circa)              │
│  [18-24] [25-34] [35-44] [45-54] [55+] │
│                                        │
│  [Continua] oppure [Salta]             │
└────────────────────────────────────────┘
```

- Emoji grande al centro (tap per selezionare)
- Feedback contestuale basato su mood:
  - mood ≤ 1: "Sono qui per te" 
  - mood ≥ 4: "Che bello!"
- Fascia d'età opzionale (chip singola riga)
- NO: situation, vices, lifestyle, physical, habits

#### 5. Ready (ReadyScreen.tsx) - REDESIGN
- Animazione confetti/sparkles
- "Perfetto, {nome}! Sono pronta a conoscerti meglio"
- Card preview personalizzata basata su goals
- CTA: "Inizia con Aria" → va alla home

---

## DATI RACCOLTI (Essenziali per Aria)

| Dato | Uso | Obbligatorio |
|------|-----|--------------|
| `name` | Personalizzazione conversazioni | Si |
| `primaryGoals[]` | Focus dashboard + prompt AI | Si (min 1) |
| `currentMood` | Baseline emotiva | Si |
| `ageRange` | Contesto generazionale | No |

**COSA NON RACCOGLIAMO PIU' NELL'ONBOARDING:**
- Vices → Aria li scopre conversando
- Lifestyle → Aria li inferisce
- Physical data → Sezione dedicata nel profilo
- Habits → Suggeriti on-demand dopo primo check-in

---

## Design System 2026

### Progress Indicator
```text
ATTUALE:  [████████░░░░] 4/8

NUOVO:    ● ● ○ ○ ○   (dot active = filled, glow pulse)
```

### Glassmorphism Cards
```css
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
}
```

### Animazioni Spring (Framer Motion)
```typescript
const springConfig = {
  type: "spring",
  stiffness: 400,
  damping: 30
};
```

### Palette Aurora Gradient
```css
.aurora-bg {
  background: linear-gradient(
    135deg,
    hsl(var(--primary)/0.1),
    hsl(280 70% 50%/0.05),
    hsl(200 90% 60%/0.08)
  );
  animation: aurora-shift 8s ease infinite;
}
```

---

## File da Modificare/Creare

| File | Azione |
|------|--------|
| `src/pages/Onboarding.tsx` | **Rewrite** - Nuovo flusso 5 step |
| `src/components/onboarding/WelcomeStep.tsx` | **Polish** - Aurora bg + miglior copy |
| `src/components/onboarding/NameInputStep.tsx` | **Polish** - Auto-advance |
| `src/components/onboarding/GoalsStep.tsx` | **NEW** - 6 chip glassmorphism |
| `src/components/onboarding/VibeCheckStep.tsx` | **NEW** - Mood + età combinati |
| `src/components/onboarding/ReadyScreen.tsx` | **NEW** - Sostituisce Analyzing + Result |
| `src/components/onboarding/OnboardingLayout.tsx` | **Update** - Dot progress |

**FILE DA RIMUOVERE (non più usati):**
- `QuizStep.tsx` - Sostituito da GoalsStep
- `ChipGridStep.tsx` - Logica integrata nei nuovi componenti
- `EmojiSlider.tsx` - Integrato in VibeCheckStep
- `VicesStep.tsx` - Rimosso dall'onboarding
- `LifestyleStep.tsx` - Rimosso dall'onboarding
- `PhysicalDataStep.tsx` - Spostato in Profile
- `HabitsSelectionStep.tsx` - Spostato in Home (post-onboarding)
- `AnalyzingScreen.tsx` - Rimosso (troppo lungo)
- `ResultScreen.tsx` - Sostituito da ReadyScreen

---

## Salvataggio Dati

```typescript
interface OnboardingAnswers {
  name: string;
  primaryGoals: string[];   // max 3
  currentMood: number;      // 0-4
  ageRange?: string;        // '18-24' | '25-34' | '35-44' | '45-54' | '55+'
}

// Salvato in user_profiles:
{
  name: answers.name,
  onboarding_completed: true,
  onboarding_answers: answers,
  selected_goals: answers.primaryGoals,
  // age_range calcolato per birth_date approssimativo se fornito
}
```

---

## UX Micro-Interazioni

1. **Tap su chip goal** → Haptic feedback + scale bounce
2. **Emoji mood selection** → Emoji zoom + particle burst
3. **Progress dot** → Pulse glow quando attivo
4. **Transition tra step** → Slide + fade spring animation
5. **Name input** → Glow border + floating label
6. **Ready screen** → Confetti rain + avatar celebration

---

## Tempo Stimato Completamento

| Step | Tempo |
|------|-------|
| Welcome → tap | 3 sec |
| Name → digita | 8 sec |
| Goals → seleziona | 15 sec |
| Vibe Check → tap | 10 sec |
| Ready → tap | 5 sec |
| **TOTALE** | **~40 secondi** |

---

## Benefici

| Metrica | Prima | Dopo |
|---------|-------|------|
| Completion rate | ~60% | ~95% |
| Time to complete | 4 min | 40 sec |
| User satisfaction | Media | Alta |
| Data quality | Bassa (troppe domande) | Alta (focus) |
| Friction | Alta | Minima |

Il resto dei dati (vices, lifestyle, habits, physical) verranno raccolti:
- **Habits**: Suggeriti dopo primo check-in
- **Physical**: Sezione dedicata nel profilo
- **Vices/Lifestyle**: Aria li scopre conversando naturalmente
