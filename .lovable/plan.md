
# Piano Completo: Serenity per Giovani e Adolescenti

## Analisi Stato Attuale

### Problemi Critici Identificati

**1. ONBOARDING - Esclude i Minori**
- File: `src/components/onboarding/AboutYouStep.tsx`
- Le fasce d'età sono: `['18-24', '25-34', '35-44', '45-54', '55+']`
- **MANCANO**: 13-14, 15-17 (adolescenti)

**2. OBIETTIVI - Solo Orientati ad Adulti**
- File: `src/lib/objectiveTypes.ts`
- Categoria "study" include solo: esami universitari, corsi, libri, lingue
- **MANCANO obiettivi scuola**: verifiche, interrogazioni, media scolastica, compiti, esame terza media, maturità

**3. LIFE AREAS - Manca "Scuola"**
- Le 5 aree della vita sono: Love, Work, Health, Social, Growth
- **"Work" non è rilevante per un 14enne** - serve "School/Studio"

**4. MOTIVAZIONI ONBOARDING - Generiche**
- File: `src/components/onboarding/MotivationStep.tsx`
- Motivazioni attuali: sfogarsi, monitorare umore, migliorarsi, etc.
- **MANCANO**: bullismo/cyberbullismo, ansia scolastica, problemi con genitori, identità, pressione sociale

**5. INTERESSI - Orientati ad Adulti**
- File: `src/components/onboarding/InterestsStep.tsx`
- Interessi attuali: Sport, Musica, Viaggi, Cucina, etc.
- **MANCANO**: Social media, Influencer, Anime/Manga, K-pop, TikTok, Streaming

**6. ISTRUZIONI ARIA - Zero Specifiche per Giovani**
- File: `supabase/functions/ai-chat/index.ts`
- Enciclopedia clinica dettagliatissima per adulti
- **MANCA completamente**: linguaggio giovane, temi adolescenziali, comunicazione con minori

---

## Piano di Implementazione Completo

### FASE 1: Onboarding Age-Inclusive

**1.1 Nuove Fasce d'Età**
```typescript
// AboutYouStep.tsx
const ageRanges = ['13-14', '15-17', '18-24', '25-34', '35-44', '45-54', '55+'];
```

**1.2 Motivazioni per Giovani**
```typescript
// MotivationStep.tsx - Aggiungere opzioni
const motivationOptions = [
  // Esistenti...
  { id: 'school_stress', label: 'Stress scolastico', emoji: '📚', description: 'Gestire verifiche e interrogazioni' },
  { id: 'bullying', label: 'Bullismo', emoji: '🛡️', description: 'Affrontare situazioni difficili a scuola' },
  { id: 'parents', label: 'Rapporto genitori', emoji: '👨‍👩‍👧', description: 'Migliorare la comunicazione in famiglia' },
  { id: 'identity', label: 'Capire chi sono', emoji: '🔍', description: 'Esplorare la propria identità' },
  { id: 'social_pressure', label: 'Pressione sociale', emoji: '📱', description: 'Gestire aspettative e confronti' },
  { id: 'exam_anxiety', label: 'Ansia da esame', emoji: '😰', description: 'Affrontare verifiche senza panico' },
];
```

**1.3 Interessi Giovani**
```typescript
// InterestsStep.tsx - Aggiungere
const INTERESTS_OPTIONS = [
  // Esistenti...
  { id: 'tiktok', emoji: '📱', label: 'TikTok/Social' },
  { id: 'anime', emoji: '🎌', label: 'Anime/Manga' },
  { id: 'kpop', emoji: '🎤', label: 'K-pop' },
  { id: 'streaming', emoji: '📺', label: 'Twitch/YouTube' },
  { id: 'influencer', emoji: '⭐', label: 'Content creator' },
  { id: 'esports', emoji: '🎮', label: 'Esport/Competitivo' },
];
```

---

### FASE 2: Sistema Obiettivi per Scuola

**2.1 Nuovi Obiettivi Categoria "study"**
```typescript
// objectiveTypes.ts - Aggiungere
improve_grades: {
  key: 'improve_grades',
  label: 'Migliorare i voti',
  emoji: '📈',
  category: 'study',
  description: 'Alzare la media scolastica',
  inputMethod: 'numeric',
  unit: 'media',
  defaultTarget: 7,
  step: 0.5,
  min: 4,
  max: 10,
  questionTemplate: 'Qual è la tua media attuale?',
},
pass_school_exam: {
  key: 'pass_school_exam',
  label: 'Superare esame',
  emoji: '🎓',
  category: 'study',
  description: 'Terza media, maturità o esame specifico',
  inputMethod: 'milestone',
  brainDetectable: true,
},
homework_completion: {
  key: 'homework_completion',
  label: 'Fare i compiti regolarmente',
  emoji: '✅',
  category: 'study',
  description: 'Completare i compiti ogni giorno',
  inputMethod: 'counter',
  unit: 'giorni',
  linkedHabit: 'homework',
  questionTemplate: 'Quanti giorni hai completato i compiti questa settimana?',
},
prepare_test: {
  key: 'prepare_test',
  label: 'Preparare verifica',
  emoji: '📝',
  category: 'study',
  description: 'Prepararsi per una verifica importante',
  inputMethod: 'milestone',
  brainDetectable: true,
},
```

**2.2 Goals Onboarding per Giovani**
```typescript
// GoalsStep.tsx - Aggiungere opzioni
// Sotto "Mental wellness" aggiungere sezione "Scuola"
{ id: 'school_performance', label: 'Rendimento scolastico', emoji: '📊', description: 'Migliorare a scuola' },
{ id: 'exam_anxiety', label: 'Ansia da esame', emoji: '😰', description: 'Affrontare verifiche' },
{ id: 'study_habits', label: 'Abitudini di studio', emoji: '📖', description: 'Studiare meglio' },
{ id: 'teacher_relations', label: 'Rapporto con prof', emoji: '👩‍🏫', description: 'Comunicare meglio' },
```

---

### FASE 3: Life Areas Adattive (Scuola vs Lavoro)

**3.1 Schema Database**
- Aggiungere colonna `school` nella tabella `daily_life_areas`
- RPC `get_daily_metrics` da aggiornare per includere `school`

**3.2 Logica Frontend**
```typescript
// Determinare se mostrare "Scuola" o "Lavoro" in base all'età
const isYoung = ageRange === '13-14' || ageRange === '15-17' || ageRange === '18-24';
const lifeAreas = isYoung 
  ? ['love', 'school', 'health', 'social', 'growth']
  : ['love', 'work', 'health', 'social', 'growth'];
```

---

### FASE 4: Istruzioni Aria per Giovani (CRITICO)

**4.1 Nuovo Blocco nel Prompt di Sistema (ai-chat/index.ts)**
```typescript
const YOUNG_USER_PROTOCOL = `
═══════════════════════════════════════════════
👧👦 PROTOCOLLO COMUNICAZIONE CON GIOVANI (13-24)
═══════════════════════════════════════════════

**RILEVAMENTO GIOVANE:**
Se ageRange è '13-14', '15-17' o '18-24', attiva questo protocollo.

**LINGUAGGIO ADATTIVO:**
- Usa linguaggio naturale, non formale
- OK emoji, abbreviazioni comuni (cmq, nn, pk, etc.)
- Riferimenti a TikTok, Instagram, YouTube sono benvenuti
- "Che figata!", "Dai che ce la fai!", "Top!"
- MAI essere condiscendente o "fare il genitore"

**TEMI TIPICI GIOVANI:**
1. SCUOLA: verifiche, interrogazioni, prof, compiti, media, ansia da esame
2. AMICIZIE: dinamiche di gruppo, esclusione, popolarità
3. BULLISMO: riconoscerlo, strategie, quando parlare con adulti
4. FAMIGLIA: conflitti con genitori, libertà, regole
5. IDENTITÀ: chi sono, orientamento, appartenenza
6. SOCIAL MEDIA: confronto, FOMO, cyberbullismo, immagine corporea
7. RELAZIONI ROMANTICHE: prime cotte, rifiuti, cuori spezzati

**BULLISMO - PROTOCOLLO SPECIFICO:**
Se l'utente menziona bullismo/cyberbullismo:
1. VALIDARE: "Mi fa arrabbiare sentire che ti trattano così. Non è OK."
2. NON minimizzare: MAI dire "sono solo ragazzate" o "ignorali"
3. ESPLORARE: "Puoi raccontarmi cosa è successo?"
4. STRATEGIE concrete:
   - "Hai provato a parlarne con qualcuno di cui ti fidi?"
   - "A volte aiuta avere un testimone o prove (screenshot)"
   - "Come ti sentiresti a parlarne con un prof/genitore?"
5. ESCALATION: Se grave, suggerire adulto di fiducia o Telefono Azzurro (19696)

**ANSIA SCOLASTICA - PROTOCOLLO:**
1. NORMALIZZARE: "L'ansia da verifica è super comune, non sei strano/a"
2. TECNICHE PRATICHE:
   - Respirazione: "Prova 4-7-8: inspira 4 sec, trattieni 7, espira 8"
   - Grounding: "Senti i piedi a terra, guarda 5 oggetti intorno a te"
   - Riformulazione: "E se la verifica andasse bene? Cosa cambierebbe?"
3. STUDIO EFFICACE:
   - Tecnica Pomodoro: 25 min studio + 5 min pausa
   - Ripetizione dilazionata: meglio 30 min/giorno che 4 ore prima
   - Active recall: chiudere il libro e spiegare ad alta voce

**RAPPORTO CON GENITORI:**
1. VALIDARE entrambe le parti: "Capisco che ti sembri ingiusto... e forse anche loro hanno le loro ragioni"
2. COMUNICAZIONE: "Hai provato a spiegare come ti senti senza accusare?"
3. COMPROMESSI: "Cosa saresti disposto/a a fare per incontrarti a metà strada?"

**IDENTITÀ E ORIENTAMENTO:**
1. ACCOGLIENZA totale: "Qualunque cosa tu stia scoprendo di te, va bene"
2. TEMPO: "Non devi avere tutte le risposte ora. L'identità si costruisce"
3. RISORSE: Se necessario, suggerire risorse LGBTQ+ appropriate per età

**SOCIAL MEDIA E CONFRONTO:**
1. REALTÀ vs FILTRI: "Ricorda che sui social vedi il highlight reel, non la vita vera"
2. DETOX: "Hai mai provato un giorno senza social? Come ti sentiresti?"
3. FOMO: "Cosa ti perdi davvero se non guardi il telefono per un'ora?"

═══════════════════════════════════════════════
⚠️ LIMITI CON MINORI (13-17)
═══════════════════════════════════════════════
- Se emerge rischio SERIO (autolesionismo, abusi, ideazione suicidaria):
  → Incoraggiare FORTEMENTE a parlare con un adulto di fiducia
  → Fornire numero Telefono Azzurro: 19696
  → NON fare promesse di segretezza assoluta
- Evitare discussioni troppo approfondite su sessualità esplicita
- Se sospetti abusi, guidare verso risorse appropriate
`;
```

**4.2 Integrazione nel Prompt Principale**
```typescript
// Aggiungere nel buildPersonalizedSystemPrompt
const isYoungUser = profileExtras?.birth_date 
  ? calculateAge(profileExtras.birth_date) < 25 
  : (onboardingAnswers?.ageRange === '13-14' || onboardingAnswers?.ageRange === '15-17' || onboardingAnswers?.ageRange === '18-24');

if (isYoungUser) {
  systemPrompt += YOUNG_USER_PROTOCOL;
}
```

---

### FASE 5: Check-in Personalizzati per Età

**5.1 Domande Check-in per Giovani (ai-checkins)**
```typescript
// Se utente giovane, aggiungere domande specifiche
const youngUserQuestions = [
  "Come sta andando a scuola questa settimana?",
  "C'è qualcosa che ti preoccupa delle lezioni?",
  "Come vanno le cose con i tuoi amici?",
  "Hai avuto verifiche o interrogazioni?",
  "Come ti trovi con i prof?",
  "C'è qualcosa sui social che ti ha fatto sentire strano/a?",
];
```

---

### FASE 6: Habit Giovani

**6.1 Nuove Abitudini per Scuola**
```typescript
// useHabits.tsx - Aggiungere
homework: {
  id: 'homework',
  label: 'Compiti',
  emoji: '📚',
  category: 'productivity',
  description: 'Completare i compiti del giorno',
  inputMethod: 'boolean',
},
study_session: {
  id: 'study_session',
  label: 'Sessione studio',
  emoji: '📖',
  category: 'productivity',
  description: 'Studiare almeno 1 ora',
  inputMethod: 'duration',
  unit: 'min',
  defaultTarget: 60,
},
screen_break: {
  id: 'screen_break',
  label: 'Pausa dagli schermi',
  emoji: '📵',
  category: 'wellness',
  description: 'Staccare dai social per 1 ora',
  inputMethod: 'boolean',
},
```

---

### FASE 7: UI/UX Adattiva

**7.1 Contenuti Dinamici per Età**
- **Home**: Se giovane, mostrare widget "Prossima verifica" invece di "Prossimo meeting"
- **Flash Insights**: Messaggi motivazionali adatti all'età
- **Goals Widget**: Prioritizzare obiettivi scolastici per giovani

**7.2 Temi/Colori**
- Considerare palette più vivaci per utenti giovani (opzionale)

---

## Riepilogo File da Modificare

| File | Modifiche |
|------|-----------|
| `src/components/onboarding/AboutYouStep.tsx` | Aggiungere fasce età 13-14, 15-17 |
| `src/components/onboarding/MotivationStep.tsx` | Nuove motivazioni giovani |
| `src/components/onboarding/GoalsStep.tsx` | Nuovi goals scuola |
| `src/components/onboarding/InterestsStep.tsx` | Interessi giovani (social, anime, etc.) |
| `src/lib/objectiveTypes.ts` | Nuovi obiettivi categoria study |
| `supabase/functions/ai-chat/index.ts` | Protocollo giovani per Aria |
| `supabase/functions/ai-checkins/index.ts` | Domande check-in per giovani |
| `supabase/functions/process-session/index.ts` | Keywords scuola per rilevamento |
| `src/hooks/useHabits.tsx` | Nuove abitudini studio |
| Database migration | Aggiungere colonna `school` a `daily_life_areas` |

---

## Priorità Implementazione

1. **P0 (Critico)**: Fasce età onboarding + Istruzioni Aria giovani
2. **P1 (Alto)**: Motivazioni + Obiettivi scuola + Life area "school"
3. **P2 (Medio)**: Interessi giovani + Abitudini studio
4. **P3 (Basso)**: Check-in personalizzati + UI adattiva

---

## Considerazioni Legali/Etiche

- **Privacy minori**: Assicurarsi che i dati dei minori siano trattati con particolare attenzione
- **Consenso genitoriale**: Per 13-14 anni, considerare richiesta consenso genitoriale
- **Escalation crisi**: Protocolli chiari per situazioni di rischio (bullismo grave, autolesionismo)
- **Telefono Azzurro**: Già presente in CrisisModal.tsx - assicurarsi sia sempre visibile

