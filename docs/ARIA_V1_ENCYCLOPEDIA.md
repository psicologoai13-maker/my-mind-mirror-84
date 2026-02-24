# 🧠 Aria — Documentazione Completa v1.0

## *"La tua amica che ti capisce davvero."*

---

# Indice

1. [Panoramica del Prodotto](#1-panoramica-del-prodotto)
2. [Architettura Tecnica](#2-architettura-tecnica)
3. [Aria — L'Intelligenza Artificiale](#3-aria--lintelligenza-artificiale)
4. [Sistema di Onboarding](#4-sistema-di-onboarding)
5. [Home — Dashboard Adattiva](#5-home--dashboard-adattiva)
6. [Aria Portal — Hub Conversazionale](#6-aria-portal--hub-conversazionale)
7. [Chat Testuale con Aria](#7-chat-testuale-con-aria)
8. [Voce — Conversazione Vocale Immersiva](#8-voce--conversazione-vocale-immersiva)
9. [Diari Tematici](#9-diari-tematici)
10. [Sistema di Check-in Intelligente](#10-sistema-di-check-in-intelligente)
11. [Analisi — Centro Clinico](#11-analisi--centro-clinico)
12. [Obiettivi — Traguardi Personali](#12-obiettivi--traguardi-personali)
13. [Abitudini — Daily Tracker](#13-abitudini--daily-tracker)
14. [Sistema di Estrazione Metriche (66 Parametri)](#14-sistema-di-estrazione-metriche-66-parametri)
15. [Memoria a Lungo Termine](#15-memoria-a-lungo-termine)
16. [Contesto in Tempo Reale](#16-contesto-in-tempo-reale)
17. [Protocolli Clinici](#17-protocolli-clinici)
18. [Area Medico/Dottore](#18-area-medicodottore)
19. [Corpo — Metriche Fisiche](#19-corpo--metriche-fisiche)
20. [Correlazioni & Pattern Emotivi](#20-correlazioni--pattern-emotivi)
21. [Gamification & Reward](#21-gamification--reward)
22. [Profilo & Impostazioni](#22-profilo--impostazioni)
23. [Sicurezza & Privacy](#23-sicurezza--privacy)
24. [Piattaforme & Cross-Platform](#24-piattaforme--cross-platform)
25. [Stack Tecnologico](#25-stack-tecnologico)
26. [Roadmap & Visione](#26-roadmap--visione)

---

# 1. Panoramica del Prodotto

## Cos'è Aria

**Aria** è un'applicazione di benessere mentale basata sull'intelligenza artificiale che funge da **psicologa AI conversazionale**. Non è un chatbot generico: è un'amica virtuale formata clinicamente che impara dall'utente nel tempo, adattando linguaggio, tono e approccio terapeutico alla persona.

## Problema di Mercato

- **75%** delle persone con problemi di salute mentale non riceve trattamento
- I tempi di attesa per uno psicologo in Italia superano i **3-6 mesi**
- Il costo medio delle sedute (**50-100€**) è una barriera significativa
- Lo stigma sociale impedisce a molti di cercare aiuto

## Proposta di Valore

| Aspetto | Terapeuta Tradizionale | Aria |
|---------|----------------------|------|
| Disponibilità | 1h/settimana | 24/7/365 |
| Costo | 50-100€/seduta | Freemium |
| Tempo d'attesa | Settimane/mesi | Immediato |
| Continuità | Solo durante la seduta | Monitoraggio continuo |
| Memoria | Appunti manuali | Memoria strutturata illimitata |
| Dati | Soggettivi | 66 metriche cliniche quantificate |

## Target Utente

- **Primario**: Giovani adulti (18-35) con ansia, stress, problemi relazionali
- **Secondario**: Adulti (35-55) con burnout, problemi familiari, crisi di mezza età
- **Terziario**: Adolescenti (13-17) e senior (65+) con protocolli linguistici dedicati

---

# 2. Architettura Tecnica

## Frontend

| Tecnologia | Uso |
|------------|-----|
| **React 18** + **TypeScript** | Framework UI |
| **Vite** | Build tool |
| **Tailwind CSS** | Styling utility-first |
| **Framer Motion** | Animazioni e transizioni |
| **Recharts** | Grafici e data visualization |
| **Radix UI** (shadcn/ui) | Componenti accessibili |
| **React Query** (TanStack) | State management server-side |
| **React Router v6** | Routing SPA |

## Backend

| Tecnologia | Uso |
|------------|-----|
| **Supabase** | Database PostgreSQL + Auth + Realtime |
| **Edge Functions** (Deno) | Logic serverless (20+ funzioni) |
| **Google Gemini 2.5 Flash** | Modello AI principale (chat + analisi) |
| **ElevenLabs** | Voce conversazionale (Agent v3) |
| **OpenWeather API** | Contesto meteorologico |
| **World News API** | Contesto attualità |

## Database

- **31 tabelle** PostgreSQL con Row-Level Security (RLS)
- **11 funzioni** PL/pgSQL per logica server-side
- Trigger automatici per streak, timestamp e profili
- Cache multi-livello per performance ottimale

## Mobile

| Piattaforma | Tecnologia |
|-------------|-----------|
| **Web** | PWA responsive (mobile-first) |
| **Android** | Capacitor (wrapper nativo) |
| **iOS** | App nativa separata (Rork Max) con backend condiviso |

---

# 3. Aria — L'Intelligenza Artificiale

## Identità e Personalità

Aria non è un chatbot, non è un terapeuta, non è un assistente. È un'**amica che sa di psicologia**. La sua personalità è governata da regole rigide:

### HUMAN_CONVERSATION_ENGINE

Il protocollo proprietario che rende Aria "umana":

- **Regola 60/40**: Il 60% delle risposte NON termina con una domanda
- **12 Pattern di Risposta**: Alterna tra reazioni pure, opinioni, provocazioni affettuose, storytelling
- **Micro-reazioni**: Il 50% dei messaggi inizia con interiezioni naturali ("Uff", "Ma dai", "Serio?")
- **Anti-Therapist**: Bandite frasi cliniche come "Come ti senti a riguardo?"
- **Ritmo Variabile**: La lunghezza della risposta rispecchia quella dell'utente

### Linguaggio Adattivo per Età (6 Fasce)

Aria adatta **vocabolario, tono, riferimenti culturali, uso di emoji e lunghezza delle risposte** in base all'età precisa dell'utente:

| Fascia | Età | Tono | Esempio |
|--------|-----|------|---------|
| Adolescenti | 13-17 | Sorella maggiore, Gen-Z | "Noo ma serio?! Che palo 💀" |
| Giovani Adulti | 18-24 | Migliore amica, mix IT/EN | "Assurdo, ci sta troppo" |
| Adulti Giovani | 25-34 | Confidente diretta | "Senti, onestamente..." |
| Adulti Maturi | 35-49 | Amica saggia | "Sai cosa penso?" |
| Over 50 | 50-64 | Amica di lunga data | "Ma certo, è comprensibile" |
| Senior | 65+ | Compagna affettuosa | "Che bella cosa, mi racconti" |

### Protocollo Notturno (00:00-05:00)

Tra mezzanotte e le 5 del mattino, Aria:
- Abbassa il tono energetico
- Elimina i punti esclamativi
- Adotta un registro intimo e riflessivo
- Rispetta la vulnerabilità tardo-notturna

### Stili di Supporto Personalizzati

Basati sulla scelta dell'utente nell'onboarding:

| Stile | Comportamento |
|-------|--------------|
| **Ascoltatore** | Priorità all'ascolto, feedback minimi, zero consigli non richiesti |
| **Consulente** | Suggerimenti concreti, focus su azioni pratiche, problem-solving |
| **Sfidante** | Domande provocatorie, sfida convinzioni limitanti, push verso crescita |
| **Confortante** | Validazione emotiva, rassicurazione, tono avvolgente |

---

# 4. Sistema di Onboarding

## Flusso (6 Step)

1. **Welcome** — Schermata di benvenuto con presentazione di Aria
2. **Nome & Mood** — Nome dell'utente + umore iniziale (slider 1-5 con emoji)
3. **Profilo** — Genere, età precisa (13-99), stato terapeutico, occupazione
4. **Motivazioni** — Perché l'utente è qui (ansia, sonno, relazioni, energia, autostima, focus, motivazione)
5. **Obiettivi** — Selezione obiettivi specifici
6. **Interessi** — Hobby, sport, musica, serie TV, ecc.

## Dati Raccolti

Tutti i dati dell'onboarding vengono:
- Salvati nel profilo utente (`onboarding_answers`)
- Utilizzati per configurare la **dashboard personalizzata** (quali metriche mostrare)
- Iniettati nel prompt di Aria per personalizzare il tono e il focus clinico
- Usati per calcolare `birth_date` dall'età precisa

## Occupazione Intelligente

Se l'utente ha meno di 19 anni, viene chiesto se è studente (e il tipo di scuola). Per adulti, viene chiesta l'occupazione lavorativa. Questo contesto influenza i riferimenti e gli scenari di Aria.

---

# 5. Home — Dashboard Adattiva

## Struttura

La homepage è una **dashboard AI-driven** che si riordina automaticamente in base ai dati dell'utente:

### Componenti

1. **Header Personalizzato**
   - Saluto contestuale (Buongiorno/Buon pomeriggio/Buonasera/Buonanotte)
   - Nome dell'utente
   - Indicatore stato check-in

2. **Welcome Back Banner**
   - Appare dopo 3+ giorni di inattività
   - Messaggio empatico personalizzato

3. **Wellness Score Box**
   - Punteggio benessere 0-100 (calcolato dall'AI)
   - Messaggio motivazionale generato dall'AI
   - Espandibile con insight AI dettagliato
   - Badge colorato con trend

4. **Smart Check-in** (vedi sezione dedicata)

5. **Widget Adattivi** (ordinati dall'AI):
   - **Vitals Grid**: Griglia parametri vitali (umore, ansia, energia, sonno)
   - **Emotional Mix Bar**: Distribuzione emotiva del giorno

## AI Dashboard Engine

Una Edge Function dedicata (`ai-dashboard`) analizza i dati dell'utente e genera:
- L'ordine ottimale dei widget
- Il messaggio di benessere personalizzato
- Suggerimenti contestuali
- Risultati cachati per performance

---

# 6. Aria Portal — Hub Conversazionale

## Design "Aurora Portal"

La sezione `/aria` è il cuore dell'app, con un'estetica vibrante:

- **Sfondo Aurora**: Gradienti dinamici violetto-indaco con riflessi luminosi
- **Particelle Fluttuanti**: Effetto cosmic con particelle animate
- **Orb Glassmorfico Centrale**: Sfera luminosa statica che si anima durante le interazioni vocali
- **Sottotitolo**: "Sono qui per te, quando vuoi"

## Punti di Accesso

Da questo hub l'utente può:

1. **💬 Chat Testuale** → Navigazione a `/chat`
2. **🎙️ Voce** → Apertura modale vocale immersiva
3. **📔 Diari Tematici** → Apertura diario specifico (scroll orizzontale)
4. **📜 Cronologia** → Sheet laterale con sessioni passate

## Gestione Permessi Location

Prima della prima interazione, Aria chiede il permesso per la geolocalizzazione (opzionale) per arricchire il contesto con meteo e posizione.

---

# 7. Chat Testuale con Aria

## Architettura

La chat utilizza **streaming SSE** (Server-Sent Events) per risposta in tempo reale, token per token.

### Flusso Tecnico

1. L'utente apre `/chat`
2. Viene creata una **sessione** nel database
3. Aria genera un **saluto contestuale** basato su:
   - Tempo trascorso dall'ultima sessione
   - Nome dell'utente
   - Storico recente
4. Ogni messaggio viene inviato alla Edge Function `ai-chat` con:
   - Storico completo della conversazione
   - Contesto real-time (ora, meteo, posizione, news)
   - Memoria a lungo termine (fino a 50 ricordi selezionati)
   - Obiettivi attivi
   - Metriche giornaliere
   - Abitudini traciate
   - Interessi personali
   - Eventi futuri
5. La risposta viene streamata token per token
6. Al termine della sessione (o dopo 5 min di inattività), viene chiamata `process-session` per estrarre le 66 metriche

### Dimensione del Prompt

Il prompt di sistema di Aria supera le **7.000 righe** di istruzioni cliniche, inclusi:
- ~4.200 righe in `ai-chat/index.ts`
- ~2.800 righe in `process-session/index.ts`
- Contesto dinamico iniettato per ogni utente (~500-1.000 righe aggiuntive)

### Saluto Intelligente

Il saluto di apertura varia in base alla recenza:

| Tempo dall'ultima sessione | Esempio |
|---------------------------|---------|
| < 30 minuti | "Ehi {nome}! Ci siamo appena sentiti 😊 Tutto ok?" |
| 30-60 minuti | "Ciao {nome}! Bentornato/a! 💚 È successo qualcosa?" |
| 1-3 ore | "Ciao di nuovo {nome}! 💚 Com'è andata nel frattempo?" |
| 3-24 ore | "Ehi {nome}! 💚 Come stai ora?" |
| 1 giorno | "Ciao {nome}! 💚 Come stai oggi?" |
| 2-7 giorni | "Ehi {nome}! 💚 È un po' che non ci sentiamo, come va?" |
| 7+ giorni | "{nome}! 💚 Che bello risentirti! Come stai?" |
| Mai | "Ciao {nome}! 💚 Sono Aria, piacere di conoscerti!" |

### Funzionalità Avanzate

- **Crisis Detection**: Header `X-Crisis-Alert` per attivare il protocollo di sicurezza
- **Idle Timer**: Chiusura automatica dopo 5 minuti di inattività
- **Optimistic UI**: I messaggi appaiono istantaneamente prima della conferma dal server
- **Memory Badge**: Indicatore visivo dei ricordi attivi di Aria
- **Intent System**: Navigazione da altre pagine con intenti specifici (es. creazione obiettivo)

---

# 8. Voce — Conversazione Vocale Immersiva

## Tecnologia

- **Provider**: ElevenLabs Conversational AI (Agent V3)
- **ASR**: Scribe Realtime (speech-to-text)
- **Modello vocale**: V3 Conversational
- **Strategia connessione**: 3 livelli di fallback (WebSocket+Overrides → WebRTC → WebSocket base)

## UI Immersiva (ZenVoiceModal)

- **Full-Screen**: Esperienza completamente immersiva, nessuna distrazione
- **Avatar Orb**: Sfera animata via Canvas che reagisce al volume audio
- **Sfondo Aurora**: Effetto atmosferico con particelle
- **Transcript Live**: Anteprima in tempo reale di ciò che Aria sta dicendo
- **Controlli Touch**: Mute e End Call con touch area ingrandita
- **Fix iOS Safari**: Gestione specifica per sblocco AudioContext tramite gesto utente

## Contesto Dinamico

Prima di ogni sessione vocale, viene chiamata la Edge Function `elevenlabs-context` che genera:
- Il prompt completo di Aria (~30.000 caratteri)
- Il messaggio iniziale personalizzato
- La lingua (italiano)

Questi dati vengono iniettati come **override** nel WebSocket di ElevenLabs, garantendo che Aria mantenga la stessa personalità della chat testuale.

---

# 9. Diari Tematici

## Concetto

I diari tematici sono **chat specializzate** focalizzate su un argomento specifico. A differenza della chat generale con Aria, ogni diario mantiene il proprio storico separato.

## Temi Disponibili

| Tema | Icona | Focus |
|------|-------|-------|
| **Amore** | ❤️ | Relazioni, partner, sentimenti |
| **Lavoro** | 💼 | Carriera, colleghi, stress lavorativo |
| **Relazioni** | 👥 | Amicizie, famiglia, sociale |
| **Se Stessi** | 🌟 | Introspezione, crescita, identità |

## Personalizzazione

- L'utente può **aggiungere e rimuovere** diari attivi (max 6)
- Supporto per **diari custom** con etichetta personalizzata
- I diari sono visualizzati come **chip scrollabili** orizzontalmente

## Architettura

Ogni diario è salvato nella tabella `thematic_diaries` con:
- Array di messaggi in formato JSONB
- Preview dell'ultimo messaggio
- Timestamp dell'ultima attività
- Tema (chiave univoca per utente)

La Edge Function `thematic-diary-chat` gestisce le risposte con contesto specifico per tema.

---

# 10. Sistema di Check-in Intelligente

## Concetto

Il check-in giornaliero è un sistema **AI-personalizzato** che genera domande diverse ogni giorno basandosi su:
- Obiettivi dell'utente
- Abitudini attive
- Aree della vita monitorate
- Dati mancanti recenti

## Tipologie di Check-in

| Tipo | Input | Esempio |
|------|-------|---------|
| **Mood** | 5 emoji (😔😕😐🙂😊) | "Come ti senti oggi?" |
| **Slider** | Scala 1-10 | "Quanto sei stressato oggi?" |
| **Boolean** | Sì/No (switch) | "Hai dormito bene?" |
| **Numeric** | Input numerico | "Quante ore hai dormito?" |
| **Counter** | +/- con contatore | "Quanti bicchieri d'acqua?" |
| **Timer** | Cronometro | "Quanto hai meditato?" |

## Flusso

1. L'AI genera 3-6 check-in personalizzati (Edge Function `ai-checkins`)
2. I check-in appaiono sulla Home come card interattive
3. L'utente risponde uno alla volta
4. I dati vengono salvati nelle tabelle appropriate (`daily_checkins`, `daily_habits`, `daily_life_areas`)
5. Completamento visuale con animazione ✅

## Check-in Summary Modal

Un modal riassuntivo mostra lo stato di tutti i check-in del giorno, con possibilità di visualizzare il riepilogo.

---

# 11. Analisi — Centro Clinico

## Struttura (Pagina `/analisi`)

La sezione Analisi è il **centro dati clinico** dell'utente, organizzato in sezioni Bento:

### Selettore Temporale

4 opzioni: **Giorno** | **Settimana** | **Mese** | **Tutto**

Con auto-espansione intelligente: se non ci sono dati nella settimana, espande automaticamente al mese, poi a "Tutto".

### Sezioni Dati

1. **Distribuzione Emotiva** (EmotionalSpectrumSection)
   - Lista verticale di barre orizzontali
   - Ordinate per valore decrescente
   - 20 emozioni tracciate

2. **Aree della Vita** (LifeAreasSection)
   - Radar Chart (se ≥3 aree con dati)
   - Griglia a 2 colonne con punteggi
   - 9 aree: Lavoro, Scuola, Amore, Famiglia, Socialità, Salute, Crescita, Tempo Libero, Finanze

3. **Domini Clinici** (ClinicalDomainSection)
   - **Attivazione**: Burnout, Irritabilità, Pensieri accelerati, Regolazione emotiva
   - **Cognitivo**: Ruminazione, Autoefficacia, Chiarezza mentale, Concentrazione, Dissociazione, Confusione
   - **Comportamentale**: Evitamento, Ritiro sociale, Impulsi compulsivi, Procrastinazione
   - **Somatico**: Tensione somatica, Cambiamenti appetito, Esposizione solare
   - **Risorse**: Coping, Gratitudine, Motivazione, Autostima, Scopo, Soddisfazione, Supporto sociale, Resilienza, Mindfulness
   - **Sicurezza** (appare solo se >0): Ideazione suicidaria, Disperazione, Impulsi autolesionistici

4. **Corpo** (CorpoTab)
   - Peso, Altezza, Indice Massa Corporea
   - Frequenza cardiaca, Pressione
   - Passi, Calorie, Minuti attivi

5. **Abitudini** (AbitudiniTab)
   - Tracciamento routine giornaliere
   - Streak e completamento

6. **Correlazioni & Pattern** (CorrelationsInsightSection)
   - Correlazioni statistiche tra metriche (es. sonno ↔ umore)
   - Pattern emotivi rilevati (es. "morning dip", "weekend boost")

### Colori Semantici

| Tipo | Valore | Colore |
|------|--------|--------|
| Positivo (↑) | ≥7 | 🟢 Verde |
| Positivo (↑) | 4-6 | 🟡 Giallo |
| Positivo (↑) | <4 | 🔴 Rosso |
| Negativo (↓, es. Ansia) | ≤3 | 🟢 Verde |
| Negativo (↓) | 4-6 | 🟡 Giallo |
| Negativo (↓) | >6 | 🔴 Rosso |

### Metric Detail Sheet

Il tocco su qualsiasi metrica apre un bottom sheet con:
- Grafico sparkline storico
- Valore medio nel periodo
- Trend (↑ ↓ →)
- Dettagli clinici

---

# 12. Obiettivi — Traguardi Personali

## Filosofia

Gli obiettivi sono **interamente gestiti via conversazione con Aria**. L'utente non compila form: parla con Aria dei suoi desideri e l'AI crea, aggiorna e monitora gli obiettivi automaticamente.

## Categorie

| Categoria | Icona | Esempi |
|-----------|-------|--------|
| **Mente** | 🧠 | Ridurre ansia, Dormire meglio |
| **Corpo** | 💪 | Perdere peso, Fare più sport |
| **Studio** | 📚 | Superare esame, Studiare X ore |
| **Lavoro** | 💼 | Promozione, Side project |
| **Finanze** | 💰 | Risparmiare, Budget, Debiti |
| **Relazioni** | ❤️ | Trovare partner, Migliorare amicizie |
| **Crescita** | 🌱 | Leggere, Meditare, Viaggiare |

## Obiettivi Finanziari (Dettaglio)

Il sistema supporta 5 sotto-tipi finanziari:

1. **Accumulo**: Raggiungere una cifra (es. 10.000€ di risparmi)
2. **Risparmio Periodico**: X€ al mese/settimana
3. **Limite Spesa**: Max X€/mese per categoria
4. **Guadagno Periodico**: Obiettivo di entrate
5. **Riduzione Debiti**: Estinguere un debito specifico

## Tracking

- **Numerico**: Progress bar con valore corrente/target
- **Qualitativo**: Stima AI 0-100% basata su milestone
- **Auto-sync**: Collegamento a abitudini o metriche corporee
- **AI Milestones**: Sotto-obiettivi generati dall'AI
- **AI Feedback**: Messaggi motivazionali personalizzati

## UI

Layout Bento con:
- Progress ring 64px (glow emerald/violet)
- Badge categoria e tracking
- Card orizzontali scrollabili

---

# 13. Abitudini — Daily Tracker

## Gestione via Aria

Come gli obiettivi, le abitudini sono create e aggiornate **esclusivamente tramite conversazione**. L'utente dice "Voglio iniziare a meditare" e Aria propone di aggiungerla al tracker.

## Tipi di Abitudini

### Positive (streak_type: "daily")
- Meditazione, Yoga, Respirazione
- Acqua, Vitamine, Pasti sani
- Esercizio, Stretching, Passi
- Lettura, Studio, Journaling
- Gratitudine, Affermazioni, Digital Detox

### Negative (streak_type: "abstain")
- Sigarette, Alcol, Junk Food, Social Media
- Per queste, valore 0 = SUCCESSO, valore > 0 = FALLIMENTO

## Sistema di Streak

Tabella `habit_streaks` aggiornata automaticamente via trigger PL/pgSQL:
- **Current Streak**: Giorni consecutivi
- **Longest Streak**: Record personale
- **Streak Broken Count**: Volte interrotta
- **Total Completions**: Completamenti totali

## Integrazione Check-in

Le abitudini attive appaiono automaticamente nel check-in giornaliero sulla Home.

---

# 14. Sistema di Estrazione Metriche (66 Parametri)

## Panoramica

La Edge Function `process-session` analizza ogni conversazione ed estrae **66 metriche cliniche** in modo completamente automatico, senza che l'utente debba rispondere a questionari.

## Le 66 Metriche

### 4 Vitali
`mood` (umore), `anxiety` (ansia), `energy` (energia), `sleep` (sonno)

### 20 Emozioni
**Base (Ekman)**: Gioia, Tristezza, Rabbia, Paura, Disgusto, Sorpresa, Apatia

**Secondarie**: Vergogna, Gelosia, Speranza, Frustrazione, Nostalgia, Nervosismo, Sopraffazione, Eccitazione, Delusione

**Estese**: Serenità, Orgoglio, Affetto, Curiosità

### 9 Aree della Vita
Lavoro, Scuola, Amore, Famiglia, Socialità, Salute, Crescita, Tempo Libero, Finanze

### 32 Parametri di Psicologia Profonda

**Cognitivi (6)**: Ruminazione, Autoefficacia, Chiarezza mentale, Concentrazione, Dissociazione, Confusione

**Attivazione (4)**: Burnout, Irritabilità, Pensieri accelerati, Regolazione emotiva

**Comportamentali (4)**: Evitamento, Ritiro sociale, Impulsi compulsivi, Procrastinazione

**Somatici (3)**: Tensione somatica, Cambiamenti appetito, Esposizione solare

**Risorse (11)**: Coping, Solitudine percepita, Senso di colpa, Gratitudine, Motivazione, Pensieri intrusivi, Autostima, Scopo nella vita, Soddisfazione di vita, Supporto sociale percepito, Resilienza, Mindfulness

**Sicurezza (3)**: Ideazione suicidaria, Disperazione, Impulsi autolesionistici

### + 1 Riassunto AI
Summary testuale della sessione + insight + eventi chiave + tag emotivi

## Protocollo di Inferenza

- **Emozioni positive**: Regole ammorbidite — l'AI può dedurre punteggi da situazioni oggettivamente favorevoli (viaggi, successi)
- **Emozioni negative**: Rigore dell'evidenza esplicita — l'AI NON inventa malessere
- **Post-processing**: Funzione `forceContextualInferences` scansiona il transcript per pattern (keyword viaggi, eventi sociali, successi) e forza punteggi minimi di base

## Flusso Tecnico

1. Sessione chat/voce completata → `process-session` invocata
2. L'intero transcript viene analizzato con Gemini 2.5 Flash
3. 66 metriche estratte in formato JSON strutturato
4. Dati salvati in 4 tabelle: `sessions`, `daily_emotions`, `daily_life_areas`, `daily_psychology`
5. Metriche aggregate dalla funzione PL/pgSQL `get_daily_metrics`
6. Dashboard e Analisi aggiornate automaticamente

---

# 15. Memoria a Lungo Termine

## Architettura Strutturata

Aria utilizza un'architettura SQL avanzata per la memoria, non un semplice array:

### Tabella `user_memories`

| Campo | Descrizione |
|-------|-------------|
| `fact` | Il fatto memorizzato (es. "[PERSONA] Fidanzata: Laura") |
| `category` | Categoria (persona, evento, hobby, lavoro, salute, ecc.) |
| `importance` | Priorità 1-10 |
| `source_session_id` | Sessione da cui è stato estratto |
| `is_active` | Se il ricordo è ancora valido |
| `last_referenced_at` | Ultima volta che è stato usato |

### Smart Selection

Per ogni conversazione, Aria seleziona i ricordi più rilevanti:
1. **Tag prioritari**: `[EVENTO]`, `[PERSONA]`, `[VIAGGIO]`, `[LAVORO]`, `[HOBBY]`
2. **Ultimi 25 ricordi** per recenza
3. **Max 50 totali** per evitare overflow del contesto

### Regola Anti-Ridondanza

**CRITICA**: Prima di porre domande, Aria DEVE consultare la memoria. Se l'informazione è già presente (es. "[EVENTO] Viaggio a Madrid"), Aria fa riferimento diretto al dato noto invece di chiedere nuovamente.

### Tabella `session_context_snapshots`

Per ogni sessione completata:
- Riassunto del contesto
- Emozione dominante
- Topic chiave
- Problemi irrisolti
- Action items
- Punteggio qualità sessione

### Tabella `conversation_topics`

Traccia gli argomenti di conversazione nel tempo:
- Frequenza di menzione
- Sentiment medio
- Se è un argomento sensibile
- Se va evitato a meno che l'utente lo introduca

## Correzioni

L'utente può correggere la memoria di Aria durante la conversazione. Il sistema rileva automaticamente le correzioni e aggiorna i fatti memorizzati.

---

# 16. Contesto in Tempo Reale

## Architettura Zero-Cost

Aria è consapevole del contesto reale dell'utente tramite:

### Data/Ora
- Ora esatta, giorno della settimana, festività
- Protocollo notturno automatico (00:00-05:00)

### Geolocalizzazione
- Posizione GPS dell'utente (con permesso)
- Riferimenti a luoghi noti ("Sei a Roma oggi?")

### Meteo (OpenWeather API)
- Temperatura, condizioni, umidità
- Cache 2 ore per utente con grid-based coordinate rounding (0.1°)
- ~1.000 chiamate/giorno limit

### News (World News API)
- Notizie rilevanti dalla cronaca
- Cache globale condivisa tra tutti gli utenti
- Refresh automatico 2x/giorno (8:00 e 18:00)
- 50 punti/giorno limit

### Degradazione Graduale
Se le API non sono disponibili, Aria funziona normalmente senza contesto esterno.

---

# 17. Protocolli Clinici

## Framework Terapeutici Integrati

Aria integra i seguenti approcci evidence-based:

### CBT (Terapia Cognitivo-Comportamentale)
- **10 Distorsioni Cognitive** identificate e nominate (catastrofizzazione, lettura del pensiero, pensiero tutto-o-nulla, ecc.)
- **Ristrutturazione Cognitiva** in tempo reale
- **Behavioral Experiments** suggeriti

### DBT (Terapia Dialettico-Comportamentale)
- **TIPP**: Temperatura, Intenso esercizio, Paced breathing, Paired relaxation
- **5-4-3-2-1 Grounding**: Tecnica sensoriale per crisi
- **STOP Skill**: Fermati, Passo indietro, Osserva, Procedi

### ACT (Acceptance and Commitment Therapy)
- **Defusione**: "Sto avendo il pensiero che..." vs "Sono un fallito"
- **Matrice ACT**: Valori vs Evitamento
- **Foglie sul Fiume**: Osservazione pensieri senza giudizio
- **Dropping Anchor**: Tecnica di ancoraggio

### MI (Motivational Interviewing)
- **OARS**: Open questions, Affirmation, Reflection, Summary
- **Scaling Questions**: "Da 1 a 10, dove sei?"
- **Evocazione motivazione intrinseca**

### SFBT (Solution-Focused Brief Therapy)
- **Domanda del Miracolo**: "Se il problema fosse risolto domani..."
- **Ricerca delle Eccezioni**: "Quando il problema era meno presente?"
- **Complimenti Costruttivi**

## Enciclopedia Clinica (500+ Righe)

Il prompt include una **enciclopedia completa di condizioni cliniche**:

- Disturbi d'Ansia (GAD, Panico, Sociale, Agorafobia, Fobie)
- Disturbi dell'Umore (Depressione Maggiore, Distimia, Bipolare)
- Trauma (PTSD, Adattamento, Lutto Complicato, C-PTSD)
- Disturbi di Personalità (Borderline, Narcisistico, Evitante, Dipendente)
- Disturbi Alimentari (Anoressia, Bulimia, BED, Ortoressia, ARFID)
- ADHD e Neurodivergenza
- OCD (con distinzione ego-distonico/sintonico)
- Disturbi del Sonno (Insonnia, Ipersonnia, Incubi)
- Dipendenze (Sostanze e Comportamentali)
- Disturbi Dissociativi (Depersonalizzazione, Derealizzazione)

## 50+ Scenari di Risposta Guidata

Blocchi di risposta dettagliati per situazioni specifiche:

1. **Ansia Profonda & Ipocondria** (fitta al petto, testa pesante, panic attack notturno, vagal shutdown)
2. **Distorsioni Cognitive** (catastrofizzazione, lettura del pensiero, tutto-o-nulla)
3. **Relazioni & Intimità** (ghosting, dipendenza affettiva, prestazione sessuale, vergogna corporea)
4. **Burnout & Impostore** (sindrome dell'impostore, burnout totale)
5. **Rabbia, Lutto & Famiglia Tossica** (rabbia esplosiva, genitori tossici, lutto, dipendenze)
6. **Psicosomatica & Biohacking** (stomaco, schiena, pelle, reset dopamina, igiene sonno, fame nervosa)
7. **Comunicazione Assertiva** (people pleasing, confini, litigio, colloquio)
8. **Esistenzialismo** (vuoto esistenziale, pensieri intrusivi OCD, solitudine, gratitudine)
9. **Primo Soccorso Emotivo** (pianto incontrollabile, self-harm urges, shock acuto, paralisi decisionale)
10. **Cultura & Lifestyle** (leggerezza, bisogno di piangere, viaggiare, passioni)
11. **Procrastinazione** (inerzia, perfezionismo paralizzante, habit stacking)
12. **Ascolto Prolungato** (pacing, simulazione flusso di coscienza)
13. **Inside Jokes & Continuità** (soprannomi, follow-up spontanei)
14. **Ambivalenza & Nostalgia** (mancare chi fa male, accettare l'ambivalenza)

## Triage Psichiatrico (4 Livelli)

| Livello | Condizione | Azione |
|---------|-----------|--------|
| **1 — CRITICO** | Ideazione suicidaria attiva, autolesionismo, psicosi | Protocollo Sicurezza + 112/PS |
| **2 — URGENTE** | Anedonia grave, panico debilitante, flashback PTSD, ipomania | Tecniche DBT + suggerire specialista |
| **3 — ATTENZIONE** | Insonnia cronica, isolamento, burnout in peggioramento | Monitoraggio + obiettivi specifici |
| **4 — STANDARD** | Stress gestibile, crescita personale, ansia situazionale | Approccio terapeutico normale |

---

# 18. Area Medico/Dottore

## Dual-Role System

L'app supporta due ruoli: **Patient** (default) e **Doctor**. Il ruolo è gestito tramite la tabella `user_roles` con enum `app_role`.

## Flusso Paziente → Dottore

1. Il paziente genera un **codice di connessione** (8 caratteri alfanumerici) dal profilo
2. Il dottore inserisce il codice nella propria dashboard
3. Viene creata una connessione in `doctor_patient_access`
4. Il dottore può ora visualizzare i dati del paziente

## Dashboard Dottore (`/doctor-dashboard`)

- Lista pazienti connessi
- Per ogni paziente:
  - Metriche vitali recenti
  - Distribuzione emotiva
  - Aree della vita
  - Sessioni e transcript
  - Alert di crisi

## Report Clinico

Il dottore può generare un **report clinico PDF** (via `generate-clinical-report`) con tutti i dati aggregati del paziente.

## RLS Policies

Tutti i dati paziente sono protetti da policy RLS che verificano:
```sql
EXISTS (
  SELECT 1 FROM doctor_patient_access
  WHERE patient_id = [tabella].user_id
  AND doctor_id = auth.uid()
  AND is_active = true
)
```

---

# 19. Corpo — Metriche Fisiche

## Tabella `body_metrics`

Tracciamento giornaliero di:
- **Peso** (kg) e **Altezza** (cm)
- **Body Fat %** e **Massa Muscolare** (kg)
- **Circonferenza Vita** (cm)
- **Frequenza Cardiaca a Riposo** (bpm)
- **Pressione Arteriosa** (sistolica/diastolica)
- **Ore di Sonno** e **Qualità Sonno**
- **Passi**, **Calorie Bruciate**, **Minuti Attivi**
- **Livello Idratazione**

## Integrazione con Obiettivi

Gli obiettivi "body" possono essere collegati a metriche corporee specifiche per auto-sync dei progressi.

---

# 20. Correlazioni & Pattern Emotivi

## Correlazioni (Pearson)

La Edge Function `calculate-correlations` esegue analisi statistiche tra coppie di metriche:
- Esempio: "Il tuo sonno ha una correlazione positiva forte (r=0.72) con il tuo umore"
- Salvate in `user_correlations` con coefficiente, p-value e sample size
- Insight testuale generato automaticamente

## Pattern Emotivi

La Edge Function `detect-emotion-patterns` identifica trend temporali:
- **Morning Dip**: Umore basso al mattino
- **Weekend Boost**: Miglioramento nel weekend
- **Seasonal Pattern**: Variazioni stagionali
- **Trigger Factors**: Fattori scatenanti identificati
- Raccomandazioni personalizzate

---

# 21. Gamification & Reward

## Sistema di Punti

| Azione | Punti |
|--------|-------|
| Sessione completata | +10 |
| Check-in giornaliero | +5 |
| Streak 7 giorni | +50 |
| Obiettivo raggiunto | +100 |
| Referral completato | +200 |

## Achievement System

Badge sbloccabili per milestone (salvati in `user_achievements`):
- Primo check-in
- Prima sessione
- Streak di 7, 30, 100 giorni
- 10 sessioni completate
- Primo obiettivo raggiunto

## Referral Program

- Ogni utente ha un codice referral unico (6 caratteri)
- Referral tracciato con stato (pending → completed)
- Punti assegnati quando il referral è attivo per X giorni

---

# 22. Profilo & Impostazioni

## Struttura

- **Header Compatto**: Avatar, nome, stats, streak
- **Premium Banner**: CTA per utenti free
- **Gruppi Impostazioni**:
  - Dati Personali
  - Interessi & Preferenze
  - Notifiche
  - Aspetto (tema, testo grande, riduzione movimento)
  - Privacy
  - Area Clinica (connessione medico)
  - Aiuto & Supporto
  - Invita Amici (referral)

## Notifiche

Configurazione granulare:
- Check-in reminder (con orario personalizzabile)
- Promemoria sessione
- Insight giornalieri
- Obiettivo completato
- Aggiornamenti app

## Aspetto

- Tema: Sistema / Chiaro / Scuro
- Testo grande (accessibilità)
- Riduzione movimento (accessibilità)

---

# 23. Sicurezza & Privacy

## Row-Level Security (RLS)

Ogni tabella ha policy RLS che garantiscono:
- **Utenti**: Possono vedere/modificare SOLO i propri dati
- **Dottori**: Possono vedere (READ-ONLY) i dati dei pazienti connessi
- **Nessun accesso anonimo**: Tutte le tabelle richiedono autenticazione

## Protocollo di Sicurezza Clinica

Quando Aria rileva segnali critici (livello 1-2 del triage):
- Header `X-Crisis-Alert` nella risposta HTTP
- Modal di crisi con:
  - Numero di emergenza (112)
  - Telefono Amico
  - Telefono Azzurro (per minori)
  - Risorse di aiuto

## Gestione Dati Sensibili

- Argomenti sensibili tracciati nella tabella `conversation_topics`
- Flag `avoid_unless_introduced` per argomenti che Aria non deve sollevare per prima
- Flag `is_sensitive` per argomenti che richiedono cautela extra

## Privacy Settings

L'utente può controllare:
- Condivisione posizione GPS
- Condivisione notizie come contesto
- Connessione con medico (revocabile in qualsiasi momento)

---

# 24. Piattaforme & Cross-Platform

## Web (Piattaforma Principale)

- PWA responsive, mobile-first
- Supporto completo desktop e tablet
- Hosting su Lovable Cloud

## Android

- **Capacitor** wrapper nativo
- Accesso a API native (vibrazione, notifiche)
- Stesso codebase del web

## iOS

- **App nativa separata** (Rork Max)
- Backend condiviso (stesse Edge Functions e database)
- Edge Function proxy dedicata (`aria-chat-ios`) per chat non-streaming
- Notifiche push native via APNs (`aria-push-notification`)
- Integrazione voce ElevenLabs con override dinamici

## Notifiche Push (iOS)

Tabella `device_push_tokens` per mappare token APNs per utente.
Edge Function `aria-push-notification` genera messaggi contestuali che simulano messaggi personali da Aria.

---

# 25. Stack Tecnologico

## Riepilogo Completo

```
┌─────────────────────────────────────────────────┐
│                    FRONTEND                      │
│  React 18 • TypeScript • Vite • Tailwind CSS    │
│  Framer Motion • Recharts • Radix UI (shadcn)   │
│  React Query • React Router v6                   │
├─────────────────────────────────────────────────┤
│                    BACKEND                       │
│  Supabase (PostgreSQL + Auth + Realtime)         │
│  20+ Edge Functions (Deno/TypeScript)            │
│  31 tabelle • 11 funzioni PL/pgSQL              │
│  Row-Level Security su ogni tabella              │
├─────────────────────────────────────────────────┤
│                      AI                          │
│  Google Gemini 2.5 Flash (chat + analisi)        │
│  ElevenLabs Agent V3 (voce conversazionale)      │
│  7.000+ righe di istruzioni cliniche             │
│  66 metriche estratte per sessione               │
├─────────────────────────────────────────────────┤
│               CONTESTO REAL-TIME                 │
│  OpenWeather API (meteo, cache 2h)               │
│  World News API (news, cache 12h)                │
│  GPS Geolocation (con permesso)                  │
├─────────────────────────────────────────────────┤
│                   MOBILE                         │
│  Web: PWA responsive (mobile-first)              │
│  Android: Capacitor                              │
│  iOS: App nativa (Rork Max) + backend condiviso  │
└─────────────────────────────────────────────────┘
```

## Edge Functions (20+)

| Funzione | Scopo |
|----------|-------|
| `ai-chat` | Chat principale con Aria (streaming SSE, ~4.200 righe) |
| `aria-chat-ios` | Proxy non-streaming per iOS |
| `aria-voice-chat` | Contesto voce web |
| `aria-agent-backend` | Backend agente avanzato |
| `elevenlabs-context` | Generazione contesto per ElevenLabs |
| `elevenlabs-conversation-token` | Token conversazione ElevenLabs |
| `gemini-voice` | Voce Gemini (web) |
| `gemini-voice-native` | Voce Gemini (nativo) |
| `process-session` | Estrazione 66 metriche (~2.800 righe) |
| `ai-dashboard` | Generazione dashboard AI |
| `ai-analysis` | Analisi AI settimanale |
| `ai-insights` | Insight AI |
| `ai-checkins` | Check-in personalizzati AI |
| `real-time-context` | Aggregazione contesto real-time |
| `refresh-global-context` | Refresh cache news globale |
| `calculate-correlations` | Correlazioni statistiche Pearson |
| `detect-emotion-patterns` | Rilevamento pattern emotivi |
| `thematic-diary-chat` | Chat diari tematici |
| `create-habit-chat` | Creazione abitudini via chat |
| `create-objective-chat` | Creazione obiettivi via chat |
| `update-objective-chat` | Aggiornamento obiettivi via chat |
| `sync-habits-to-brain` | Sync abitudini nel contesto AI |
| `doctor-view-data` | Dati per vista medico |
| `generate-clinical-report` | Report clinico PDF |
| `aria-push-notification` | Notifiche push iOS |

---

# 26. Roadmap & Visione

## V1 (Attuale) — Completata ✅

- ✅ Chat testuale con Aria (streaming)
- ✅ Voce conversazionale (ElevenLabs)
- ✅ 66 metriche cliniche automatiche
- ✅ Dashboard adattiva AI-driven
- ✅ Diari tematici
- ✅ Check-in intelligenti personalizzati
- ✅ Obiettivi e Abitudini gestiti via conversazione
- ✅ Memoria strutturata a lungo termine
- ✅ Contesto real-time (meteo, news, GPS)
- ✅ Area medico con condivisione dati
- ✅ Correlazioni e pattern emotivi
- ✅ Gamification (punti, streak, achievement)
- ✅ Cross-platform (Web, Android, iOS)
- ✅ Linguaggio adattivo per 6 fasce d'età
- ✅ 50+ scenari di risposta clinica guidata
- ✅ Protocollo triage psichiatrico a 4 livelli
- ✅ Enciclopedia clinica integrata (500+ righe)
- ✅ 5 framework terapeutici (CBT, DBT, ACT, MI, SFBT)

## Visione Futura

- 🔮 **Aria Proattiva**: Notifiche push contestuali ("Ehi, ho notato che non dormi bene da 3 giorni...")
- 🔮 **Integrazione Wearable**: Apple Watch, Fitbit per dati biometrici automatici
- 🔮 **Gruppi di Supporto**: Sessioni guidate da Aria con più utenti
- 🔮 **Marketplace Terapeuti**: Connessione con professionisti reali
- 🔮 **AI Multimodale**: Analisi espressioni facciali e tono vocale
- 🔮 **Localizzazione**: Espansione oltre l'italiano (EN, ES, FR, DE)

---

# Metriche Chiave (KPI)

| Metrica | Descrizione |
|---------|-------------|
| **DAU** | Utenti attivi giornalieri |
| **Sessioni/utente/settimana** | Frequenza di conversazione |
| **Check-in completion rate** | % check-in completati |
| **Streak medio** | Giorni consecutivi di utilizzo |
| **Retention D7/D30** | Ritenzione a 7 e 30 giorni |
| **Metriche estratte/sessione** | Media metriche non-null per sessione |
| **NPS** | Net Promoter Score |
| **Crisis alerts** | Numero alert sicurezza attivati |

---

# Note per Investitori

## Differenziatori Competitivi

1. **Profondità clinica senza pari**: 66 metriche vs 3-5 dei competitor
2. **Memoria relazionale**: Aria ricorda tutto, come un vero terapeuta
3. **Zero questionari**: I dati vengono estratti dalla conversazione naturale
4. **Multi-modale**: Chat + Voce + Diari, tutti clinicamente integrati
5. **Contesto reale**: Meteo, news, posizione influenzano le risposte
6. **Linguaggio adattivo**: 6 fasce d'età con vocabolario dedicato
7. **Dual-platform**: Paziente + Medico sulla stessa infrastruttura
8. **Protocolli evidence-based**: CBT, DBT, ACT, MI, SFBT integrati

## Moat Tecnico

- **7.000+ righe** di prompt clinico proprietario
- **Architettura di estrazione** 66 metriche (process-session)
- **Memoria strutturata** con anti-ridondanza e smart selection
- **Contesto real-time** multi-sorgente a costo zero
- **50+ scenari** clinici pre-programmati

---

*Documento generato il 24 Febbraio 2026 — Aria v1.0.0*
*Confidenziale — Solo per uso interno e presentazioni a investitori*
