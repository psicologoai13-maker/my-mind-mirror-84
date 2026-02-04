

# Riorganizzazione Clinica Sezione Analisi

## Analisi dello Stato Attuale

### Problemi Identificati
1. **Terminologia errata**: "Parametri Vitali" è un termine medico (frequenza cardiaca, pressione, ecc.) - non psicologico
2. **Organizzazione non clinica**: I dati sono raggruppati per fonte tecnica, non per dominio psicologico
3. **Storico limitato**: Solo 4 metriche cliccabili su ~40 tracciate
4. **Ridondanza**: 16 metriche psicologiche + 14 emozioni con sovrapposizioni
5. **Mancano aggregazioni**: Nessun indice composito clinicamente significativo
6. **UX passiva**: Grafici statici da scrollare invece di esplorazione interattiva

### Metriche Attualmente Tracciate
- **Sessioni/Check-in**: mood, anxiety, energy, sleep (4)
- **Emozioni**: 14 emozioni (gioia, tristezza, rabbia, paura, apatia + 9 secondarie)
- **Psicologia**: 16 metriche (ruminazione, burnout, autoefficacia, ecc.)
- **Aree Vita**: 6 aree (lavoro/scuola, amore, sociale, salute, crescita)

---

## Nuova Architettura: Domini Clinici

### Struttura Proposta (6 Domini)

```text
┌─────────────────────────────────────────────────┐
│  📊 Analisi                                     │
│  Il tuo benessere psicologico                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Oggi] [Settimana] [Mese] [Tutto]              │
│                                                 │
│  ══════════════════════════════════════════════ │
│                                                 │
│  💜 STATO EMOTIVO                               │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ Umore  │ │ Gioia  │ │ Triste │ │ Rabbia │   │
│  │  7.2↑  │ │  6.5↑  │ │  2.1↓  │ │  1.8→  │   │
│  │ ▂▃▅▆▇  │ │ ▃▄▅▆▇  │ │ ▇▅▃▂▁  │ │ ▂▂▂▂▂  │   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
│  (scroll per vedere tutte le 14+ emozioni)     │
│                                                 │
│  ⚡ ATTIVAZIONE                                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ Ansia  │ │ Energia│ │ Nervos │ │ Sopraf │   │
│  │  4.1↓  │ │  6.8→  │ │  3.2↓  │ │  2.5↓  │   │
│  │ ▇▆▅▄▃  │ │ ▄▄▅▅▄  │ │ ▆▅▄▃▂  │ │ ▅▄▃▂▂  │   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
│                                                 │
│  🧠 COGNITIVO                                   │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │Chiarezz│ │Concentr│ │Ruminaz │ │Pensieri│   │
│  │  6.2→  │ │  5.8→  │ │  3.5↓  │ │  2.8↓  │   │
│  │ ▄▄▅▅▅  │ │ ▃▄▄▅▅  │ │ ▆▅▄▃▃  │ │ ▅▄▃▃▂  │   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
│                                                 │
│  💤 SOMATICO                                    │
│  ┌────────┐ ┌────────┐ ┌────────┐              │
│  │ Sonno  │ │Tensione│ │Appetito│              │
│  │  7.5↑  │ │  3.0↓  │ │  5.5→  │              │
│  │ ▂▃▅▆▇  │ │ ▆▅▄▃▂  │ │ ▄▄▅▅▅  │              │
│  └────────┘ └────────┘ └────────┘              │
│                                                 │
│  🧭 FUNZIONAMENTO                               │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ Lavoro │ │ Amore  │ │ Sociale│ │ Salute │   │
│  │  6.0↑  │ │  7.2→  │ │  5.5↑  │ │  6.8→  │   │
│  │ ▂▃▄▅▆  │ │ ▅▅▆▆▆  │ │ ▂▃▄▅▆  │ │ ▅▅▆▆▆  │   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
│                                                 │
│  💪 RISORSE PERSONALI                           │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │Autoeffi│ │Autostim│ │Gratitud│ │Motivaz │   │
│  │  7.8↑  │ │  6.5→  │ │  7.2↑  │ │  6.0→  │   │
│  │ ▃▄▅▆▇  │ │ ▄▄▅▅▅  │ │ ▃▄▅▆▇  │ │ ▄▄▅▅▅  │   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Mappatura Metriche per Dominio

| Dominio | Metriche | Fonte DB |
|---------|----------|----------|
| **Stato Emotivo** | Umore, Gioia, Tristezza, Rabbia, Paura, Apatia, Vergogna, Gelosia, Speranza, Frustrazione, Nostalgia, Eccitazione, Delusione | `sessions`, `daily_emotions` |
| **Attivazione** | Ansia, Energia, Nervosismo, Sopraffazione, Burnout, Irritabilità | `sessions`, `daily_emotions`, `daily_psychology` |
| **Cognitivo** | Chiarezza Mentale, Concentrazione, Ruminazione, Pensieri Intrusivi | `daily_psychology` |
| **Somatico** | Qualità Sonno, Tensione Fisica, Appetito, Esposizione Sole | `sessions`, `daily_psychology` |
| **Funzionamento** | Lavoro/Scuola, Amore, Sociale, Salute, Crescita | `daily_life_areas` |
| **Risorse** | Autoefficacia, Autostima, Gratitudine, Motivazione, Coping | `daily_psychology` |

---

## Componenti Tecnici

### 1. UnifiedMetricCard (Nuovo)

Card compatta e cliccabile per ogni singola metrica:

```typescript
interface UnifiedMetricCardProps {
  metricKey: string;
  label: string;
  icon: string;
  color: string;
  value: number | null;        // Media periodo
  trend: 'up' | 'down' | 'stable';
  sparklineData: number[];     // Ultimi 7 punti
  isNegative?: boolean;        // Se true, basso = buono
  onClick: () => void;
}
```

Caratteristiche:
- Dimensione: ~100x90px (compatta)
- Valore grande con colore semantico
- Mini-sparkline SVG (7 punti)
- Freccia trend con significato invertito per metriche negative
- Feedback tattile al click

### 2. ClinicalDomainSection (Nuovo)

Wrapper per ogni dominio clinico:

```typescript
interface ClinicalDomainSectionProps {
  title: string;
  icon: string;
  description?: string;
  metrics: MetricConfig[];
  metricsData: Record<string, MetricData>;
  onMetricClick: (key: string) => void;
}
```

Caratteristiche:
- Header con icona + titolo dominio
- ScrollArea orizzontale per overflow
- Griglia responsiva 2-4 colonne
- Collapse/expand opzionale

### 3. MetricDetailSheet (Estensione)

Estendere per supportare TUTTE le ~40 metriche:

```typescript
// Aggiungere casi per:
- Tutte le 14 emozioni (joy, sadness, anger, fear, apathy, shame, jealousy, hope, frustration, nostalgia, nervousness, overwhelm, excitement, disappointment)
- Tutte le 16 metriche psicologiche
- Tutte le 6 aree vita
```

### 4. Configurazione Metriche Centralizzata

Nuovo file `src/lib/clinicalDomains.ts`:

```typescript
export interface ClinicalMetric {
  key: string;
  label: string;
  icon: string;
  color: string;
  domain: 'emotional' | 'activation' | 'cognitive' | 'somatic' | 'functioning' | 'resources';
  source: 'vitals' | 'emotions' | 'psychology' | 'life_areas';
  isNegative: boolean;
  description: string;
}

export const CLINICAL_DOMAINS = [
  {
    id: 'emotional',
    label: 'Stato Emotivo',
    icon: '💜',
    description: 'Come ti senti emotivamente'
  },
  // ... altri domini
];

export const ALL_CLINICAL_METRICS: ClinicalMetric[] = [
  // ~40 metriche con configurazione completa
];
```

---

## File da Modificare

### Creare
1. `src/lib/clinicalDomains.ts` - Configurazione domini e metriche
2. `src/components/analisi/UnifiedMetricCard.tsx` - Card metrica singola
3. `src/components/analisi/ClinicalDomainSection.tsx` - Sezione dominio
4. `src/components/analisi/AnalisiRedesigned.tsx` - Nuovo layout principale

### Modificare
1. `src/components/analisi/MetricDetailSheet.tsx` - Supporto tutte le metriche
2. `src/pages/Analisi.tsx` - Integrare nuovo layout

### Deprecare (mantenere per ora, rimuovere dopo test)
- `DynamicVitalsGrid.tsx`
- `EmotionalSpectrumRadar.tsx`
- `EmotionalMixBar.tsx`
- `DeepPsychologyCard.tsx`
- `LifeBalanceRadar.tsx`

---

## Logica di Rendering

### Visibilità Sezioni
```typescript
// Mostra dominio solo se ha almeno 1 metrica con dati
const shouldShowDomain = (domain: ClinicalDomain, data: MetricData[]) => {
  return domain.metrics.some(m => data[m.key]?.value !== null);
};
```

### Time Selector Intelligente
- Mostra "Oggi" solo se ci sono dati oggi
- Sempre visibile anche senza dati nel range (per cambiare range)

### Semantic Colors
```typescript
const getScoreColor = (value: number, isNegative: boolean) => {
  if (isNegative) {
    // Per metriche negative (ansia, ruminazione): basso = verde
    if (value <= 3) return 'text-emerald-500';
    if (value <= 6) return 'text-amber-500';
    return 'text-orange-500';
  } else {
    // Per metriche positive (umore, gioia): alto = verde
    if (value >= 7) return 'text-emerald-500';
    if (value >= 4) return 'text-amber-500';
    return 'text-orange-500';
  }
};
```

---

## Vantaggi del Nuovo Design

1. **Clinicamente corretto**: Terminologia e organizzazione psicologica valida
2. **Storico universale**: Ogni singola metrica è cliccabile e mostra andamento
3. **Densità informativa**: Più dati in meno spazio
4. **Esplorazione attiva**: L'utente scopre invece di scrollare passivamente
5. **Mobile-first**: Card touch-friendly
6. **Scalabile**: Facile aggiungere nuove metriche o domini
7. **Semantico**: Colori che comunicano significato (verde = bene, anche per ansia bassa)

---

## Sequenza Implementazione

1. Creare `clinicalDomains.ts` con configurazione completa
2. Creare `UnifiedMetricCard.tsx` componente base
3. Creare `ClinicalDomainSection.tsx` wrapper
4. Estendere `MetricDetailSheet.tsx` per tutte le metriche
5. Creare nuovo layout in `Analisi.tsx`
6. Testing e polish
7. Deprecare vecchi componenti

