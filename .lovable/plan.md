
# Redesign Completo Sezione Analisi - Design Attraente

## Problemi Attuali (dalla screenshot)
1. **Card piatte e noiose**: Solo testo + numero senza elementi visivi
2. **Spazi vuoti**: Card singola su una riga crea "buco" visivo
3. **Mancanza di gerarchia**: Tutte le sezioni sembrano uguali
4. **Nessun grafico attraente**: Solo un minuscolo sparkline invisibile
5. **Sezioni non contenute**: Ogni dominio sembra "fluttuare"

## Soluzione: Design a 3 Livelli

### Livello 1: Card Contenitore per Dominio
Ogni dominio clinico avrà una card contenitore con:
- Sfondo glass con bordo sottile
- Header con icona + titolo
- Le metriche all'interno organizzate

```text
┌─────────────────────────────────────────┐
│ 💜 Stato Emotivo                        │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │ 😌      │ │ 😊      │ │ 😨      │    │
│ │ ●●●○    │ │ ●●●●    │ │ ●○○○    │    │
│ │ Umore   │ │ Gioia   │ │ Paura   │    │
│ │ 8.0     │ │ 7.0     │ │ 2.0     │    │
│ └─────────┘ └─────────┘ └─────────┘    │
└─────────────────────────────────────────┘
```

### Livello 2: Card Metrica con Progress Ring
Ogni metrica avrà un mini progress ring visivo:

```text
┌───────────────┐
│     😌        │  <- Icona grande centrata
│   ╭───╮       │
│   │ ● │       │  <- Progress ring colorato
│   ╰───╯       │
│   Umore       │  <- Label
│    8.0        │  <- Valore grande
│    ↑          │  <- Trend piccolo
└───────────────┘
```

### Livello 3: Layout Intelligente Anti-Vuoto
- **3 colonne** per le metriche (più compatte, meno spazi)
- Quando il numero è **non divisibile per 3**, l'ultima card si espande
- Es: 4 metriche = 3 + 1 (espansa a tutta larghezza)
- Es: 5 metriche = 3 + 2 (due card a metà)

## Struttura Visiva Finale

```text
┌─────────────────────────────────────────┐
│  📊 Analisi                             │
│  Il tuo benessere psicologico           │
│                                         │
│  [Settimana] [Mese] [Tutto]             │
│                                         │
│  ╔═════════════════════════════════════╗│
│  ║ 💜 Stato Emotivo                    ║│
│  ║ ┌──────┐ ┌──────┐ ┌──────┐         ║│
│  ║ │  😌  │ │  😊  │ │  😨  │         ║│
│  ║ │ ╭─╮  │ │ ╭─╮  │ │ ╭─╮  │         ║│
│  ║ │ │●│  │ │ │●│  │ │ │○│  │         ║│
│  ║ │ ╰─╯  │ │ ╰─╯  │ │ ╰─╯  │         ║│
│  ║ │Umore │ │Gioia │ │Paura │         ║│
│  ║ │ 8.0  │ │ 7.0  │ │ 2.0  │         ║│
│  ║ └──────┘ └──────┘ └──────┘         ║│
│  ╚═════════════════════════════════════╝│
│                                         │
│  ╔═════════════════════════════════════╗│
│  ║ ⚡ Attivazione                       ║│
│  ║ ┌────────────────────────────────┐  ║│
│  ║ │        😰  Ansia               │  ║│
│  ║ │        ╭─────╮                 │  ║│ <- Card singola espansa
│  ║ │        │  ●  │  2.0 ↓          │  ║│    con ring più grande
│  ║ │        ╰─────╯                 │  ║│
│  ║ └────────────────────────────────┘  ║│
│  ╚═════════════════════════════════════╝│
│                                         │
│  ╔═════════════════════════════════════╗│
│  ║ 🧠 Cognitivo                        ║│
│  ║ ┌────────────────────────────────┐  ║│
│  ║ │   💡  Chiarezza Mentale        │  ║│
│  ║ │   ╭─────╮                      │  ║│
│  ║ │   │  ●  │  8.0 ↑               │  ║│
│  ║ │   ╰─────╯                      │  ║│
│  ║ └────────────────────────────────┘  ║│
│  ╚═════════════════════════════════════╝│
│                                         │
└─────────────────────────────────────────┘
```

## Componenti Tecnici

### 1. RichMetricCard (sostituzione UnifiedMetricCard)
Card con progress ring SVG integrato:

```typescript
interface RichMetricCardProps {
  metricKey: string;
  label: string;
  icon: string;
  color: string;
  value: number | null;
  trend: 'up' | 'down' | 'stable';
  isNegative?: boolean;
  size?: 'compact' | 'expanded';  // Per gestire card singole
  onClick: () => void;
}
```

Caratteristiche:
- Progress ring SVG con animazione
- Icona centrata sopra il ring
- Valore grande sotto con colore semantico
- Trend indicator discreto
- Variante `expanded` per card singole (ring piu grande, layout orizzontale)

### 2. DomainCard (nuova wrapper)
Card contenitore per ogni dominio:

```typescript
interface DomainCardProps {
  domain: ClinicalDomain;
  children: React.ReactNode;
}
```

Caratteristiche:
- Sfondo `bg-glass/30` con bordo `border-glass-border`
- Header con icona + titolo dominio
- Padding interno uniforme
- Radius arrotondato per effetto "contenitore"

### 3. SmartMetricsGrid (layout intelligente)
Griglia che elimina spazi vuoti:

```typescript
interface SmartMetricsGridProps {
  metrics: ClinicalMetric[];
  metricsData: Record<string, MetricData>;
  onMetricClick: (key: string) => void;
}
```

Logica:
- Filtra metriche con dati
- Se count === 1: card espansa a tutta larghezza
- Se count === 2: due card a meta
- Se count >= 3: griglia 3 colonne
- Ultima riga: espande per riempire

## File da Modificare

### Creare
1. `src/components/analisi/RichMetricCard.tsx` - Card con progress ring
2. `src/components/analisi/DomainCard.tsx` - Card contenitore dominio

### Modificare
1. `src/components/analisi/ClinicalDomainSection.tsx` - Usare DomainCard + layout smart
2. `src/components/analisi/UnifiedMetricCard.tsx` - Sostituire con RichMetricCard

### Rimuovere/Deprecare
- Il vecchio `UnifiedMetricCard.tsx` sara sostituito

## Dettagli Implementativi

### Progress Ring SVG
```typescript
const ProgressRing = ({ value, color, size = 40 }) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 10) * circumference;
  
  return (
    <svg width={size} height={size}>
      {/* Background circle */}
      <circle
        cx={size/2}
        cy={size/2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size/2}
        cy={size/2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
};
```

### Layout Grid Intelligente
```typescript
const getGridLayout = (count: number) => {
  if (count === 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  return 'grid-cols-3';
};

const getLastRowSpan = (count: number, index: number) => {
  const remainder = count % 3;
  const isLastRow = index >= count - remainder;
  
  if (remainder === 1 && isLastRow) return 'col-span-3'; // Espandi a tutta larghezza
  if (remainder === 2 && isLastRow) return 'col-span-1'; // Due card normali
  return 'col-span-1';
};
```

## Vantaggi del Nuovo Design

1. **Visivamente attraente**: Progress ring colorati invece di numeri piatti
2. **Zero spazi vuoti**: Layout intelligente che adatta le card
3. **Gerarchia chiara**: Card contenitore per ogni dominio
4. **Consistenza Liquid Glass**: Usa il design system esistente
5. **Feedback visivo**: Ring animati e colori semantici
6. **Compattezza**: 3 colonne invece di 2 = piu metriche visibili
7. **Touch-friendly**: Card grandi e ben spaziate
