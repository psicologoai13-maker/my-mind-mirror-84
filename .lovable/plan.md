
# Piano: Allineare Aria Vocale ad Aria Chat

## Analisi del Gap

### Aria Chat (ai-chat/index.ts) - 2510 righe:
- **Rubrica Clinica Completa**: 20 emozioni, valutazione psicologica avanzata
- **Tecniche Cliniche**: CBT, ACT, DBT, MI, SFBT
- **Enciclopedia Clinica**: Ansia, disturbi umore, trauma, personalità, alimentari, ADHD, dipendenze
- **Libreria Psicoeducativa**: Meccanismi psicologici, distorsioni cognitive
- **Protocolli Intervento**: Mindfulness, gestione rabbia, elaborazione lutto, dinamiche relazionali
- **Triage Psichiatrico**: 4 livelli (Critico, Urgente, Attenzione, Standard)
- **Personalità Dinamica**: Switch Amica/Psicologa basato sul contesto
- **Protocollo Giovani**: Comunicazione adattiva per 13-24 anni
- **Protocollo Adulti**: Per utenti 18+

### Dati Iniettati in Chat:
| Blocco | Dati |
|--------|------|
| `userContextBlock` | Nome, obiettivi, memoria (ultimi 30 punti), stile persona |
| `objectivesBlock` | Obiettivi attivi con valore partenza/attuale/target |
| `interestsBlock` | Squadre cuore, musica, hobby, animali, valori, preferenze comunicative |
| `currentStateBlock` | Vitali oggi (mood, ansia, energia, sonno), emozioni prevalenti, aree vita |
| `recentSessionsBlock` | Ultime 3 sessioni con riassunti AI + contesto temporale |
| `habitsBlock` | Abitudini tracciate oggi |
| `bodyBlock` | Peso, sonno, passi, attività, frequenza cardiaca |
| `profileExtrasBlock` | Genere, età, altezza, stato terapia, occupazione |
| `realTimeContext` | Data/ora, meteo, news Italia |
| `firstConversationBlock` | Istruzioni speciali prima chat |

### Aria Vocale Attuale (aria-voice-chat/index.ts) - 170 righe:
- System prompt basico (50 righe)
- Nessun recupero dati utente
- Nessun contesto (nome, memoria, obiettivi, stato)
- Nessuna tecnica clinica avanzata
- Nessun protocollo età

## Soluzione: "Mirror Brain" per la Voce

Creeremo una versione ottimizzata del cervello di Aria per il contesto vocale, mantenendo la stessa profondità clinica ma con output più concisi.

### Fase 1: Autenticazione e Recupero Dati

Aggiungere alla funzione `aria-voice-chat`:

```text
1. Autenticazione JWT dall'header Authorization
2. Fetch parallelo da database:
   - user_profiles (nome, long_term_memory, selected_goals, occupation_context, gender, birth_date)
   - user_interests (squadre, hobby, valori, preferenze comunicative)
   - user_objectives (obiettivi attivi con progress)
   - get_daily_metrics RPC (vitali, emozioni, aree vita, psicologia profonda)
   - sessions (ultime 3 con ai_summary)
   - daily_habits (abitudini oggi)
   - body_metrics (peso, sonno, passi)
```

### Fase 2: Sistema di Istruzioni Unificato

Creare un sistema di istruzioni "mirror" che includa:

1. **Identità Aria Vocale**
   - Stessa personalità (migliore amica + psicologa)
   - Adattamento per voce: risposte 2-4 frasi max
   - Switch dinamico amica/terapeuta

2. **Competenze Cliniche Complete**
   - Rubrica valutazione emotiva (20 emozioni)
   - Tecniche terapeutiche (CBT, ACT, DBT, MI, SFBT)
   - Protocolli intervento (ansia, rabbia, lutto, relazioni)
   - Triage psichiatrico 4 livelli
   - Protocollo sicurezza crisi

3. **Protocolli Età-Specifici**
   - Giovani (13-17): linguaggio informale, temi scuola, bullismo, genitori
   - Giovani Adulti (18-24): mix protocolli
   - Adulti (25+): protocollo completo

4. **Gestione Obiettivi**
   - Rilevamento progressi dal parlato
   - Celebrazione o supporto adattivo
   - Domande chiarificatrici naturali

### Fase 3: Costruzione Blocchi Contesto

Generare blocchi contesto condensati per il prompt vocale:

```text
═══════════════════════════════════════════════
👤 CONTESTO UTENTE
═══════════════════════════════════════════════
Nome: [Nome]
Età: [X] anni | Occupazione: [studente/lavoratore]
Obiettivi: [ridurre ansia, dormire meglio...]
Memoria: [ultimi 10 punti salienti]

📊 STATO OGGI:
Umore: X/10 | Ansia: X/10 | Energia: X/10 | Sonno: X/10
Emozioni: [gioia 40%, tristezza 20%...]

🎯 OBIETTIVI ATTIVI:
• "Perdere peso" (corpo): 72kg → target 68kg
• "Risparmiare" (finanze): 500€ → target 2000€

🎯 INTERESSI:
Squadre: [Juventus, Milan...]
Musica: [Rock, Pop] - Artisti: [X, Y]
Hobby: [palestra, lettura...]

⏰ ULTIMA CONVERSAZIONE: [ieri / 2 giorni fa...]
Argomento: [riassunto breve]
═══════════════════════════════════════════════
```

### Fase 4: Voce Italiana Nativa

Per la sintesi vocale ElevenLabs, valutare alternative alla voce "Sarah" (americana):

**Opzioni Voice ID da testare:**
1. "Laura" (FGY2WhTYpPnrIDTdsKH5) - voce femminile multilingue
2. "Aria" (OYTbf65OHHFELVut7v2H) - nome appropriato, calda
3. Ricerca nella Voice Library per voci italiane native

**Impostazioni ottimizzate per italiano:**
```json
{
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.8,
    "style": 0.4,
    "use_speaker_boost": true
  }
}
```

### Fase 5: Frontend (useHybridVoice)

Aggiornare l'hook per passare contesto aggiuntivo se necessario e gestire il token di autenticazione correttamente.

## File da Modificare

| File | Modifiche |
|------|-----------|
| `supabase/functions/aria-voice-chat/index.ts` | Riscrittura completa: ~800-1000 righe con autenticazione, fetch dati, prompt clinico completo, iniezione contesto |
| `src/hooks/useHybridVoice.tsx` | Verifica passaggio auth token (già gestito da Supabase SDK) |

## Struttura Finale aria-voice-chat

```text
1. Imports e Configurazione
2. CORS Headers
3. ═══════════════════════════════════════════════
   SISTEMA ISTRUZIONI ARIA VOCALE (Condensato)
   ═══════════════════════════════════════════════
   - Identità e Personalità
   - Rubrica Emotiva
   - Tecniche Cliniche (riferimento)
   - Protocollo Sicurezza
   - Stile Vocale (brevità)

4. Funzione buildVoiceSystemPrompt():
   - Iniezione nome, memoria, obiettivi
   - Stato attuale (vitali, emozioni)
   - Interessi utente
   - Contesto temporale sessioni
   - Protocollo età-specifico

5. Funzione getUserVoiceContext():
   - Autenticazione JWT
   - Fetch parallelo tutti i dati
   - Return struttura completa

6. Handler principale:
   - Auth check
   - Get user context
   - Build personalized prompt
   - Call Lovable Gateway (Gemini 3 Flash)
   - Generate ElevenLabs audio (voce italiana)
   - Return text + audio
```

## Risultato Atteso

Dopo l'implementazione, Aria vocale:
- Chiamerà l'utente per nome
- Ricorderà conversazioni passate
- Conoscerà obiettivi e progressi
- Adatterà il tono all'età
- Userà tecniche cliniche appropriate
- Parlerà con voce italiana naturale
- Avrà la stessa profondità di comprensione della versione chat

## Note Tecniche

- Il prompt vocale sarà una versione "condensata" (~800 righe vs 2500) per ottimizzare latenza
- Le tecniche cliniche complete saranno disponibili come "riferimento" invece di essere incluse per intero
- Focus su contesto utente e stato attuale per risposte personalizzate
- La voce ElevenLabs richiede test con diverse voci multilingue per trovare quella con accento italiano migliore
