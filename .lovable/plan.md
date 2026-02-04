
# Piano: Riorganizzazione Clinica della Sezione Analisi

## Analisi della Situazione Attuale

### Cosa stiamo raccogliendo ora:
| Categoria | Metriche | Quantità |
|-----------|----------|----------|
| Emozioni | joy, sadness, anger, fear, apathy, shame, jealousy, hope, frustration, nostalgia, nervousness, overwhelm, excitement, disappointment | 14 |
| Psicologia | rumination, self_efficacy, mental_clarity, burnout_level, coping_ability, loneliness_perceived, somatic_tension, appetite_changes, sunlight_exposure, guilt, gratitude, irritability, concentration, motivation, intrusive_thoughts, self_worth | 16 |
| Aree di Vita | work, school, love, social, health, growth | 6 |
| Vitali | mood, anxiety, energy, sleep | 4 |

**Totale attuale: ~40 metriche**

---

## Valutazione Clinica: Cosa Manca

### 1. CRITICO - Indicatori di Sicurezza (uno psicologo li cercherebbe SUBITO)
- **Pensieri suicidari** (suicidal_ideation) - fondamentale per il triage
- **Disperazione** (hopelessness) - predittore di rischio
- **Impulsi autolesionistici** (self_harm_urges)

### 2. Emozioni Mancanti (modello Ekman + espansioni cliniche)
- **Disgusto** (disgust) - emozione base di Ekman
- **Sorpresa** (surprise) - emozione base di Ekman  
- **Serenità/Calma** (serenity) - opposto dell'ansia
- **Orgoglio** (pride) - importante per autostima
- **Affetto** (affection) - distinto da amore romantico
- **Curiosità** (curiosity) - indicatore di engagement

### 3. Cognitivo Mancante
- **Dissociazione** (dissociation) - critico per trauma
- **Confusione mentale** (confusion)
- **Pensieri accelerati** (racing_thoughts) - indicatore mania/ansia

### 4. Comportamentale (categoria completamente assente!)
- **Evitamento** (avoidance) - core dell'ansia
- **Ritiro sociale** (social_withdrawal)
- **Compulsioni** (compulsive_urges) - OCD-related
- **Procrastinazione** (procrastination)

### 5. Psicologico Mancante
- **Senso di scopo** (sense_of_purpose) - fondamentale
- **Soddisfazione di vita** (life_satisfaction)
- **Supporto sociale percepito** (perceived_social_support)
- **Regolazione emotiva** (emotional_regulation)
- **Resilienza** (resilience)
- **Presenza/Mindfulness** (mindfulness)

### 6. Aree di Vita - Analisi Nomenclatura

**Il nome "Aree della Vita" va bene clinicamente** - alternative accettabili:
- "Domini di Funzionamento" (più clinico)
- "Qualità della Vita" (QoL domains)

**Aree mancanti:**
- **Famiglia** (family) - distinto da "amore" che è romantico
- **Tempo Libero** (leisure) - importante per burnout
- **Situazione Economica** (finances) - stress finanziario

---

## Piano di Implementazione

### Fase 1: Rimuovere VitalsSection
Eliminare il componente `VitalsSection` dalla pagina Analisi. I parametri vitali (mood, anxiety, energy, sleep) sono già integrati nei domini clinici appropriati.

### Fase 2: Aggiornare Schema Database
Aggiungere le colonne mancanti alle tabelle esistenti:

```text
daily_emotions:
  + disgust, surprise, serenity, pride, affection, curiosity

daily_psychology:
  + suicidal_ideation, hopelessness, self_harm_urges
  + dissociation, confusion, racing_thoughts
  + avoidance, social_withdrawal, compulsive_urges, procrastination
  + sense_of_purpose, life_satisfaction, perceived_social_support
  + emotional_regulation, resilience, mindfulness

daily_life_areas:
  + family, leisure, finances
```

### Fase 3: Riorganizzare Domini Clinici
Nuova struttura con 7 domini:

```text
1. STATO EMOTIVO (20 emozioni)
   - Base: joy, sadness, anger, fear, disgust, surprise
   - Espanse: hope, shame, guilt, pride, serenity, curiosity...

2. ATTIVAZIONE & AROUSAL (8 metriche)
   - anxiety, energy, nervousness, overwhelm, burnout, irritability
   - racing_thoughts, emotional_regulation

3. COGNITIVO (6 metriche)
   - mental_clarity, concentration, rumination, intrusive_thoughts
   - dissociation, confusion

4. COMPORTAMENTALE (4 metriche) [NUOVO]
   - avoidance, social_withdrawal, compulsive_urges, procrastination

5. SOMATICO (4 metriche)
   - sleep, somatic_tension, appetite_changes, sunlight_exposure

6. RISORSE PERSONALI (10 metriche)
   - self_efficacy, self_worth, gratitude, motivation, coping_ability
   - sense_of_purpose, life_satisfaction, perceived_social_support
   - resilience, mindfulness

7. AREE DI VITA (9 aree)
   - work, school, love, family, social, health, growth, leisure, finances

8. SICUREZZA (ALERT) [Speciale]
   - suicidal_ideation, hopelessness, self_harm_urges
   - Visualizzazione separata con indicatori di crisi
```

### Fase 4: Aggiornare clinicalDomains.ts
Riorganizzare completamente con le nuove metriche e domini.

### Fase 5: Aggiornare Edge Functions
Modificare `process-session` per estrarre le nuove metriche dalle conversazioni con Aria.

---

## Riepilogo Metriche Finali

| Dominio | Metriche Attuali | Nuove | Totale |
|---------|------------------|-------|--------|
| Emozioni | 14 | +6 | 20 |
| Attivazione | 6 | +2 | 8 |
| Cognitivo | 4 | +2 | 6 |
| Comportamentale | 0 | +4 | 4 |
| Somatico | 4 | 0 | 4 |
| Risorse | 7 | +5 | 12 |
| Aree di Vita | 6 | +3 | 9 |
| Sicurezza | 0 | +3 | 3 |
| **TOTALE** | **~40** | **+25** | **~66** |

---

## Note Tecniche

1. **VitalsSection**: Da rimuovere - i suoi valori (mood, anxiety, energy, sleep) sono già distribuiti nei domini appropriati

2. **Indicatori di Sicurezza**: Richiedono gestione speciale - quando `suicidal_ideation > 5` o `hopelessness > 7`, attivare alert e protocollo crisi esistente

3. **Retrocompatibilità**: Le nuove colonne saranno nullable, quindi i dati esistenti non saranno impattati

4. **AI Extraction**: L'edge function `process-session` dovrà essere aggiornata per riconoscere i nuovi segnali nelle conversazioni

