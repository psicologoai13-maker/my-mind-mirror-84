# ARIA V1.7 — Enciclopedia Completa del Progetto

> Versione: 1.7 | Data: 1 Marzo 2026
> V1.7: Backend V2.0 (esercizi, gamification, HealthKit, diari V2, wrapped) + Post-audit fix (9 bug corretti, 3 funzioni eliminate)

---

## Indice

1. [Visione e Missione](#1-visione-e-missione)
2. [Architettura della Piattaforma](#2-architettura-della-piattaforma)
3. [Aria — Il Motore Conversazionale Umano](#3-aria--il-motore-conversazionale-umano)
4. [Sistema Diari Personali](#4-sistema-diari-personali)
5. [Sistema Vocale — Architettura Ibrida V1.6](#5-sistema-vocale--architettura-ibrida-v16)
6. [Sistema Clinico e Metriche Automatiche](#6-sistema-clinico-e-metriche-automatiche)
7. [Memoria Strutturata e Continuità Narrativa](#7-memoria-strutturata-e-continuità-narrativa)
8. [Contesto Real-Time](#8-contesto-real-time)
9. [Analytics Avanzati e Correlazioni](#9-analytics-avanzati-e-correlazioni)
10. [Architettura Multi-Piattaforma](#10-architettura-multi-piattaforma)
11. [Sistema Doctor/Patient](#11-sistema-doctorpatient)
12. [Gamification e Engagement](#12-gamification-e-engagement)
13. [Sicurezza e Privacy](#13-sicurezza-e-privacy)
14. [Stack Tecnologico](#14-stack-tecnologico)
15. [Strategia Voce Economica](#15-strategia-voce-economica)
16. [Decisioni Architetturali V1.6](#16-decisioni-architetturali-v16)
17. [Changelog V1 → V1.5](#17-changelog-v1--v15)
18. [Changelog V1.5 → V1.6](#18-changelog-v15--v16)

---

## 1. Visione e Missione

**Aria** è un'applicazione di supporto al benessere psicologico che combina intelligenza artificiale conversazionale, monitoraggio clinico automatizzato e un'interfaccia empatica pensata per l'uso quotidiano. Non è una sostituzione della terapia, ma un **companion digitale** che aiuta gli utenti a comprendere i propri pattern emotivi, mantenere abitudini salutari e accedere a supporto immediato 24/7.

### Principi Fondanti
- **Conversazione prima di tutto**: ogni dato viene estratto dal dialogo naturale, mai da form invasivi
- **Parità clinica cross-platform**: la stessa qualità di analisi su Web, Android e iOS
- **Privacy by design**: dati crittografati, RLS a livello di riga, nessun dato condiviso senza consenso esplicito
- **Accessibilità universale**: linguaggio adattivo per età (14-70+), supporto per neurodivergenza

---

## 2. Architettura della Piattaforma

### 2.1 Frontend
- **Web/Android**: React 18 + Vite + TypeScript + Tailwind CSS + Capacitor
- **iOS**: App nativa Swift (Rork Max) che comunica con lo stesso backend
- **Design System**: Shadcn/UI con componenti custom, dark/light mode, design tokens semantici

### 2.2 Backend (Supabase Standalone)

> **V1.6 — Migrazione completata**: il backend è stato migrato da Lovable Cloud a un progetto Supabase indipendente.

- **Progetto Supabase**: `pcsoranahgoinljvgmtl` (regione EU Frankfurt)
- **Database**: PostgreSQL con 31+ tabelle, RLS completo
- **GRANT permissions**: aggiunte esplicitamente per PostgREST su 30 tabelle (ruoli: `anon`, `authenticated`, `service_role`)
- **Edge Functions**: 20+ funzioni serverless Deno per logica AI, processing e integrazioni
- **Auth**: Supabase Auth con Google OAuth + email/password + recovery flow
- **Realtime**: Supabase Realtime per aggiornamenti live

### 2.3 AI Models
- **Chat testuale**: Google Gemini 2.5 Flash — chiamate dirette a `generativelanguage.googleapis.com` con `GOOGLE_API_KEY` (rimossa dipendenza Lovable AI proxy)
- **Voce**: ElevenLabs Conversational AI Agent (Agent V3) — latenza ultra-bassa WebRTC
- **Analisi avanzata**: Google Gemini 2.5 Pro per report clinici e analisi complesse — chiamate dirette Google API
- **Fallback ricerche**: Perplexity API per query mediche/farmacologiche real-time

---

## 3. Aria — Il Motore Conversazionale Umano

### 3.1 Human Conversation Engine (HCE)

Il cuore di Aria è l'**Human Conversation Engine**, un sistema di prompt engineering di ~4900+ righe che trasforma un LLM in un interlocutore empatico, clinicamente informato e conversazionalmente naturale.

#### Principi del HCE:
1. **Mai terapeuta, sempre companion**: Aria non diagnostica, non prescrive, non interpreta — accompagna
2. **Conversazione naturale**: risposte brevi (2-4 frasi), linguaggio colloquiale italiano, emoji contestuali
3. **Ascolto attivo**: parafrasi, validazione emotiva, domande aperte
4. **Memoria narrativa**: riferimenti a conversazioni passate, follow-up su temi irrisolti
5. **Adattamento linguistico**: 6 fasce d'età con vocabolario, riferimenti culturali e tono diversificati

#### Fasce d'Età Adattive:
| Fascia | Età | Caratteristiche |
|--------|-----|----------------|
| Teen | 14-17 | Slang giovanile, riferimenti social media, tono peer-to-peer |
| Young Adult | 18-25 | Linguaggio universitario, riferimenti pop culture |
| Adult | 26-35 | Equilibrio professionale/personale, pragmatismo |
| Mature | 36-50 | Focus famiglia/carriera, linguaggio maturo |
| Senior | 51-65 | Riflessione, saggezza, rispetto per l'esperienza |
| Elder | 65+ | Semplicità, pazienza, riferimenti tradizionali |

### 3.2 Personalità HCE V1.6 — Riscrittura

> **V1.6**: personalità completamente riscritta per essere più amica, meno assistente.

Cambiamenti chiave:
- **Umorismo contestuale**: battute affettuose e leggere calibrate sul contesto emotivo
- **Follow-up proattivo**: Aria ricorda e riprende temi delle sessioni precedenti senza aspettare che l'utente li sollevi
- **Memoria attiva**: riferimenti espliciti a fatti memorizzati ("L'altra volta mi dicevi che...")
- **Frasi da chatbot bandite**: lista anti-pattern aggiornata — frasi generiche tipo "Capisco come ti senti", "Sono qui per te", "È normale sentirsi così" sono vietate
- **Tono autentico**: risposte che suonano come un'amica vera, non un bot di supporto

### 3.3 Comportamento Chat V1.6 (ai-chat)

#### Fix transcript grezzo
Il messaggio di apertura non espone più il transcript grezzo della sessione precedente. Il contesto viene elaborato e sintetizzato prima dell'iniezione.

#### Tono notturno obbligatorio (00:00-06:00)
Tra mezzanotte e le 6 di mattina, Aria adotta un tono notturno con **priorità assoluta** su qualsiasi altra regola di tono:
- Voce sussurrata, frasi più brevi
- Nessuna domanda invasiva
- Validazione e accompagnamento al sonno

#### Modalità primo incontro
Quando `user_memories < 3`, Aria entra in modalità primo incontro:
- Si presenta in modo caldo e naturale
- Non fa riferimenti a sessioni precedenti inesistenti
- Domande leggere per conoscere l'utente

#### Regola anti-interrogatorio
- Massimo 1 domanda ogni 2 risposte
- 60% delle risposte deve essere senza domanda
- Evita sequenze di domande consecutive che creano sensazione di interrogatorio

#### Contesto temporale attivo
Aria è consapevole di:
- **Tempo dall'ultima sessione**: "Sono passati 3 giorni..." o "Ci siamo sentiti stamattina..."
- **Stato emotivo ultima sessione**: riprende il filo emotivo senza ripetere
- **Ora del giorno calibrata**: saluti e tono adattati all'ora corrente
- **Eventi imminenti**: legge `user_events` per riferirsi a eventi futuri rilevanti

### 3.4 Scenario Response Guide

Aria include una guida di 100+ scenari pre-mappati che coprono:
- **Crisi**: ideazione suicidaria, autolesionismo, panico acuto → protocollo 4 livelli
- **Emozioni complesse**: lutto, tradimento, burnout, solitudine
- **Quotidianità**: lavoro, relazioni, studio, sonno
- **Crescita personale**: obiettivi, motivazione, resilienza

### 3.5 Framework Terapeutici Integrati

Aria attinge da 54 documenti nella Knowledge Base che coprono:
- **CBT** (Terapia Cognitivo-Comportamentale)
- **DBT** (Terapia Dialettico-Comportamentale)
- **ACT** (Acceptance and Commitment Therapy)
- **Schema Therapy**
- **Motivational Interviewing (MI)**
- **SFBT** (Solution-Focused Brief Therapy)
- **Mindfulness-Based Interventions**
- **Psicoeducazione** su ansia, depressione, ADHD, disturbi alimentari

---

## 4. Sistema Diari Personali

> **V1.7**: Sistema diari unificato. V1 (`thematic_diaries`) eliminato e migrato in V2.

### 4.1 Concetto
I diari sono **quaderni personali liberi** senza alcuna interazione AI diretta. L'utente scrive liberamente i propri pensieri, organizzati in quaderni tematici personalizzabili.

### 4.2 Tabelle

**`diaries`** — I quaderni:
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| user_id | uuid | FK |
| name | text | Nome del quaderno |
| icon_emoji | text | Icona emoji |
| color_hex | text | Colore hex |
| description | text | Descrizione opzionale |
| is_active | boolean | Attivo/archiviato |
| weekly_prompt | text | Prompt settimanale opzionale |
| created_at | timestamptz | — |

**`diary_entries`** — Le voci:
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| diary_id | uuid | FK → diaries |
| user_id | uuid | FK |
| entry_date | date | Data voce |
| content_text | text | Testo scritto |
| content_audio_url | text | URL audio (se dettato) |
| content_transcript | text | Trascrizione audio |
| entry_type | text | text/audio |
| prompt_used | text | Domanda usata |
| mood_at_entry | integer | Umore al momento della scrittura |
| is_private | boolean | Voce privata |
| word_count | integer | Conteggio parole (trigger automatico) |
| created_at | timestamptz | — |
| updated_at | timestamptz | — |

### 4.3 Edge Functions
- `diary-save-entry` — salva una nuova entry
- `diary-get-entries` — recupera le entries di un diario
- `transcribe-diary-voice` — trascrizione audio con OpenAI Whisper (lingua: italiano)
- `get-diary-prompt` — genera domanda personalizzata con Gemini basata su contesto sessioni e ultime voci

### 4.4 Interazione con Aria
Aria **legge i diari in background** per arricchire il contesto conversazionale. Non menziona di aver letto i diari a meno che l'utente ne parli. Zero interazione AI nel processo di scrittura.

### 4.5 Migrazione V1 → V2 (1 Marzo 2026)
- Dati migrati da `thematic_diaries` (jsonb entries) a `diaries` + `diary_entries` (righe singole)
- Mapping: title→name, color→color_hex, icon→icon_emoji
- Tabella originale rinominata `thematic_diaries_v1_backup` (eliminabile in futuro)
- `thematic-diary-chat` eliminata

---

## 4b. Sistema Esercizi Guidati (V1.7)

### 4b.1 Concetto
Catalogo di esercizi di benessere (respirazione, mindfulness, rilassamento muscolare) con tracking completamento, mood pre/post, e punti gamification.

### 4b.2 Tabelle

**`exercises`** — Catalogo:
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| slug | text | Identificatore univoco (es. "breathing-478") |
| title | text | Nome esercizio |
| category | text | Categoria (breathing, mindfulness, relaxation, ecc.) |
| difficulty | text | beginner / intermediate / advanced |
| duration_minutes | integer | Durata stimata |
| points_reward | integer | Punti assegnati al completamento |
| is_active | boolean | Attivo nel catalogo |

**`user_exercise_sessions`** — Log completamenti:
| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| user_id | uuid | FK |
| exercise_id | uuid | FK → exercises |
| duration_actual | integer | Durata effettiva (minuti) |
| mood_before | integer | Umore prima (1-10) |
| mood_after | integer | Umore dopo (1-10) |
| triggered_by | text | manual / scheduled / suggestion |
| session_id | text | Sessione chat associata (opzionale) |

### 4b.3 Edge Functions
- `get-exercises` — lista esercizi filtrati per categoria e difficoltà
- `log-exercise` — registra completamento + assegna punti via trigger `award_exercise_points`

### 4b.4 Selezione personalizzata "Per te oggi"
Gestita da `home-context`. Logica attuale semplificata:
- Ansia > 6 → breathing-478
- Sera/notte → breathing o rilassamento muscolare
- Mattina → box breathing o mindfulness
- Altro → random tra esercizi beginner
- **Da migliorare**: logica deterministica basata su hash userId+data, tracking esercizi fatti, progressione difficoltà

---

## 5. Sistema Vocale — Architettura Ibrida V1.6

### 5.1 Evoluzione dalla V1

La V1 utilizzava un approccio monolitico dove l'intero prompt (~70k caratteri) veniva iniettato via `overrides.agent.prompt`. Questo causava:
- Crash alla connessione per payload eccessivo
- Latenza iniziale di 5-8 secondi
- Disconnessioni frequenti su mobile

La **V1.5** ha adottato un'architettura a **tre livelli** che separa responsabilità. La **V1.6** potenzia il livello statico e il contesto dinamico.

### 5.2 Architettura a Tre Livelli

#### Livello 1 — ElevenLabs Dashboard (Statico — Riscritto V1.6)
- **System Prompt V1.6**: completamente riscritto con:
  - Sezione adattamento per età (6 fasce: Teen → Elder)
  - Consapevolezza temporale attiva con ora e giorno corrente
  - Modalità primo incontro (quando user_memories < 3)
  - Umorismo e battute affettuose contestuali
  - Stesse regole anti-interrogatorio della chat (max 1 domanda ogni 2 risposte)
- **Knowledge Base**: 54 documenti consolidati caricati nativamente nell'agente
- **Configurazione voce**: voce italiana, parametri di latenza, VAD settings

#### Livello 2 — Web/Supabase (Dinamico Leggero)
- **Connessione**: solo `firstMessage` personalizzato + `language: 'it'`
- **Contesto dinamico**: iniettato via `sendContextualUpdate()` dopo il primo `user_transcript` o dopo 6.5s di timeout
- **Payload ridotto**: ~600 caratteri (memorie utente, obiettivi attivi, contesto temporale)
- **Sanitizzazione**: rimozione caratteri di controllo, compressione whitespace

#### Livello 3 — iOS/Swift (Nativo)
- Handshake nativo con overrides via SDK Swift
- Stesso contesto dinamico del Livello 2
- Parità clinica garantita dal cervello statico nella dashboard

### 5.3 elevenlabs-context V1.6

> **V1.6**: contesto arricchito con nuove informazioni.

La Edge Function `elevenlabs-context` ora include:
- **Tempo dall'ultima sessione**: "3 giorni fa" o "stamattina"
- **Stato emotivo ultima sessione**: emozione dominante e score
- **Eventi imminenti ±12h**: da `user_events` con data e titolo
- **Ora in formato Aria**: "sono le 15:30 di giovedì pomeriggio"
- Memorie utente recenti e obiettivi attivi (come prima)

### 5.4 Stabilità della Connessione

Miglioramenti rispetto alla V1:
- **WebRTC prioritario**: `conversationToken` via WebRTC (latenza inferiore) con fallback su WebSocket `signedUrl`
- **Iniezione contesto differita**: mai durante l'handshake, solo dopo stabilizzazione
- **Auto-reconnect**: se la sessione cade entro 15 secondi, tentativo automatico di riconnessione (una sola volta)
- **Edge Function token**: `elevenlabs-conversation-token` genera sia token WebRTC che signed URL WebSocket come fallback
- **Edge Function context**: `elevenlabs-context` prepara `first_message` e `dynamic_context` in parallelo

### 5.5 Flusso di una Sessione Vocale

```
1. Utente preme "Parla con Aria"
2. Richiesta permesso microfono
3. Fetch parallelo: token + contesto
4. startSession({ conversationToken, connectionType: 'webrtc', overrides: { firstMessage, language } })
5. Aria pronuncia il saluto personalizzato
6. Utente parla → primo user_transcript ricevuto
7. sendContextualUpdate(dynamicContext) — 350ms dopo il primo transcript
8. Conversazione continua normalmente
9. Utente chiude → endSession() → salvataggio sessione + process-session asincrono
```

### 5.6 Salvataggio e Processing

Al termine della sessione vocale:
1. Transcript completo salvato nella tabella `sessions` (tipo `voice`)
2. Edge Function `process-session` invocata in background per:
   - Estrarre 66 metriche cliniche dal transcript
   - Aggiornare le tabelle `daily_emotions`, `daily_psychology`, `daily_life_areas`
   - Generare `session_context_snapshots`
   - Aggiornare `user_memories` con nuovi fatti estratti
   - Calcolare e aggiornare `conversation_topics`
   - **V1.6**: Estrarre eventi futuri dalla conversazione e salvarli in `user_events`

---

## 6. Sistema Clinico e Metriche Automatiche

### 6.1 Le 66+ Metriche Automatiche

Ogni conversazione (chat o voce) viene analizzata da `process-session` per estrarre automaticamente:

#### Vitali (4 metriche)
| Metrica | Range | Descrizione |
|---------|-------|-------------|
| Mood | 1-10 | Umore generale percepito |
| Anxiety | 1-10 | Livello di ansia |
| Energy | 1-10 | Livello energetico |
| Sleep Quality | 1-10 | Qualità del sonno |

#### Emozioni (20 metriche)
Joy, Sadness, Anger, Fear, Apathy, Shame, Jealousy, Hope, Frustration, Nostalgia, Nervousness, Overwhelm, Excitement, Disappointment, Disgust, Surprise, Serenity, Pride, Affection, Curiosity

#### Aree della Vita (9 metriche)
Work, School, Love, Family, Social, Health, Growth, Leisure, Finances

#### Psicologia Profonda (32 metriche)
Organizzate in 6 domini clinici:

**Dominio Attivazione**: Motivation, Burnout Level, Somatic Tension, Appetite Changes, Sunlight Exposure

**Dominio Cognitivo**: Mental Clarity, Concentration, Rumination, Intrusive Thoughts, Dissociation, Confusion, Racing Thoughts

**Dominio Comportamentale**: Avoidance, Social Withdrawal, Compulsive Urges, Procrastination

**Dominio Somatico**: Somatic Tension, Appetite Changes

**Dominio Risorse**: Self-Efficacy, Coping Ability, Self-Worth, Gratitude, Sense of Purpose, Life Satisfaction, Perceived Social Support, Emotional Regulation, Resilience, Mindfulness

**Dominio Sicurezza** (appare solo se >0): Suicidal Ideation, Hopelessness, Self-Harm Urges

### 6.2 Sistema di Triage Psichiatrico a 4 Livelli

| Livello | Trigger | Azione |
|---------|---------|--------|
| 🟢 Basso | Tristezza lieve, stress quotidiano | Supporto empatico standard |
| 🟡 Moderato | Ansia persistente, umore basso cronico | Tecniche CBT/DBT, suggerimento professionista |
| 🟠 Alto | Hopelessness >7, isolamento sociale | Protocollo di sicurezza attivo, risorse emergenza |
| 🔴 Critico | Ideazione suicidaria, autolesionismo | Numeri emergenza immediati, flag `crisis_alert` |

### 6.3 Wellness Score

Il **Wellness Score** (0-100) è calcolato server-side dalla Edge Function `ai-dashboard` usando una media pesata temporalmente (30 giorni) delle metriche vitali e psicologiche. Il punteggio viene cachato in `user_profiles.ai_dashboard_cache` per garantire parità numerica tra Web e iOS.

---

## 7. Memoria Strutturata e Continuità Narrativa

### 7.1 Architettura della Memoria (V1.5+)

La V1 utilizzava un semplice array `long_term_memory` nel profilo utente. Dalla V1.5 è in uso un sistema SQL strutturato:

#### Tabella `user_memories`
- **Fatti categorizzati**: relazioni, lavoro, salute, preferenze, eventi significativi
- **Importanza** (1-10): determina la priorità di iniezione nel contesto
- **Decay temporale**: `last_referenced_at` per gestire la rilevanza nel tempo
- **Source tracking**: collegamento alla sessione di origine

#### Tabella `session_context_snapshots`
- **Riepilogo sessione**: temi chiave, emozione dominante, qualità percepita
- **Issues irrisolti**: problemi aperti da riprendere nelle sessioni successive
- **Action items**: compiti suggeriti da Aria da verificare al follow-up
- **Follow-up needed**: flag per sessioni che richiedono continuità

#### Tabella `conversation_topics`
- **Topic tracking**: argomenti menzionati con frequenza e sentiment medio
- **Sensitive topics**: temi delicati da evitare a meno che l'utente non li introduca
- **Related topics**: grafo di connessioni tra argomenti

### 7.2 Iniezione del Contesto

Ad ogni sessione (chat o voce), il sistema:
1. Recupera le ultime 20 memorie ordinate per importanza
2. Recupera l'ultimo `session_context_snapshot` con issues irrisolti
3. Recupera i `conversation_topics` sensibili
4. Compone un blocco di contesto iniettato nel prompt (chat) o via `sendContextualUpdate` (voce)

---

## 8. Contesto Real-Time

### 8.1 Architettura Zero-Cost

Aria è consapevole del contesto real-time dell'utente:

- **Data/Ora**: giorno della settimana, ora, festività italiane
- **Geolocalizzazione**: città, regione (con permesso utente)
- **Meteo**: temperatura, condizioni (OpenWeather API, cache 2h per utente)
- **News**: notizie italiane rilevanti (World News API, cache globale 2x/giorno)

### 8.2 Limiti e Degradazione

- OpenWeather: ~1000 chiamate/giorno, coordinate arrotondate a 0.1°
- World News: 50 punti/giorno, refresh alle 8:00 e 18:00
- Se le API non sono disponibili, Aria funziona normalmente senza contesto ambientale
- L'utente può disabilitare location e news dalle impostazioni Privacy

---

## 9. Analytics Avanzati e Correlazioni

### 9.1 Correlazioni Statistiche

La Edge Function `calculate-correlations` esegue analisi di correlazione di Pearson tra metriche:
- Sonno vs Umore
- Esercizio vs Ansia
- Socializzazione vs Energia
- Risultati salvati in `user_correlations` con p-value e significatività

### 9.2 Pattern Emotivi

La Edge Function `detect-emotion-patterns` identifica trend temporali:
- **Morning Dip**: umore sistematicamente più basso al mattino
- **Weekend Boost**: miglioramento nei weekend
- **Seasonal patterns**: variazioni stagionali
- Risultati in `emotion_patterns` con confidence e trigger factors

### 9.3 Habit Streaks

Tabella `habit_streaks` aggiornata via trigger PL/pgSQL (`update_habit_streak`) per calcolo istantaneo di:
- Streak corrente e record
- Streak interrotte
- Completamenti totali

---

## 9b. HealthKit Integration (V1.7)

### 9b.1 Tabella

**`healthkit_data`**:
| Colonna | Tipo | Note |
|---------|------|------|
| user_id | uuid | FK |
| date | date | Giorno di riferimento |
| steps | integer | Passi |
| sleep_hours | numeric | Ore di sonno |
| heart_rate_avg | numeric | FC media |
| hrv_avg | numeric | HRV media |
| weight | numeric | Peso |
| sleep_quality_hk | text | Qualità sonno (non ancora usata nell'AI) |
| menstrual_cycle_phase | text | Fase ciclo (non ancora correlata con mood) |

### 9b.2 Sync
- Edge function `sync-healthkit`: riceve dati dall'app iOS e li salva
- Autenticazione: solo JWT (fixato V1.7 — prima accettava qualsiasi user_id)
- Sync unidirezionale: iOS → DB

### 9b.3 Uso nei contesti AI
- `ai-chat`: include passi, sonno, FC come contesto nella conversazione
- `elevenlabs-context`: stesso contesto per sessioni vocali
- `calculate-correlations`: calcola correlazioni HealthKit ↔ mood/ansia
- `home-context`: mostra dati nel widget "Il tuo stato oggi"

---

## 10. Architettura Multi-Piattaforma

### 10.1 Parità Cross-Platform

| Feature | Web | Android | iOS |
|---------|-----|---------|-----|
| Chat testuale | ✅ ai-chat | ✅ ai-chat | ✅ aria-chat-ios |
| Voce ElevenLabs | ✅ React SDK | ✅ React SDK | ✅ Swift SDK |
| Metriche cliniche | ✅ process-session | ✅ process-session | ✅ process-session |
| Dashboard | ✅ ai-dashboard | ✅ ai-dashboard | ✅ ai-dashboard |
| Push notifications | ❌ | ✅ Capacitor | ✅ APNs nativo |

### 10.2 Edge Function Proxy per iOS

`aria-chat-ios` è un proxy dedicato per il client Swift che:
- Accetta `accessToken`, `userId`, `sessionId` nel body per autenticazione fallback
- Restituisce risposte JSON non-streaming (`reply`, `crisisAlert`, `summary`)
- Supporta processing clinico incrementale senza chiudere la sessione

### 10.3 Triple Authentication Fallback

L'Edge Function `ai-chat` implementa 3 livelli di autenticazione:
1. Header `Authorization` con JWT utente
2. Campo `accessToken` nel body JSON
3. Campo `userId` nel body con bypass RLS tramite `service_role`

---

## 11. Sistema Doctor/Patient

### 11.1 Ruoli

- **Patient** (default): accesso completo all'app, generazione codice di connessione
- **Doctor**: dashboard dedicata per monitorare i pazienti connessi

### 11.2 Flusso di Connessione

1. Paziente genera un `connection_code` (8 caratteri alfanumerici)
2. Dottore inserisce il codice nella sua dashboard
3. Funzione `find_patient_by_code` verifica il codice
4. Record creato in `doctor_patient_access`
5. Dottore può visualizzare (read-only): sessioni, emozioni, metriche, life areas, pattern

### 11.3 Report Clinico

Edge Function `generate-clinical-report` genera report PDF strutturati con:
- Panoramica metriche nel periodo selezionato
- Trend e correlazioni significative
- Pattern emotivi identificati
- Aree di attenzione clinica

---

## 12. Gamification e Engagement

### 12.1 Sistema Punti
- `user_reward_points`: saldo punti spendibili (`total_points`) e punti totali guadagnati (`lifetime_points`)
- `reward_transactions`: log di ogni transazione
- Funzione `add_reward_points()`: gestione atomica, incrementa lifetime_points solo su punti positivi
- Riscatto atomico via `atomic_redeem_points()` con SELECT FOR UPDATE

**Punti automatici (trigger SQL):**
| Azione | Punti |
|--------|:---:|
| Check-in completato | +5 |
| Sessione chat (>3 messaggi) | +15 |
| Sessione vocale | +25 |
| Voce diario | +10 |
| Streak 7 giorni | +50 |
| Streak 30 giorni | +200 |

### 12.2 Livelli
- `gamification_levels`: livelli definiti con nome, emoji, punti necessari
- Il livello si basa su `lifetime_points` (non decrementano quando spendi punti)
- Trigger automatico `update_user_level_on_points_change` aggiorna il livello ad ogni cambio punti
- Funzione `calculate_user_level()` per ricalcolo on-demand

### 12.3 Badge / Achievement
- `user_achievements`: badge sbloccabili per traguardi
- 16 badge automatici (first_checkin, streak_7, streak_30, sessions_10, ecc.)
- Funzione `check_and_award_badges()` eseguita ad ogni attività
- Da ottimizzare: attualmente esegue 8 COUNT ogni volta anche se tutti i badge sono sbloccati

### 12.4 Sfide
- `user_challenges`: sfide a tempo con expires_at
- Edge function `start-challenge` per avviare
- **Problema noto**: nessun cron job pulisce sfide scadute

### 12.5 Wrapped (Resoconto periodico)
- `aria_wrapped_data`: dati cachati per Wrapped mensile/annuale
- `generate-wrapped`: genera statistiche + messaggio AI motivazionale con Gemini
- `get-wrapped`: recupera con cache 24h, rigenera se scaduto

### 12.6 Edge Functions Gamification
- `get-gamification-status` — stato completo: livello, badge, sfide, punti, prossimo livello
- `redeem-points` — riscatto punti via RPC atomica `atomic_redeem_points`
- `start-challenge` — avvia sfida
- `generate-wrapped` / `get-wrapped` — sistema Wrapped

---

## 13. Sicurezza e Privacy

### 13.1 Row Level Security (RLS)

Ogni tabella ha policy RLS che garantiscono:
- Gli utenti vedono solo i propri dati
- I dottori vedono solo i dati dei pazienti connessi
- Nessun accesso anonimo ai dati sensibili

### 13.2 Crittografia e Storage

- Dati in transito: HTTPS/TLS
- Dati at rest: crittografia PostgreSQL
- API keys: memorizzate come Supabase Secrets, mai nel codice
- Token vocali: generati server-side, monouso

### 13.3 GDPR Compliance

- Pagine legali: Privacy Policy, Terms of Service
- Consenso esplicito per geolocalizzazione e news
- Diritto all'oblio implementabile via delete policies
- Nessun dato condiviso con terze parti senza consenso

### 13.4 Fix Sicurezza V1.7 (1 Marzo 2026)

4 edge functions corrette con autenticazione JWT obbligatoria:
- `elevenlabs-conversation-token`: prima accessibile senza login (costi illimitati)
- `aria-push-notification`: prima chiunque poteva triggerare notifiche a tutti
- `sync-healthkit`: prima accettava qualsiasi user_id nel body
- `calculate-correlations`: prima zero autenticazione

Inoltre: `doctor-view-data` ora verifica obbligatoriamente la relazione `doctor_patient_access`.

---

## 14. Stack Tecnologico

### 14.1 Frontend
| Tecnologia | Versione | Uso |
|-----------|---------|-----|
| React | 18.3 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Styling |
| Shadcn/UI | Latest | Component library |
| Framer Motion | 12.x | Animazioni |
| Recharts | 2.x | Grafici |
| React Router | 6.x | Routing |
| TanStack Query | 5.x | Data fetching e caching |
| Capacitor | 8.x | Native bridge (Android) |

### 14.2 Backend
| Tecnologia | Uso |
|-----------|-----|
| Supabase Standalone (`pcsoranahgoinljvgmtl`) | Database, Auth, Edge Functions, Realtime |
| PostgreSQL | Database relazionale (EU Frankfurt) |
| Deno | Runtime Edge Functions |
| Google Gemini (API diretta) | AI conversazionale — gemini-2.5-flash (chat), gemini-2.5-pro (analisi) |
| ElevenLabs | AI vocale (WebRTC/WebSocket) |
| OpenWeather API | Contesto meteo |
| World News API | Contesto news |

### 14.3 Edge Functions (22+)
| Funzione | Scopo | Stato |
|---------|-------|-------|
| ai-chat | Chat testuale principale con prompt clinico completo | ✅ Attiva |
| aria-chat-ios | Proxy chat per client iOS (JSON non-streaming) | ✅ Attiva |
| aria-voice-chat | Gestione sessioni vocali | ✅ Attiva |
| elevenlabs-conversation-token | Generazione token WebRTC/WebSocket | ✅ Attiva |
| elevenlabs-context | Preparazione contesto dinamico per voce (arricchito V1.6) | ✅ Attiva |
| process-session | Estrazione metriche cliniche + eventi futuri dal transcript | ✅ Attiva |
| ai-dashboard | Calcolo Wellness Score e metriche focus | ✅ Attiva |
| ai-analysis | Analisi approfondita per sezione Analisi | ✅ Attiva |
| ai-insights | Generazione insight personalizzati | ✅ Attiva |
| ai-checkins | Check-in personalizzati AI | ✅ Attiva |
| real-time-context | Contesto real-time (meteo, news, location) | ✅ Attiva |
| refresh-global-context | Aggiornamento cache globale news | ✅ Attiva |
| calculate-correlations | Correlazioni statistiche tra metriche | ✅ Attiva |
| detect-emotion-patterns | Identificazione pattern emotivi | ✅ Attiva |
| sync-habits-to-brain | Sincronizzazione abitudini nel contesto AI | ✅ Attiva |
| create-objective-chat | Creazione obiettivi via AI | ✅ Attiva |
| update-objective-chat | Aggiornamento obiettivi via AI | ✅ Attiva |
| create-habit-chat | Creazione abitudini via AI | ✅ Attiva |
| generate-clinical-report | Report clinici PDF | ✅ Attiva |
| doctor-view-data | Dati paziente per dashboard dottore | ✅ Attiva |
| diary-save-entry | Salvataggio entry nei diari personali | ✅ **Nuova V1.6** |
| diary-get-entries | Recupero entries dei diari personali | ✅ **Nuova V1.6** |
| thematic-diary-chat | Chat tematica per diari | ⛔ **DEPRECATED** (HTTP 410) |
| aria-push-notification | Notifiche push | ✅ Attiva |
| gemini-voice-native | Voce Gemini nativa (legacy) | ✅ Attiva |
| aria-agent-backend | Backend agente Aria | ✅ Attiva |

---

## 15. Strategia Voce Economica

> **V1.6 — In sviluppo**: alternativa economica a ElevenLabs per scalabilità.

### 15.1 Architettura Proposta

**OpenAI TTS + Whisper** come alternativa a ElevenLabs per utenti non-premium:

| Componente | Tecnologia | Costo |
|-----------|-----------|-------|
| Text-to-Speech | OpenAI TTS (voci Nova/Shimmer) | ~$0.015/1K chars |
| Speech-to-Text | OpenAI Whisper | ~$0.006/min |
| Costo stimato per sessione | ~5 min conversazione | ~$0.12/sessione |

### 15.2 Architettura Tecnica

```
Loop Swift con AVAudioRecorder:
1. Utente parla → AVAudioRecorder cattura audio
2. Audio → Edge Function openai-stt → Whisper → testo
3. Testo → ai-chat (stessa logica) → risposta testuale
4. Risposta → Edge Function openai-tts → audio Nova/Shimmer
5. Audio riprodotto → loop ricomincia
```

### 15.3 Toggle Premium/Standard

Nelle impostazioni utente, toggle per scegliere:
- **Premium**: ElevenLabs (bassa latenza, voce naturale, WebRTC)
- **Standard**: OpenAI TTS/Whisper (latenza maggiore, costo ridotto)

Edge Functions previste: `openai-tts`, `openai-stt`

---

## 16. Decisioni Architetturali V1.6

### 16.1 Sessione giornaliera unica

> **Da implementare**

Invece di sessioni basate sul tempo (timer), Aria avrà una sessione giornaliera unica che si chiude per contesto, non per durata. Questo permette conversazioni più naturali e continuità nel dialogo giornaliero.

### 16.2 user_interests non migrata

La tabella `user_interests` (~50 campi di preferenze dettagliate) **non è presente nelle migrazioni** del nuovo DB Supabase standalone. Da valutare se:
- Ricreare la tabella con migrazione dedicata
- Integrare le informazioni in `user_memories` (approccio più flessibile)
- Raccogliere le preferenze organicamente tramite conversazione

---

## 17. Changelog V1 → V1.5

### 🔴 Breaking Changes
- Architettura vocale completamente riscritta (da monolitica a 3 livelli)
- Memoria migrata da array semplice a sistema SQL strutturato

### 🟢 Nuove Feature
- **Voce stabile**: WebRTC prioritario, context injection differito, auto-reconnect
- **iOS nativo**: parità clinica completa con proxy `aria-chat-ios`
- **54 documenti Knowledge Base**: caricati nativamente nell'agente ElevenLabs
- **6 nuove emozioni**: Disgust, Surprise, Serenity, Pride, Affection, Curiosity
- **3 nuove aree vita**: Leisure, Finances, School
- **32 metriche psicologiche**: inclusi indicatori di sicurezza (suicidal ideation, self-harm)
- **Correlazioni statistiche**: Pearson con p-value
- **Pattern emotivi**: detection automatica (morning dip, weekend boost)
- **Habit streaks**: calcolo via trigger PL/pgSQL
- **Push notifications**: iOS APNs + Android Capacitor
- **Report clinici**: generazione PDF per dottori
- **Referral system**: codici invito con bonus punti
- **Contesto real-time**: meteo, news, geolocalizzazione

### 🟡 Miglioramenti
- **Performance**: caching aggressivo (`ai_dashboard_cache`, `ai_analysis_cache`, `ai_insights_cache`)
- **Triple auth fallback**: supporto iOS senza cookie
- **RLS completo**: tutte le 31+ tabelle con policy granulari
- **Occupazione context**: adattamento life areas per studente/lavoratore/entrambi
- **Profilo 360°**: altezza, data nascita, genere, stato terapia

### 🔧 Fix Tecnici
- Crash vocale per payload eccessivo → architettura 3 livelli
- Disconnessioni frequenti → WebRTC + auto-reconnect
- Contesto iniettato troppo presto → deferred injection post-transcript
- Inconsistenza metriche cross-platform → calcolo server-side centralizzato

---

## 18. Changelog V1.5 → V1.6

### 🔴 Breaking Changes
- **Migrazione Supabase**: da Lovable Cloud a progetto Supabase indipendente (`pcsoranahgoinljvgmtl`, EU Frankfurt)
- **API Gemini**: 17 edge functions migrate da Lovable AI proxy a chiamate dirette `generativelanguage.googleapis.com` con `GOOGLE_API_KEY`
- **Modelli Gemini corretti**: `gemini-2.5-flash` (chat/processing) e `gemini-2.5-pro` (analisi complesse)
- **LOVABLE_API_KEY rimossa**: non più necessaria, sostituita da `GOOGLE_API_KEY` diretta
- **thematic-diary-chat**: deprecata, risponde HTTP 410

### 🟢 Nuove Feature
- **Sistema Diari Personali**: quaderni liberi senza AI, con `diary-save-entry` e `diary-get-entries`
- **Estrazione eventi futuri**: `process-session` estrae eventi dalla conversazione e li salva in `user_events` con `follow_up_done = false`
- **Aggiornamento eventi passati**: eventi con data passata aggiornati automaticamente a status `passed`
- **Modalità primo incontro**: quando `user_memories < 3`, Aria si presenta senza riferimenti a sessioni inesistenti
- **Tono notturno 00:00-06:00**: priorità assoluta su qualsiasi altra regola di tono
- **Contesto temporale attivo**: tempo dall'ultima sessione, stato emotivo, ora calibrata, eventi imminenti

### 🟡 Miglioramenti
- **Personalità HCE riscritta**: più amica meno assistente, umorismo contestuale, follow-up proattivo, memoria attiva
- **Regola anti-interrogatorio**: max 1 domanda ogni 2 risposte, 60% risposte senza domanda
- **System Prompt ElevenLabs V1.6**: completamente riscritto con adattamento età, consapevolezza temporale, primo incontro
- **elevenlabs-context arricchito**: tempo ultima sessione, stato emotivo, eventi imminenti ±12h, ora formato Aria
- **GRANT permissions**: aggiunte per PostgREST su 30 tabelle (anon, authenticated, service_role)
- **Frasi chatbot bandite**: lista anti-pattern aggiornata

### 🔧 Fix Tecnici
- Transcript grezzo non più esposto nel messaggio di apertura
- Tono notturno ora con priorità assoluta (prima veniva sovrascritto)

### 🟠 Da Implementare
- **OpenAI TTS economico**: Nova/Shimmer + Whisper come alternativa a ElevenLabs (~$0.12/sessione)
- **Sessione giornaliera unica**: chiusura per contesto, non per timer
- **user_interests**: non presente nel nuovo DB, da valutare migrazione

---

## 19. Changelog V1.6 → V1.7

### Backend V2.0 (28 Feb 2026)
- 8 nuove tabelle: exercises, user_exercise_sessions, gamification_levels, user_challenges, diaries, diary_entries, healthkit_data, aria_wrapped_data
- 11 nuove edge functions: home-context, get-exercises, log-exercise, get-gamification-status, redeem-points, start-challenge, sync-healthkit, generate-wrapped, get-wrapped, transcribe-diary-voice, get-diary-prompt
- 3 edge functions modificate: ai-chat (+esercizi +HealthKit), calculate-correlations (+HealthKit), process-session (+diari)
- Trigger automatici: punti su azioni, 16 badge, calcolo livello

### Post-Audit Fix (1 Mar 2026)
- 9 bug critici corretti (4 sicurezza, 3 correttezza, 2 pulizia)
- 3 edge functions eliminate: create-objective-chat, create-habit-chat, thematic-diary-chat
- Diari V1 migrati in V2, tabella rinominata a backup
- 7 trigger duplicati rimossi, 3 funzioni SQL duplicate rimosse
- Nuova colonna lifetime_points, nuova RPC atomic_redeem_points
- Edge functions totali: da 29 a 26

---

> **Nota**: Questo documento è destinato a uso interno e presentazioni per investitori. Tutti i dati tecnici sono accurati alla data di pubblicazione.
