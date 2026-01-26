

# Piano: Ristrutturazione Navigazione + Sistema Obiettivi Espanso

## Panoramica

Trasformare l'app da "strumento di salute mentale" a **"compagno di vita completo"** con:
1. Sezione **Obiettivi** dedicata nella bottom nav (al posto di Diario)
2. Hub centrale **Aria** (chat/voce/diari unificati) con icona differenziata
3. Obiettivi espansi oltre la salute mentale (fitness, studio, lavoro, relazioni)

## Nuova Struttura Navigazione

```
┌─────────────────────────────────────────────────────────┐
│                    NUOVA BOTTOM NAV                      │
├─────────┬─────────┬─────────────┬─────────┬─────────────┤
│  Home   │ Analisi │    ARIA     │Obiettivi│   Profilo   │
│   🏠    │   📊    │  ✨ (orb)   │   🎯    │     👤      │
│    /    │/analisi │   /aria     │/obiettivi│  /profile  │
└─────────┴─────────┴─────────────┴─────────┴─────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │    HUB ARIA (nuovo)   │
              ├───────────────────────┤
              │ • Chat testuale       │
              │ • Voce (Zen Modal)    │
              │ • Diari tematici      │
              │ • Cronologia sessioni │
              └───────────────────────┘
```

## Design del Pulsante Centrale "Aria"

Al posto dell'icona `MessageCircle`, useremo un **orb luminoso stilizzato** che richiama il design della voce:
- Icona custom: cerchio con gradiente sottile + sparkle
- Colore: gradiente sage-to-lavender (coerente con ZenVoiceModal)
- Effetto: leggero glow animato (non aggressivo)
- Al tap: apre la nuova pagina `/aria` (non più popup scelta)

## Nuove Categorie Obiettivi

### Categorie Espanse

| Categoria | Icona | Obiettivi Esempio |
|-----------|-------|-------------------|
| **Mente** | 🧠 | Ridurre ansia, Dormire meglio, Stabilità emotiva |
| **Corpo** | 💪 | Perdere peso, Allenarsi regolarmente, Mangiare sano |
| **Studio** | 📚 | Superare esami, Concentrazione, Imparare lingua |
| **Lavoro** | 💼 | Promozione, Nuove skill, Work-life balance |
| **Relazioni** | 💕 | Migliorare comunicazione, Trovare partner, Amicizie |
| **Crescita** | 🌱 | Meditazione quotidiana, Leggere di più, Hobby nuovo |
| **Finanze** | 💰 | Risparmiare, Budget, Investire |

### Schema Dati per Obiettivi Custom

```sql
-- Nuova tabella per obiettivi personalizzati
CREATE TABLE user_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL, -- 'mind', 'body', 'study', 'work', 'relationships', 'growth', 'finance'
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC, -- Es: 70 (kg), 10 (libri), 5 (esami)
  current_value NUMERIC,
  unit TEXT, -- 'kg', 'books', 'exams', 'hours', etc.
  deadline DATE,
  status TEXT DEFAULT 'active', -- 'active', 'achieved', 'paused', 'abandoned'
  ai_feedback TEXT, -- Feedback AI periodico
  progress_history JSONB DEFAULT '[]', -- [{date, value, note}]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Nuova Pagina: Aria Hub (`/aria`)

### Layout

```
┌─────────────────────────────────────────┐
│ ← Indietro        Aria           ⚙️    │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │        INIZIA SESSIONE           │  │
│  │  ┌─────────┐    ┌─────────┐      │  │
│  │  │  Chat   │    │  Voce   │      │  │
│  │  │   💬    │    │   🎙️    │      │  │
│  │  └─────────┘    └─────────┘      │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ─── I Tuoi Quaderni ───────────────   │
│  ┌────────┐ ┌────────┐                 │
│  │ Amore  │ │Lavoro  │ ← Scroll H     │
│  │   ❤️   │ │   💼   │                 │
│  └────────┘ └────────┘                 │
│                                         │
│  ─── Cronologia ────────────────────   │
│  ┌─────────────────────────────────┐   │
│  │ 📅 Oggi, 14:30 • Chat • 15min   │   │
│  │ 📅 Ieri, 20:00 • Voce • 8min    │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

## Nuova Pagina: Obiettivi (`/obiettivi`)

### Layout

```
┌─────────────────────────────────────────┐
│        I Tuoi Obiettivi           ➕    │
├─────────────────────────────────────────┤
│                                         │
│  ── Obiettivi Attivi ───────────────   │
│  ┌─────────────────────────────────┐   │
│  │ 🎯 Perdere 5kg                  │   │
│  │ ████████░░░░░░░░ 60% • -3kg     │   │
│  │ "Stai andando alla grande!"     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📚 Superare esame Statistica    │   │
│  │ ██████░░░░░░░░░░ 40% • 15gg     │   │
│  │ "Aumenta le sessioni studio"    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ── Categorie ──────────────────────   │
│  [🧠 Mente] [💪 Corpo] [📚 Studio]     │
│  [💼 Lavoro] [💕 Relazioni] [🌱 ...]   │
│                                         │
│  ── Traguardi Raggiunti ────────────   │
│  ✅ Dormire 7h/notte (15 Gen)          │
│  ✅ Meditare 30 giorni (2 Gen)         │
│                                         │
└─────────────────────────────────────────┘
```

### Funzionalità Obiettivi

1. **Creazione Custom**: L'utente può aggiungere obiettivi con titolo, target, deadline
2. **Tracking Automatico**: L'AI rileva progressi dalle conversazioni
3. **Feedback AI Periodico**: Ogni settimana Aria commenta i progressi
4. **Milestone**: Sub-obiettivi per obiettivi grandi
5. **Storico**: Visualizzazione traguardi raggiunti

## File da Creare/Modificare

### Nuovi File

| File | Descrizione |
|------|-------------|
| `src/pages/Aria.tsx` | Hub centrale per chat, voce, diari |
| `src/pages/Objectives.tsx` | Pagina obiettivi dedicata |
| `src/components/objectives/ObjectiveCard.tsx` | Card singolo obiettivo |
| `src/components/objectives/NewObjectiveModal.tsx` | Modal creazione obiettivo |
| `src/components/objectives/CategoryChips.tsx` | Filtri per categoria |
| `src/components/aria/SessionTypeSelector.tsx` | Selettore chat/voce |
| `src/hooks/useObjectives.tsx` | Hook per gestione obiettivi |

### File da Modificare

| File | Modifiche |
|------|-----------|
| `src/components/layout/BottomNav.tsx` | Nuova struttura nav, icona Aria, path /obiettivi |
| `src/App.tsx` | Nuove routes /aria e /obiettivi |
| `src/pages/Onboarding.tsx` | Aggiunta categorie obiettivi espanse |
| `supabase/functions/process-session/index.ts` | Rilevamento progressi obiettivi non-mentali |
| `supabase/functions/ai-chat/index.ts` | Conoscenza obiettivi utente per coaching |

### Migrazione Database

```sql
-- Nuova tabella obiettivi
CREATE TABLE user_objectives (...);

-- Espansione goal configs per nuove categorie
-- Trigger per aggiornamento automatico progressi
```

## Integrazione AI con Obiettivi

L'AI (Aria) verrà aggiornata per:
1. **Riconoscere** quando l'utente parla di obiettivi non-mentali
2. **Tracciare** progressi automaticamente ("Ho perso 2kg!" → aggiorna obiettivo)
3. **Motivare** con coaching specifico per categoria
4. **Celebrare** traguardi raggiunti
5. **Adattare** domande check-in in base agli obiettivi attivi

## Riepilogo Visivo Cambiamenti

```
PRIMA:
[Home] [Analisi] [💬 Sessione] [Diario] [Profilo]
                      ↓
              popup: Chat/Voce

DOPO:
[Home] [Analisi] [✨ Aria] [Obiettivi] [Profilo]
                     ↓
           pagina: Chat/Voce/Diari/Cronologia
```

## Benefici

1. **Obiettivi in primo piano**: Visibilità costante nella nav principale
2. **Hub unificato Aria**: Tutto in un posto, meno confusione
3. **Espansione use case**: Non solo salute mentale, ma life coaching completo
4. **Engagement**: Gli utenti tornano per tracciare obiettivi diversi
5. **Retention**: Obiettivi a lungo termine creano abitudine

