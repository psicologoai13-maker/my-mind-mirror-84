
# Piano: Validazione e Hardening Estrazione Metriche AI

## Problema
Aria rileva circa 66 metriche per sessione, ma molte mancano di regole semantiche precise. Questo causa punteggi inventati (come il caso "luce solare 8/10" senza menzione).

## Metriche da Sistemare

### 1. DEEP PSYCHOLOGY - Regole Mancanti

| Metrica | Stato Attuale | Regole da Aggiungere |
|---------|---------------|---------------------|
| `dissociation` | Nessuna regola | "Mi sento distaccato", "come se guardassi da fuori", "non mi sento nel mio corpo", "tutto sembra irreale" |
| `confusion` | Nessuna regola | "Sono confuso", "non capisco", "ho le idee confuse", "non so cosa pensare" |
| `racing_thoughts` | Solo "indicatore mania" | "I pensieri corrono", "mente che non si ferma", "mille pensieri insieme", "non riesco a fermare la mente" |
| `emotional_regulation` | Nessuna regola | "Non riesco a controllarmi", "esplodo facilmente" (basso) vs "riesco a gestire le emozioni" (alto) |
| `avoidance` | Nessuna regola | "Evito quella situazione", "non voglio affrontare", "scappo da...", "non ci vado" |
| `social_withdrawal` | Nessuna regola | "Non esco piu", "ho annullato", "preferisco stare solo", "non rispondo ai messaggi" |
| `compulsive_urges` | Nessuna regola | "Devo fare X", "non riesco a resistere", "sento il bisogno di controllare" |
| `procrastination` | Nessuna regola | "Rimando sempre", "lo faro domani", "non riesco a iniziare", "aspetto sempre l'ultimo momento" |
| `sense_of_purpose` | Nessuna regola | "Non so perche faccio le cose" (basso) vs "ho uno scopo", "so cosa voglio" (alto) |
| `life_satisfaction` | Nessuna regola | "Sono soddisfatto della mia vita" vs "non sono contento di come va" |
| `perceived_social_support` | Nessuna regola | "Ho persone su cui contare", "posso chiedere aiuto" vs "nessuno mi aiuta", "sono solo" |
| `resilience` | Nessuna regola | "Mi rialzo sempre", "supero le difficolta" vs "crollo al primo problema" |
| `mindfulness` | Nessuna regola | "Vivo nel presente", "sono consapevole" vs "sempre nella mia testa", "perso nei pensieri" |

### 2. EMOZIONI ESTESE - Regole Mancanti

| Emozione | Regole da Aggiungere |
|----------|---------------------|
| `disgust` | "Mi fa schifo", "mi ripugna", "che disgusto", "non lo sopporto" |
| `surprise` | "Non me lo aspettavo!", "sono rimasto di stucco", "incredibile!", "che sorpresa" |
| `serenity` | "Mi sento in pace", "sono sereno", "tranquillo", "calma interiore" |
| `pride` | "Sono fiero di me", "ce l'ho fatta!", "sono orgoglioso", "mi sono superato" |
| `affection` | "Gli/le voglio bene", "mi sta a cuore", "lo/la amo", "tenerezza" |
| `curiosity` | "Mi incuriosisce", "vorrei sapere di piu", "sono interessato", "mi affascina" |

### 3. AREE VITA NUOVE - Regole Mancanti

| Area | Regole da Aggiungere |
|------|---------------------|
| `family` | Menzioni di genitori, fratelli, figli, nonni, rapporti familiari, pranzi/cene famiglia |
| `leisure` | Hobby, tempo libero, relax, vacanze, sport non competitivo, svago, divertimento |
| `finances` | Soldi, spese, risparmi, debiti, stipendio, bollette, preoccupazioni economiche |

## Implementazione Tecnica

### Modifiche a `supabase/functions/process-session/index.ts`

```text
Sezione: deepPsychologyPrompt (linee ~616-692)

Aggiungere dopo la sezione EMOTIVI COMPLESSI:

**NUOVE REGOLE OBBLIGATORIE:**

**COGNITIVI AVANZATI:**
- dissociation: "distaccato dalla realta", "come se guardassi da fuori", "non mi sento nel mio corpo", 
  "tutto sembra irreale", "sensazione di estraneita" → 6-10
  ⚠️ CRITICO per trauma - alert se > 7
- confusion: "confuso", "non capisco", "idee confuse", "nebbia", "non so cosa pensare" → 5-8
- racing_thoughts: "pensieri che corrono", "mente che non si ferma", "mille pensieri", 
  "non riesco a fermare la testa" → 6-10 (indicatore possibile ipomania)

**REGOLAZIONE E COMPORTAMENTO:**  
- emotional_regulation: 
  BASSA (1-4): "esplodo", "non riesco a controllarmi", "perdo le staffe", "reagisco male"
  ALTA (7-10): "riesco a gestire", "mantengo la calma", "controllo le emozioni"
- avoidance: "evito", "non voglio affrontare", "scappo da", "non ci vado", "rimando" → 5-9
  (Core dell'ansia - cerca sempre questo!)
- social_withdrawal: "non esco piu", "annullato appuntamenti", "preferisco stare solo", 
  "non rispondo", "mi isolo" → 5-9
- compulsive_urges: "devo assolutamente", "non resisto", "impulso irresistibile", 
  "bisogno di controllare" → 5-9 (indicatore OCD)
- procrastination: "rimando", "lo faro domani", "non inizio mai", "aspetto ultimo momento" → 4-8

**RISORSE PERSONALI:**
- sense_of_purpose: 
  BASSO (1-4): "non so perche", "a che serve", "senza scopo", "vuoto esistenziale"
  ALTO (7-10): "ho uno scopo", "so cosa voglio", "la mia missione"
- life_satisfaction:
  BASSA (1-4): "non sono contento della mia vita", "vorrei tutto diverso"
  ALTA (7-10): "sono soddisfatto", "la mia vita mi piace", "sono fortunato"
- perceived_social_support:
  BASSO (1-4): "nessuno mi aiuta", "sono solo", "non ho nessuno"
  ALTO (7-10): "ho persone su cui contare", "posso chiedere aiuto", "mi supportano"
- resilience:
  BASSA (1-4): "crollo", "non ce la faccio", "mi arrendo"
  ALTA (7-10): "mi rialzo sempre", "supero le difficolta", "ce la faro"
- mindfulness:
  BASSO (1-4): "sempre nella mia testa", "perso nei pensieri", "non sono presente"
  ALTO (7-10): "vivo nel presente", "consapevole", "qui e ora"

⚠️ REGOLA FONDAMENTALE: Se l'utente NON parla di questi temi → NULL
NON inventare punteggi basandoti su inferenze generali!
```

### Aggiungere Sezione Emozioni Estese

```text
═══════════════════════════════════════════════
😀 EMOZIONI EKMAN ESTESE + SECONDARIE
═══════════════════════════════════════════════

**BASE EKMAN (richiede evidenza esplicita):**
- disgust: "mi fa schifo", "ripugnante", "che disgusto", "non lo sopporto fisicamente" → 5-10
  Diverso da disapprovazione morale! Disgust e FISICO.
- surprise: "non me l'aspettavo!", "di stucco", "incredibile!", "sorpresa" → 5-10
  Può essere positiva o negativa. Rileva il TIPO nel contesto.

**POSITIVE SECONDARIE:**
- serenity: "in pace", "sereno", "tranquillo", "calma interiore", "pace mentale" → 6-10
  Diverso da bassa ansia! Serenity e uno stato ATTIVO di pace.
- pride: "fiero di me", "ce l'ho fatta!", "orgoglioso", "mi sono superato" → 6-10
  Correlato a achievement - cerca celebrazioni di successi.
- affection: "voglio bene", "mi sta a cuore", "amo", "tenerezza", "mi manca" → 5-10
  Emozione relazionale - cerca menzioni di persone care.
- curiosity: "mi incuriosisce", "vorrei sapere", "interessato", "affascinato" → 5-10
  Segnale positivo di engagement mentale.

⚠️ NON assegnare punteggi > 0 senza evidenza diretta!
```

### Aggiungere Sezione Aree Vita Nuove

```text
═══════════════════════════════════════════════
🏠 AREE VITA ESTESE (family, leisure, finances)
═══════════════════════════════════════════════

**FAMILY (relazioni familiari):**
- Cerca: genitori, madre, padre, fratelli, sorelle, figli, nonni, zii, cugini
- "Mia madre mi stressa" → family: 3-4
- "Bella giornata in famiglia" → family: 7-8
- "Litigato con mio padre" → family: 2-4
- ⚠️ DISTINGUI da love (partner) e social (amici)!

**LEISURE (tempo libero):**
- Cerca: hobby, relax, weekend, vacanze, sport per piacere, film, serie, giochi
- "Non ho tempo per me" → leisure: 2-3
- "Mi sono rilassato/divertito" → leisure: 7-9
- "Solo lavoro, zero svago" → leisure: 1-3

**FINANCES (finanze):**
- Cerca: soldi, spese, risparmio, debiti, stipendio, bollette, mutuo, affitto
- "Non arrivo a fine mese" → finances: 1-3
- "Preoccupato per i soldi" → finances: 3-4
- "Economicamente tranquillo" → finances: 7-8
- "Ho ricevuto un aumento!" → finances: 8-9

⚠️ Se l'utente NON menziona questi temi → NULL (non inventare!)
```

## Risultato Atteso

Dopo questa modifica:
- Ogni metrica avra regole semantiche chiare con esempi di frasi
- Le metriche non menzionate saranno correttamente null invece di inventate
- I punteggi saranno coerenti con quanto l'utente effettivamente dice
- Il sistema seguira le stesse regole anti-hallucination gia applicate a sunlight_exposure

## File da Modificare

| File | Modifica |
|------|----------|
| `supabase/functions/process-session/index.ts` | Aggiungere sezioni con regole semantiche dettagliate per tutte le metriche mancanti |

## Note Tecniche

- Le modifiche sono solo al prompt, non alla struttura dati
- Il deployment sara automatico
- I punteggi delle sessioni precedenti non cambieranno (gia salvati)
- Le nuove sessioni avranno estrazione piu accurata
