
# Piano di Ristrutturazione Grafici Emotivi

## Obiettivo
Unificare e migliorare tutti i grafici emotivi per mostrare dinamicamente tutte le 14 emozioni tracciate quando hanno valori > 0, con un design coerente e visivamente accattivante.

---

## 1. Creare Configurazione Centralizzata Emozioni

Creo un nuovo file `src/lib/emotionConfig.ts` che definisce:

```text
┌─────────────────────────────────────────────────────────┐
│                   EMOTION_CONFIG                         │
├─────────────────────────────────────────────────────────┤
│  PRIMARIE (5)                                           │
│  • joy      → Gioia      → 🌟 Giallo dorato            │
│  • sadness  → Tristezza  → 💧 Blu                      │
│  • anger    → Rabbia     → 🔥 Rosso                    │
│  • fear     → Paura      → 👁️ Viola scuro              │
│  • apathy   → Apatia     → ☁️ Grigio                   │
├─────────────────────────────────────────────────────────┤
│  SECONDARIE (9)                                         │
│  • shame       → Vergogna     → Rosa scuro             │
│  • jealousy    → Gelosia      → Verde scuro            │
│  • hope        → Speranza     → Azzurro cielo          │
│  • frustration → Frustrazione → Arancione              │
│  • nostalgia   → Nostalgia    → Lavanda                │
│  • nervousness → Nervosismo   → Giallo acceso          │
│  • overwhelm   → Sopraffazione→ Viola intenso          │
│  • excitement  → Eccitazione  → Magenta                │
│  • disappointment → Delusione → Grigio-blu             │
└─────────────────────────────────────────────────────────┘
```

Questo file esporterà:
- Mappa completa emozioni con label italiano, colore, icona
- Funzione helper per filtrare emozioni con valore > 0
- Categorizzazione (primarie/secondarie)

---

## 2. Aggiornare EmotionalMixBar (Home)

**Scopo**: Mostra la proporzione relativa delle emozioni negli ultimi 30 giorni

**Modifiche**:
- Importare configurazione centralizzata
- Supportare tutte 14 emozioni dinamicamente
- Mostrare solo emozioni con valore > 0
- Migliorare la barra pillola con gradiente glass
- Aggiungere tooltip al tocco per vedere dettaglio emozione

```text
┌──────────────────────────────────────────┐
│  ✨ Mix Emotivo (30 giorni)              │
├──────────────────────────────────────────┤
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  Gioia 45% | Speranza 25% | Ansia 15%...│
│                                          │
│  • Gioia 45%  • Speranza 25%  • Ansia 15%│
│  • Frustrazione 10%  • Tristezza 5%      │
└──────────────────────────────────────────┘
```

---

## 3. Rifare EmotionalSpectrumCard (Analisi)

**Scopo**: Mostra l'intensita di ogni emozione con barre orizzontali

**Modifiche**:
- Supportare tutte 14 emozioni
- Ordinare per valore decrescente
- Raggruppare visivamente primarie vs secondarie
- Aggiungere indicatore qualitativo (Alta/Media/Bassa)
- Nascondere completamente emozioni a 0

```text
┌──────────────────────────────────────────┐
│  🎭 Spettro Emotivo                      │
├──────────────────────────────────────────┤
│  EMOZIONI PRIMARIE                       │
│  Gioia      ████████████░░░░  7.2  Buona │
│  Tristezza  ████░░░░░░░░░░░░  2.1  Bassa │
│                                          │
│  EMOZIONI SECONDARIE                     │
│  Speranza   ██████████░░░░░░  6.5  Media │
│  Frustrazione ██████░░░░░░░░  4.0  Media │
└──────────────────────────────────────────┘
```

---

## 4. Rifare EmotionalSpectrumRadar (Analisi)

**Scopo**: Visualizzazione radar dello stato emotivo attuale

**Modifiche**:
- Mostrare dinamicamente solo emozioni con dati
- Minimo 3 emozioni per il radar (altrimenti nascondere)
- Massimo 8 emozioni per leggibilita
- Prioritizzare emozioni con valori piu alti
- Aggiungere legenda interattiva

```text
┌──────────────────────────────────────────┐
│  🌈 Radar Emotivo                        │
├──────────────────────────────────────────┤
│                                          │
│           Gioia                          │
│             ●                            │
│       Speranza   Tristezza               │
│           ●   ●                          │
│                                          │
│    Frustrazione   Rabbia                 │
│            ●   ●                         │
│                                          │
│  Dominante: Gioia (7.2/10)              │
└──────────────────────────────────────────┘
```

---

## 5. Aggiornare EmotionalWeather (Progress)

**Scopo**: Trend settimanale delle emozioni

**Modifiche**:
- Supportare tutte 14 emozioni nello stacked bar
- Colorare dinamicamente solo emozioni presenti
- Migliorare tooltip con nomi italiani
- Aggiungere opzione per vedere breakdown per giorno

---

## 6. Nuovo Componente: EmotionalTrends

**Scopo**: Mostra come le emozioni cambiano nel tempo

**Caratteristiche**:
- Line chart con multiple serie
- Filtro per selezionare quali emozioni vedere
- Confronto settimana vs settimana precedente
- Insight AI sulle variazioni significative

---

## 7. Hook Unificato per Emozioni

Creo `useEmotionsData.tsx` che:
- Recupera tutte 14 emozioni dal database
- Calcola medie ponderate temporali
- Filtra automaticamente emozioni a 0
- Fornisce dati formattati per ogni tipo di grafico
- Gestisce il loading state

---

## Sequenza di Implementazione

| Fase | Componente | Priorita |
|------|------------|----------|
| 1 | `emotionConfig.ts` (config centralizzata) | Alta |
| 2 | `useEmotionsData.tsx` (hook unificato) | Alta |
| 3 | `EmotionalMixBar` (Home) | Alta |
| 4 | `EmotionalSpectrumCard` (Analisi) | Alta |
| 5 | `EmotionalSpectrumRadar` (Analisi) | Media |
| 6 | `EmotionalWeather` (Progress) | Media |
| 7 | `EmotionalTrends` (nuovo) | Bassa |

---

## Design System Applicato

Tutti i grafici seguiranno il design "Liquid Glass 2026":
- Sfondo `bg-glass` con `backdrop-blur-xl`
- Bordi `border-glass-border`
- Ombre `shadow-glass`
- Animazioni spring con `framer-motion`
- Palette colori HSL coerente
- Responsive per mobile

---

## Risultato Atteso

- Tutti i grafici mostreranno le emozioni dinamicamente (solo quelle > 0)
- Design coerente tra tutti i componenti
- Esperienza utente migliorata con etichette italiane chiare
- Nessuna confusione tra grafici diversi che mostrano dati diversi
