

# Piano: Check-in Intelligenti e Focus Topics Clinici

## Problema Attuale

### Check-in
La selezione degli 8 check-in giornalieri è quasi casuale perche:
- NON considera quali dati mancano da giorni/settimane
- NON priorizza metriche critiche da monitorare
- Priorita statica (vitals=70, altri=50) invece che basata su necessita

### Focus Topics
Mostra solo 9 metriche hardcoded su ~66 disponibili:
- 5 emozioni base (joy, sadness, anger, fear, apathy)
- 4 psychology (rumination, burnout, gratitude, loneliness)

Ignora completamente hope (8/10), motivation (9/10), growth (9/10) che sono i veri focus dell'utente!

---

## Soluzione: Check-in con "Data Hunting"

### Nuova Logica di Selezione

```text
PRIORITA 1 - MONITORAGGIO CRITICO (sempre inclusi)
  - Safety indicators (hopelessness, suicidal_ideation) se mai rilevati
  - Ansia se storicamente > 6/10
  - Mood quotidiano (metrica base)

PRIORITA 2 - DATA HUNTING (dati mancanti)
  - Metriche MAI rilevate dal profilo = priorita massima
  - Metriche mancanti da >7 giorni = priorita alta
  - Metriche mancanti da >3 giorni = priorita media

PRIORITA 3 - BILANCIAMENTO CATEGORIE
  - Almeno 1-2 vitali (mood, anxiety, energy, sleep)
  - Almeno 1-2 life areas (work/school, social, health, love)
  - Almeno 1-2 psychology (basati su bisogni)
  - Habits attive dell'utente
```

### Implementazione Edge Function

Modificare `supabase/functions/ai-checkins/index.ts`:

1. **Nuova query storica** - Fetchare dati ultimi 14 giorni per calcolare:
   - Quali metriche non sono MAI state rilevate
   - Quali metriche mancano da X giorni
   - Quali metriche hanno valori critici da monitorare

2. **Scoring dinamico** per ogni metrica:
   - `+100` se mai rilevata
   - `+50` se mancante da >7 giorni
   - `+30` se mancante da >3 giorni  
   - `+40` se valore storico critico (ansia >6, hopelessness >4)
   - `+20` se vital base (mood)

3. **AI refinement** con contesto arricchito:
   - Passa all'AI quali metriche mancano e da quanto
   - L'AI sceglie bilanciando importanza clinica e necessita dati

---

## Soluzione: Focus Topics Clinici

### Nuova Logica

```text
FONTI DATI (tutte considerate):
  - 20 Emozioni (joy, hope, fear, curiosity, serenity, etc.)
  - 9 Life Areas (work, love, social, growth, etc.)
  - 12 Resources (motivation, self_efficacy, gratitude, etc.)
  - 8 Attention Signals (anxiety, rumination, burnout, etc.)

SELEZIONE TOP 4:
  1. Ordina TUTTE le metriche per intensita (valore piu alto)
  2. Prendi le top 4 con valore >= 5
  3. Etichetta ogni focus con categoria (emozione/area/risorsa/attenzione)
```

### Implementazione Component

Modificare `src/components/home/FocusTopics.tsx`:

1. **Espandere useTimeWeightedMetrics** per includere:
   - Nuove 6 emozioni (disgust, surprise, serenity, pride, affection, curiosity)
   - Nuove 3 life areas (family, leisure, finances)
   - Risorse positive (motivation, sense_of_purpose, resilience, etc.)

2. **Nuovo algoritmo di selezione**:
   - Raccoglie TUTTE le metriche con valore > 0
   - Le ordina per intensita
   - Mostra le top 4 con etichette colorate per tipo

3. **Visualizzazione migliorata**:
   - Emozioni positive = verde
   - Emozioni negative/attenzione = arancione/rosso
   - Life areas = blu
   - Risorse = viola

---

## File da Modificare

### 1. `supabase/functions/ai-checkins/index.ts`
- Aggiungere query storica per "data hunting"
- Implementare scoring dinamico
- Migliorare prompt AI con contesto dati mancanti
- Bilanciare categorie nella selezione finale

### 2. `src/components/home/FocusTopics.tsx`
- Espandere pool metriche considerate (da 9 a ~50)
- Includere life areas e risorse positive
- Aggiungere etichette categoria
- Migliorare visualizzazione con colori per tipo

### 3. `src/hooks/useTimeWeightedMetrics.tsx`
- Aggiungere le 6 nuove emozioni
- Aggiungere le 3 nuove life areas
- Aggiungere parametri risorse (motivation, sense_of_purpose, etc.)

---

## Esempio Risultato Atteso

### Check-in per l'utente attuale

Prima (casuale):
```
rumination, joy, burnout, social, sadness, anxiety, work, gratitude
```

Dopo (data-driven):
```
mood (vital base), anxiety (storico), love (mancante 5gg), 
health (mai rilevato), sleep (vital), family (mai rilevato),
motivation (conferma valore alto), finances (nuovo + obiettivo)
```

### Focus Topics per l'utente attuale

Prima (limitato):
```
gioia 5/10, gratitudine 6/10
```

Dopo (completo):
```
motivazione 9/10 (risorsa), speranza 8/10 (emozione), 
crescita 9/10 (area vita), curiosita 7/10 (emozione)
```

---

## Note Tecniche

- Le nuove colonne database (emotions, life areas, psychology) sono gia state aggiunte nelle migrazioni precedenti
- L'edge function `process-session` gia estrae tutte le 66 metriche
- Il hook `useTimeWeightedMetrics` va solo esteso per esporre le nuove metriche

