

# Multi-Layout Switcher: Testa tutte le proposte dal vivo

## Idea

Creare tutte e 4 le varianti della Home (Attuale + A + B + C) come componenti separati, con un piccolo switcher flottante che permette di passare da una all'altra in tempo reale. La scelta viene salvata in `localStorage` cosi' resta persistente tra i refresh.

## Architettura

```text
src/pages/Index.tsx  (orchestratore con switcher)
  |
  +-- src/components/home/layouts/HomeLayoutCurrent.tsx   (layout attuale, estratto da Index.tsx)
  +-- src/components/home/layouts/HomeLayoutA.tsx          (Conversational Home)
  +-- src/components/home/layouts/HomeLayoutB.tsx          (Aria-First Feed)
  +-- src/components/home/layouts/HomeLayoutC.tsx          (Super-Clean)
  +-- src/components/home/layouts/LayoutSwitcher.tsx       (FAB flottante per cambiare layout)
```

## Come funziona

- `Index.tsx` legge da `localStorage` quale layout e' attivo (default: "current")
- Un bottone flottante in basso a sinistra (sopra la navbar) mostra un menu con 4 opzioni: "Attuale", "A", "B", "C"
- Cliccando su una opzione, il layout cambia istantaneamente senza reload
- Il switcher e' visibile SOLO in modalita' dev/test (controllato da una flag)

## Dettaglio dei 4 layout

### Layout "Current" (HomeLayoutCurrent.tsx)
- Copia esatta del contenuto attuale di `Index.tsx` (header, WellnessScoreBox, SmartCheckinSection, widget AI-ordered)
- Zero modifiche, comportamento identico a oggi

### Layout A: "Conversational Home" (HomeLayoutA.tsx)
- L'orb di Aria al centro della pagina con input chat inline sotto
- Campo di testo + bottone mic + bottone invio direttamente in Home
- Cliccando invio si naviga a `/chat` con il messaggio pre-compilato
- Cliccando mic si apre il voice modal
- Wellness Score come pill compatta orizzontale sotto l'orb
- Check-in ridotti a 3-4 pills orizzontali in fondo
- Nessun AdaptiveVitalsSection, nessun EmotionalMixBar

### Layout B: "Aria-First Feed" (HomeLayoutB.tsx)
- Nuovo componente `HeroAriaCard` in cima: orb piccolo + messaggio contestuale di Aria + 2 CTA (Scrivi/Parla)
- WellnessScore ridotto a barra orizzontale compatta (score + progress bar, una sola riga)
- Check-in come pills orizzontali scrollabili
- Un singolo "Insight del giorno" dall'IA (estratto da `analysisLayout`)
- Nessun AdaptiveVitalsSection, nessun EmotionalMixBar (spostati concettualmente in Analisi)

### Layout C: "Super-Clean" (HomeLayoutC.tsx)
- WellnessScoreBox compatto (versione ridotta dell'attuale)
- Card CTA "Parla con Aria" con 2 bottoni (Scrivi/Voce)
- SmartCheckinSection limitato a max 4 items
- Nient'altro: nessun banner, nessun vitals, nessun emotional mix

## Componente LayoutSwitcher

- Bottone flottante rotondo in basso a sinistra (position fixed, z-50)
- Icona "Layout" o "Palette"
- Al click apre un piccolo popover con 4 opzioni radio: Attuale, A, B, C
- Ogni opzione ha nome e descrizione breve
- La scelta si salva in `localStorage('home-layout-variant')`
- Puo' essere rimosso con una sola riga quando si decide il layout finale

## File da creare (7 nuovi)

1. `src/components/home/layouts/HomeLayoutCurrent.tsx` - Layout attuale estratto
2. `src/components/home/layouts/HomeLayoutA.tsx` - Conversational Home
3. `src/components/home/layouts/HomeLayoutB.tsx` - Aria-First Feed  
4. `src/components/home/layouts/HomeLayoutC.tsx` - Super-Clean
5. `src/components/home/layouts/LayoutSwitcher.tsx` - FAB switcher
6. `src/components/home/layouts/HeroAriaCard.tsx` - Card Aria per Layout B
7. `src/components/home/layouts/CompactWellnessBar.tsx` - Barra wellness compatta per Layout A/B

## File da modificare (1)

1. `src/pages/Index.tsx` - Diventa orchestratore: legge il variant da localStorage, renderizza il layout corrispondente + il LayoutSwitcher

## Sequenza di implementazione

1. Creare i componenti condivisi (`HeroAriaCard`, `CompactWellnessBar`, `LayoutSwitcher`)
2. Estrarre il layout attuale in `HomeLayoutCurrent.tsx`
3. Creare i 3 nuovi layout (A, B, C)
4. Refactorare `Index.tsx` come orchestratore
5. Testare il switcher

Dopo aver testato tutti i layout, bastera' rimuovere il `LayoutSwitcher`, cancellare i layout non scelti, e spostare il contenuto del layout vincente direttamente in `Index.tsx`.

