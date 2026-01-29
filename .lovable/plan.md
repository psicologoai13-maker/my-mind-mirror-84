
# Piano: Revisione Completa Sistema Obiettivi

## Problemi Identificati

Dall'analisi dello screenshot e del database emergono problemi critici multipli:

1. **Aria interpreta "peso 70 kg" come "traguardo raggiunto"** - sbagliato! È il valore attuale
2. **Categoria errata**: obiettivo "prendere 5 kg" salvato come `mind` invece di `body`
3. **`starting_value` mai salvato** nonostante l'utente comunichi il suo peso
4. **Warning "punto di partenza non definito"** persiste dopo che utente ha detto il peso
5. **Obiettivi duplicati** che confondono il sistema
6. **Prompt AI incompleto** - manca contesto su starting_value

---

## Analisi Tipi di Obiettivi

Considerando cosa può volere un utente normale:

| Categoria | Esempi | Ha Starting? | Ha Target? | Tipo Progresso |
|-----------|--------|--------------|------------|----------------|
| **body** | Peso, sport | ✅ SÌ | ✅ SÌ | Numerico direzionale (+ o -) |
| **finance** | Risparmi, debiti | ✅ SÌ | ✅ SÌ | Numerico direzionale |
| **study** | Esami, ore studio | ❓ Opzionale | ✅ SÌ | Completamento/conteggio |
| **work** | Promozione, progetti | ❌ NO | ❓ Opzionale | Qualitativo/milestone |
| **relationships** | Trovare partner | ❌ NO | ❌ NO | Qualitativo puro |
| **growth** | Meditare, leggere | ❓ Opzionale | ❓ Opzionale | Abitudine/milestone |
| **mind** | Ridurre ansia | ❌ NO | ❌ NO | Qualitativo puro |

**Regola chiave**: Solo `body` e `finance` RICHIEDONO starting_value + target_value numerico

---

## Interventi Necessari

### Fase 1: Fix Prompt Aria (ai-chat/index.ts)

**Problema**: Aria non sa distinguere "valore attuale" da "traguardo"
**Soluzione**: Aggiungere istruzioni esplicite nel blocco obiettivi

Modifiche al prompt:
```
REGOLE OBIETTIVI (CRITICHE!):
1. Quando utente dice "peso 70kg" → È il SUO PESO ATTUALE, non un traguardo!
2. "Traguardo" = obiettivo finale desiderato (es. "voglio arrivare a 80kg")
3. "Valore attuale" = stato presente (es. "peso 70kg", "ho 500€ risparmiati")

RISPOSTE CORRETTE:
- "peso 70kg" → "Ok, 70kg segnato! 💪 Qual è il tuo obiettivo finale?"
- "voglio arrivare a 80kg" → "Perfetto! Target 80kg salvato 🎯"

RISPOSTE SBAGLIATE (MAI FARE!):
- "peso 70kg" → "Complimenti per il traguardo!" ← SBAGLIATO! Non è un traguardo!
```

### Fase 2: Fix Process-Session (process-session/index.ts)

**Problema 1**: L'AI non passa `is_starting_value: true`
**Soluzione**: Cambiare logica - se `starting_value` è null E l'utente fornisce un valore → automaticamente è starting_value

**Problema 2**: Categoria errata (mind vs body)
**Soluzione**: Aggiungere validazione più rigorosa per keyword peso/kg/dimagrire = body

Modifiche:
- Linee 1192-1211: Migliorare logica auto-detect starting_value
- Linee 225-268: Rafforzare mapping categoria per keyword corporee/finanziarie
- Aggiungere post-processing per correggere categorie errate

### Fase 3: Fix Contesto Obiettivi in ai-chat

**Problema**: Aria non vede `starting_value` nel contesto
**Soluzione**: Modificare query in `getUserProfile()` per includere `starting_value`

Modifiche a linee 1212-1227:
```typescript
const { data: allObjectivesData } = await supabase
  .from('user_objectives')
  .select('id, title, category, target_value, current_value, starting_value, unit, status, ai_feedback')
  // ...
```

E modificare blocco obiettivi (linee 1039-1058):
```
• "Prendere peso" (corpo): Partenza: 70kg | Attuale: 70kg | Target: 80kg
```

### Fase 4: Validazione Categorie nel Prompt process-session

Aggiungere regole esplicite:
```
CATEGORIZZAZIONE OBIETTIVI (OBBLIGATORIA):
- Peso, dimagrire, kg, palestra, sport, corpo → category: "body"
- Risparmiare, soldi, €, euro, debito → category: "finance"
- Esame, laurea, studiare, corso → category: "study"
- Lavoro, carriera, promozione → category: "work"
- Partner, amici, relazione → category: "relationships"
- Meditare, leggere, crescita → category: "growth"
- Ansia, stress, mentale → category: "mind"

⚠️ "Prendere kg" = BODY, non MIND!
```

### Fase 5: Pulizia Database

Correggere obiettivi esistenti con categoria errata:
- `prendere 5 kg` → category: `body` (non `mind`)
- Eliminare duplicati
- Settare `starting_value: 70` dove manca ma l'utente l'ha comunicato

---

## File da Modificare

### 1. `supabase/functions/ai-chat/index.ts`
- Aggiungere istruzioni esplicite su "valore attuale" vs "traguardo"
- Includere `starting_value` nella query obiettivi
- Mostrare starting_value nel blocco contesto obiettivi
- Esempi corretti/sbagliati per peso

### 2. `supabase/functions/process-session/index.ts`
- Rafforzare regole categorizzazione (peso = body)
- Migliorare logica auto-detect starting_value
- Aggiungere post-processing validazione categoria
- Chiarire quando usare `is_starting_value: true`

### 3. Database
- Correggere obiettivi con categoria errata
- Pulire duplicati
- Settare starting_value mancanti

---

## Flusso Corretto Post-Fix

```
Utente: "Voglio prendere 10kg"
└─ AI crea: {category: "body", title: "Prendere peso", starting_value: null, target_value: null}
└─ ai_feedback: "Quanto pesi adesso?"

Utente: "Peso 70kg"
└─ AI aggiorna: {starting_value: 70, current_value: 70}
└─ Aria: "Ok 70kg segnato! 💪 Qual è il tuo peso obiettivo?"

Utente: "Voglio arrivare a 80kg"
└─ AI aggiorna: {target_value: 80}
└─ Aria: "Perfetto! Da 70 a 80kg, 10kg da prendere. Ci sei! 🎯"

[...settimane dopo...]
Utente: "Ce l'ho fatta, sono a 80kg!"
└─ AI rileva celebrazione esplicita → {status: "achieved"}
└─ Aria: "SIIIII! Ce l'hai fatta! 🎉🎉🎉"
```

---

## Priorità Implementazione

1. **URGENTE**: Fix prompt ai-chat (evita risposte "traguardo" errate)
2. **ALTA**: Fix categorizzazione in process-session
3. **ALTA**: Aggiungere starting_value al contesto Aria
4. **MEDIA**: Pulizia database obiettivi esistenti
5. **MEDIA**: Test end-to-end del flusso completo

---

## Sezione Tecnica

### Modifiche Prompt ai-chat (objectivesBlock)

```typescript
const objectivesBlock = `
═══════════════════════════════════════════════
🎯 OBIETTIVI ATTIVI
═══════════════════════════════════════════════
${activeList || 'Nessun obiettivo attivo'}

⚠️ REGOLE CRITICHE OBIETTIVI:

DISTINGUI SEMPRE:
- "VALORE ATTUALE" = peso/risparmio di OGGI (es. "peso 70kg", "ho 500€")
- "TRAGUARDO" = obiettivo FINALE (es. "voglio arrivare a 80kg")

QUANDO UTENTE DICE UN NUMERO (peso, €, ore):
1. È il valore ATTUALE? → Registralo, POI chiedi il target finale
2. È il target FINALE? → Registralo come obiettivo

RISPOSTE CORRETTE ✅:
- "peso 70kg" → "70kg segnato! 💪 Qual è il tuo peso obiettivo?"
- "voglio arrivare a 80kg" → "Perfetto, 80kg come target! 🎯"

RISPOSTE SBAGLIATE ❌ (MAI FARE!):
- "peso 70kg" → "Complimenti per il traguardo!" ← È il peso attuale, NON un traguardo!
- "peso 70kg" → "Come ti senti con questo traguardo?" ← SBAGLIATO!

QUANDO È UN TRAGUARDO RAGGIUNTO?
Solo se l'utente ESPLICITAMENTE celebra:
- "Ce l'ho fatta!", "Obiettivo raggiunto!", "Finalmente sono a 80kg!"
- MAI assumere raggiungimento solo da un numero
`;
```

### Modifiche Process-Session (categorizzazione)

```typescript
// Post-processing per correggere categorie errate
const BODY_KEYWORDS = /peso|kg|dimagr|ingrassare|palestra|sport|muscol|fisico|corpo/i;
const FINANCE_KEYWORDS = /risparm|soldi|euro|€|debito|guadagn|invest/i;

if (obj.category === 'mind' || obj.category === 'growth') {
  if (BODY_KEYWORDS.test(obj.title)) {
    obj.category = 'body';
    console.log('[process-session] Corrected category to body for:', obj.title);
  } else if (FINANCE_KEYWORDS.test(obj.title)) {
    obj.category = 'finance';
  }
}
```

### Modifiche Query Obiettivi in ai-chat

```typescript
// Includere starting_value
const { data: allObjectivesData } = await supabase
  .from('user_objectives')
  .select('id, title, category, target_value, current_value, starting_value, unit, status, ai_feedback')
  .eq('user_id', user.id)
  .eq('status', 'active');
```
