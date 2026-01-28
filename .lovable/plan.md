

# Piano: Unificazione Habits e Obiettivi con Sistema Check-in Intelligente

## Panoramica

Unificare **Habits** e **Obiettivi** in un'unica pagina con tab, distinguendo tra:
- **Tracker automatici** (dati da dispositivi/app esterne come passi)
- **Tracker manuali** (inserimento utente come acqua, meditazione)
- **Obiettivi a lungo termine** (peso target, risparmio, esami)

L'inserimento dati sara centralizzato nel sistema **Check-in** della Home per massima semplicita.

---

## Analisi Differenze Concettuali

| Caratteristica | Habits | Obiettivi |
|----------------|--------|-----------|
| Frequenza | Giornaliera/ricorrente | Una tantum con deadline |
| Completamento | Reset ogni giorno | Permanente quando raggiunto |
| Progresso | Streak (giorni consecutivi) | % verso target finale |
| Fonte dati | Manuale o Automatica | Sempre manuale |
| Feedback | "Completato oggi ✓" | "Obiettivo raggiunto! 🎉" |

---

## Architettura Proposta

### 1. Tipi di Tracker

```text
┌─────────────────────────────────────────────────────────┐
│                    TRACKER TYPES                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🤖 AUTOMATICI (richiedono permessi)                    │
│  ├── 👟 Passi (Apple Health / Google Fit)              │
│  ├── 😴 Ore sonno (Health Kit)                         │
│  ├── ❤️ Battito cardiaco                               │
│  └── 🔥 Calorie bruciate                               │
│                                                         │
│  ✏️ MANUALI GIORNALIERI (habits)                        │
│  ├── 💧 Acqua                                          │
│  ├── 🧘 Meditazione                                    │
│  ├── 🚭 Sigarette (abstain)                            │
│  └── ... altri                                         │
│                                                         │
│  🎯 OBIETTIVI A LUNGO TERMINE                           │
│  ├── ⚖️ Raggiungere peso X kg                          │
│  ├── 💰 Risparmiare X €                                │
│  └── 📚 Completare X esami                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2. Flusso Dati Unificato

```text
                    ┌──────────────────┐
                    │     HOME         │
                    │   Check-in       │
                    │   (4-8 box)      │
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Vitali/Psico   │  │  Habits Manua.  │  │   Obiettivi     │
│  (mood, ansia)  │  │  (acqua, medita)│  │  (peso oggi)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ▼
                    ┌──────────────────┐
                    │   daily_*        │
                    │   tables DB      │
                    └──────────────────┘
```

---

## Nuova Struttura Pagina Obiettivi

### Tab Layout

```text
┌─────────────────────────────────────────┐
│           I Tuoi Progressi              │
├─────────────────────────────────────────┤
│  [🎯 Traguardi]  [📊 Daily Tracker]     │
├─────────────────────────────────────────┤
│                                         │
│  ╔═══════════════════════════════════╗  │
│  ║  TAB TRAGUARDI:                   ║  │
│  ║  - Obiettivi con deadline         ║  │
│  ║  - Progress bar verso target      ║  │
│  ║  - AI feedback                    ║  │
│  ╚═══════════════════════════════════╝  │
│                                         │
│  ╔═══════════════════════════════════╗  │
│  ║  TAB DAILY TRACKER:               ║  │
│  ║  - Habits giornaliere             ║  │
│  ║  - Streak counter                 ║  │
│  ║  - Quick log inline               ║  │
│  ╚═══════════════════════════════════╝  │
│                                         │
└─────────────────────────────────────────┘
```

---

## Integrazione Check-in Unificato

### Principio: Un Solo Punto di Inserimento

L'utente NON deve inserire dati in posti diversi. Il **Check-in della Home** e l'unico punto di ingresso:

```text
HOME CHECK-IN (4 box prioritari)
┌────────┬────────┬────────┬────────┐
│ 😊     │ 💧     │ ⚖️     │ 🧘     │
│ Umore  │ Acqua  │ Peso   │ Medita │
└────────┴────────┴────────┴────────┘
     │        │        │        │
     ▼        ▼        ▼        ▼
  daily_   daily_   body_    daily_
  checkins habits   metrics  habits
```

### Logica di Priorita AI

L'AI seleziona i 4-8 box giornalieri in base a:
1. **Obiettivi attivi** (peso se ha obiettivo peso)
2. **Habits attive** (acqua se traccia acqua)
3. **Parametri vitali** (mood sempre)
4. **Aree vita** (lavoro se focus lavoro)

---

## Modifiche Database

### Nuovi Campi `user_habits_config`

```sql
ALTER TABLE user_habits_config ADD COLUMN IF NOT EXISTS
  data_source TEXT DEFAULT 'manual'; 
  -- 'manual', 'apple_health', 'google_fit'
  
ALTER TABLE user_habits_config ADD COLUMN IF NOT EXISTS
  auto_sync_enabled BOOLEAN DEFAULT false;
  
ALTER TABLE user_habits_config ADD COLUMN IF NOT EXISTS
  last_auto_sync_at TIMESTAMPTZ;
```

### Mapping Habits Automatiche

```typescript
const AUTO_SYNC_HABITS = {
  steps: {
    sources: ['apple_health', 'google_fit'],
    permission: 'health_data',
    syncInterval: 'hourly',
  },
  sleep: {
    sources: ['apple_health', 'google_fit'],
    permission: 'health_data',
    syncInterval: 'daily',
  },
  // Future: heart_rate, calories_burned
};
```

---

## Componenti da Modificare/Creare

### File da Eliminare
| File | Motivo |
|------|--------|
| `src/pages/Habits.tsx` | Unificata in Objectives |
| `/habits` route | Rimossa |

### File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/Objectives.tsx` | Aggiungere tab system con Habits |
| `src/components/layout/BottomNav.tsx` | Rimuovere link /habits, rinominare tab |
| `src/App.tsx` | Rimuovere route /habits |
| `src/components/habits/HabitCard.tsx` | Cambiare "Obiettivo raggiunto" → "Completato oggi ✓" |
| `src/components/habits/HabitTrackerSection.tsx` | Mostrare solo top 4 habits in Home |
| `src/hooks/usePersonalizedCheckins.tsx` | Integrare habits nel sistema check-in |

### File da Creare

| File | Descrizione |
|------|-------------|
| `src/components/objectives/ObjectivesTabContent.tsx` | Tab traguardi |
| `src/components/objectives/DailyTrackerTabContent.tsx` | Tab habits giornaliere |
| `src/components/objectives/UnifiedProgressPage.tsx` | Container con tabs |
| `src/hooks/useHealthPermissions.tsx` | Gestione permessi Health (future) |

---

## Nuova UX Home

### Sezione Check-in Migliorata

```text
┌─────────────────────────────────────────┐
│ ✨ Check-in                    2 fatti │
├─────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │ 😊      │ │ 💧      │ │ ⚖️      │ ...│
│ │ Umore   │ │ Acqua   │ │ Peso    │    │
│ └─────────┘ └─────────┘ └─────────┘    │
└─────────────────────────────────────────┘

Sotto: 
┌─────────────────────────────────────────┐
│ 📊 Le Tue Habits              Vedi →   │
├─────────────────────────────────────────┤
│ Solo habits NON nel check-in:           │
│ (es. tracker automatici come passi)     │
└─────────────────────────────────────────┘
```

### Logica di Visualizzazione Home

1. **Check-in box**: Mostra elementi che richiedono input manuale oggi
2. **Habits section** (sotto): Mostra solo tracker automatici o habits gia completate
3. **Se tutti completati**: Check-in sparisce, mostra riassunto

---

## Flusso Inserimento Dati

### Prima (Confuso)
```
Utente vuole registrare acqua:
  ├── Opzione 1: Home → Check-in → Acqua (se presente)
  ├── Opzione 2: Home → Habits Section → Acqua card → +
  └── Opzione 3: /habits → Acqua card → +
```

### Dopo (Unificato)
```
Utente vuole registrare acqua:
  └── Home → Check-in → Acqua (sempre presente se attivo)
      └── Click → Input valore → Salva
          └── Aggiorna daily_habits + invalida query
```

---

## Gestione Habits Automatiche (Future)

### Step 1: UI Preparatoria (Ora)
```typescript
// In HabitTrackerSection
if (habit.data_source !== 'manual') {
  return (
    <div className="opacity-60">
      <span>🔄 {habit.todayValue} passi</span>
      <span className="text-xs">Sincronizzato</span>
    </div>
  );
}
```

### Step 2: Integrazione Health (Post-Capacitor)
```typescript
// useHealthPermissions.tsx
const requestHealthPermission = async () => {
  // Solo dopo conversione nativa con Capacitor
  // Usa plugin: @nicwehrli/capacitor-healthkit
};
```

---

## Rinomina e Differenziazione

### Vecchio → Nuovo

| Vecchio | Nuovo |
|---------|-------|
| "Obiettivo raggiunto!" (habits) | "Completato oggi ✓" |
| "Habits" (nav) | Rimosso |
| "Obiettivi" (nav) | "Progressi" |
| Progress bar habits | Circular progress o barra diversa |

### Stile Visivo Differenziato

| Elemento | Habits | Obiettivi |
|----------|--------|-----------|
| Icona completamento | ✓ checkmark | 🎉 celebration |
| Colore progress | Blue/Primary | Gradient emerald |
| Streak badge | 🔥 fiamma | N/A |
| Reset | Ogni giorno | Mai |

---

## Sequenza Implementazione

### Fase 1: Ristrutturazione Base
1. Modificare `HabitCard.tsx` - cambiare testo completamento
2. Creare `DailyTrackerTabContent.tsx` 
3. Creare `ObjectivesTabContent.tsx`
4. Modificare `Objectives.tsx` con tab system

### Fase 2: Unificazione Check-in
5. Modificare `usePersonalizedCheckins.tsx` - integrare habits attive
6. Modificare `SmartCheckinSection.tsx` - supporto habits
7. Aggiornare edge function `ai-checkins` - includere habits nella priorita

### Fase 3: Cleanup
8. Rimuovere `/habits` route da `App.tsx`
9. Rimuovere `Habits.tsx`
10. Aggiornare `BottomNav.tsx` - rimuovere habits, rinominare Obiettivi

### Fase 4: Polish
11. Aggiungere colonne DB per data_source
12. Preparare UI per habits automatiche (placeholder)
13. Test e refinement

---

## Risultato Finale

### Esperienza Utente Semplificata

1. **Home**: Check-in unico per TUTTO (mood, habits, obiettivi con misura)
2. **Progressi page**: Due tab chiare
   - 🎯 Traguardi: obiettivi a lungo termine
   - 📊 Daily: habits giornaliere con streak
3. **Nessuna confusione**: 
   - Habits = azioni ricorrenti → "Completato oggi"
   - Obiettivi = milestone → "Raggiunto!"

### Vantaggi

- Un solo punto di inserimento dati
- Distinzione chiara habits vs obiettivi
- Preparazione per sync automatico Health
- Meno pagine = meno confusione
- AI puo mixare habits e obiettivi nel check-in giornaliero

