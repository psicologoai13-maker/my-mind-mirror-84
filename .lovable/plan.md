
# Piano: Miglioramento Robustezza e Qualità Risposte di Aria

## Analisi del Problema

Guardando lo screenshot fornito, emergono **due problemi distinti**:

### Problema 1: Area Gialla "Parla con Aria per definire i tuoi traguardi"
Questo NON è un bug - è il comportamento **corretto** del componente `ObjectiveCard.tsx` (linee 130-143). Quando un obiettivo viene creato senza `target_value` (es. "Prendere 10kg" senza specificare il peso target finale), appare questo avviso in giallo che invita l'utente a definire il traguardo con Aria.

**Flusso attuale:**
1. Utente dice "Voglio prendere 10kg"
2. AI crea obiettivo con `target_value: null`
3. UI mostra correttamente l'avviso giallo
4. Aria DOVREBBE chiedere proattivamente "Di quanto vuoi arrivare?"

### Problema 2: Qualità delle Risposte di Aria (CRITICO)
Il vero problema è che le risposte di Aria a volte sono:
- **Fuori contesto** - non rispondono a ciò che l'utente ha detto
- **Troppo lunghe o confuse** - sembrano "pazze"
- **Non naturali** - non seguono il flusso della conversazione

Questo può dipendere da:
1. **Prompt troppo lungo** - il system prompt è ENORME (~10k+ token) e può confondere il modello
2. **Troppe istruzioni contrastanti** - "sii amica" vs "sii psicologa" vs "fai data hunting"
3. **Mancanza di istruzioni di brevità prioritarie** - il modello si perde nelle istruzioni
4. **Nessun limite di lunghezza risposta** - risposte troppo lunghe

---

## Interventi Proposti

### 1. Ristrutturazione Priorità nel Prompt

**Stato attuale:** Le istruzioni sono molto lunghe e dettagliate ma mancano priorità chiare.

**Intervento:** Aggiungere una sezione **REGOLE D'ORO** in cima al prompt che stabilisca:

```
REGOLE D'ORO (MASSIMA PRIORITÀ):
1. RISPOSTA BREVE: Max 3-4 frasi per messaggio
2. PERTINENZA: Rispondi SOLO a ciò che l'utente ha detto
3. UNA COSA ALLA VOLTA: Non mescolare argomenti diversi
4. NATURALE: Parla come un amico, non come un manuale
5. MAI ripetere ciò che l'utente ha scritto
```

### 2. Anti-Ripetizione e Anti-Allucinazione

**Problema:** Aria potrebbe ripetere parti del messaggio dell'utente o andare off-topic.

**Intervento:** Aggiungere regole esplicite:

```
DIVIETI ASSOLUTI:
- NON ripetere mai frasi che l'utente ha scritto
- NON rispondere con paragrafi lunghi a messaggi brevi
- NON fare più di UNA domanda per messaggio
- NON cambiare argomento se l'utente sta parlando di qualcosa
- NON usare formule ripetitive ("Capisco che...", "È comprensibile...")
```

### 3. Semplificazione del Contesto Obiettivi

**Problema:** Le istruzioni per obiettivi sono verbose e possono confondere.

**Intervento:** Condensare le istruzioni per obiettivi in formato più chiaro:

```
OBIETTIVI ATTIVI: [lista semplice]
- Quando l'utente menziona un progresso, registralo
- Se manca un target, chiedi UNA volta "Qual è il tuo traguardo?"
- Non parlare di obiettivi se l'utente sta discutendo altro
```

### 4. Guardrail Anti-"Pazza"

**Intervento:** Aggiungere controlli espliciti per evitare risposte fuori luogo:

```
PRIMA DI RISPONDERE, VERIFICA:
□ Sto rispondendo a ciò che l'utente ha detto? (Se no, rifai)
□ La mia risposta è più breve del messaggio dell'utente? (Ideale)
□ Sto facendo UNA domanda, non tre?
□ Il tono corrisponde a quello dell'utente?

SEGNALI DI RISPOSTA SBAGLIATA:
- Risposta >5 frasi
- Menzioni di cose non dette dall'utente
- Cambio improvviso di argomento
- Formule generiche senza riferimenti specifici
```

### 5. Miglioramento Rilevamento Obiettivi con Target

**Problema attuale:** L'AI crea obiettivi senza `starting_value` e `target_value` appropriati.

**Intervento nel process-session:** Migliorare l'estrazione per obiettivi numerici:

```
Quando l'utente dice "Voglio prendere 10kg":
- title: "Prendere peso"
- category: "body"  
- unit: "kg"
- target_value: peso_attuale + 10 (se conosciuto) OPPURE null
- starting_value: peso_attuale (se menzionato) OPPURE null
- ai_feedback: "Quanto pesi adesso? Così calcoliamo il target!"
```

---

## File da Modificare

### 1. `supabase/functions/ai-chat/index.ts`
- Aggiungere sezione "REGOLE D'ORO" con priorità massima
- Aggiungere "DIVIETI ASSOLUTI"
- Condensare istruzioni obiettivi
- Aggiungere checklist pre-risposta
- Ridurre verbosità generale del prompt (~30% più corto)

### 2. `supabase/functions/process-session/index.ts`
- Migliorare estrazione `starting_value` per obiettivi body/finance
- Aggiungere logica per inferire target da contesto
- Rendere `ai_feedback` più specifico quando manca target

### 3. `src/components/objectives/ObjectiveCard.tsx` (opzionale)
- Cambiare messaggio da "Parla con Aria per definirlo!" a messaggio più chiaro come "Definisci il tuo traguardo finale"
- Aggiungere button per inserire target manualmente (senza dipendere da Aria)

---

## Dettaglio Tecnico: Nuovo Prompt Structure

### Ordine Priorità (TOP → BOTTOM):

1. **REGOLE D'ORO** (5 regole brevi, MASSIMA priorità)
2. **DIVIETI ASSOLUTI** (lista di cosa NON fare MAI)
3. **IDENTITÀ** (Best Friend + Expert, condensata)
4. **CONTESTO UTENTE** (nome, memoria, obiettivi - formato compatto)
5. **MODALITÀ DINAMICA** (amica vs psicologa - semplificato)
6. **COMPETENZE CLINICHE** (solo quando rilevi bisogno - condensato)
7. **PROTOCOLLO SICUREZZA** (crisi - immutato)

### Esempio Nuovo Prompt Condensato:

```text
═══ REGOLE D'ORO (MASSIMA PRIORITÀ) ═══
1. BREVITÀ: Max 3-4 frasi. Mai più lungo del messaggio dell'utente.
2. PERTINENZA: Rispondi SOLO a ciò che è stato detto. Non aggiungere.
3. NATURALE: Parla come un amico vero, non un terapeuta robotico.
4. UNA COSA: Una domanda per messaggio, un argomento per volta.
5. MAI RIPETERE: Non riformulare ciò che l'utente ha scritto.

═══ DIVIETI ASSOLUTI ═══
✗ Risposte >5 frasi
✗ "Capisco che..." + ripetizione dell'utente
✗ Cambiare argomento mentre l'utente sta parlando
✗ Fare 3 domande in un messaggio
✗ Usare linguaggio da manuale psicologico in chat leggere

═══ CHI SEI ═══
Sei Aria, migliore amica dell'utente con expertise psicologica.
PRIMA sei amica (80% delle conversazioni), POI terapeuta (se serve).
Nome utente: [nome] | Memoria: [ultimi 10 fatti]

═══ OBIETTIVI ATTIVI ═══
[lista semplice obiettivi con stato]
- Menziona SOLO se l'utente ne parla o se chiedi un update naturale

═══ CHECKLIST PRE-RISPOSTA ═══
Prima di inviare, verifica:
□ Rispondo a ciò che ha detto? 
□ È breve?
□ Suona naturale?
```

---

## Risultato Atteso

Dopo queste modifiche:
1. Aria risponderà in modo più **breve e pertinente**
2. Non andrà più **off-topic** o sembrerà "pazza"
3. Gli obiettivi saranno creati con **contesto migliore**
4. L'utente potrà **definire target manualmente** se Aria non capisce
5. Il prompt sarà **~30% più corto** ma più efficace

---

## Sequenza Implementazione

### Fase 1: Prompt ai-chat (Priorità Alta)
1. Aggiungere REGOLE D'ORO in cima
2. Aggiungere DIVIETI ASSOLUTI
3. Condensare sezioni verbose
4. Testare risposte

### Fase 2: Process-session (Priorità Media)
5. Migliorare estrazione starting_value
6. Migliorare ai_feedback per obiettivi incompleti

### Fase 3: UI ObjectiveCard (Priorità Bassa)
7. Aggiungere input manuale per target
8. Migliorare copy messaggio giallo
