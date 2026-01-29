
# Piano: Modernizzazione UI/UX App 2026

## Analisi Stato Attuale

L'app utilizza già un design system "Premium 2025" con elementi positivi:
- Font: Plus Jakarta Sans
- Rounded corners: rounded-3xl 
- Shadows: shadow-premium (diffuse)
- Glassmorphism base nella navbar

**Elementi che la fanno sembrare "datata" (2020-2022):**
1. **Layout troppo statico** - card rettangolari uniformi senza gerarchia visiva dinamica
2. **Colori piatti** - mancano sfumature, profondità e luci contestuali
3. **Interazioni deboli** - microinterazioni assenti, feedback tattile minimo
4. **Tipografia monotona** - pesi e scale non sfruttati
5. **Navbar tradizionale** - design "flat" senza elementi distintivi
6. **Assenza di motion design** - animazioni generiche, non contestuali
7. **Card uniformi** - tutte le card sembrano uguali, manca gerarchia
8. **Mancanza di "Liquid Glass"** - il trend 2025-2026 di Apple non è presente

---

## Trend UI/UX 2026 da Implementare

### 1. Apple "Liquid Glass" Design Language
Il nuovo standard di iOS 26 e trend dominante:
- Elementi semi-trasparenti con blur dinamico
- Luce che "scorre" attraverso le superfici
- Profondità contestuale (elementi che reagiscono allo scroll)
- Bordi luminescenti sottili

### 2. Emotionally Intelligent Design
- UI che cambia in base allo stato emotivo dell'utente
- Colori e animazioni adattive
- Feedback visivo che riflette il mood

### 3. Micro-Animations Contestuali
- Spring physics per transizioni naturali
- Haptic-visual feedback sincronizzato
- Animazioni che comunicano stato e progresso

### 4. Bento Grid Dinamico
- Layout a griglia asimmetrica stile Apple/Notion
- Card di dimensioni variabili per gerarchia visiva
- Responsive breakpoints fluidi

### 5. Gradient Mesh e Profondità
- Sfondi con gradient mesh sottili
- Ombre colorate contestuali (non grigie)
- Effetti "glow" per elementi interattivi

---

## Interventi Tecnici Dettagliati

### Fase 1: Design Tokens e Palette (index.css + tailwind.config.ts)

**Nuove variabili CSS:**
```css
/* Liquid Glass tokens */
--glass-blur: 24px;
--glass-saturation: 180%;
--glass-bg: rgba(255, 255, 255, 0.7);
--glass-border: rgba(255, 255, 255, 0.3);
--glass-glow: 0 0 20px rgba(var(--primary), 0.15);

/* Dynamic gradients */
--gradient-mesh-1: radial-gradient(ellipse at 30% 20%, rgba(155, 200, 180, 0.15), transparent 50%);
--gradient-mesh-2: radial-gradient(ellipse at 70% 80%, rgba(200, 155, 220, 0.12), transparent 50%);

/* Mood-adaptive colors */
--mood-glow-positive: 155 50% 55%;
--mood-glow-neutral: 45 60% 60%;
--mood-glow-attention: 25 65% 55%;
```

**Nuove animazioni:**
```css
@keyframes liquid-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes float-subtle {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-4px) rotate(0.5deg); }
}

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.1); }
  50% { box-shadow: 0 0 40px rgba(var(--primary-rgb), 0.25); }
}
```

### Fase 2: Componenti Glass Reusable (Nuovi file)

**Creare `src/components/ui/glass-card.tsx`:**
Componente card con effetto Liquid Glass:
- Backdrop blur dinamico
- Bordi luminescenti
- Ombre colorate
- Supporto per stati hover/active

**Creare `src/components/ui/glass-button.tsx`:**
Bottoni con effetto vetro:
- Riflesso interno
- Glow su hover
- Press animation con scale + ombre

**Creare `src/components/ui/bento-grid.tsx`:**
Sistema di layout Bento:
- Grid items con size variants (small, medium, large, featured)
- Auto-layout responsivo
- Animation stagger su mount

### Fase 3: Bottom Navigation Redesign (BottomNav.tsx)

**Trasformazione "Liquid Glass Dock":**
- Navbar più compatta e floating
- Icone con glow on active
- Pulsante centrale Aria con animazione "breathing"
- Effetto "pill" dinamico che segue la tab attiva
- Backdrop blur più intenso

```text
Stato Attuale:
┌─────────────────────────────────────────┐
│  Home   Analisi   ✨   Progressi  Profilo  │
└─────────────────────────────────────────┘

Nuovo Design:
              ╭─────────────────────╮
              │ 🏠  📊  ✨✨✨  🎯  👤 │
              ╰─────────────────────╯
                        ↑
              Floating + Liquid Glass
```

### Fase 4: Home Page Revolution (Index.tsx + components)

**Header con Gradient Mesh:**
- Background con mesh gradient animato sottile
- Saluto tipografico più audace (font-size dinamico)
- Avatar/iniziali dell'utente con glow

**WellnessScoreBox → Liquid Wellness Hero:**
- Design a "pill" allungata invece di card rettangolare
- Score con animazione ring/gauge
- Glow che cambia colore in base al punteggio
- Micro-animazione "pulse" continua

**VitalsSection → Bento Vitals Grid:**
- Layout Bento asimmetrico (1 card grande + 3 piccole)
- Card con gradients contestuali
- Iconografia più grande e centrata
- Animazioni entrance staggerate

### Fase 5: Objectives Page Modernization

**ObjectiveCard → Glass Progress Card:**
- Card con sfondo glassmorphism
- Progress bar con gradient animato
- Emoji più grandi con glow
- Stati (warning, success) con colori più vibranti

**Tabs → Pill Selector:**
- Tab selector come "pills" flottanti
- Indicatore che scorre con spring animation
- Blur leggero sullo sfondo

### Fase 6: Microinterazioni e Feedback

**Aggiungere hook `useHapticFeedback`:**
- Vibrazione leggera su tap
- Pattern diversi per success/error/warning

**Implementare transizioni Spring:**
- Usare cubic-bezier spring per tutte le transizioni
- Stagger animations su liste
- Overshoot effect su tap

**Loading States Premium:**
- Skeleton con shimmer effect
- Pulsating glow invece di spinner
- Transizioni smooth tra loading e content

### Fase 7: Tipografia Dinamica

**Scala tipografica rivista:**
- Hero titles: 40px-48px, weight 700, tracking -0.04em
- Section titles: 20px-24px, weight 600
- Body: 15px-16px, weight 400, line-height 1.6
- Captions: 12px-13px, weight 500, uppercase tracking

**Aggiungere font Inter Variable:**
Per micro-testi e numeri (più leggibile a piccole dimensioni)

### Fase 8: Mood-Adaptive Theming

**Sistema di temi dinamici:**
- Colori che cambiano leggermente in base al wellness_score
- Background gradient che si adatta
- Icone con tint contestuale

```typescript
const getMoodTheme = (score: number) => {
  if (score >= 7) return 'calm-positive';    // Verdi/teal
  if (score >= 5) return 'balanced';          // Neutri/ambra
  return 'supportive';                        // Rosa/lavanda calmanti
}
```

---

## File da Modificare/Creare

### Nuovi File:
1. `src/components/ui/glass-card.tsx` - Card con Liquid Glass
2. `src/components/ui/glass-button.tsx` - Bottoni glass
3. `src/components/ui/bento-grid.tsx` - Sistema layout Bento
4. `src/components/ui/pill-tabs.tsx` - Tab selector moderno
5. `src/components/ui/animated-ring.tsx` - Ring progress animato
6. `src/hooks/useHapticFeedback.ts` - Feedback tattile

### File da Modificare:
1. `src/index.css` - Nuovi token CSS, animazioni, gradient mesh
2. `tailwind.config.ts` - Estensioni palette e utilities
3. `src/components/layout/BottomNav.tsx` - Redesign navbar
4. `src/pages/Index.tsx` - Layout Home con Bento
5. `src/components/home/WellnessScoreBox.tsx` - Hero design
6. `src/components/home/AdaptiveVitalsSection.tsx` - Bento grid
7. `src/components/home/AdaptiveVitalCard.tsx` - Glass cards
8. `src/pages/Objectives.tsx` - Pill tabs
9. `src/components/objectives/ObjectiveCard.tsx` - Glass design
10. `src/components/habits/HabitCard.tsx` - Glass + micro-animations
11. `src/pages/Aria.tsx` - Hero boxes più impattanti
12. `src/components/ui/button.tsx` - Nuove variants glass
13. `src/components/ui/card.tsx` - Default glass styling
14. `src/components/ui/progress.tsx` - Gradient animato

---

## Risultato Visivo Atteso

### Prima (Stile 2020-2022):
- Card bianche uniformi con bordi grigi
- Navbar piatta standard
- Animazioni generiche fade-in
- Colori statici
- Layout griglia uniforme

### Dopo (Stile 2026):
- Superfici "Liquid Glass" con blur e luce
- Navbar floating con glow e movimento
- Animazioni spring contestuali
- Colori adattivi al mood dell'utente
- Layout Bento con gerarchia dinamica
- Microinterazioni su ogni elemento interattivo
- Tipografia bold e dinamica

---

## Priorità Implementazione

1. **URGENTE**: Token CSS + Glass Card base (fondamenta)
2. **ALTA**: BottomNav redesign (elemento più visibile)
3. **ALTA**: WellnessScoreBox hero (primo elemento che l'utente vede)
4. **MEDIA**: Bento grid per vitals
5. **MEDIA**: ObjectiveCard + HabitCard glass
6. **BASSA**: Microinterazioni avanzate
7. **BASSA**: Mood-adaptive theming completo

---

## Note Tecniche

**Performance:**
- Usare `will-change` solo su elementi animati attivamente
- Preferire `transform` e `opacity` per animazioni
- Limitare `backdrop-filter` a elementi visibili (virtualizzazione)

**Accessibilità:**
- Mantenere contrasto minimo WCAG AA
- Rispettare `prefers-reduced-motion`
- Evitare solo colore per comunicare stato

**Compatibilità:**
- Fallback per browser senza `backdrop-filter`
- Test su Safari iOS (parsing diverso di blur)
- Supporto dark mode per tutti i nuovi elementi
