
# Redesign Aria: Portale Immersivo con Aria

## Concept: "Entrare nel Portale di Aria"

Quando entri nella pagina, devi sentire di essere entrato in uno spazio speciale - il "mondo" di Aria. Lo sfondo si colora con i gradienti Aurora, l'atmosfera diventa immersiva, e i pulsanti di interazione diventano i protagonisti assoluti.

---

## Nuovo Layout (Single Viewport)

```text
+------------------------------------------+
|                              [📜] corner  |
|                                           |
|            ◉ Orb (compatto)               |
|           "Sono Aria"                     |
|     "Come posso aiutarti oggi?"           |
|                                           |
|  +======================================+ |
|  ||     ✏️  Scrivi con Aria            || |  <-- PULSANTE ENORME
|  +======================================+ |
|                                           |
|  +======================================+ |
|  ||     🎙️  Parla con Aria             || |  <-- PULSANTE ENORME
|  +======================================+ |
|                                           |
|   💜 Ieri: "Abbiamo parlato di..."  →     |  <-- linea sottile
|                                           |
|   I TUOI DIARI                            |
|   [❤️ Amore] [💼 Lavoro] [👥 Rel] [🧘 Me] |
+------------------------------------------+
```

---

## Modifiche Tecniche

### 1. Sfondo Portale Immersivo (Aria.tsx)

Aggiungere uno sfondo dinamico Aurora che avvolge l'intera pagina:

- Gradient radiale animato viola/indigo
- Particelle o mesh sottili animate
- Transizione fade-in al mount
- Effetto "entering portal" con scale animation

```css
/* Nuovo background portal */
.aria-portal-bg {
  background: 
    radial-gradient(ellipse 100% 80% at 50% 0%, rgba(155, 111, 208, 0.25), transparent),
    radial-gradient(ellipse 80% 60% at 30% 100%, rgba(99, 102, 241, 0.2), transparent),
    radial-gradient(ellipse 60% 50% at 80% 50%, rgba(167, 139, 250, 0.15), transparent);
  animation: portal-breathe 8s ease-in-out infinite;
}
```

### 2. AriaHeroSection.tsx - Redesign Completo

**Struttura nuova:**
- Orb compatto (w-12) centrato
- "Sono Aria" come titolo principale
- "Come posso aiutarti oggi?" come sottotitolo
- DUE pulsanti ENORMI (py-6, text-lg) come protagonisti
- Insight come linea sottile in basso (non card)

**Rimosso:**
- "Ciao [nome], come stai?" generico
- Card container - tutto integrato nel flusso

### 3. Cronologia - Icona in Angolo

Spostare cronologia in alto a destra come semplice icona:
- Solo icona History (no testo "Cronologia")
- Click apre Sheet/Drawer con lista sessioni
- Posizione: absolute top-right
- Stile: glass subtle, 40x40px

### 4. Insight Semplificato

Da card a linea sottile:
- Una riga sola con emoji + preview + freccia
- Nessun bordo visibile
- Colore text-muted con accent viola
- Click navigates to chat

### 5. Diari Più Grandi

Aumentare dimensioni chips:
- Grid 4 colonne su mobile
- Icone 48x48px
- Label sempre visibile
- Gradients più saturati

---

## File da Modificare

### `src/pages/Aria.tsx`
- Aggiungere sfondo portal animato
- Spostare icona cronologia in alto a destra
- Rimuovere sezione history da bottom
- Usare Sheet per cronologia invece di collapse

### `src/components/aria/AriaHeroSection.tsx`
- Rimuovere card wrapper
- Orb più piccolo e centrato
- "Sono Aria" come intro
- Pulsanti ENORMI (py-6, text-lg, gap-4)
- Insight come linea sottile sotto pulsanti

### `src/components/aria/DiaryChipsScroll.tsx`
- Aumentare dimensioni chips
- Padding più generoso
- Icone più grandi (w-12 h-12)

### `src/index.css`
- Aggiungere animazione `portal-breathe`
- Classe `.aria-portal-bg` per gradiente immersivo

---

## Dettagli Pulsanti Protagonisti

```tsx
// Pulsante SCRIVI - Enorme
<motion.button className={cn(
  "w-full flex items-center justify-center gap-4",
  "py-6 px-8 rounded-3xl",
  "bg-gradient-to-br from-white/90 to-white/70",
  "backdrop-blur-xl border border-white/50",
  "text-foreground font-bold text-lg",
  "shadow-glass-elevated",
)}>
  <PenLine className="w-7 h-7" />
  <span>Scrivi con Aria</span>
</motion.button>

// Pulsante PARLA - Enorme con gradiente Aria
<motion.button className={cn(
  "w-full flex items-center justify-center gap-4",
  "py-6 px-8 rounded-3xl",
  "bg-gradient-aria",
  "text-white font-bold text-lg",
  "shadow-aria-glow",
)}>
  <AudioLines className="w-7 h-7" />
  <span>Parla con Aria</span>
</motion.button>
```

---

## Animazione Portale

```css
@keyframes portal-breathe {
  0%, 100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.02);
  }
}

@keyframes portal-enter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

---

## Stima Layout Verticale

| Elemento | Altezza |
|----------|---------|
| Padding top | 16px |
| Orb + intro | 80px |
| Pulsante Scrivi | 72px |
| Gap | 12px |
| Pulsante Parla | 72px |
| Insight line | 32px |
| Gap | 16px |
| Diari header + grid | 100px |
| Bottom nav padding | 80px |
| **Totale** | ~480px |

Tutto visibile in viewport senza scroll su iPhone standard (667px).

---

## Vantaggi UX

1. **Immersione totale** - Sfondo colorato = "sei nel mondo di Aria"
2. **Azione chiara** - Due pulsanti enormi, impossibile non vederli
3. **Zero distrazione** - Cronologia nascosta, insight minimalista
4. **Brand forte** - Aurora gradient ovunque rafforza identità Aria
5. **Single viewport** - Tutto a portata di pollice
