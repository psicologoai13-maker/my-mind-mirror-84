# ARIA — Checklist Documenti per il Lancio

> Creata: 1 Marzo 2026
> Ultimo aggiornamento: 1 Marzo 2026
> Stato: IN PROGRESS — completare man mano che ci avviciniamo al lancio

---

## Come usare questa checklist

- ✅ = Completato e aggiornato
- ⚠️ = Esiste ma va aggiornato
- 🔴 = Non esiste, da creare
- ⏸️ = Non urgente adesso, da fare prima del lancio
- 🔒 = Bloccante per la pubblicazione su App Store / Play Store

---

## FASE 1 — DOCUMENTAZIONE TECNICA INTERNA
> Priorità: ORA — serve per lavorare in modo ordinato

| # | Documento | Stato | Note |
|---|-----------|:---:|------|
| 1 | `ARIA_V1.6_ENCYCLOPEDIA.md` | ⚠️ | Aggiornare a V1.7: diari solo V2, 3 funzioni eliminate, 9 bug fixati, lifetime_points, atomic_redeem_points |
| 2 | `ARIA_BACKEND_TECHNICAL_GUIDE.md` | ⚠️ | Rimuovere thematic_diaries, aggiungere nuove funzioni SQL, aggiornare conteggio edge functions (26), aggiornare schema diaries |
| 3 | `ARIA_SWIFT_IOS.md` | ✅ | Ok per ora. Aggiornare quando modifichiamo l'app iOS |
| 4 | `ARIA_DECISIONI_CHANGELOG.md` | ⚠️ | Aggiungere sessione 1 Marzo 2026 con tutti i fix e decisioni (diari V1 eliminati, ecc.) |
| 5 | `ARIA_AUDIT_1_EDGE_FUNCTIONS_CORE.md` | ✅ | Archivio storico 28 Feb — non toccare |
| 6 | `ARIA_AUDIT_2_EDGE_FUNCTIONS_SECONDARY.md` | ✅ | Archivio storico 28 Feb — non toccare |
| 7 | `ARIA_AUDIT_3_BUSINESS_LOGIC.md` | ✅ | Archivio storico 28 Feb — non toccare |
| 8 | `ARIA_AUDIT_4_DATABASE_AND_GAPS.md` | ✅ | Archivio storico 28 Feb — non toccare |
| 9 | `ARIA_POST_AUDIT_FIXES.md` | 🔴 | Registro di tutti i fix applicati il 1 Marzo. DA CREARE |
| 10 | `ARIA_BRIEFING_NUOVA_CHAT.md` | ⚠️ | Aggiornare con stato post-fix e decisioni prese |

---

## FASE 2 — DOCUMENTI LEGALI OBBLIGATORI
> Priorità: PRIMA DEL LANCIO — senza questi Apple e Google non approvano l'app

| # | Documento | Stato | Bloccante? | Note |
|---|-----------|:---:|:---:|------|
| 11 | **Privacy Policy** | 🔴 | 🔒 | Deve coprire: dati raccolti (emozioni, sessioni, HealthKit, voce), AI processing (Gemini, ElevenLabs, Whisper), storage (Supabase EU), condivisione dottore, retention, diritti utente GDPR. Deve essere ospitata su URL pubblico |
| 12 | **Terms of Service** | 🔴 | 🔒 | Deve includere: disclaimer medico chiaro, limiti del servizio AI, età minima (14+), responsabilità utente, condizioni premium/punti, cancellazione account |
| 13 | **Disclaimer Medico** | 🔴 | 🔒 | ARIA non è un dispositivo medico. Non sostituisce diagnosi, terapia o trattamento professionale. Va mostrato all'onboarding E nella sezione legale. Obbligatorio per app salute mentale |
| 14 | **EULA** (End User License Agreement) | 🔴 | 🔒 | Richiesto specificamente da Apple App Store per la pubblicazione |
| 15 | **Cookie/Consent Policy** | 🔴 | | Solo per versione web — GDPR richiede consenso esplicito per cookie e tracciamento |

---

## FASE 3 — CONFORMITÀ GDPR / PROTEZIONE DATI
> Priorità: PRIMA DEL LANCIO — obbligatorio per operare in EU con dati sanitari

| # | Documento | Stato | Note |
|---|-----------|:---:|------|
| 16 | **Data Processing Record** (Registro trattamenti) | 🔴 | Obbligatorio GDPR Art. 30. Elenca: quali dati, perché, base giuridica, chi vi accede, quanto li tieni |
| 17 | **DPIA** (Data Protection Impact Assessment) | 🔴 | Obbligatorio quando tratti dati sanitari/psicologici con AI su larga scala. Documenta rischi e mitigazioni |
| 18 | **Data Retention Policy** | 🔴 | Quanto tieni i dati? Quando li cancelli automaticamente? Cosa succede ai dati dopo cancellazione account? |
| 19 | **Sub-processor List** | 🔴 | Lista completa di chi processa i dati degli utenti e dove: Supabase (EU Frankfurt), Google Gemini (API), ElevenLabs (voce), OpenAI Whisper (trascrizione), OpenWeather (meteo), WorldNews (notizie) |
| 20 | **Informativa consenso in-app** | 🔴 | Testo mostrato all'utente prima di attivare: HealthKit, geolocalizzazione, notifiche, condivisione dottore. Deve essere chiaro e specifico per ogni permesso |
| 21 | **Consenso trattamento AI** | 🔴 | Consenso esplicito che i dati delle conversazioni vengono processati da AI (Gemini) per analisi psicologica. Non può essere implicito con dati sanitari |

---

## FASE 4 — FUNZIONALITÀ GDPR DA IMPLEMENTARE
> Priorità: PRIMA DEL LANCIO — servono edge functions + UI

| # | Funzionalità | Stato | Note |
|---|-------------|:---:|------|
| 22 | **Export dati utente** (GDPR Art. 15) | 🔴 | Edge function che esporta TUTTI i dati dell'utente in formato JSON/ZIP scaricabile. Sessioni, check-in, diari, metriche, memorie, obiettivi, HealthKit |
| 23 | **Eliminazione account completa** (GDPR Art. 17) | 🔴 | Edge function che cancella TUTTI i dati dell'utente da tutte le tabelle + auth.users. Irreversibile, con conferma. Deve anche revocare token ElevenLabs attivi |
| 24 | **Registro consensi** | 🔴 | Tabella DB che registra quando l'utente ha dato/revocato ciascun consenso (HealthKit, AI processing, notifiche, condivisione dottore) con timestamp |
| 25 | **Revoca consenso singolo** | 🔴 | L'utente deve poter revocare singoli consensi (es. HealthKit sì ma voce no) senza cancellare l'account |

---

## FASE 5 — DOCUMENTI APP STORE
> Priorità: SOLO QUANDO L'APP È PRONTA PER IL LANCIO

| # | Documento | Stato | Bloccante? | Note |
|---|-----------|:---:|:---:|------|
| 26 | **App Store Description** (IT + EN) | ⏸️ | 🔒 | Titolo, sottotitolo, descrizione lunga, keywords, categoria |
| 27 | **App Privacy Nutrition Labels** | ⏸️ | 🔒 | Apple richiede dichiarazione esatta di: dati raccolti, dati collegati all'utente, dati usati per tracciamento. Va compilato nel form App Store Connect |
| 28 | **Health-related app guidelines compliance** | ⏸️ | 🔒 | Apple ha regole specifiche per app salute mentale (HIG Health section). Documentare come ARIA le rispetta |
| 29 | **Screenshot e preview** | ⏸️ | 🔒 | 6.5" e 5.5" per iPhone, eventuali iPad. Video preview opzionale ma consigliato |
| 30 | **Support URL** | ⏸️ | 🔒 | Pagina web pubblica con: FAQ, contatto email, come cancellare account. Apple la verifica |
| 31 | **App Review Notes** | ⏸️ | | Note per il reviewer Apple: account di test, spiegazione delle funzionalità AI, disclaimer salute |
| 32 | **Play Store Listing** (se Android) | ⏸️ | 🔒 | Simile ad App Store ma con requisiti diversi (Play Console) |

---

## FASE 6 — DOCUMENTI PRODOTTO / BUSINESS
> Priorità: QUANDO SERVE — per marketing, investitori, pianificazione

| # | Documento | Stato | Note |
|---|-----------|:---:|------|
| 33 | **Mockup V4** | 🔴 | Design completo di tutte le schermate con decisioni UI/UX definitive |
| 34 | **Piano di pricing** | 🔴 | Free vs Premium: cosa è incluso, costo, sistema punti, riscatto |
| 35 | **Roadmap** | 🔴 | Feature pianificate con timeline: v1.7, v1.8, v2.0 |
| 36 | **Onboarding flow** | 🔴 | Flusso completo primo accesso: consensi, domande iniziali, primo incontro con Aria |
| 37 | **Landing page / sito web** | ⏸️ | Pagina pubblica per presentare ARIA, ospitare privacy policy e support |
| 38 | **Pitch deck** (se cerchi investitori) | ⏸️ | Presentazione del progetto per potenziali investitori |

---

## RIEPILOGO RAPIDO

| Fase | Documenti | Completati | Da fare |
|------|:-:|:-:|:-:|
| 1 — Tecnica interna | 10 | 5 | 5 |
| 2 — Legale obbligatorio | 5 | 0 | 5 |
| 3 — GDPR conformità | 6 | 0 | 6 |
| 4 — GDPR funzionalità | 4 | 0 | 4 |
| 5 — App Store | 7 | 0 | 7 (⏸️) |
| 6 — Prodotto/Business | 6 | 0 | 6 |
| **TOTALE** | **38** | **5** | **33** |

---

## LOG AGGIORNAMENTI

| Data | Cosa è cambiato |
|------|-----------------|
| 1 Mar 2026 | Creazione checklist. 5 doc tecnici ok, 5 da aggiornare, 28 da creare |

