# ARIA V1.5 — Enciclopedia Completa del Progetto

> Versione: 1.5 | Data: 26 Febbraio 2026  
> Aggiornamento dalla V1 con tutte le evoluzioni architetturali, cliniche e di piattaforma

---

## Indice

1. [Visione e Missione](#1-visione-e-missione)
2. [Architettura della Piattaforma](#2-architettura-della-piattaforma)
3. [Aria — Il Motore Conversazionale Umano](#3-aria--il-motore-conversazionale-umano)
4. [Sistema Vocale — Architettura Ibrida V1.5](#4-sistema-vocale--architettura-ibrida-v15)
5. [Sistema Clinico e Metriche Automatiche](#5-sistema-clinico-e-metriche-automatiche)
6. [Memoria Strutturata e Continuità Narrativa](#6-memoria-strutturata-e-continuità-narrativa)
7. [Contesto Real-Time](#7-contesto-real-time)
8. [Analytics Avanzati e Correlazioni](#8-analytics-avanzati-e-correlazioni)
9. [Architettura Multi-Piattaforma](#9-architettura-multi-piattaforma)
10. [Sistema Doctor/Patient](#10-sistema-doctorpatient)
11. [Gamification e Engagement](#11-gamification-e-engagement)
12. [Sicurezza e Privacy](#12-sicurezza-e-privacy)
13. [Stack Tecnologico](#13-stack-tecnologico)
14. [Changelog V1 → V1.5](#14-changelog-v1--v15)

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

### 2.2 Backend (Lovable Cloud / Supabase)
- **Database**: PostgreSQL con 31+ tabelle, RLS completo
- **Edge Functions**: 20+ funzioni serverless Deno per logica AI, processing e integrazioni
- **Auth**: Supabase Auth con Google OAuth + email/password + recovery flow
- **Realtime**: Supabase Realtime per aggiornamenti live

### 2.3 AI Models
- **Chat testuale**: Google Gemini 2.5 Flash (via Lovable AI proxy) — bilanciamento costo/qualità
- **Voce**: ElevenLabs Conversational AI Agent (Agent V3) — latenza ultra-bassa WebRTC
- **Analisi avanzata**: Google Gemini 2.5 Pro per report clinici e analisi complesse
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

### 3.2 Scenario Response Guide

Aria include una guida di 100+ scenari pre-mappati che coprono:
- **Crisi**: ideazione suicidaria, autolesionismo, panico acuto → protocollo 4 livelli
- **Emozioni complesse**: lutto, tradimento, burnout, solitudine
- **Quotidianità**: lavoro, relazioni, studio, sonno
- **Crescita personale**: obiettivi, motivazione, resilienza

### 3.3 Framework Terapeutici Integrati

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

## 4. Sistema Vocale — Architettura Ibrida V1.5

### 4.1 Evoluzione dalla V1

La V1 utilizzava un approccio monolitico dove l'intero prompt (~70k caratteri) veniva iniettato via `overrides.agent.prompt`. Questo causava:
- Crash alla connessione per payload eccessivo
- Latenza iniziale di 5-8 secondi
- Disconnessioni frequenti su mobile

La **V1.5** adotta un'architettura a **tre livelli** che separa responsabilità:

### 4.2 Architettura a Tre Livelli

#### Livello 1 — ElevenLabs Dashboard (Statico)
- **System Prompt**: identità di Aria, regole core, protocolli clinici di base, istruzioni di prosodia
- **Knowledge Base**: 54 documenti consolidati caricati nativamente nell'agente
- **Configurazione voce**: voce italiana, parametri di latenza, VAD settings
- Il prompt e la KB vengono gestiti direttamente nel dashboard ElevenLabs, eliminando la necessità di inviarli ad ogni sessione

#### Livello 2 — Web/Lovable (Dinamico Leggero)
- **Connessione**: solo `firstMessage` personalizzato + `language: 'it'`
- **Contesto dinamico**: iniettato via `sendContextualUpdate()` dopo il primo `user_transcript` o dopo 6.5s di timeout
- **Payload ridotto**: ~600 caratteri (memorie utente, obiettivi attivi, contesto temporale)
- **Sanitizzazione**: rimozione caratteri di controllo, compressione whitespace

#### Livello 3 — iOS/Swift (Nativo)
- Handshake nativo con overrides via SDK Swift
- Stesso contesto dinamico del Livello 2
- Parità clinica garantita dal cervello statico nella dashboard

### 4.3 Stabilità della Connessione V1.5

Miglioramenti rispetto alla V1:
- **WebRTC prioritario**: `conversationToken` via WebRTC (latenza inferiore) con fallback su WebSocket `signedUrl`
- **Iniezione contesto differita**: mai durante l'handshake, solo dopo stabilizzazione
- **Auto-reconnect**: se la sessione cade entro 15 secondi, tentativo automatico di riconnessione (una sola volta)
- **Edge Function token**: `elevenlabs-conversation-token` genera sia token WebRTC che signed URL WebSocket come fallback
- **Edge Function context**: `elevenlabs-context` prepara `first_message` e `dynamic_context` in parallelo

### 4.4 Flusso di una Sessione Vocale

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

### 4.5 Salvataggio e Processing

Al termine della sessione vocale:
1. Transcript completo salvato nella tabella `sessions` (tipo `voice`)
2. Edge Function `process-session` invocata in background per:
   - Estrarre 66 metriche cliniche dal transcript
   - Aggiornare le tabelle `daily_emotions`, `daily_psychology`, `daily_life_areas`
   - Generare `session_context_snapshots`
   - Aggiornare `user_memories` con nuovi fatti estratti
   - Calcolare e aggiornare `conversation_topics`

---

## 5. Sistema Clinico e Metriche Automatiche

### 5.1 Le 66+ Metriche Automatiche

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

### 5.2 Sistema di Triage Psichiatrico a 4 Livelli

| Livello | Trigger | Azione |
|---------|---------|--------|
| 🟢 Basso | Tristezza lieve, stress quotidiano | Supporto empatico standard |
| 🟡 Moderato | Ansia persistente, umore basso cronico | Tecniche CBT/DBT, suggerimento professionista |
| 🟠 Alto | Hopelessness >7, isolamento sociale | Protocollo di sicurezza attivo, risorse emergenza |
| 🔴 Critico | Ideazione suicidaria, autolesionismo | Numeri emergenza immediati, flag `crisis_alert` |

### 5.3 Wellness Score

Il **Wellness Score** (0-100) è calcolato server-side dalla Edge Function `ai-dashboard` usando una media pesata temporalmente (30 giorni) delle metriche vitali e psicologiche. Il punteggio viene cachato in `user_profiles.ai_dashboard_cache` per garantire parità numerica tra Web e iOS.

---

## 6. Memoria Strutturata e Continuità Narrativa

### 6.1 Architettura della Memoria (V1.5)

La V1 utilizzava un semplice array `long_term_memory` nel profilo utente. La V1.5 introduce un sistema SQL strutturato:

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

### 6.2 Iniezione del Contesto

Ad ogni sessione (chat o voce), il sistema:
1. Recupera le ultime 20 memorie ordinate per importanza
2. Recupera l'ultimo `session_context_snapshot` con issues irrisolti
3. Recupera i `conversation_topics` sensibili
4. Compone un blocco di contesto iniettato nel prompt (chat) o via `sendContextualUpdate` (voce)

---

## 7. Contesto Real-Time

### 7.1 Architettura Zero-Cost

Aria è consapevole del contesto real-time dell'utente:

- **Data/Ora**: giorno della settimana, ora, festività italiane
- **Geolocalizzazione**: città, regione (con permesso utente)
- **Meteo**: temperatura, condizioni (OpenWeather API, cache 2h per utente)
- **News**: notizie italiane rilevanti (World News API, cache globale 2x/giorno)

### 7.2 Limiti e Degradazione

- OpenWeather: ~1000 chiamate/giorno, coordinate arrotondate a 0.1°
- World News: 50 punti/giorno, refresh alle 8:00 e 18:00
- Se le API non sono disponibili, Aria funziona normalmente senza contesto ambientale
- L'utente può disabilitare location e news dalle impostazioni Privacy

---

## 8. Analytics Avanzati e Correlazioni

### 8.1 Correlazioni Statistiche

La Edge Function `calculate-correlations` esegue analisi di correlazione di Pearson tra metriche:
- Sonno vs Umore
- Esercizio vs Ansia
- Socializzazione vs Energia
- Risultati salvati in `user_correlations` con p-value e significatività

### 8.2 Pattern Emotivi

La Edge Function `detect-emotion-patterns` identifica trend temporali:
- **Morning Dip**: umore sistematicamente più basso al mattino
- **Weekend Boost**: miglioramento nei weekend
- **Seasonal patterns**: variazioni stagionali
- Risultati in `emotion_patterns` con confidence e trigger factors

### 8.3 Habit Streaks

Tabella `habit_streaks` aggiornata via trigger PL/pgSQL (`update_habit_streak`) per calcolo istantaneo di:
- Streak corrente e record
- Streak interrotte
- Completamenti totali

---

## 9. Architettura Multi-Piattaforma

### 9.1 Parità Cross-Platform

| Feature | Web | Android | iOS |
|---------|-----|---------|-----|
| Chat testuale | ✅ ai-chat | ✅ ai-chat | ✅ aria-chat-ios |
| Voce ElevenLabs | ✅ React SDK | ✅ React SDK | ✅ Swift SDK |
| Metriche cliniche | ✅ process-session | ✅ process-session | ✅ process-session |
| Dashboard | ✅ ai-dashboard | ✅ ai-dashboard | ✅ ai-dashboard |
| Push notifications | ❌ | ✅ Capacitor | ✅ APNs nativo |

### 9.2 Edge Function Proxy per iOS

`aria-chat-ios` è un proxy dedicato per il client Swift che:
- Accetta `accessToken`, `userId`, `sessionId` nel body per autenticazione fallback
- Restituisce risposte JSON non-streaming (`reply`, `crisisAlert`, `summary`)
- Supporta processing clinico incrementale senza chiudere la sessione

### 9.3 Triple Authentication Fallback

L'Edge Function `ai-chat` implementa 3 livelli di autenticazione:
1. Header `Authorization` con JWT utente
2. Campo `accessToken` nel body JSON
3. Campo `userId` nel body con bypass RLS tramite `service_role`

---

## 10. Sistema Doctor/Patient

### 10.1 Ruoli

- **Patient** (default): accesso completo all'app, generazione codice di connessione
- **Doctor**: dashboard dedicata per monitorare i pazienti connessi

### 10.2 Flusso di Connessione

1. Paziente genera un `connection_code` (8 caratteri alfanumerici)
2. Dottore inserisce il codice nella sua dashboard
3. Funzione `find_patient_by_code` verifica il codice
4. Record creato in `doctor_patient_access`
5. Dottore può visualizzare (read-only): sessioni, emozioni, metriche, life areas, pattern

### 10.3 Report Clinico

Edge Function `generate-clinical-report` genera report PDF strutturati con:
- Panoramica metriche nel periodo selezionato
- Trend e correlazioni significative
- Pattern emotivi identificati
- Aree di attenzione clinica

---

## 11. Gamification e Engagement

### 11.1 Sistema Punti

- `user_reward_points`: punti totali e lifetime
- `reward_transactions`: log di ogni transazione (check-in, sessione, streak, referral)
- Funzione PL/pgSQL `add_reward_points` per gestione atomica

### 11.2 Achievement

- `user_achievements`: badge sbloccabili per traguardi
- 30+ achievement definiti (primo check-in, streak 7 giorni, 10 sessioni, etc.)

### 11.3 Referral

- `referral_code` generato automaticamente per ogni utente
- Sistema di inviti con bonus punti per referrer e referato

### 11.4 Notifiche Smart

- `smart_notifications`: notifiche AI-triggered con priorità e scheduling
- `device_push_tokens`: gestione token push per iOS (APNs) e Android (Capacitor)
- Edge Function `aria-push-notification`: invio notifiche contestuali

---

## 12. Sicurezza e Privacy

### 12.1 Row Level Security (RLS)

Ogni tabella ha policy RLS che garantiscono:
- Gli utenti vedono solo i propri dati
- I dottori vedono solo i dati dei pazienti connessi
- Nessun accesso anonimo ai dati sensibili

### 12.2 Crittografia e Storage

- Dati in transito: HTTPS/TLS
- Dati at rest: crittografia PostgreSQL
- API keys: memorizzate come Supabase Secrets, mai nel codice
- Token vocali: generati server-side, monouso

### 12.3 GDPR Compliance

- Pagine legali: Privacy Policy, Terms of Service
- Consenso esplicito per geolocalizzazione e news
- Diritto all'oblio implementabile via delete policies
- Nessun dato condiviso con terze parti senza consenso

---

## 13. Stack Tecnologico

### 13.1 Frontend
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

### 13.2 Backend
| Tecnologia | Uso |
|-----------|-----|
| Supabase (Lovable Cloud) | Database, Auth, Edge Functions, Realtime |
| PostgreSQL | Database relazionale |
| Deno | Runtime Edge Functions |
| Google Gemini | AI conversazionale (chat) |
| ElevenLabs | AI vocale (WebRTC/WebSocket) |
| OpenWeather API | Contesto meteo |
| World News API | Contesto news |

### 13.3 Edge Functions (20+)
| Funzione | Scopo |
|---------|-------|
| ai-chat | Chat testuale principale con prompt clinico completo |
| aria-chat-ios | Proxy chat per client iOS (JSON non-streaming) |
| aria-voice-chat | Gestione sessioni vocali |
| elevenlabs-conversation-token | Generazione token WebRTC/WebSocket |
| elevenlabs-context | Preparazione contesto dinamico per voce |
| process-session | Estrazione metriche cliniche dal transcript |
| ai-dashboard | Calcolo Wellness Score e metriche focus |
| ai-analysis | Analisi approfondita per sezione Analisi |
| ai-insights | Generazione insight personalizzati |
| ai-checkins | Check-in personalizzati AI |
| real-time-context | Contesto real-time (meteo, news, location) |
| refresh-global-context | Aggiornamento cache globale news |
| calculate-correlations | Correlazioni statistiche tra metriche |
| detect-emotion-patterns | Identificazione pattern emotivi |
| sync-habits-to-brain | Sincronizzazione abitudini nel contesto AI |
| create-objective-chat | Creazione obiettivi via AI |
| update-objective-chat | Aggiornamento obiettivi via AI |
| create-habit-chat | Creazione abitudini via AI |
| generate-clinical-report | Report clinici PDF |
| doctor-view-data | Dati paziente per dashboard dottore |
| thematic-diary-chat | Chat tematica per diari |
| aria-push-notification | Notifiche push |
| gemini-voice-native | Voce Gemini nativa (legacy) |
| aria-agent-backend | Backend agente Aria |

---

## 14. Changelog V1 → V1.5

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

> **Nota**: Questo documento è destinato a uso interno e presentazioni per investitori. Tutti i dati tecnici sono accurati alla data di pubblicazione.
