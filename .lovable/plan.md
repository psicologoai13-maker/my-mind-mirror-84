

# Redesign Completo Sezione Analisi

## Problema Attuale
- Lista verticale di grafici separati - poco attraente
- Solo i 4 parametri vitali hanno storico cliccabile
- Emozioni, Psicologia, Aree Vita non mostrano storico individuale
- Troppo spazio occupato da grafici non interattivi

## Soluzione Proposta: "Unified Metric Cards"

Una nuova architettura dove **ogni singolo valore** è una card compatta e cliccabile che mostra:
1. Valore attuale con colore semantico
2. Mini-sparkline incorporato (7 giorni)
3. Trend indicator (freccia su/giù/stabile)
4. Click apre sheet con storico completo

### Struttura Visiva

```text
┌─────────────────────────────────────────┐
│  📊 Analisi                             │
│  Il tuo wellness a 360°                 │
├─────────────────────────────────────────┤
│                                         │
│  [Giorno] [Settimana] [Mese] [Tutto]    │  ← Selettore tempo globale
│                                         │
│  ─────── 💫 Parametri Vitali ────────   │
│  ┌──────────┐ ┌──────────┐              │
│  │ 😌 Umore │ │ 😰 Ansia │              │
│  │  7.2 ↑   │ │  4.1 ↓   │              │
│  │ ▂▃▄▅▆▇█  │ │ █▇▆▅▄▃▂  │              │
│  └──────────┘ └──────────┘              │
│  ┌──────────┐ ┌──────────┐              │
│  │ ⚡ Energ │ │ 💤 Sonno │              │
│  │  6.8 →   │ │  7.5 ↑   │              │
│  │ ▃▃▄▄▅▄▄  │ │ ▂▃▅▆▇▇█  │              │
│  └──────────┘ └──────────┘              │
│                                         │
│  ─────── 🎭 Emozioni ────────           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ 😊 Gioia │ │ 😢 Trist │ │ 😨 Paura │ │
│  │  6.5 ↑   │ │  2.1 ↓   │ │  3.0 →   │ │
│  │ ▂▃▄▅▆▇█  │ │ █▆▄▃▂▂▂  │ │ ▃▃▃▃▃▃▃  │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│  ← scroll orizzontale per altre →       │
│                                         │
│  ─────── 🧠 Psicologia ────────         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ 💫 Autoe │ │ 🧠 Chiar │ │ 🔄 Rumin │ │
│  │  7.8 ↑   │ │  6.2 →   │ │  3.5 ↓   │ │
│  │ ▂▃▄▅▆▇█  │ │ ▄▄▅▅▆▆▆  │ │ █▇▆▅▄▃▂  │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│  ← scroll orizzontale per altre →       │
│                                         │
│  ─────── 🧭 Aree della Vita ────────    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ 💼 Lavor │ │ ❤️ Amore │ │ 👥 Socia │ │
│  │  6.0 ↑   │ │  7.2 →   │ │  5.5 ↑   │ │
│  │ ▂▃▄▄▅▆▆  │ │ ▅▅▆▆▇▇▇  │ │ ▂▃▃▄▅▅▆  │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│                                         │
│  ─────── 💪 Corpo ────────              │
│  (se dati disponibili)                  │
│                                         │
└─────────────────────────────────────────┘
```

### Comportamento Click

Cliccando su qualsiasi card si apre il `MetricDetailSheet` esistente (già funzionante) ma esteso per supportare TUTTE le metriche:

```text
┌─────────────────────────────────────────┐
│                    ─                    │  ← drag handle
│  ┌────────────────────────────────────┐ │
│  │ 😊  Gioia                          │ │
│  │     Storico settimanale            │ │
│  └────────────────────────────────────┘ │
│                                         │
│  ┌─────────────┐  ┌─────────────┐       │
│  │   Media     │  │   Trend     │       │
│  │    6.5      │  │     ↑       │       │
│  │   /10      │  │ In aumento  │       │
│  └─────────────┘  └─────────────┘       │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │                                     ││
│  │        📈 Area Chart Storico        ││
│  │                                     ││
│  │   ▂▃▄▅▆▇█                          ││
│  │  ───────────────────────────        ││
│  │  Lu Ma Me Gi Ve Sa Do               ││
│  │                                     ││
│  └─────────────────────────────────────┘│
│                                         │
│  12 rilevazioni nel periodo             │
└─────────────────────────────────────────┘
```

## Vantaggi del Nuovo Design

1. **Consistenza**: Ogni metrica ha lo stesso trattamento visivo
2. **Densità**: Più informazioni in meno spazio (no grafici giganti)
3. **Storico universale**: Ogni valore è cliccabile per vedere l'andamento
4. **Interattività**: L'utente esplora attivamente invece di scrollare passivamente
5. **Mobile-first**: Card compatte perfette per touch

## Dettagli Tecnici

### Nuovi Componenti

1. **UnifiedMetricCard** - Card compatta con:
   - Icon + label
   - Valore grande con colore semantico
   - Mini sparkline (ultimi 7 punti)
   - Trend arrow
   - onClick handler

2. **CategorySection** - Sezione con:
   - Titolo + icon
   - ScrollArea orizzontale per overflow
   - Griglia 2 colonne (visibili) + scroll

3. **MetricDetailSheet** (estensione) - Aggiungere supporto per:
   - Emozioni (joy, sadness, anger, fear, apathy, etc.)
   - Psicologia (rumination, burnout, self_efficacy, etc.)
   - Aree vita (work, love, social, health, growth, school)

### Modifiche Database/Backend

Nessuna - tutti i dati sono già tracciati in:
- `daily_emotions` - 14 emozioni
- `daily_psychology` - 16 metriche psicologiche
- `daily_life_areas` - 6 aree
- `sessions` + `daily_checkins` - 4 vitali

### File da Modificare

1. **Creare**: `src/components/analisi/UnifiedMetricCard.tsx`
2. **Creare**: `src/components/analisi/CategorySection.tsx`
3. **Modificare**: `src/components/analisi/MetricDetailSheet.tsx` - estendere per tutte le metriche
4. **Sostituire**: `src/pages/Analisi.tsx` - nuovo layout
5. **Rimuovere/Deprecare**:
   - `DynamicVitalsGrid.tsx` (sostituito da UnifiedMetricCard)
   - `EmotionalSpectrumRadar.tsx` (radar ridondante)
   - `EmotionalMixBar.tsx` (bar ridondante)
   - `DeepPsychologyCard.tsx` (accordion sostituito da cards)
   - `CorrelationCard.tsx` (può rimanere come feature opzionale)

### Configurazione Metriche

Estendere `src/lib/chartLibrary.ts` con configurazione completa per tutte le ~40 metriche:

```typescript
// Esempio struttura
{
  key: 'joy',
  label: 'Gioia',
  icon: '😊',
  color: 'hsl(50, 90%, 50%)',
  category: 'emotions',
  isNegative: false,
  description: 'Felicità e contentezza'
}
```

## Tempistiche Stimate

- UnifiedMetricCard: 30 min
- CategorySection: 20 min
- MetricDetailSheet esteso: 40 min
- Analisi.tsx nuovo layout: 30 min
- Testing e polish: 20 min

**Totale: ~2.5 ore**

