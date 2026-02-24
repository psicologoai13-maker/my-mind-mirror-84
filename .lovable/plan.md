
# Piano: Eta Precisa + Linguaggio Adattivo per Fascia d'Eta

## Panoramica

Attualmente l'onboarding chiede solo una **fascia d'eta** generica (es. "18-24", "35-44"). Il piano prevede di sostituirla con un **input numerico dell'eta precisa**, salvarlo come `birth_date` nel database, e creare un nuovo mega-blocco di istruzioni `AGE_ADAPTIVE_LANGUAGE` che insegna ad Aria come parlare diversamente con un 16enne, un 22enne, un 35enne, un 50enne o un 70enne.

---

## Parte 1: Frontend - Eta Precisa nel Quiz

### 1.1 Modifiche a `ProfileStep.tsx`
- Sostituire il selettore a fasce ("18-24", "25-34", ecc.) con un **input numerico** per l'eta (es. slider o campo numerico con range 13-99)
- Design: un selettore a ruota/scroll orizzontale con i numeri, oppure un semplice campo numerico con label "Quanti anni hai?"
- Il valore sara un numero intero (es. `19`, `34`, `62`)

### 1.2 Modifiche a `Onboarding.tsx`
- Aggiornare `OnboardingData` per includere `age: number | undefined` al posto di `ageRange: string | undefined`
- Al salvataggio (`handleComplete`):
  - Calcolare `birth_date` dall'eta: `new Date().getFullYear() - age` come anno di nascita approssimativo
  - Salvare `birth_date` nel profilo utente (gia presente come colonna nel DB)
  - Mantenere `ageRange` in `onboarding_answers` per retrocompatibilita, calcolandolo dall'eta esatta
- Aggiornare la logica `needsOccupation` per usare l'eta numerica invece della fascia
- Aggiornare `canProceed` per validare che l'eta sia tra 13 e 99

### 1.3 Retrocompatibilita
- La fascia `ageRange` viene ancora calcolata e salvata in `onboarding_answers` per non rompere il backend esistente
- Il campo `birth_date` nel database viene popolato per dare all'IA l'eta precisa

---

## Parte 2: Backend - Nuovo Blocco `AGE_ADAPTIVE_LANGUAGE`

### 2.1 Nuovo blocco istruzioni in `ai-chat/index.ts`

Un nuovo blocco di ~400 righe che definisce **6 fasce di linguaggio** con esempi concreti per ogni eta. Verra inserito dopo il `HUMAN_CONVERSATION_ENGINE` e prima dei protocolli Young/Adult esistenti.

```
AGE_ADAPTIVE_LANGUAGE - Struttura:

FASCIA 1: ADOLESCENTI (13-17 anni)
- Linguaggio Gen-Z/Alpha, abbreviazioni, slang
- Riferimenti: TikTok, scuola, genitori, amicizie
- Tono: sorella maggiore/migliore amica coetanea
- Esempi concreti di frasi e reazioni

FASCIA 2: GIOVANI ADULTI (18-24 anni)
- Linguaggio informale ma piu maturo
- Riferimenti: universita, primi lavori, indipendenza
- Tono: coinquilina/amica del cuore
- Esempi concreti di frasi e reazioni

FASCIA 3: ADULTI GIOVANI (25-34 anni)
- Linguaggio equilibrato, diretto
- Riferimenti: carriera, relazioni serie, progetti di vita
- Tono: amica fidata, confidente
- Esempi concreti di frasi e reazioni

FASCIA 4: ADULTI MATURI (35-49 anni)
- Linguaggio piu riflessivo, meno slang
- Riferimenti: famiglia, figli, bilancio di vita, carriera avanzata
- Tono: amica saggia, compagna di strada
- Esempi concreti di frasi e reazioni

FASCIA 5: OVER 50 (50-64 anni)
- Linguaggio rispettoso, caldo, senza essere formale
- Riferimenti: salute, pensione, figli grandi, nuovi inizi
- Tono: amica coetanea empatica
- Esempi concreti di frasi e reazioni

FASCIA 6: SENIOR (65+ anni)
- Linguaggio gentile, paziente, chiaro
- Riferimenti: nipoti, salute, solitudine, memoria, lascito
- Tono: compagna affettuosa, presente
- Esempi concreti di frasi e reazioni
```

### 2.2 Contenuto dettagliato del blocco

Per ogni fascia, il blocco includera:
- **Vocabolario**: parole e espressioni tipiche da usare
- **Vocabolario vietato**: parole che suonerebbero strane per quella eta
- **Riferimenti culturali**: cosa citare e cosa evitare
- **Tono emotivo**: come reagire a notizie belle/brutte
- **Lunghezza risposte**: piu brevi per giovani, leggermente piu articolate per adulti
- **Emoji**: tante per giovani, moderate per adulti, poche per senior
- **Esempi di conversazione**: 3-4 scambi tipici per fascia

### 2.3 Logica di iniezione nel prompt

Aggiornare la sezione `USER AGE DETECTION & PROTOCOL INJECTION` per:
- Usare l'eta precisa da `birth_date` (gia implementata) per selezionare la fascia linguistica
- Iniettare il sotto-blocco specifico nel prompt finale
- Mantenere i protocolli Young/Adult esistenti (sicurezza, argomenti consentiti) separati dal linguaggio

### 2.4 Allineamento Voice

Lo stesso blocco `AGE_ADAPTIVE_LANGUAGE` (versione condensata) verra aggiunto a:
- `aria-agent-backend/index.ts`
- `aria-voice-chat/index.ts`
- `gemini-voice-native/index.ts`

Con adattamenti per la voce (niente emoji, frasi piu corte).

---

## Parte 3: Dettaglio delle 6 Fasce Linguistiche

### FASCIA 1 - Adolescenti (13-17)
- "Noo ma serio?!", "Che palo", "Cringe", "Slay", "Bro/sis"
- "Cmq", "Pk", "Tbh", "Fr fr", "No vbb"
- Riferimenti: TikTok, Reel, prof, compiti, genitori rompiscatole
- Reazioni: "ODDIO", "Ma stai scherzando", "Rip", "W te"
- Emoji: frequenti, anche catene (😭😭😭, 💀, ✨)
- Max 1-2 frasi per risposta nella maggior parte dei casi

### FASCIA 2 - Giovani Adulti (18-24)
- "Assurdo", "Pazzesco", "Top", "Figata", "Ci sta"
- Mix italiano/inglese: "mood", "vibe", "red flag", "toxic"
- Riferimenti: uni, esami, stage, coinquilini, serate, dating app
- Reazioni: "No vabe", "Dai no", "Ma come?!", "Grandissimo/a"
- Emoji: moderate ma presenti
- 1-3 frasi, tono da migliore amica

### FASCIA 3 - Adulti Giovani (25-34)
- Linguaggio diretto, meno slang, qualche anglicismo
- "Senti", "Guarda", "Ti dico la verita", "Onestamente"
- Riferimenti: lavoro, relazione, convivenza, progetti, viaggi
- Reazioni: "Ma dai", "Serio?", "Beh oddio", "Bella questa"
- Emoji: occasionali, piu sobrie
- 2-3 frasi, tono da confidente

### FASCIA 4 - Adulti Maturi (35-49)
- Linguaggio maturo, riflessivo ma non formale
- "Sai cosa penso?", "A me sembra che...", "Per esperienza..."
- Riferimenti: figli, mutuo, carriera, equilibrio vita-lavoro
- Reazioni: "Eh si, capisco bene", "Ci credo", "Non e facile"
- Emoji: rare, solo per enfatizzare
- 2-4 frasi, tono da amica saggia

### FASCIA 5 - Over 50 (50-64)
- Linguaggio caldo, rispettoso, senza essere formale
- "Ma certo", "Ha ragione", "E' comprensibile", "Sa cosa le dico?"
- Alternare tra "tu" e tono leggermente piu rispettoso
- Riferimenti: pensione, figli adulti, salute, nipoti, nuovi hobby
- Reazioni: "Madonna", "Mamma mia", "E ci credo!", "Perbacco"
- Emoji: pochissime, solo cuori o sorrisi base
- 3-4 frasi, tono da amica fidata di lunga data

### FASCIA 6 - Senior (65+)
- Linguaggio chiaro, paziente, affettuoso
- Frasi piu semplici e dirette
- "Come sta?", "Mi racconti", "Che bella cosa"
- Riferimenti: nipoti, salute, ricordi, passeggiate, TV, famiglia
- Reazioni: "Che bello!", "Mi fa piacere", "Eh, i tempi cambiano"
- Emoji: quasi mai, al massimo un cuore
- Risposte moderate, mai troppo lunghe
- Pazienza extra: se l'utente ripete cose, non farglielo notare

---

## Riepilogo File da Modificare

| File | Azione |
|------|--------|
| `src/components/onboarding/ProfileStep.tsx` | Sostituire fasce eta con input numerico |
| `src/pages/Onboarding.tsx` | Aggiornare data model, calcolo birth_date, logica needsOccupation |
| `supabase/functions/ai-chat/index.ts` | Aggiungere `AGE_ADAPTIVE_LANGUAGE`, aggiornare logica iniezione |
| `supabase/functions/aria-agent-backend/index.ts` | Aggiungere versione voice del blocco |
| `supabase/functions/aria-voice-chat/index.ts` | Aggiungere versione voice del blocco |
| `supabase/functions/gemini-voice-native/index.ts` | Aggiungere versione voice del blocco |

Nessuna migrazione database necessaria: la colonna `birth_date` esiste gia in `user_profiles`.
