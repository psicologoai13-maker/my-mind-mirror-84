
# Piano: Sistema di Correzione Memoria per Aria

## Problema Identificato

Quando l'utente corregge Aria ("No, hai capito male"), il sistema attuale:
- Salva comunque l'informazione errata in `key_facts`
- Appende alla `long_term_memory` senza verificare o rimuovere errori (linea 1149: `[...existingMemory, ...newMemoryItems].slice(-60)`)
- Il `ai_summary` riflette l'errore invece della correzione
- Non esiste rilevamento di pattern correttivi nel prompt AI

---

## Soluzione Tecnica

### Fase 1: Rilevamento Correzioni nel Prompt AI (process-session)

Aggiornare il prompt di analisi per rilevare frasi correttive e restituire un nuovo campo `corrections`:

```text
═══════════════════════════════════════════════
🔄 RILEVAMENTO CORREZIONI (CRUCIALE!)
═══════════════════════════════════════════════
Se l'utente CORREGGE un'informazione precedente, DEVI rilevarlo.

**PATTERN CORRETTIVI:**
- "No", "Non è così", "Hai capito male", "Mi sono spiegato male"
- "Intendevo dire...", "In realtà...", "Volevo dire..."
- "Non ho detto questo", "Hai frainteso"

**QUANDO RILEVI UNA CORREZIONE:**
1. L'informazione PRECEDENTE è SBAGLIATA → NON salvarla in key_facts
2. L'informazione NUOVA dopo la correzione è quella GIUSTA → salva solo questa
3. Aggiungi al campo "corrections" cosa era sbagliato

**FORMATO:**
"corrections": [
  {
    "wrong_fact": "L'utente lavora come ingegnere",
    "corrected_to": "L'utente studia ingegneria",
    "keywords_to_remove": ["lavora come ingegnere"]
  }
]

**ESEMPIO:**
Utente: "Lavoro come programmatore"
Aria: "Da quanto fai il programmatore?"
Utente: "No aspetta, studio informatica, non lavoro ancora"

→ key_facts: ["Studia informatica"] (NON "lavora come programmatore")
→ corrections: [{"wrong_fact": "Lavora come programmatore", ...}]
```

### Fase 2: Pulizia Memoria Esistente (process-session)

Modificare la logica di salvataggio memoria (linee ~1145-1149):

```typescript
// NUOVA LOGICA: Pulizia memoria basata su correzioni
const corrections = (analysis as any).corrections || [];

// Rimuovi fatti che contengono keywords errate
const cleanedMemory = existingMemory.filter((fact: string) => {
  const isWrongFact = corrections.some((c: any) => 
    c.keywords_to_remove?.some((kw: string) => 
      fact.toLowerCase().includes(kw.toLowerCase())
    )
  );
  if (isWrongFact) {
    console.log('[process-session] Removing wrong fact from memory:', fact);
  }
  return !isWrongFact;
});

// Filtra key_facts che sono stati corretti
const filteredKeyFacts = analysis.key_facts.filter((fact: string) => 
  !corrections.some((c: any) => 
    c.wrong_fact?.toLowerCase() === fact.toLowerCase()
  )
);

// Combine e limita a 60
const updatedMemory = [...cleanedMemory, ...filteredKeyFacts, ...personalMemoryItems].slice(-60);
```

### Fase 3: Gestione Real-time Correzioni (ai-chat)

Aggiungere alle GOLDEN_RULES istruzioni per la gestione delle correzioni:

```text
═══════════════════════════════════════════════
🔄 GESTIONE CORREZIONI (OBBLIGATORIO!)
═══════════════════════════════════════════════

Se l'utente ti corregge ("no", "hai sbagliato", "non intendevo"):

1. **RICONOSCI l'errore immediatamente:**
   - "Ah scusa, ho frainteso!"
   - "Ops, colpa mia!"
   - "Ah ok, avevo capito male!"

2. **RIFORMULA con l'info corretta:**
   - "Quindi [versione corretta], giusto?"

3. **NON ripetere MAI l'info sbagliata** in futuro

4. **NON giustificarti** o spiegare perché hai sbagliato

**ESEMPIO:**
Utente: "No, non sono sposato, ho solo una ragazza"
Tu: "Ah scusa! Quindi sei fidanzato. Com'è che vi siete conosciuti?"
```

### Fase 4: Regole Anti-Allucinazione Estese

Aggiornare il prompt di `process-session` con regole più strict per key_facts:

```text
═══════════════════════════════════════════════
⚠️ REGOLE KEY_FACTS (ANTI-ALLUCINAZIONE)
═══════════════════════════════════════════════

**SALVA in key_facts SOLO:**
- Fatti ESPLICITAMENTE dichiarati dall'utente
- Informazioni CONFERMATE (non corrette successivamente)

**NON salvare MAI:**
- Tue deduzioni o ipotesi
- Domande retoriche ("Forse sei stressato?" → NON è un fatto)
- Informazioni che l'utente ha corretto
- Risposte a tue domande che non sono state confermate

**NEGAZIONI:**
- "Non mi piace correre" → [NON PIACE] correre (rispetta la negazione!)
- "Non sono mai stato in Giappone" → NON salvare "Giappone" come interesse

**CONTESTO TEMPORALE:**
- "Ieri ero triste" → [IERI] era triste (non "è triste" permanente)
- "L'anno scorso lavoravo a Roma" → [PASSATO] lavorava a Roma
```

---

## File da Modificare

| File | Modifiche |
|------|-----------|
| `supabase/functions/process-session/index.ts` | Aggiungere sezione prompt correzioni, campo `corrections` nell'interfaccia, logica pulizia memoria |
| `supabase/functions/ai-chat/index.ts` | Aggiungere sezione GOLDEN_RULES per gestione correzioni real-time |

---

## Interfaccia JSON Aggiornata (process-session)

```typescript
interface OmniscientAnalysis {
  // ... campi esistenti ...
  key_facts: string[];
  corrections: Array<{
    wrong_fact: string;
    corrected_to: string;
    keywords_to_remove: string[];
  }>;
}
```

---

## Risultato Atteso

1. Quando l'utente corregge Aria, l'informazione sbagliata viene rimossa dalla `long_term_memory`
2. Il `summary` e `key_facts` riflettono solo le informazioni corrette
3. Aria riconosce esplicitamente quando ha frainteso ("Scusa, ho capito male!")
4. La memoria rimane pulita e accurata nel tempo
5. Le negazioni e il contesto temporale vengono rispettati
