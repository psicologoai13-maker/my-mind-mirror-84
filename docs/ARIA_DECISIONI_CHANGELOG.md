# ARIA — Decisioni e Changelog

> Registro cronologico delle decisioni architetturali, modifiche significative e stato di implementazione.

---

## 27 Feb 2026 — Sessione V1.5 → V1.6

### Completate

#### Migrazione Supabase standalone
- Migrazione completa da Lovable Cloud a progetto Supabase indipendente
- Nuovo progetto: `pcsoranahgoinljvgmtl` (regione EU Frankfurt)
- GRANT permissions aggiunte per PostgREST su 30 tabelle (anon, authenticated, service_role)
- Tutti i dati migrati e testati

#### 17 Edge Functions migrate a Google API diretta
- Tutte le edge functions che usavano Lovable AI proxy ora chiamano direttamente `generativelanguage.googleapis.com`
- Modelli corretti: `gemini-2.5-flash` (chat/processing) e `gemini-2.5-pro` (analisi complesse)
- `LOVABLE_API_KEY` rimossa, sostituita da `GOOGLE_API_KEY` diretta

#### Sistema diari personali implementato
- Nuova edge function `diary-save-entry` per salvataggio entries
- Nuova edge function `diary-get-entries` per recupero entries
- `thematic-diary-chat` deprecata (risponde HTTP 410)
- Tabella `thematic_diaries` aggiornata con colonne: title, entries (jsonb array), color, icon
- Diari = quaderni personali liberi, zero interazione AI
- Aria legge diari in background per contesto conversazionale

#### 4 Fix comportamento chat Aria deployati
1. **Transcript grezzo risolto**: il messaggio di apertura non espone più il transcript grezzo della sessione precedente
2. **Tono notturno risolto**: tono notturno 00:00-06:00 ora con priorità assoluta su qualsiasi altra regola
3. **Modalità primo incontro implementata**: quando user_memories < 3, Aria si presenta senza riferimenti a sessioni inesistenti
4. **Regola anti-interrogatorio**: max 1 domanda ogni 2 risposte, 60% risposte senza domanda

#### System Prompt ElevenLabs riscritto V1.6
- Prompt completamente riscritto con adattamento per età (6 fasce: Teen → Elder)
- Consapevolezza temporale attiva con ora e giorno corrente
- Modalità primo incontro
- Umorismo e battute affettuose contestuali
- Stesse regole anti-interrogatorio della chat

#### elevenlabs-context arricchito
- Aggiunto: tempo dall'ultima sessione
- Aggiunto: stato emotivo ultima sessione
- Aggiunto: eventi imminenti ±12h da user_events
- Aggiunto: ora in formato Aria ("sono le 15:30 di giovedì pomeriggio")

#### Personalità HCE riscritta
- Più amica, meno assistente
- Umorismo contestuale
- Follow-up proattivo su temi precedenti
- Memoria attiva con riferimenti espliciti
- Lista anti-pattern aggiornata (frasi da chatbot bandite)

#### process-session potenziato
- Aggiunta estrazione eventi futuri dalla conversazione
- Salvataggio in user_events con follow_up_done = false
- Aggiornamento automatico eventi passati a status 'passed'

### Da implementare

#### OpenAI TTS come alternativa economica
- OpenAI TTS (Nova/Shimmer) + Whisper come alternativa a ElevenLabs
- Costo stimato: ~$0.12/sessione vs ElevenLabs
- Architettura: loop Swift con AVAudioRecorder + edge functions openai-tts e openai-stt
- Toggle Premium/Standard nelle impostazioni utente

#### Sessione giornaliera unica
- Una sessione per giorno che si chiude per contesto, non per timer
- Permette conversazioni più naturali e continuità nel dialogo giornaliero

### Da valutare

#### user_interests non presente nel nuovo DB
- La tabella user_interests (~50 campi di preferenze) non è stata inclusa nelle migrazioni del nuovo DB
- Opzioni: ricreare con migrazione dedicata, integrare in user_memories, raccogliere organicamente via conversazione

---
