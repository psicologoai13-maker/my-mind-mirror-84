
# Piano: Modernizzazione Daily Tracker e Sistema di Creazione Habits via AI

## Problema Identificato

1. **UI Inconsistente**: Il Daily Tracker usa una grafica vecchia (Sheet con griglia di selezione) mentre gli Obiettivi hanno il design moderno "Liquid Glass"
2. **Display Errato**: Alcune habit come "No Junk Food" (abstain type) non mostrano correttamente lo stato
3. **Aggiunta Manuale**: Attualmente si selezionano habits da una lista predefinita invece che parlando con Aria

## Soluzione Proposta

### Fase 1: Unificazione UI Daily Tracker

**1.1 Aggiornare DailyTrackerTabContent**
- Rimuovere il sistema Sheet con griglia di selezione
- Sostituire il bottone "Aggiungi" con apertura di chat Aria (come ObjectiveQuizModal)
- Mantenere la card "Completate oggi X/Y" con stile glass

**1.2 Correggere HabitCard**
- Fix per habits di tipo "abstain" (No Junk Food): mostrare correttamente stato "Oggi OK" vs "Non registrato"
- Uniformare padding e margini con ObjectiveCard

### Fase 2: Sistema AI-Driven Habit Creation

**2.1 Nuovo Componente: HabitCreationChat**
- Interfaccia chat identica a ObjectiveCreationChat
- Aria rileva automaticamente il tipo di habit dal linguaggio naturale
- Chiede preferenze di aggiornamento:
  - **Auto-sync**: "Questa habit può essere sincronizzata automaticamente. Vuoi che ti chieda accesso a Apple Health/Google Fit?"
  - **Check-in**: "Come preferisci aggiornare questa habit? Nel check-in giornaliero o parlandone in chat?"

**2.2 Nuovo Edge Function: create-habit-chat**
```text
Flusso conversazione AI:
1. Utente: "Voglio tracciare quanta acqua bevo"
2. Aria: "Ottimo! Quanti bicchieri d'acqua è il tuo obiettivo giornaliero?"
3. Utente: "8 bicchieri"
4. Aria: "Perfetto! Come preferisci aggiornarlo? 
   - Nel check-in giornaliero (ti chiederò ogni giorno)
   - Parlandone in chat quando ti ricordi"
5. Utente: "Check-in"
6. Aria: [CREA HABIT] "Fatto! Ho aggiunto 'Acqua 💧' - ti chiederò nel check-in!"
```

**2.3 Estensione Schema Database**
Aggiungere a `user_habits_config`:
```sql
update_method TEXT DEFAULT 'checkin' -- 'checkin', 'chat', 'auto_sync'
requires_permission BOOLEAN DEFAULT FALSE
permission_granted BOOLEAN DEFAULT FALSE
```

### Fase 3: Logica Raccolta Dati Intelligente

**3.1 Per Habits con update_method = 'checkin'**
- Appaiono nella Home durante il check-in giornaliero
- Una volta aggiornate, scompaiono per quel giorno

**3.2 Per Habits con update_method = 'chat'**
- Aria chiede proattivamente durante le sessioni: "Quante volte hai fatto cardio questa settimana?"
- Se l'utente non apre l'app, i dati vengono raccolti nella prossima conversazione

**3.3 Per Habits con update_method = 'auto_sync'**
- Mostrano messaggio "Richiede app nativa"
- Quando disponibile, chiedono permesso accesso dati esterni

### Fase 4: UI Components

**4.1 Nuovo Modal: HabitQuizModal**
```text
┌─────────────────────────────────────────┐
│  ✨ Nuova Habit                          │
├─────────────────────────────────────────┤
│                                         │
│  [Chat con Aria simile a               │
│   ObjectiveCreationChat]                │
│                                         │
│  Aria: Che abitudine vuoi tracciare?   │
│  [Input message]                    📤  │
│                                         │
└─────────────────────────────────────────┘
```

**4.2 HabitCard Migliorato**
- Aggiungere menu 3 punti come ObjectiveCard
- Opzioni: Modifica target, Cambia metodo aggiornamento, Elimina
- Per habits con update_method != 'hidden': bottone "Aggiorna" visibile

## Dettagli Tecnici

### File da Creare
1. `src/components/habits/HabitCreationChat.tsx` - Chat AI per creazione habits
2. `src/components/habits/HabitQuizModal.tsx` - Modal contenitore
3. `supabase/functions/create-habit-chat/index.ts` - Edge function AI

### File da Modificare
1. `src/components/objectives/DailyTrackerTabContent.tsx` - Nuovo sistema aggiunta
2. `src/components/habits/HabitCard.tsx` - Menu impostazioni + fix abstain
3. `src/hooks/useHabits.tsx` - Supporto update_method

### Migrazione Database
```sql
ALTER TABLE user_habits_config 
ADD COLUMN update_method TEXT DEFAULT 'checkin',
ADD COLUMN requires_permission BOOLEAN DEFAULT FALSE,
ADD COLUMN permission_granted BOOLEAN DEFAULT FALSE;
```

## Sistema Prompt AI (create-habit-chat)

```text
Sei Aria, aiuti a creare abitudini personalizzate.

CATEGORIE HABITS:
- health: Salute (sonno, acqua, vitamine)
- fitness: Fitness (esercizio, cardio, yoga)
- mental: Mente (meditazione, gratitudine)
- nutrition: Alimentazione (pasti sani, no junk food)
- bad_habits: Vizi da evitare (sigarette, alcol)
- productivity: Produttività (lettura, focus)
- social: Social (socializzare, chiamate)

TIPI INPUT:
- toggle: Sì/No (meditazione, esercizio)
- counter: +/- con target (acqua, gratitudine)
- abstain: Obiettivo = 0 (sigarette, junk food)
- numeric: Valore diretto (ore sonno, peso)
- range: Opzioni preset (caffè: 0, 1-2, 3-4, 5+)

METODI AGGIORNAMENTO:
- checkin: Appare nel check-in giornaliero Home
- chat: Aria chiede durante le sessioni
- auto_sync: Richiede permesso app esterne

FLOW:
1. Capire cosa vuole tracciare
2. Determinare categoria e tipo input
3. Chiedere target giornaliero (se applicabile)
4. Chiedere metodo aggiornamento preferito
5. Creare habit
```

## Risultato Atteso

L'utente potrà:
1. Aprire "Aggiungi Habit" → Si apre chat con Aria
2. Descrivere liberamente cosa vuole tracciare
3. Aria fa domande per capire tipo e preferenze
4. Habit creata automaticamente con il metodo di aggiornamento scelto
5. Se sceglie check-in → appare nella Home
6. Se sceglie chat → Aria chiede durante le sessioni
