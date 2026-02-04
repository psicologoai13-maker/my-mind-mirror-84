
# Redesign Onboarding Quiz & Auth - Liquid Glass 2026

## Analisi Stato Attuale

| Componente | Problemi Identificati |
|------------|----------------------|
| **Auth.tsx** | Ha elementi Aurora ma manca profondita immersiva, card-glass ok |
| **OnboardingLayout.tsx** | Progress dots basici, header troppo semplice |
| **WelcomeStep.tsx** | Aurora presente ma mancano particelle e anelli concentrici |
| **NameInputStep.tsx** | Input senza effetto glow on focus, card avatar basica |
| **AboutYouStep.tsx** | Emoji buttons ok ma mancano riflessi interni |
| **MotivationStep.tsx** | Grid cards piatte, nessun shimmer effect |
| **GoalsStep.tsx** | Stesso problema di MotivationStep |
| **InterestsStep.tsx** | Grid troppo densa, chips senza glow |
| **ReadyScreen.tsx** | Gia abbastanza allineato, minor tweaks |

## Concept: "Immersive Onboarding Portal"

L'onboarding deve sentirsi come un viaggio guidato attraverso un portale di luce. Ogni step ha una sottile animazione di transizione e tutti gli elementi hanno profondita glass.

```text
    ╭─────────────────────────────╮
    │  ● ━━━━━ ○ ○ ○ ○           │  <- Progress pills con glow
    ├─────────────────────────────┤
    │                             │
    │      ◯ ◯ ◯                  │  <- Floating particles
    │    ╭───────────╮            │
    │    │  🌟 Aria  │            │  <- Glass avatar con anelli
    │    ╰───────────╯            │
    │                             │
    │   Come ti chiami?           │
    │                             │
    │  ╭─────────────────────╮    │
    │  │     [Input]         │    │  <- Input glass con glow
    │  ╰─────────────────────╯    │
    │                             │
    │   ╭─────────────────╮       │
    │   │    Continua     │       │  <- Button gradient-aria
    │   ╰─────────────────╯       │
    │                             │
    ╰─────────────────────────────╯
```

## Modifiche Dettagliate

### 1. OnboardingLayout.tsx - Header Premium

**Progress Indicator Upgrade:**
- Da semplici dots a "pills" con gradiente per lo step attivo
- Step completati: piccoli dots con glow viola
- Sfondo header con blur piu intenso

```tsx
// PRIMA
<div className={cn(
  "rounded-full transition-all duration-300",
  isCurrent ? "w-8 h-2 bg-gradient-aria shadow-aria-glow" 
            : isCompleted ? "w-2 h-2 bg-aria-violet/60"
            : "w-2 h-2 bg-muted-foreground/30"
)} />

// DOPO
<div className={cn(
  "rounded-full transition-all duration-500",
  isCurrent 
    ? "w-10 h-2.5 bg-gradient-aria shadow-aria-glow animate-pulse" 
    : isCompleted 
      ? "w-2.5 h-2.5 bg-aria-violet shadow-[0_0_10px_rgba(155,111,208,0.4)]"
      : "w-2 h-2 bg-muted-foreground/20"
)} />
```

**Back Button Upgrade:**
- Aggiungere hover glow effect
- Icona piu grande

### 2. WelcomeStep.tsx - Portal d'Ingresso

**Particelle Fluttuanti:**
- Riutilizzare `FloatingParticles` dalla sezione Aria
- 6-8 particelle distribuite sullo schermo

**Orb Avatar Potenziato:**
- Aggiungere 2 anelli concentrici pulsanti (come AriaHeroSection)
- Dimensione aumentata a `w-40 h-40`
- Glow piu intenso

**Testo:**
- Font size aumentato per "Ciao! Sono Aria"
- Aggiungere sottile animazione di typing/fade

### 3. NameInputStep.tsx - Input Immersivo

**Avatar Section:**
- Sostituire box con MessageCircle con orb Aurora piu grande
- Aggiungere anelli concentrici animati

**Input Field Upgrade:**
- Bordo con gradiente sottile quando focused
- Glow viola piu pronunciato
- Placeholder con animazione fade

**Feedback Text:**
- Aggiungere animazione sparkle emoji

### 4. AboutYouStep.tsx - Mood Selection Premium

**Emoji Buttons:**
- Aggiungere shimmer effect on hover
- Ombra interna (inner glow) quando selezionato
- Animazione scale piu fluida

**Gender/Age Pills:**
- Transizione da pills basiche a glass pills con glow
- Bordo gradiente quando selezionato

**Layout:**
- Aggiungere divider con gradiente invece di linea solida

### 5. MotivationStep.tsx & GoalsStep.tsx - Grid Cards Premium

**Card Upgrade:**
- Aggiungere `before:` pseudo-element per riflesso interno
- Shimmer effect sottile on hover
- Quando selezionato: bordo con gradiente Aurora
- Check indicator con animazione pop

**Grid Layout:**
- Gap leggermente aumentato per respirare
- Card min-height aumentata per piu spazio

**Counter Badge:**
- Aggiungere pulsazione quando cambia numero

### 6. InterestsStep.tsx - Chips Compatte

**Chip Cards:**
- Ridurre da 4 colonne a 3 per piu respiro
- Aggiungere glow effect quando selezionato
- Emoji piu grandi

**Layout:**
- Aggiungere scroll indicator sottile se contenuto overflow

### 7. Auth.tsx - Refinements

**Floating Orbs:**
- Aggiungere terzo orb piu piccolo
- Animazioni piu lente e organiche

**Card Auth:**
- Aggiungere riflesso interno piu visibile
- Input fields con glow on focus
- Separatore con gradiente

**Loading State:**
- Aggiungere particelle durante il caricamento

## Animazioni Aggiuntive (index.css)

```css
/* Shimmer per cards */
@keyframes card-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.card-shimmer-hover:hover::before {
  animation: card-shimmer 2s linear infinite;
}

/* Glow pulse per elementi selezionati */
@keyframes selection-glow {
  0%, 100% { box-shadow: 0 0 15px rgba(155, 111, 208, 0.3); }
  50% { box-shadow: 0 0 25px rgba(155, 111, 208, 0.5); }
}

.selection-glow {
  animation: selection-glow 2s ease-in-out infinite;
}
```

## File da Modificare

| File | Tipo Modifica |
|------|---------------|
| `src/components/onboarding/OnboardingLayout.tsx` | Progress pills, header blur |
| `src/components/onboarding/WelcomeStep.tsx` | Particelle, orb con anelli |
| `src/components/onboarding/NameInputStep.tsx` | Avatar orb, input glow |
| `src/components/onboarding/AboutYouStep.tsx` | Emoji glow, pills upgrade |
| `src/components/onboarding/MotivationStep.tsx` | Card shimmer, selection glow |
| `src/components/onboarding/GoalsStep.tsx` | Card shimmer, selection glow |
| `src/components/onboarding/InterestsStep.tsx` | 3 colonne, chip glow |
| `src/pages/Auth.tsx` | Orbs, input glow, card depth |
| `src/index.css` | Nuove animazioni shimmer/glow |

## Dettagli Tecnici

### Nuove Classi Utility (index.css)
- `.card-glass-interactive` - card con shimmer hover
- `.input-glass-focus` - input con glow viola on focus
- `.pill-selection` - pill con glow quando selezionata
- `.ring-concentric` - anelli pulsanti per orb

### Componenti Condivisi
- Riutilizzare `FloatingParticles` dal folder aria
- Creare componente `GlowOrb` riusabile per avatar

### Performance
- Usare `will-change: transform` per animazioni
- Limitare particelle a 8 max
- Usare `transform` invece di `top/left` per animazioni

## Risultato Atteso

1. **Coerenza Visiva** - Onboarding e Auth allineati con resto dell'app
2. **Profondita** - Ogni elemento ha ombre, riflessi e glow appropriati
3. **Immersione** - Particelle e animazioni creano sensazione di "portale"
4. **Premium Feel** - Transizioni fluide, feedback visivi ricchi
5. **Performance** - Animazioni ottimizzate per mobile
