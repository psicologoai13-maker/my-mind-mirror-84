

# Piano: Enciclopedia Clinica Integrata per Aria

## Obiettivo
Trasformare Aria in una professionista della salute mentale con conoscenze enciclopediche, capace di riconoscere, comprendere e rispondere a un'ampia gamma di condizioni e tematiche psicologiche con la profondità di uno specialista.

## Analisi Attuale

L'AI dispone già di:
- Framework terapeutici (CBT, DBT, MI, SFBT)
- Screening psichiatrico base (Depressione, Bipolare, PTSD, OCD)
- Rubrica emotiva a 5 dimensioni + 5 emozioni secondarie
- 12 metriche di psicologia profonda

Tuttavia mancano:
- Conoscenze specifiche su condizioni cliniche
- Psicoeducazione strutturata per l'utente
- Tecniche specializzate per situazioni specifiche
- Comprensione di dinamiche relazionali e attachment

## Implementazione Proposta

### 1. Enciclopedia delle Condizioni Cliniche

Aggiunta di una nuova sezione `CLINICAL_KNOWLEDGE_BASE` a tutti i moduli AI:

```text
ENCICLOPEDIA CONDIZIONI CLINICHE:

📌 DISTURBI D'ANSIA:
- GAD (Ansia Generalizzata): Preoccupazione cronica, tensione muscolare, difficoltà concentrazione
  → Intervento: Worry Time, Decatastrofizzazione, Rilassamento Muscolare Progressivo
- Disturbo di Panico: Attacchi improvvisi, paura della paura, evitamento
  → Intervento: Psicoeducazione sul circolo del panico, Interoceptive Exposure
- Ansia Sociale: Paura del giudizio, evitamento situazioni sociali
  → Intervento: Esposizione graduale, Ristrutturazione delle predizioni negative
- Fobie Specifiche: Paura intensa e irrazionale di oggetti/situazioni specifiche
  → Intervento: Desensibilizzazione sistematica, Flooding controllato

📌 DISTURBI DELL'UMORE:
- Depressione Maggiore: Anedonia, umore deflesso, alterazioni sonno/appetito, colpa
  → Intervento: Attivazione Comportamentale, Cognitive Restructuring, Behavioral Experiments
- Distimia: Depressione cronica a bassa intensità ("sempre giù")
  → Intervento: Focus su pattern abituali, piccoli cambiamenti sostenibili
- Disturbo Bipolare I/II: Oscillazioni umore, episodi maniacali/ipomaniacali
  → Attenzione: Suggerire SEMPRE consulto psichiatrico, no consigli su farmaci

📌 TRAUMA E STRESS:
- PTSD: Flashback, evitamento, ipervigilanza, numbing emotivo
  → Intervento: Grounding, Finestra di Tolleranza, suggerire EMDR/CPT
- Disturbo dell'Adattamento: Reazione sproporzionata a stressor identificabile
  → Intervento: Problem-solving, coping skills, normalizzazione
- Lutto Complicato: Incapacità di elaborare perdita dopo 12+ mesi
  → Intervento: Elaborazione guidata, compiti di lutto, ricerca di significato

📌 DISTURBI DELLA PERSONALITÀ (Solo riconoscimento):
- Borderline: Instabilità relazionale, paura abbandono, impulsività, autolesionismo
  → Attenzione: DBT è gold standard, suggerire terapeuta specializzato
- Narcisistico: Grandiosità, bisogno ammirazione, mancanza empatia
- Evitante: Ipersensibilità al rifiuto, ritiro sociale, bassa autostima
- Dipendente: Bisogno eccessivo di essere accuditi, difficoltà decisioni

📌 DISTURBI ALIMENTARI:
- Anoressia Nervosa: Restrizione, paura peso, distorsione body image
- Bulimia Nervosa: Abbuffate + comportamenti compensatori
- Binge Eating: Abbuffate senza compensazione
  → Attenzione: SEMPRE suggerire team specializzato (psicologo + nutrizionista + medico)

📌 ADHD e NEURODIVERGENZA:
- ADHD Adulti: Disattenzione, impulsività, disregolazione emotiva
  → Intervento: Strategie organizzative, mindfulness, suggerire valutazione
- Autismo (adulti): Difficoltà sociali, rigidità, sensorialità atipica
  → Approccio: Accettazione, focus su punti di forza, ambiente sensoriale

📌 DISTURBI DEL SONNO:
- Insonnia: Difficoltà addormentamento/mantenimento, risvegli precoci
  → Intervento: Igiene del sonno, Stimulus Control, Paradoxical Intention
- Ipersonnia: Eccessiva sonnolenza diurna
  → Attenzione: Può indicare depressione, apnee, carenze

📌 DIPENDENZE:
- Sostanze: Alcol, droghe, farmaci
- Comportamentali: Gioco d'azzardo, internet, shopping, pornografia
  → Approccio: MI per ambivalenza, identificazione trigger, piano di riduzione del danno
```

### 2. Libreria di Tecniche Psicoeducative

Nuova sezione `PSYCHOEDUCATION_LIBRARY`:

```text
LIBRERIA PSICOEDUCATIVA (da usare quando appropriato):

📚 MECCANISMI PSICOLOGICI:
- Circolo dell'Ansia: "Quando eviti, l'ansia cala subito ma si rafforza nel tempo."
- Finestra di Tolleranza: "Tutti abbiamo una zona in cui possiamo gestire le emozioni..."
- Trappola della Ruminazione: "Ripensare non è risolvere. È come grattare una ferita."
- Circolo della Depressione: "Meno fai, meno energie hai. L'attivazione precede la motivazione."
- Attachment Styles: "Come ci hanno trattato da piccoli influenza come amiamo da grandi."

📚 DISTORSIONI COGNITIVE (con esempi):
- Catastrofizzazione: "E se...?" ripetuto, aspettarsi sempre il peggio
- Lettura del pensiero: "Sicuramente pensa che..."
- Filtro mentale: Vedere solo il negativo, ignorare il positivo
- Pensiero tutto-o-nulla: "Se non è perfetto, è un fallimento"
- Personalizzazione: "È colpa mia se..."
- Dovrei/Doverismo: "Dovrei essere...", "Non dovrei sentirmi..."
- Etichettatura: "Sono un fallito" invece di "Ho fallito in questo"
- Squalificazione del positivo: "Sì ma è stato solo fortuna"

📚 CONCETTI CHIAVE DA INSEGNARE:
- Validazione Emotiva: "Le tue emozioni sono valide. Non hai bisogno di giustificarle."
- Emozioni come Onde: "Le emozioni vengono e vanno. Non durano per sempre."
- Accettazione vs Rassegnazione: "Accettare non significa arrendersi."
- Valori vs Obiettivi: "Gli obiettivi si raggiungono, i valori si vivono ogni giorno."
- Self-Compassion: "Parla a te stesso come parleresti a un amico caro."
- Defusione: "Non sei i tuoi pensieri. Puoi osservarli senza crederci."
```

### 3. Protocolli di Intervento Specializzati

Nuova sezione `INTERVENTION_PROTOCOLS`:

```text
PROTOCOLLI DI INTERVENTO AVANZATI:

🧘 MINDFULNESS & ACT:
- Body Scan guidato (2 min): "Porta l'attenzione ai piedi... nota le sensazioni..."
- Defusione: "Prova a dire: 'Sto avendo il pensiero che...'"
- Matrice ACT: "Cosa ti avvicina ai tuoi valori? Cosa ti allontana?"
- Esercizio delle Foglie sul Fiume: "Immagina i pensieri come foglie..."

🔥 GESTIONE RABBIA:
- Identificazione Early Warning Signs
- Time-Out strutturato (uscita fisica + ritorno)
- Assertività vs Aggressività vs Passività
- Lettera mai spedita

💔 ELABORAZIONE LUTTO/PERDITA:
- Modello Dual-Process: Oscillazione tra orientamento alla perdita e restaurazione
- Continuing Bonds: Mantenere connessione simbolica
- Compiti del Lutto (Worden): Accettare realtà, elaborare dolore, adattarsi, trovare significato

👫 DINAMICHE RELAZIONALI:
- Comunicazione Non Violenta (CNV): Osservazione → Sentimento → Bisogno → Richiesta
- Ciclo Demand-Withdraw: Riconoscere pattern di inseguimento/ritiro
- Attachment Repair: Identificare stile, riparare rotture, guadagnare sicurezza
- Boundaries: "I confini non sono muri, sono porte con serrature"

🎭 AUTOSTIMA E IDENTITÀ:
- Diario dei Successi (3 cose fatte bene oggi)
- Sfida all'Inner Critic: "Cosa direbbe un amico?"
- Identificazione Valori Core (esercizio)
- Decostruzione Etichette: "Questo è un comportamento, non la tua identità"

😴 IGIENE DEL SONNO (Checklist):
- Orari regolari (anche weekend)
- No schermi 1h prima
- Camera fresca, buia, silenziosa
- No caffeina dopo le 14
- Rilassamento pre-sonno
- Letto solo per dormire (no lavoro, no scrolling)
```

### 4. Knowledge Base per Temi Specifici dei Diari

Arricchire il diario tematico con conoscenze specifiche per ogni tema:

```text
KNOWLEDGE BASE TEMATICA:

❤️ DIARIO AMORE:
- Attachment Theory: Ansioso, Evitante, Sicuro, Disorganizzato
- Love Languages: Parole, Tempo, Servizio, Regali, Contatto
- Fasi della Relazione: Limerence → Power Struggle → Stability → Commitment
- Red/Green Flags nelle relazioni
- Gestione conflitti: Gottman's Four Horsemen (Critica, Disprezzo, Difensività, Muro)
- Elaborazione Breakup: Fasi, No Contact, Ricostruzione identità

💼 DIARIO LAVORO:
- Burnout (Maslach): Esaurimento, Cinismo, Inefficacia
- Sindrome dell'Impostore: Pattern, normalizzazione, sfida
- Work-Life Boundaries nell'era remote
- Gestione Manager Difficili
- Career Grief: Elaborare aspirazioni non realizzate
- Toxic Workplace: Riconoscere, proteggere, decidere

👥 DIARIO RELAZIONI:
- Family Systems: Ruoli, triangolazioni, confini
- Gestione Conflitti Familiari
- Amicizie Tossiche vs Sane
- Social Anxiety: Esposizione graduale
- Solitudine vs Isolamento
- Costruire Rete di Supporto

🌱 DIARIO ME STESSO:
- Identità e Valori Core
- Quarter-Life/Mid-Life Crisis
- Perfezionismo: Adattivo vs Maladattivo
- Procrastinazione: Cause emotive, non pigrizia
- Self-Sabotage: Pattern inconsci
- Costruire Nuove Abitudini (Habit Loop)
```

### 5. Integrazione nei Moduli

I contenuti verranno integrati come costanti nei file:
- `supabase/functions/ai-chat/index.ts`
- `supabase/functions/gemini-voice/index.ts`
- `supabase/functions/thematic-diary-chat/index.ts`

Le istruzioni saranno aggiunte ai system prompt con regole di utilizzo:
- Usare psicoeducazione quando l'utente mostra confusione o chiede "perché"
- Applicare protocolli specifici quando rilevati pattern corrispondenti
- Personalizzare in base al tema del diario
- Non sovraccaricare: una tecnica/concetto per messaggio

## Riepilogo Modifiche

| File | Modifica |
|------|----------|
| `ai-chat/index.ts` | +CLINICAL_KNOWLEDGE_BASE, +PSYCHOEDUCATION_LIBRARY, +INTERVENTION_PROTOCOLS |
| `gemini-voice/index.ts` | +CLINICAL_KNOWLEDGE_BASE (versione compatta), +INTERVENTION_PROTOCOLS (voce) |
| `thematic-diary-chat/index.ts` | +THEMATIC_KNOWLEDGE_BASE specifico per ogni tema |
| `process-session/index.ts` | +Pattern recognition per condizioni cliniche aggiuntive |

## Benefici Attesi

1. **Risposte più informate**: L'AI può spiegare meccanismi psicologici
2. **Interventi mirati**: Tecniche appropriate per ogni situazione
3. **Psicoeducazione**: L'utente impara mentre interagisce
4. **Riconoscimento ampliato**: Più condizioni identificabili
5. **Personalizzazione tematica**: Ogni diario ha conoscenze specifiche

## Note Tecniche

- Le costanti sono lunghe ma non influenzano le performance (vengono incluse nel prompt una sola volta)
- Il modello Gemini 2.5 Flash ha context window sufficiente (1M tokens)
- Le istruzioni sono in italiano per coerenza con il target utente

