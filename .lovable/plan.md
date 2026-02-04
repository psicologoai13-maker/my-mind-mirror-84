
# Redesign Aria: Hub Centralizzato con UX Premium

## Problemi Attuali

### Spazio ed Efficienza
1. **Session Selector boxes troppo grandi** - 2 box da ~120px ciascuno con decorazioni eccessive
2. **Diaries grid 2x2** - Occupa ~200px ma mostra solo 4 elementi
3. **Session history items alti** - Ogni item ~60px con troppo padding
4. **Header generico** - Nessuna identità visiva distintiva di Aria

### UX Confusa
5. **Pulsante "+" diari non funziona** - Non apre nulla
6. **Nessun focus visivo su Aria** - La pagina non comunica che è il "centro" di Aria
7. **Hierarchy assente** - Chat/Voce, Diari, Cronologia hanno stesso peso visivo
8. **Empty state debole** - "Nessuna sessione ancora" poco ingaggiante

---

## Nuovo Design: Aria Hub Centralizzato

```text
+------------------------------------------+
|  ARIA HERO (identità visiva forte)        |
|           ◉ Orb Aria animato              |
|         "Ciao [nome], come stai?"         |
|     [💬 Scrivi]     [🎙️ Parla]           |
+------------------------------------------+
|  QUICK INSIGHT (ultima sessione)          |
|  💜 "Ieri hai parlato di lavoro..."       |
|     Tocca per continuare →                |
+------------------------------------------+
|  DIARI (scroll orizzontale compatto)      |
|  [❤️ Amore] [💼 Lavoro] [👥 Rel.] [+]    |
+------------------------------------------+
|  CRONOLOGIA (lista ultra-compatta)        |
|  📜 Cronologia                 Vedi tutto |
|  +--------------------------------------+ |
|  | 🎙️ Vocale • 3 Feb  14:30  2min      | |
|  | 💬 Chat • 2 Feb    10:15  #ansia    | |
|  | 🎙️ Vocale • 1 Feb  20:00  5min      | |
|  +--------------------------------------+ |
+------------------------------------------+
```

---

## Componenti Tecnici

### 1. AriaHeroSection (nuovo)
Sezione hero con identità Aria forte:

```tsx
// Struttura
- Orb animato centrale (Canvas o SVG) con gradiente Aurora
- Saluto personalizzato con ora del giorno
- Due CTA buttons compatti in una riga
- Stats sottili: "12 sessioni • 5 giorni streak"
```

**Visual:**
- Orb con animazione pulse/breathing
- Gradiente Aurora (viola/indigo) come brand identity
- Reflection glass effect sotto l'orb

### 2. QuickInsightCard (nuovo)
Mostra l'ultimo insight o suggerimento:

```tsx
// Se ha sessioni recenti:
- Preview ultima conversazione
- "Continua la conversazione" CTA

// Se nessuna sessione:
- Suggerimento personalizzato
- "Inizia a parlare con me" CTA
```

### 3. DiaryChipsScroll (nuovo)
Diari come chips orizzontali scrollabili:

```tsx
// Layout: scroll orizzontale
- Chips compatti: [emoji + label]
- Max 6 chips visibili
- Pulsante [+] per aggiungere
- Altezza totale: ~50px invece di ~200px
```

**Vantaggi:**
- 75% risparmio spazio
- Tutti i diari accessibili con uno scroll
- Pattern mobile-native (come stories)

### 4. CompactSessionList (nuovo)
Lista sessioni ultra-compatta:

```tsx
// Ogni item: 44px invece di 60px
- Icona tipo (🎙️/💬) + data inline
- Ora + durata + 1 emotion tag
- No padding extra, no chevron
```

---

## Modifiche File

### `src/pages/Aria.tsx`
- Rimuovere grid 2x2 per session selector
- Implementare nuovo layout verticale
- Ridurre padding globale (space-y-4)

### `src/components/aria/AriaHeroSection.tsx` (nuovo)
- Orb animato con Canvas/SVG
- Saluto dinamico
- CTA buttons compatti
- Mini stats row

### `src/components/aria/QuickInsightCard.tsx` (nuovo)
- Card insight ultima sessione
- Empty state engaging
- CTA per continuare

### `src/components/aria/DiaryChipsScroll.tsx` (nuovo)
- Scroll orizzontale chips
- Add diary inline
- Feedback touch

### `src/components/aria/CompactSessionItem.tsx` (nuovo)
- Item sessione 44px
- Layout inline ottimizzato

---

## Dettagli Animazioni

### Orb Aria
```text
- Breathing animation (scale 1.0 → 1.05 → 1.0)
- Gradient rotation lenta
- Glow pulsante sincronizzato
- Touch: ripple + haptic feedback
```

### Transizioni
- Chips scroll: momentum physics
- Session items: stagger entrance (50ms delay)
- Quick insight: slide-up on mount

---

## Stima Risparmio Spazio

| Sezione | Prima | Dopo | Risparmio |
|---------|-------|------|-----------|
| Session Selector | ~180px | ~160px (hero) | 11% |
| Diaries Grid | ~200px | ~60px (chips) | 70% |
| Session Items (5x) | ~300px | ~220px | 27% |
| **Totale viewport** | ~680px | ~440px | **35%** |

---

## Vantaggi UX

1. **Identità Aria forte** - L'orb comunica che è "casa di Aria"
2. **Azione immediata** - CTA sempre in viewport
3. **Discovery naturale** - Scroll orizzontale per diari
4. **Mobile-first** - Pattern nativi (chips, compact lists)
5. **Engagement** - Quick insight invita a continuare
6. **Consistenza** - Stile Liquid Glass come Profile

---

## Palette Colori Aria

```css
/* Hero gradient */
--aria-orb: linear-gradient(135deg, #9B6FD0, #6366F1, #A78BFA);

/* Quick insight */
--insight-bg: rgba(139, 92, 246, 0.1);
--insight-border: rgba(139, 92, 246, 0.2);

/* Diary chips */
--chip-bg: var(--glass);
--chip-active: var(--aria-violet);
```

---

## Schema Componenti

```text
Aria.tsx
├── AriaHeroSection
│   ├── AriaOrb (animato)
│   ├── GreetingText
│   ├── ActionButtons (Chat/Voice)
│   └── MiniStats
├── QuickInsightCard
│   ├── InsightContent
│   └── ContinueCTA
├── DiaryChipsScroll
│   ├── DiaryChip[] (map)
│   └── AddChipButton
└── SessionHistorySection
    ├── SectionHeader
    └── CompactSessionItem[] (map)
```
