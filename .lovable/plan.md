
# Piano: Quiz Iniziale Gamificato e Completo

## Panoramica

Trasformazione del quiz di onboarding in un'esperienza **gamificata, veloce e coinvolgente** che raccoglie informazioni complete (inclusi dati privati come peso, altezza, vizi) in modo intuitivo e divertente.

## Principi Guida

| Principio | Implementazione |
|-----------|-----------------|
| **Velocita** | Max 8-10 step, ~3 minuti totali |
| **Gamification** | Animazioni, feedback visivo, emoji, "punti" simbolici |
| **Privacy First** | Domande sensibili presentate con cura e opzione "Preferisco non rispondere" |
| **Multiscelta** | Box selezionabili per tutto tranne dati numerici specifici |
| **Mobile First** | Touch-friendly, grandi aree cliccabili |

---

## Nuova Struttura Step (10 step totali)

### Step 1: Welcome Personalizzato
**Tipo**: Intro animata (non conta come step)
```
"Ciao! Sono Aria, la tua compagna di benessere.
Rispondi a poche domande per personalizzare la tua esperienza."
[Iniziamo →]
```

### Step 2: Nome
**Tipo**: Input testuale semplice
```
"Come ti chiami?"
[Input: Nome]
```
*Salvataggio in: user_profiles.name*

### Step 3: Obiettivi Principali (Multi-selezione)
**Tipo**: Card Grid con emoji
```
"Cosa vorresti migliorare?" (max 3)
[ ] 🧘 Gestire l'ansia
[ ] 😴 Dormire meglio  
[ ] ⚡ Avere più energia
[ ] 💕 Migliorare relazioni
[ ] 📝 Sfogarmi/Diario
[ ] 🌱 Crescita personale
[ ] 💼 Gestire stress lavoro
[ ] 🪞 Autostima
```
*Salvataggio in: onboarding_answers.primaryGoals*

### Step 4: Situazione Attuale
**Tipo**: Card singola selezione
```
"Come descriveresti questo periodo?"
( ) 😐 Stabile ma voglio di più
( ) 🌪️ Momento difficile
( ) 🌅 In ripresa
( ) 🚀 Voglio crescere
```

### Step 5: Come Ti Senti? (Emoji Slider)
**Tipo**: Slider interattivo animato
```
"Come ti senti ultimamente?"
😔 ──●────── 😊
    Così così
```

### Step 6: Vizi & Abitudini da Monitorare (Multi-selezione)
**Tipo**: Chip Grid tematici
```
"Hai qualche 'vizio' che vuoi tenere sotto controllo?" (opzionale)

🚬 Fumo
🍷 Alcol  
☕ Troppo caffè
🍬 Zuccheri
📱 Social Media
💅 Mangiarsi unghie
⏰ Procrastinazione
❌ Nessuno di questi
```
*Salvataggio in: onboarding_answers.vices + creazione automatica habits*

### Step 7: Stile di Vita (Multi-selezione)
**Tipo**: Chip Grid
```
"Come descriveresti il tuo stile di vita?"

🏃 Faccio sport regolarmente
🧘 Pratico meditazione
😴 Ho problemi di sonno
💧 Bevo poca acqua
🍎 Mangio sano
📚 Leggo spesso
👥 Vita sociale attiva
🏠 Passo molto tempo solo/a
```

### Step 8: Dati Fisici (Input Numerici Opzionali)
**Tipo**: Card con input compatti
```
"Vuoi tracciare anche dati fisici?" (opzionale)

┌─────────────────────────────┐
│ ⚖️ Peso attuale            │
│ [_____] kg                  │
├─────────────────────────────┤
│ 📏 Altezza                  │
│ [_____] cm                  │
├─────────────────────────────┤
│ 🎂 Anno di nascita          │
│ [_____]                     │
└─────────────────────────────┘

[Salta questo step →]
```
*Salvataggio in: body_metrics + onboarding_answers*

### Step 9: Abitudini da Sviluppare (Suggerite + Griglia)
**Tipo**: Suggerimenti AI + Grid
```
"Quali abitudini vuoi sviluppare?"

✨ Suggerite per te:
[💧 Acqua] [🧘 Meditazione] [😴 Sonno]

Tutte le abitudini:
[Grid completa esistente]
```
*Riutilizza HabitsSelectionStep migliorato*

### Step 10: Loading Animato "Analisi"
**Tipo**: Animazione gamificata
```
[Cerchio che si riempie]
✓ Analisi profilo completata
✓ Obiettivi identificati
✓ Piano personalizzato creato
✓ Dashboard pronta!
```

### Step 11: Risultato + CTA
**Tipo**: Celebrazione
```
🎉 Sei pronto!
Dashboard personalizzata per:
• Gestione Ansia
• Qualità Sonno
• [altri obiettivi]

[Inizia il tuo percorso →]
```

---

## Nuovi Componenti da Creare

| File | Descrizione |
|------|-------------|
| `src/components/onboarding/WelcomeStep.tsx` | Intro animata con Aria |
| `src/components/onboarding/NameInputStep.tsx` | Input nome con animazione |
| `src/components/onboarding/ChipGridStep.tsx` | Griglia chip multi-selezione riutilizzabile |
| `src/components/onboarding/VicesStep.tsx` | Step vizi con chip selezionabili |
| `src/components/onboarding/LifestyleStep.tsx` | Step stile di vita |
| `src/components/onboarding/PhysicalDataStep.tsx` | Input peso, altezza, anno nascita |
| `src/components/onboarding/ProgressBadge.tsx` | Badge animato che appare al completamento step |

## File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/Onboarding.tsx` | Ristrutturazione completa con nuovi step |
| `src/components/onboarding/OnboardingLayout.tsx` | Progress bar gamificata con icone step |
| `src/components/onboarding/QuizStep.tsx` | Migliorare animazioni, aggiungere feedback haptic |
| `src/components/onboarding/EmojiSlider.tsx` | Animazioni più fluide, feedback visivo |
| `src/components/onboarding/HabitsSelectionStep.tsx` | Design compatto, suggerimenti prominenti |
| `src/components/onboarding/AnalyzingScreen.tsx` | Animazioni piu coinvolgenti |
| `src/components/onboarding/ResultScreen.tsx` | Celebrazione piu elaborata |

---

## Logica Dati e Salvataggio

### Struttura onboarding_answers aggiornata
```typescript
interface OnboardingAnswers {
  // Step 2
  name: string;
  
  // Step 3  
  primaryGoals: string[];
  
  // Step 4
  lifeSituation: string;
  
  // Step 5
  currentMood: number; // 0-4
  
  // Step 6 - NUOVO
  vices: string[]; // ['smoking', 'alcohol', 'caffeine', ...]
  
  // Step 7 - NUOVO
  lifestyle: string[]; // ['active', 'meditation', 'sleep_issues', ...]
  
  // Step 8 - NUOVO
  physicalData: {
    weight?: number;
    height?: number;
    birthYear?: number;
  };
  
  // Step 9
  selectedHabits: string[];
}
```

### Azioni automatiche post-onboarding

1. **Salva nome** in `user_profiles.name`
2. **Crea record peso** in `body_metrics` se fornito
3. **Crea habits** per vizi selezionati (smoking, alcohol, etc.) con streakType: 'abstain'
4. **Crea habits** per abitudini selezionate
5. **Configura dashboard** basata su obiettivi
6. **Salva tutto** in `onboarding_answers` per riferimento AI

---

## Gamification Elements

### 1. Progress Bar Evoluta
```
Step 1   2   3   4   5   6   7   8   9   10
  ●───●───●───○───○───○───○───○───○───○
        "Ottimo inizio!"
```

### 2. Micro-animazioni
- **Selezione card**: Scale up + glow + check animato
- **Completamento step**: Confetti mini + suono haptic
- **Emoji slider**: L'emoji selezionata "balla"
- **Input completato**: Check verde animato

### 3. Messaggi di Incoraggiamento
- Step 3: "Fantastico! Adesso so cosa e importante per te"
- Step 6: "Nessun giudizio, solo supporto"
- Step 8: "Questi dati aiuteranno Aria a darti consigli piu precisi"
- Step 10: "Ci siamo quasi!"

### 4. Skip Intelligente
- Domande sensibili hanno sempre "Preferisco non rispondere"
- Skip non penalizza l'esperienza

---

## Design Specifiche

### Card Chip (Vizi/Lifestyle)
```css
/* Non selezionato */
.chip {
  background: var(--card);
  border: 2px solid transparent;
  border-radius: 1rem;
  padding: 0.75rem 1.25rem;
  font-size: 0.9rem;
}

/* Selezionato */
.chip-selected {
  background: var(--primary) / 10%;
  border-color: var(--primary);
  transform: scale(1.02);
}
```

### Input Numerico (Peso/Altezza)
```css
.numeric-input {
  background: var(--card);
  border-radius: 1rem;
  padding: 1rem;
  font-size: 1.5rem;
  text-align: center;
  width: 100%;
}
```

---

## Sequenza Implementazione

1. **Creare componenti base**
   - WelcomeStep
   - NameInputStep  
   - ChipGridStep (riutilizzabile)

2. **Creare step specifici**
   - VicesStep
   - LifestyleStep
   - PhysicalDataStep

3. **Migliorare componenti esistenti**
   - QuizStep (animazioni)
   - EmojiSlider (feedback)
   - HabitsSelectionStep (compact)

4. **Ristrutturare Onboarding.tsx**
   - Nuovo flow 10 step
   - Logica salvataggio estesa

5. **Aggiornare AnalyzingScreen e ResultScreen**
   - Animazioni celebrative
   - Riepilogo personalizzato

6. **Test e Polish**
   - Animazioni fluide
   - Gestione errori
   - Accessibilita

---

## Stima Tempo

| Fase | Tempo |
|------|-------|
| Componenti base | 15 min |
| Step specifici | 20 min |
| Miglioramenti esistenti | 15 min |
| Onboarding.tsx | 20 min |
| Animazioni/Polish | 15 min |
| **Totale** | **~85 min** |

---

## Risultato Finale

L'utente completera il quiz in **~3 minuti** con un'esperienza:
- Visivamente accattivante e moderna
- Intuitiva (niente da "capire")
- Completa (raccoglie dati psicologici + fisici + abitudini)
- Rispettosa della privacy (skip sempre disponibile)
- Divertente (sembra un gioco, non un questionario medico)

Aria avra accesso a:
- Nome utente
- Obiettivi principali
- Sfide attuali
- Stato emotivo iniziale
- Vizi da monitorare
- Stile di vita
- Dati fisici base (se forniti)
- Abitudini da tracciare
