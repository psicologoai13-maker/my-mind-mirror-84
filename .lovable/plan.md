
# Quiz Personalizzato per Eta e Genere

## Analisi del Gap Attuale

| Elemento | Stato Attuale | Problema |
|----------|---------------|----------|
| Eta | Binary (giovani vs adulti) | Troppo generico, mancano fasce intermedie |
| Genere | Raccolto ma **mai usato** | Spreco di dato prezioso |
| Occupazione | Non chiesta | Fondamentale per life areas (scuola/lavoro) |

## Proposta: Matrice di Personalizzazione 4x3

### Fasce d'Eta Migliorate

| Fascia | Label | Focus Principale |
|--------|-------|------------------|
| <18 | Adolescenti | Scuola, identita, famiglia |
| 18-24 | Giovani Adulti | Transizione, universita/primo lavoro |
| 25-44 | Adulti | Carriera, famiglia, equilibrio |
| 45+ | Adulti Maturi | Salute, legacy, riscoperta |

### Personalizzazioni per Genere

**Motivazioni Specifiche per Genere:**

| Genere | Opzioni Esclusive |
|--------|-------------------|
| Donna | Sindrome dell'impostora, ciclo mestruale, carico mentale, maternita |
| Uomo | Esprimere emozioni, pressione del "provider", vulnerabilita |
| Altro/Non specificato | Identita di genere, accettazione |

**Goals Specifici per Genere:**

| Genere | Goals Esclusivi |
|--------|-----------------|
| Donna | Body positivity, self-care, gestire ciclo |
| Uomo | Emotional intelligence, paternita consapevole |

**Interessi Specifici per Genere:**

| Genere | Interessi Proposti |
|--------|-------------------|
| Donna (<25) | Skincare, fashion, drama coreani |
| Donna (25+) | Wellness, self-help books, pilates |
| Uomo (<25) | Calcio, gaming, gym |
| Uomo (25+) | Investimenti, tech, sport |

## Nuovo Flusso Quiz (7 Step)

```text
Step 1: Welcome
   |
Step 2: Name
   |
Step 3: AboutYou (Mood + Genere + Eta)
   |
Step 4: Occupation (NUOVO - solo se 18-27)
   |
   +--> Studente: mostra school
   +--> Lavoratore: mostra work  
   +--> Entrambi: mostra entrambe
   |
Step 5: Motivation (personalizzato eta + genere)
   |
Step 6: Goals (personalizzato eta + genere)
   |
Step 7: Interests (personalizzato eta + genere)
   |
Step 8: Ready
```

## Dettaglio Opzioni per Profilo Utente

### ADOLESCENTI (<18)

**Donna <18:**
- Motivazioni: Stress scolastico, Pressione social, Body image, Ciclo mestruale, Rapporto genitori
- Goals: Autostima, Accettare il corpo, Rendimento scolastico, Gestire ansia da verifiche
- Interessi: TikTok, K-pop, Skincare, Drama, Anime

**Uomo <18:**
- Motivazioni: Stress scolastico, Performance sportiva, Bullismo, Rapporto genitori, Identita
- Goals: Concentrazione, Forma fisica, Rendimento scolastico, Gestire rabbia
- Interessi: Gaming, Esport, Calcio, YouTube, Anime

### GIOVANI ADULTI (18-24)

**Donna 18-24:**
- Motivazioni: Ansia universitaria, Futuro incerto, Relazioni, Confronto social, Indipendenza
- Goals: Work-life balance, Autostima, Relazioni sane, Finanze personali
- Interessi: Wellness, Self-care, Travel, Fashion, Podcasts

**Uomo 18-24:**
- Motivazioni: Carriera, Performance, Relazioni, Indipendenza, Pressione sociale
- Goals: Produttivita, Fitness, Finanze, Networking
- Interessi: Gym, Investimenti, Tech, Gaming, Sport

### ADULTI (25-44)

**Donna 25-44:**
- Motivazioni: Work-life balance, Carico mentale, Maternita, Relazione di coppia, Self-care trascurato
- Goals: Equilibrio, Me time, Gestire stress, Relazioni migliori, Forma fisica
- Interessi: Yoga, Lettura, Cucina, Giardinaggio, Wellness

**Uomo 25-44:**
- Motivazioni: Pressione lavorativa, Provider stress, Paternita, Burnout, Tempo per se
- Goals: Work-life balance, Presenza in famiglia, Fitness, Gestire stress
- Interessi: Sport, Investimenti, DIY, Tech, Podcasts

### ADULTI MATURI (45+)

**Donna 45+:**
- Motivazioni: Menopausa, Empty nest, Riscoperta personale, Salute, Invecchiare bene
- Goals: Accettazione, Nuovi hobby, Salute, Relazioni figli adulti
- Interessi: Giardinaggio, Volontariato, Viaggi, Benessere, Arte

**Uomo 45+:**
- Motivazioni: Midlife, Salute, Legacy, Rapporto figli, Pensione
- Goals: Fitness over 40, Nuovi interessi, Bilanciare vita, Accettazione
- Interessi: Golf/Sport, Viaggi, Investimenti, Hobby artigianali

## Modifiche Tecniche

### 1. Nuovo Step: OccupationStep.tsx (solo per 18-27)

Chiedere: "Cosa fai principalmente?"
- Studio
- Lavoro  
- Entrambi

Questo imposta `occupation_context` nel profilo per personalizzare le life areas nell'app.

### 2. Aggiornare AboutYouStep.tsx

Spostare la domanda sul genere PRIMA dell'eta per dare piu peso visivo.

### 3. Aggiornare MotivationStep.tsx

```typescript
// Nuova logica di filtering
const getMotivationOptions = (ageRange: string, gender: string) => {
  const base = [...baseMotivationOptions];
  
  // Age-specific
  if (isYouth(ageRange)) {
    base.push(...youthMotivations);
  } else {
    base.push(...adultMotivations);
  }
  
  // Gender-specific
  if (gender === 'female') {
    base.push(...femaleMotivations);
    if (isYouth(ageRange)) {
      base.push(...youngFemaleMotivations);
    }
  } else if (gender === 'male') {
    base.push(...maleMotivations);
  }
  
  return base;
};
```

### 4. Aggiornare GoalsStep.tsx

Stessa logica di MotivationStep con goals specifici per combinazione eta+genere.

### 5. Aggiornare InterestsStep.tsx

Stessa logica con interessi specifici.

### 6. Aggiornare Onboarding.tsx

- Aggiungere `occupation` allo stato
- Inserire OccupationStep condizionale (solo se eta 18-27)
- Passare `gender` a tutti gli step oltre a `ageRange`
- Salvare `occupation_context` nel profilo

## File da Modificare

| File | Modifiche |
|------|-----------|
| `src/pages/Onboarding.tsx` | Aggiungere occupation state, step condizionale, passare gender agli step |
| `src/components/onboarding/OccupationStep.tsx` | **NUOVO** - Step occupazione |
| `src/components/onboarding/AboutYouStep.tsx` | Riordinare genere prima di eta |
| `src/components/onboarding/MotivationStep.tsx` | Aggiungere prop gender, nuove opzioni |
| `src/components/onboarding/GoalsStep.tsx` | Aggiungere prop gender, nuove opzioni |
| `src/components/onboarding/InterestsStep.tsx` | Aggiungere prop gender, nuove opzioni |

## Nuove Opzioni da Aggiungere

### Motivazioni per Genere

**Solo Donne:**
- `imposter_syndrome`: Sindrome dell'impostora
- `mental_load`: Carico mentale
- `body_image`: Rapporto col corpo
- `cycle_management`: Gestire il ciclo

**Solo Uomini:**
- `express_emotions`: Esprimere emozioni
- `provider_pressure`: Pressione del "dover mantenere"
- `show_vulnerability`: Mostrarsi vulnerabile

### Goals per Genere

**Solo Donne:**
- `body_positivity`: Accettare il corpo
- `me_time`: Tempo per me
- `mental_load_balance`: Bilanciare carico mentale

**Solo Uomini:**
- `emotional_intelligence`: Intelligenza emotiva
- `present_father`: Paternita presente
- `open_up`: Aprirsi di piu

### Interessi per Genere/Eta

**Donne Giovani:**
- `skincare`, `kdramas`, `fashion`, `astrology`

**Donne Adulte:**
- `pilates`, `self_help`, `wellness_retreats`

**Uomini Giovani:**
- `football`, `gym`, `crypto`

**Uomini Adulti:**
- `golf`, `whisky`, `classic_cars`

## Risultato Atteso

1. **Esperienza Personalizzata** - Ogni utente vede opzioni rilevanti per la sua situazione
2. **Engagement Migliore** - Meno scroll, piu rilevanza
3. **Dati Migliori per Aria** - Contesto piu ricco per conversazioni personalizzate
4. **Occupation Context** - Imposta automaticamente scuola/lavoro per le life areas
