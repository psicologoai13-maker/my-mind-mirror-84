

# Revisione Completa Sezione Analisi 2026

## Problemi Attuali Identificati

1. **Parametri Vitali Statici** - Solo 4 metriche fisse (Umore, Ansia, Energia, Sonno), non adattivi all'utente
2. **Struttura Confusa** - Componenti ammassati senza gerarchia visiva chiara
3. **Nessuna Personalizzazione** - I grafici mostrati non dipendono dai dati effettivi dell'utente
4. **Libreria Grafici Limitata** - Pochi tipi di visualizzazione disponibili
5. **Design Datato** - Non allineato allo standard "Liquid Glass 2026"

---

## Piano di Implementazione

### Fase 1: Nuovo Sistema "Chart Library" Dinamico

Creeremo una libreria di grafici modulari che si attivano solo se l'utente ha dati rilevanti:

| Grafico | Categoria | Si attiva se... |
|---------|-----------|-----------------|
| Mood vs Ansia (Area) | Mente | Ha sessioni/checkin |
| Parametri Vitali (Grid) | Mente | Ha qualsiasi dato vitale |
| Spettro Emotivo (Radar) | Mente | Ha emozioni rilevate |
| Mix Emotivo (Bar) | Mente | Ha emozioni multiple |
| Psicologia Profonda (List) | Mente | Ha metriche psicologiche |
| Aree Vita (Radar) | Mente | Ha life areas compilate |
| Trend Peso (Line) | Corpo | Ha dati peso |
| Qualita Sonno (Bar) | Corpo | Ha ore sonno |
| Battito Cardiaco (Line) | Corpo | Ha dati heart rate |
| Attivita Fisica (Heatmap) | Corpo | Ha passi/calorie |
| Streak Abitudini (Cards) | Abitudini | Ha abitudini attive |
| Correlazioni AI (Insight) | Tutti | Ha dati cross-categoria |

### Fase 2: Nuova Architettura Parametri Vitali

**Prima (statico):**
```
[Umore] [Ansia] [Energia] [Sonno] - sempre 4, sempre questi
```

**Dopo (dinamico):**
```
L'AI seleziona i 4-6 parametri piu rilevanti per l'utente basandosi su:
- Obiettivi selezionati nell'onboarding
- Dati effettivamente tracciati
- Varianza/trend significativi
- Focus settimanale personale
```

Nuovi parametri disponibili:
- Concentrazione, Motivazione, Autostima (da daily_psychology)
- Ruminazione, Burnout, Tensione Somatica
- Gratitudine, Irritabilita, Solitudine

### Fase 3: Nuovo Layout Tab "Mente" 

```
+--------------------------------------------------+
|  [Header] Analisi - Il tuo wellness a 360        |
|  [Time Selector] Oggi | Settimana | Mese | Tutto |
+--------------------------------------------------+
|  [Tabs] 🧠 Mente | 💪 Corpo | 📊 Abitudini | 🎯  |
+--------------------------------------------------+

SEZIONE: SNAPSHOT VELOCE
+------------------------+------------------------+
|  📊 Wellness Score     |  🔥 Trend Settimanale  |
|  [Ring Chart + Score]  |  [Sparkline + Delta]   |
+------------------------+------------------------+

SEZIONE: PARAMETRI VITALI (Dinamici 4-6)
+------------------------+------------------------+
|  😌 Umore      7.2     |  ⚡ Energia    6.8     |
|  [Sparkline]  +0.5     |  [Sparkline]  -0.2     |
+------------------------+------------------------+
|  🧠 Chiarezza  8.1     |  💫 Autoefficacia 7.5  |
|  [Sparkline]  +1.2     |  [Sparkline]  stabile  |
+------------------------+------------------------+

SEZIONE: GRAFICI CORRELATI (Solo se dati presenti)
+--------------------------------------------------+
|  📈 Umore vs Ansia (ultimi 30 giorni)           |
|  [Area Chart con 2 linee sovrapposte]           |
+--------------------------------------------------+
+--------------------------------------------------+
|  🌈 Spettro Emotivo                              |
|  [Radar Chart con 5-10 emozioni]                 |
+--------------------------------------------------+
+--------------------------------------------------+
|  🧭 Aree della Vita                              |
|  [Pentagon Radar: Amore, Lavoro, Social...]      |
+--------------------------------------------------+

SEZIONE: PSICOLOGIA PROFONDA (Accordion)
+--------------------------------------------------+
|  🧠 Metriche Avanzate                    [AI]    |
|  +------------------------------------------+    |
|  |  🔄 Ruminazione        6/10    [expand]  |    |
|  |  🔥 Burnout            4/10    [expand]  |    |
|  |  💫 Autoefficacia      8/10    [expand]  |    |
|  +------------------------------------------+    |
+--------------------------------------------------+

SEZIONE: AI INSIGHTS (Premium)
+--------------------------------------------------+
|  ✨ Insight Personalizzato                       |
|  "Questa settimana la tua energia e correlata    |
|   positivamente con le ore di sonno..."          |
+--------------------------------------------------+
```

### Fase 4: Componenti Nuovi da Creare

1. **`DynamicVitalsGrid.tsx`** - Grid che mostra 4-6 parametri scelti dall'AI
2. **`ChartSelector.tsx`** - Sistema che decide quali grafici mostrare
3. **`CorrelationInsight.tsx`** - Card che mostra correlazioni tra metriche
4. **`EmotionalSpectrum.tsx`** - Radar con tutte le emozioni (primarie + secondarie)
5. **`WellnessSnapshot.tsx`** - Header con score + trend delta
6. **`AvailableChartsConfig.ts`** - Configurazione di tutti i grafici disponibili

### Fase 5: Logica di Selezione Grafici

```typescript
// Pseudo-codice della logica
function selectChartsForUser(userData) {
  const availableCharts = [];
  
  // Mente
  if (userData.hasVitals) availableCharts.push('vitals_grid');
  if (userData.hasSessions > 2) availableCharts.push('mood_anxiety_trend');
  if (userData.hasEmotions) availableCharts.push('emotional_spectrum');
  if (userData.hasLifeAreas) availableCharts.push('life_balance_radar');
  if (userData.hasPsychology) availableCharts.push('deep_psychology');
  
  // Corpo
  if (userData.hasWeight) availableCharts.push('weight_trend');
  if (userData.hasSleep) availableCharts.push('sleep_quality');
  if (userData.hasHeartRate) availableCharts.push('heart_rate_trend');
  if (userData.hasActivity) availableCharts.push('activity_heatmap');
  
  return availableCharts;
}
```

---

## Dettagli Tecnici

### File da Modificare
- `src/pages/Analisi.tsx` - Nuova architettura principale
- `src/components/analisi/AnalisiTabContent.tsx` - Nuovo layout Mente
- `src/components/analisi/VitalMetricCard.tsx` - Supporto metriche dinamiche

### File da Creare
- `src/lib/chartLibrary.ts` - Configurazione tutti grafici disponibili
- `src/components/analisi/DynamicVitalsGrid.tsx` - Grid parametri dinamici
- `src/components/analisi/WellnessSnapshot.tsx` - Header con score
- `src/components/analisi/EmotionalSpectrumRadar.tsx` - Radar emozioni completo
- `src/components/analisi/CorrelationCard.tsx` - Card insight correlazioni
- `src/hooks/useChartVisibility.tsx` - Hook che determina grafici visibili

### Hooks da Aggiornare
- `useAIAnalysis.tsx` - Aggiungere selezione dinamica parametri vitali

---

## Risultato Finale

**User Experience Migliorata:**
- Utente vede SOLO grafici rilevanti ai suoi dati
- Parametri vitali personalizzati (non sempre gli stessi 4)
- Design professionale e coerente con Liquid Glass 2026
- Gerarchia visiva chiara con sezioni ben definite
- Insight AI che collegano metriche diverse

**Scalabilita:**
- Facile aggiungere nuovi tipi di grafici
- Sistema modulare basato su configurazione
- Preparato per future integrazioni (Apple Health, etc.)

