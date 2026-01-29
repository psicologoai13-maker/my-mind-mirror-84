
# Piano: Definizione Colori + Estensione Liquid Glass 2026 a Tutta l'App

## Decisioni Cromatiche

Basandomi sulle tue scelte:
- **Mood Generale**: Gradient dinamico (colori che cambiano)
- **Identità Aria**: Gradient esclusivo (distinto dall'app)

---

## Proposta Palette Colori 2026

### 1. Base App - "Ambient Wellness"

Un sistema di colori che cambia leggermente in base al wellness_score dell'utente:

| Stato | Gradient Background | Primary Accent |
|-------|---------------------|----------------|
| Positivo (score 7-10) | Sage → Teal → Cyan | Emerald |
| Neutro (score 4-6) | Sand → Amber → Peach | Golden |
| Supportivo (score 1-3) | Lavender → Rose → Blush | Soft Pink |

**Default/Generale**: Sage Green → Teal → Soft Blue
- Calmo, naturale, tech-forward
- HSL: `155° → 175° → 200°`

### 2. Aria - "Aurora Gradient"

Gradient esclusivo viola/indigo che distingue l'IA:
- **Amethyst** `#9B6FD0` → **Indigo** `#6366F1` → **Violet** `#A78BFA`
- Usato per: pulsante Aria nella navbar, sessioni chat/voice, elementi AI-driven
- Trasmette: intelligenza, mistero, profondità

### 3. Token CSS Proposti

```css
/* Gradient dinamico app - cambia con mood */
--gradient-ambient-positive: linear-gradient(135deg, 
  hsl(155 40% 92%), 
  hsl(175 35% 90%), 
  hsl(200 30% 92%));

--gradient-ambient-neutral: linear-gradient(135deg, 
  hsl(45 50% 92%), 
  hsl(35 45% 90%), 
  hsl(25 40% 92%));

--gradient-ambient-supportive: linear-gradient(135deg, 
  hsl(280 35% 93%), 
  hsl(340 30% 92%), 
  hsl(350 35% 94%));

/* Aria exclusive gradient */
--gradient-aria: linear-gradient(135deg, 
  hsl(270 60% 65%), 
  hsl(240 80% 65%), 
  hsl(280 70% 70%));

--gradient-aria-subtle: linear-gradient(135deg, 
  hsl(270 40% 95%), 
  hsl(250 35% 93%), 
  hsl(280 30% 95%));
```

---

## Pagine da Aggiornare

### 1. Analisi.tsx (Pagina Corrente)
**Stato attuale**: Header basic, card senza glass, time selector piatto

**Aggiornamenti**:
- Header con gradient mesh sottile
- `TimeRangeSelector` → convertire a `PillTabs` style (già creato)
- `VitalMetricCard` → glass surface con AnimatedRing
- Sezioni con glass-card invece di bg-card
- AI badge con glow animato

### 2. Aria.tsx
**Stato attuale**: Box colorati ma statici, no glass

**Aggiornamenti**:
- Box "Scrivi/Parla con Aria" → glass-card con gradient-aria
- Sezione Diari → Bento grid layout
- Cronologia → card glass con hover effects
- Pulsante centrale "Aria" nella navbar → breathing animation con gradient-aria

### 3. Profile.tsx
**Stato attuale**: Card bianche uniformi

**Aggiornamenti**:
- Header profilo → glass-card hero con avatar glow
- Badge utente → pill con gradient (Plus = golden, Free = glass)
- Settings menu → glass-card con hover glow
- Stats row → micro-cards con AnimatedRing

### 4. Sessions.tsx
- Card sessioni → glass con gradient border
- Emotion tags → pills con glow contestuale

### 5. Chat.tsx
- Bubble Aria → gradient-aria background
- Input → glass-card con focus glow

### 6. Componenti Analisi da aggiornare
- `TimeRangeSelector` → PillTabs style
- `VitalMetricCard` → glass + AnimatedRing
- `EmotionalMixBar` → glass container
- `LifeBalanceRadar` → glass-card
- `DeepPsychologyCard` → accordion glass

---

## Implementazione Tecnica

### Fase 1: Token Colori (index.css)

Nuove variabili per gradients dinamici:
```css
/* Ambient gradients - mood responsive */
--gradient-ambient: var(--gradient-ambient-positive);

/* Aria identity */
--gradient-aria: linear-gradient(135deg, #9B6FD0, #6366F1, #A78BFA);
--aria-glow: 0 0 30px rgba(99, 102, 241, 0.3);

/* Updated primary - slightly more vibrant */
--primary: 160 50% 40%;
--primary-rgb: 64, 153, 128;
```

### Fase 2: BottomNav Enhancement

- Pulsante Aria centrale con `gradient-aria` e `animate-breathe`
- Glow viola on hover/active
- Active indicator che usa gradient dinamico

### Fase 3: Analisi Page Modernization

- `TimeRangeSelector.tsx` → rifatto con PillTabs style già esistente
- `VitalMetricCard.tsx` → glass-surface + AnimatedRing + chart glow
- Header con gradient mesh
- Sezioni con staggered animation

### Fase 4: Aria Page Modernization

- Hero boxes con glass + gradient-aria
- Diaries in Bento grid
- Session cards con glass effect

### Fase 5: Profile Page Modernization

- Hero card glass con inner glow
- Settings menu con glass-card
- Badge gradient animato per Plus users

### Fase 6: Global Components

- `EmotionalMixBar` → glass container
- `LifeBalanceRadar` → glass-card wrapping
- Tutti i Chart → glow on data points
- Loading states → shimmer con gradient

---

## File da Modificare

### Core Design System
1. `src/index.css` - Nuovi token gradient e colori Aria
2. `tailwind.config.ts` - Utilities per gradients

### Componenti Layout
3. `src/components/layout/BottomNav.tsx` - Aria button gradient
4. `src/components/layout/MobileLayout.tsx` - Mood-responsive background

### Pagina Analisi
5. `src/pages/Analisi.tsx` - Glass layout
6. `src/components/analisi/TimeRangeSelector.tsx` - PillTabs style
7. `src/components/analisi/VitalMetricCard.tsx` - Glass + AnimatedRing
8. `src/components/analisi/DeepPsychologyCard.tsx` - Glass accordion
9. `src/components/analisi/LifeAreasCard.tsx` - Glass wrapper

### Pagina Aria
10. `src/pages/Aria.tsx` - Full glass redesign
11. `src/components/diary/DiaryNotebookCard.tsx` - Glass variant

### Pagina Profile
12. `src/pages/Profile.tsx` - Glass cards
13. `src/components/profile/PremiumCard.tsx` - Gradient badge
14. `src/components/profile/PointsProgressCard.tsx` - Glass + glow

### Pagina Chat
15. `src/components/chat/ChatBubble.tsx` - Aria gradient

### Shared Components
16. `src/components/home/EmotionalMixBar.tsx` - Glass container
17. `src/components/home/LifeBalanceRadar.tsx` - Glass card

---

## Risultato Visivo Finale

### Identità App
- Background: Gradient mesh animato che cambia con il mood
- Superfici: Liquid Glass con blur e luce interna
- Accenti: Sage/Teal per elementi generali

### Identità Aria
- Gradient esclusivo viola/indigo
- Glow distintivo su tutti gli elementi AI
- Animazione "breathing" sul pulsante centrale
- Chat bubbles con gradiente leggero

### Coerenza 2026
- Ogni pagina usa glass-card
- Animazioni spring su tutte le interazioni
- Glow contestuali su stati active/focus
- Typography bold con tracking stretto

---

## Ordine di Implementazione

1. **Token CSS** - Definire tutti i nuovi colori/gradients
2. **BottomNav Aria** - Gradient esclusivo + breathing
3. **Analisi completa** - Glass + modern selectors
4. **Aria Hub** - Glass + gradient hero
5. **Profile** - Glass settings menu
6. **Chat bubbles** - Aria gradient
7. **Testing cross-page** - Coerenza visiva

