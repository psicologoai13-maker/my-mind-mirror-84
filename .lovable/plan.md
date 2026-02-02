
# Piano: Trasformazione Obiettivi e Habits a Gestione Esclusiva AI

## Panoramica

Eliminare tutti gli inserimenti manuali per obiettivi e habits, centralizzando la gestione esclusivamente tramite conversazioni con Aria (sessioni e diari). L'unica eccezione sono le **habits auto_sync** (passi, battito cardiaco) che continueranno ad avere tracking automatico.

---

## Impatto Utente

**Prima**: L'utente poteva creare e aggiornare habits/obiettivi manualmente tramite modal, pulsanti +/-, e check-in grid.

**Dopo**: L'utente parla con Aria e lei:
1. Rileva nuovi obiettivi/habits dalle conversazioni
2. Chiede conferma prima di aggiungerli
3. Aggiorna i progressi quando l'utente menziona risultati
4. Mostra tutto in modo read-only nelle tab Progressi

---

## Modifiche Tecniche

### Fase 1: Rimozione UI Manuali

#### 1.1 Tab "Traguardi" (Obiettivi)
**File**: `src/components/objectives/ObjectivesTabContent.tsx`
- Rimuovere pulsante "+ Nuovo"
- Rimuovere `ObjectiveQuizModal`
- Card obiettivi diventano solo visualizzazione (no pulsante aggiorna progresso)
- Aggiungere messaggio: "Parla con Aria per aggiungere o aggiornare obiettivi"

#### 1.2 Tab "Daily Tracker" (Habits)
**File**: `src/components/objectives/DailyTrackerTabContent.tsx`
- Rimuovere pulsante "Aggiungi"
- Rimuovere `HabitQuizModal`
- Rimuovere apertura di `HabitBatchModal` per aggiornamento manuale
- Mantenere solo visualizzazione read-only delle habits
- Eccezione: habits con `data_source: 'auto_sync'` mostrano ancora status auto-sincronizzato

#### 1.3 Home Check-in Grid
**File**: `src/components/home/SmartCheckinSection.tsx`
- Rimuovere items di tipo `habit` dalla griglia (eccetto auto_sync)
- Rimuovere items di tipo `objective` dalla griglia
- Mantenere solo: vitals, emotions, life_areas, psychology

#### 1.4 Sezione Habits Home (se esiste separatamente)
**File**: `src/components/habits/HabitTrackerSection.tsx`
- Rimuovere completamente o convertire a read-only display

### Fase 2: Potenziamento AI per Gestione Habits/Obiettivi

#### 2.1 Aggiornamento `process-session`
**File**: `supabase/functions/process-session/index.ts`

Aggiungere istruzioni specifiche per:

```text
═══════════════════════════════════════════════
🔄 GESTIONE HABITS VIA CONVERSAZIONE
═══════════════════════════════════════════════

RILEVAMENTO NUOVE HABITS:
Quando l'utente dice:
- "Voglio iniziare a meditare ogni giorno"
- "Devo smettere di fumare"
- "Voglio bere più acqua"

→ Aggiungi a "habits_to_create":
{
  "habit_type": "meditation|cigarettes|water|...",
  "label": "Meditazione",
  "daily_target": 1,
  "streak_type": "daily|abstain",
  "input_method": "toggle|counter|abstain",
  "update_method": "chat", // SEMPRE "chat" per gestione AI
  "ai_confirmation_needed": true
}

AGGIORNAMENTO PROGRESSI HABITS:
Quando l'utente dice:
- "Oggi ho meditato 20 minuti"
- "Ho bevuto 6 bicchieri d'acqua"  
- "Non ho fumato oggi!"
- "Ieri sono andato in palestra"

→ Aggiungi a "habits_to_update":
{
  "habit_type": "meditation",
  "value": 20,
  "date": "YYYY-MM-DD", // Oggi o data menzionata
  "note": "Sessione mattutina"
}

REGOLE:
- update_method = "chat" significa che l'habit si aggiorna SOLO tramite conversazione
- Aria deve CONFERMARE prima di creare nuove habits
- Aria deve CELEBRARE quando l'utente completa habits
```

#### 2.2 Nuovo Endpoint per Creazione AI-Driven
**File**: `supabase/functions/process-session/index.ts` (estensione)

Aggiungere logica per:
1. Salvare automaticamente habits rilevate con `ai_confirmation_needed: true`
2. Inserire in `pending_habit_suggestions` o creare direttamente se esplicito
3. Salvare aggiornamenti habits in `daily_habits` quando menzionati

#### 2.3 Aggiornamento `ai-chat` per Risposte Contestuali
**File**: `supabase/functions/ai-chat/index.ts`

Aggiungere al system prompt di Aria:

```text
GESTIONE OBIETTIVI E HABITS:
- Tu sei l'UNICO modo per creare e aggiornare habits/obiettivi
- Quando l'utente menziona progressi, REGISTRALI attivamente
- Quando rilevi un nuovo obiettivo/habit, CHIEDI conferma:
  "Ho capito che vuoi [X]. Vuoi che lo aggiunga ai tuoi traguardi?"
- Quando l'utente aggiorna un progresso, CELEBRA e conferma:
  "Perfetto! Ho registrato [X]. Ottimo lavoro!"
```

### Fase 3: Nuovo Flusso Dati

#### 3.1 Schema Output `process-session`
Aggiungere al JSON di output:

```typescript
interface ProcessSessionOutput {
  // ... existing fields ...
  
  // NUOVO: Habits gestite da AI
  habits_to_create?: {
    habit_type: string;
    label: string;
    daily_target: number;
    streak_type: 'daily' | 'abstain';
    needs_user_confirmation: boolean;
  }[];
  
  habits_to_update?: {
    habit_type: string;
    value: number;
    date: string;
    note?: string;
  }[];
  
  // NUOVO: Flag per indicare che l'utente ha confermato
  user_confirmed_habit?: string; // habit_type confermato
}
```

#### 3.2 Persistenza Automatica
In `process-session`, dopo l'analisi AI:

```typescript
// Salva aggiornamenti habits
if (habits_to_update?.length > 0) {
  for (const update of habits_to_update) {
    await supabase.from('daily_habits').upsert({
      user_id,
      date: update.date,
      habit_type: update.habit_type,
      value: update.value,
      notes: update.note
    }, { onConflict: 'user_id,date,habit_type' });
  }
}
```

### Fase 4: UI Read-Only Migliorata

#### 4.1 Nuovo `HabitDisplayCard` (read-only)
**File**: `src/components/habits/HabitDisplayCard.tsx` (nuovo)

```tsx
// Card che mostra:
// - Icona + Nome habit
// - Valore attuale / Target
// - Streak corrente
// - "Ultimo aggiornamento via Aria"
// - NO pulsanti di modifica
```

#### 4.2 Nuovo `ObjectiveDisplayCard` (read-only)
Modificare `ObjectiveCard.tsx` per:
- Rimuovere menu azioni (modifica, elimina)
- Rimuovere click per aggiornare progresso
- Aggiungere badge "Gestito da Aria"
- Mantenere solo visualizzazione progresso

#### 4.3 Call-to-Action per Aria
In entrambe le tab, aggiungere sezione:

```tsx
<div className="text-center p-4 bg-glass rounded-2xl">
  <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
  <p className="text-sm text-muted-foreground">
    Parla con Aria per aggiornare i tuoi progressi
  </p>
  <Button onClick={navigateToAria}>
    Vai ad Aria
  </Button>
</div>
```

---

## File da Modificare/Eliminare

| File | Azione |
|------|--------|
| `ObjectivesTabContent.tsx` | Rimuovere creazione manuale, rendere read-only |
| `DailyTrackerTabContent.tsx` | Rimuovere creazione/update manuale |
| `ObjectiveQuizModal.tsx` | **ELIMINARE** |
| `ObjectiveCreationChat.tsx` | **ELIMINARE** |
| `HabitQuizModal.tsx` | **ELIMINARE** |
| `HabitCreationChat.tsx` | **ELIMINARE** |
| `HabitBatchModal.tsx` | **ELIMINARE** o convertire a read-only |
| `ProgressUpdateModal.tsx` | **ELIMINARE** |
| `SmartCheckinSection.tsx` | Rimuovere items habit/objective |
| `HabitTrackerSection.tsx` | Rimuovere o convertire a read-only |
| `CompactHabitGrid.tsx` | Convertire a read-only |
| `process-session/index.ts` | Aggiungere logica habits/objectives |
| `ai-chat/index.ts` | Aggiungere istruzioni gestione |
| `create-habit-chat/index.ts` | **ELIMINARE** |
| `create-objective-chat/index.ts` | **ELIMINARE** |

---

## Eccezioni: Habits Auto-Sync

Le seguenti habits mantengono il tracking automatico:
- `steps` (Passi) - da Health Kit/Google Fit
- `heart_rate` (Battito) - da wearable
- `exercise` (Esercizio) - da fitness app
- `cycling` (Ciclismo) - da GPS

Per queste:
- `data_source: 'auto_sync'` nel database
- Mostrano badge "Sincronizzato automaticamente"
- Non richiedono interazione utente né Aria

---

## Istruzioni AI Dettagliate

### Per Rilevamento Obiettivi
```text
PATTERN DA RICONOSCERE:
- "Vorrei [verbo]" → Potenziale obiettivo
- "Devo [verbo]" → Potenziale obiettivo urgente
- "Il mio obiettivo è..." → Obiettivo esplicito
- Numeri + unità ("5kg", "1000€") → Target value

AZIONE:
1. Estrai categoria (body/finance/study/work/relationships/growth)
2. Estrai target_value se presente
3. Chiedi conferma: "Vuoi che aggiunga '[titolo]' ai tuoi traguardi?"
```

### Per Aggiornamento Progressi
```text
PATTERN DA RICONOSCERE:
- "Oggi ho [azione passata]"
- "Ieri sono [azione]"
- "Peso Xkg" (per obiettivi body)
- "Ho risparmiato X€" (per obiettivi finance)

AZIONE:
1. Identifica quale obiettivo/habit aggiornare
2. Estrai valore numerico
3. Salva automaticamente
4. Conferma: "Registrato! Sei a X% del tuo obiettivo."
```

---

## Timeline Implementazione

1. **Fase 1** (UI): ~30 minuti
2. **Fase 2** (AI): ~45 minuti  
3. **Fase 3** (Flusso dati): ~30 minuti
4. **Fase 4** (Polish): ~15 minuti

**Totale stimato**: ~2 ore

---

## Rischi e Mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Utente non sa come aggiornare | Messaggi chiari + CTA "Parla con Aria" |
| AI non rileva correttamente | Istruzioni dettagliate nel prompt |
| Perdita dati esistenti | Nessuna migrazione DB, solo UI |
| Habits auto_sync non funzionano | Eccezione esplicita nel codice |
