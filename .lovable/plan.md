

# Piano: Sistema di Aggiornamento Progressi Obiettivi

## Problema Identificato
Gli obiettivi a inserimento manuale (finanziari, peso, studio, etc.) non hanno alcun modo per aggiornare i progressi nell'app. Esiste la funzione `addProgress` nel codice ma non è mai stata collegata all'interfaccia.

## Soluzione Proposta

### 1. Quick Update Modal (Primario)
Creare un nuovo componente `ProgressUpdateModal` che si apre toccando direttamente la card dell'obiettivo o dal menu "Aggiorna progresso".

**Flusso utente:**
```text
Card Obiettivo → Tap su card/menu → Modal rapido → Input valore → Conferma
```

**Design del modal:**
- Input numerico grande e centrato
- Unità di misura ben visibile (€, kg, ore, libri)
- Pulsanti +/- per incrementi rapidi
- Campo note opzionale
- Riepilogo variazione (es. "Da €150 → €200")
- Bottone conferma con feedback haptico

### 2. Pulsante Visibile sulla Card
Aggiungere un pulsante "+" visibile direttamente sulla card (non solo nel dropdown menu), per rendere l'azione più scopribile.

### 3. Integrazione Check-in (Secondario)
Aggiungere gli obiettivi manuali al flusso di check-in giornaliero:

**Logica:**
- Dopo i 4 parametri base (umore, ansia, energia, sonno)
- Mostrare max 2 obiettivi che richiedono aggiornamento
- Solo per obiettivi con `input_method`: `numeric`, `counter`, `time_based`
- Escludere: `session_detected`, `milestone`, `auto_body`, `auto_habit`

### 4. Tipi di Input per Categoria

| Categoria | Tipo Input | Esempio UI |
|-----------|------------|------------|
| Finance (periodico) | Incremento | "Quanto hai risparmiato oggi?" +€ |
| Finance (accumulo) | Valore assoluto | "A quanto ammonta il totale?" €___ |
| Finance (limite) | Incremento spese | "Quanto hai speso oggi?" +€ |
| Body (peso) | Valore assoluto | "Quanto pesi oggi?" __kg |
| Study (libri) | Counter | "Quanti libri hai letto?" +1 +2 +3 |
| Study (ore) | Incremento | "Quante ore oggi?" +1h +2h |

---

## Dettagli Tecnici

### File da Creare
- `src/components/objectives/ProgressUpdateModal.tsx` - Modal principale

### File da Modificare
- `src/components/objectives/ObjectiveCard.tsx` - Aggiungere pulsante visibile + collegamento modal
- `src/components/objectives/ObjectivesTabContent.tsx` - Passare `onAddProgress` alle card
- `src/hooks/useObjectives.tsx` - Verificare che `addProgress` funzioni correttamente
- `src/components/home/QuickCheckin.tsx` - Aggiungere step obiettivi (opzionale fase 2)

### Struttura ProgressUpdateModal

```typescript
interface ProgressUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objective: Objective;
  onSave: (value: number, note?: string) => void;
}
```

**Features:**
- Input adattivo in base a `finance_tracking_type` e `input_method`
- Pulsanti incremento rapido (+10, +50, +100 per €)
- Validazione (non superare target per limiti spesa, etc.)
- Preview della variazione prima di confermare
- Animazione successo con toast

### Logica Incremento vs Assoluto

```typescript
// Obiettivi con valore ASSOLUTO (imposti il totale)
const absoluteTypes = ['accumulation', 'debt_reduction'];
const absoluteCategories = ['body']; // peso

// Obiettivi con INCREMENTO (aggiungi al totale)
const incrementTypes = ['periodic_saving', 'spending_limit', 'periodic_income'];
const incrementMethods = ['counter'];
```

### Database
Nessuna modifica al database richiesta - utilizza la struttura esistente `progress_history` e `current_value`.

---

## UX Flow Finale

```text
┌─────────────────────────────────────────┐
│  Gestione Economica 💰                  │
│  Risparmio mensile: €500/mese          │
│                                         │
│  ██████░░░░░░░░░░░░ 30%                │
│  €150 → €500                            │
│                                         │
│  [+] Aggiungi progresso                 │ ← NUOVO PULSANTE
└─────────────────────────────────────────┘
                    ↓ tap
┌─────────────────────────────────────────┐
│  Aggiorna Risparmio                     │
│                                         │
│  Quanto hai risparmiato?                │
│                                         │
│        ┌─────────────┐                  │
│    €   │     50      │                  │
│        └─────────────┘                  │
│                                         │
│  [+10] [+20] [+50] [+100]               │
│                                         │
│  Attuale: €150 → Nuovo: €200            │
│                                         │
│  [     Conferma Progresso     ]         │
└─────────────────────────────────────────┘
```

---

## Fasi di Implementazione

**Fase 1 (Priorità Alta):**
1. Creare `ProgressUpdateModal` con input adattivo
2. Aggiungere pulsante visibile su `ObjectiveCard`
3. Collegare `onAddProgress` in `ObjectivesTabContent`

**Fase 2 (Opzionale):**
4. Integrare obiettivi manuali nel check-in giornaliero
5. Aggiungere reminder per obiettivi non aggiornati da X giorni

