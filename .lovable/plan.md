
## Piano: Potenziamento Rilevamento Metriche nelle Sessioni Aria

### Problema Identificato

Il sistema di estrazione metriche (`process-session`) rileva solo **mood** e **anxiety** perché le istruzioni anti-allucinazione sono troppo conservative. Le regole attuali richiedono parole chiave esplicite ("sono felice", "sono eccitato") invece di permettere inferenze da contesto.

**Esempio concreto del bug:**
- Conversazione: "Domani parto per Madrid con amici per il Circo Loco, poi vado a Rio"
- Rilevato: mood: 9, anxiety: 2
- NON rilevato (ma dovrebbe): excitement: 8, joy: 7, social: 8, leisure: 9, hope: 7

### Root Cause

Le istruzioni nel prompt dicono:
- "Se NON menzionato esplicitamente → 0/null"
- "NON inferire mai"
- "SOLO se l'utente dice esplicitamente..."

Questo approccio funziona per prevenire falsi positivi su emozioni NEGATIVE, ma blocca completamente il rilevamento di emozioni POSITIVE che sono evidenti dal contesto.

### Soluzione in 3 Parti

---

**Parte 1: Ammorbidire le Regole per Emozioni Positive**

Modificare le istruzioni nel prompt di `process-session` per permettere INFERENZA CONTESTUALE per emozioni positive:

```text
REGOLA DIFFERENZIATA:
- EMOZIONI NEGATIVE (tristezza, rabbia, paura, ansia): 
  Richiedi evidenza ESPLICITA. NON inventare problemi.
  
- EMOZIONI POSITIVE (gioia, eccitazione, speranza, serenità):
  PUOI INFERIRE dal contesto se chiaramente positivo.
  Viaggio + amici = excitement + social + joy
  Festa/evento = excitement + anticipation
  Obiettivo raggiunto = pride + joy
```

---

**Parte 2: Aggiungere Post-Processing Contestuale**

Implementare logica di inferenza automatica DOPO la risposta AI per catturare pattern ovvi:

```text
PATTERN POSITIVI DA FORZARE:
- Keyword "viaggio|vacanza|partire|andare a" + destinazione
  → leisure: 7-8, excitement: 6-7
  
- Keyword "amici|con [nome]|gruppo|festa"
  → social: 7-8, joy: 5-6
  
- Keyword "matrimonio|laurea|compleanno|promozione"
  → excitement: 7-8, joy: 7-8, pride: 5-6
  
- Keyword "weekend|relax|svago|divertimento"
  → leisure: 6-8
```

---

**Parte 3: Correggere Salvataggio nella Tabella Sessions**

I campi `emotion_breakdown` e `deep_psychology` nella tabella `sessions` sono vuoti `{}` nonostante i dati vengano salvati nelle tabelle separate. Verificare che il mapping sia corretto:

```typescript
// Assicurarsi che l'oggetto completo venga passato
.update({
  emotion_breakdown: analysis.emotions, // NON vuoto
  deep_psychology: analysis.deep_psychology, // NON vuoto
})
```

---

### File da Modificare

1. **`supabase/functions/process-session/index.ts`**
   - Ammorbidire regole anti-hallucination per emozioni positive (linee ~1055-1133)
   - Aggiungere post-processing per pattern contestuali positivi (dopo linea 1684)
   - Aggiungere logging per debug del JSON raw (linea 1549)

---

### Dettagli Tecnici

**Nuova sezione da aggiungere al prompt (~linea 1135):**

```text
REGOLE DI INFERENZA CONTESTUALE (EMOZIONI POSITIVE):

Quando il contesto è CHIARAMENTE POSITIVO, PUOI e DEVI inferire:

VIAGGIO/VACANZA:
- "parto per X", "vado a X", "viaggio a X", "vacanza" → excitement: 6-8, leisure: 7-9
- Se con amici/partner → aggiungi social: 7-8 o love: 7-8

EVENTI POSITIVI:
- "festa", "compleanno", "matrimonio", "laurea" → excitement: 7-8, joy: 6-8
- "promozione", "nuovo lavoro" → pride: 6-8, joy: 6-7, work: 8-9

SOCIALITÀ:
- "con amici", "uscita", "aperitivo", "gruppo" → social: 7-8, joy: 5-6

TEMPO LIBERO:
- "weekend", "relax", "hobby", "sport" → leisure: 6-8

REGOLA: Le emozioni NEGATIVE richiedono ancora parole esplicite.
Le emozioni POSITIVE possono essere inferite da contesto positivo evidente.
```

**Nuova funzione post-processing (~dopo linea 1680):**

```typescript
const forceContextualInferences = (analysis, transcript) => {
  const lowerTranscript = transcript.toLowerCase();
  
  // Pattern viaggio/vacanza
  if (/viaggio|vacanza|parto per|vado a|andiamo a/.test(lowerTranscript)) {
    if (!analysis.emotions.excitement || analysis.emotions.excitement < 6) {
      analysis.emotions.excitement = 7;
    }
    if (!analysis.life_areas.leisure) {
      analysis.life_areas.leisure = 8;
    }
  }
  
  // Pattern amici/sociale
  if (/amici|con [a-z]+|gruppo|festa|aperitivo/.test(lowerTranscript)) {
    if (!analysis.life_areas.social || analysis.life_areas.social < 6) {
      analysis.life_areas.social = 7;
    }
    if (!analysis.emotions.joy || analysis.emotions.joy < 5) {
      analysis.emotions.joy = 6;
    }
  }
  
  return analysis;
};
```

---

### Risultato Atteso

Dopo le modifiche, la stessa conversazione sul viaggio a Madrid produrrà:
- mood: 9, anxiety: 2 (come prima)
- excitement: 7-8 (inferito da "viaggio" + contesto)
- joy: 6-7 (inferito da contesto positivo)
- social: 8 (inferito da "con amici")
- leisure: 8 (inferito da "svago")
- hope: 6 (inferito da piani futuri)

Questo permetterà ad Aria di avere una visione a 360 gradi dello stato emotivo dell'utente, non solo mood e ansia.
