
# Piano: Fascia Età Unica + Obiettivi Scuola + Fix Visibilità Check-in

## 1. Fix Critico: Visibilità Check-in Non Funzionante

### Problema Identificato
La edge function `ai-checkins` usa una cache "fixed daily list" che rimane immutata per 24 ore. Quando l'utente cambia `checkin_visibility` da "daily" a "hidden", la cache non viene invalidata e l'obiettivo continua ad apparire.

### Soluzione
Invalidare la cache `ai_checkins_cache` ogni volta che viene modificata la visibilità di un obiettivo.

**File: `src/hooks/useObjectives.tsx`**
```typescript
// Nel updateObjective mutation, dopo il successo:
onSuccess: async (data, variables) => {
  queryClient.invalidateQueries({ queryKey: ['objectives'] });
  
  // Se è stata modificata la visibilità, invalida la cache check-in
  if ('checkin_visibility' in variables) {
    await supabase
      .from('user_profiles')
      .update({ ai_checkins_cache: null })
      .eq('user_id', user.id);
    
    // Refresh anche i check-in
    queryClient.invalidateQueries({ queryKey: ['smart-checkins'] });
  }
  // ... rest of toast logic
}
```

---

## 2. Fascia d'Età Unica per Minori

### Modifica
Unificare '13-14' e '15-17' in un'unica fascia "Minore di 18".

**File: `src/components/onboarding/AboutYouStep.tsx`**
```typescript
// DA:
const ageRanges = ['13-14', '15-17', '18-24', '25-34', '35-44', '45-54', '55+'];

// A:
const ageRanges = ['<18', '18-24', '25-34', '35-44', '45-54', '55+'];
```

### Aggiornamenti Correlati
- **ai-chat**: Aggiornare il rilevamento giovane per usare `'<18'`
- **ai-checkins**: Aggiornare logica età se necessario

---

## 3. Nuovi Obiettivi Scuola con Tracking Voti

### Nuovi Obiettivi da Aggiungere
**File: `src/lib/objectiveTypes.ts`**

```typescript
// === NUOVI OBIETTIVI SCUOLA ===

// Tracking media singole materie
subject_grade: {
  key: 'subject_grade',
  label: 'Voto materia specifica',
  emoji: '📊',
  category: 'study',
  description: 'Migliora il voto in una materia specifica',
  inputMethod: 'numeric',
  unit: 'voto',
  defaultTarget: 7,
  step: 0.5,
  min: 1,
  max: 10,
  requiresStartingValue: true,
  questionTemplate: 'Qual è il tuo voto attuale in questa materia?',
},

// Registro voti singoli (per tracciare ogni verifica)
track_test_grades: {
  key: 'track_test_grades',
  label: 'Registro verifiche',
  emoji: '📝',
  category: 'study',
  description: 'Tieni traccia dei voti delle verifiche',
  inputMethod: 'numeric',
  unit: 'voto',
  step: 0.5,
  min: 1,
  max: 10,
  questionTemplate: 'Che voto hai preso nell\'ultima verifica?',
},

// Obiettivo frequenza (giorni di presenza)
school_attendance: {
  key: 'school_attendance',
  label: 'Frequenza scolastica',
  emoji: '🏫',
  category: 'study',
  description: 'Migliora la tua frequenza a scuola',
  inputMethod: 'counter',
  unit: 'giorni',
  defaultTarget: 20,
  questionTemplate: 'Quanti giorni sei andato a scuola questo mese?',
},

// Studio quotidiano
daily_study_time: {
  key: 'daily_study_time',
  label: 'Tempo studio giornaliero',
  emoji: '⏱️',
  category: 'study',
  description: 'Studia un certo numero di ore al giorno',
  inputMethod: 'time_based',
  unit: 'min',
  defaultTarget: 60,
  linkedHabit: 'learning',
  questionTemplate: 'Quanto hai studiato oggi?',
},

// Compiti consegnati in tempo
assignments_on_time: {
  key: 'assignments_on_time',
  label: 'Consegne puntuali',
  emoji: '✅',
  category: 'study',
  description: 'Consegna i compiti entro la scadenza',
  inputMethod: 'counter',
  unit: 'consegne',
  defaultTarget: 10,
  questionTemplate: 'Quante consegne hai fatto in tempo?',
},

// Preparazione interrogazione
prepare_oral_exam: {
  key: 'prepare_oral_exam',
  label: 'Preparare interrogazione',
  emoji: '🎤',
  category: 'study',
  description: 'Prepararsi per un\'interrogazione',
  inputMethod: 'milestone',
  brainDetectable: true,
},

// Media fine quadrimestre
quarterly_average: {
  key: 'quarterly_average',
  label: 'Media quadrimestre',
  emoji: '📈',
  category: 'study',
  description: 'Raggiungi una certa media a fine quadrimestre',
  inputMethod: 'numeric',
  unit: 'media',
  defaultTarget: 7,
  step: 0.1,
  min: 4,
  max: 10,
  requiresStartingValue: true,
  questionTemplate: 'Qual è la tua media attuale del quadrimestre?',
},

// Debito scolastico
clear_school_debt: {
  key: 'clear_school_debt',
  label: 'Recuperare debito',
  emoji: '🔄',
  category: 'study',
  description: 'Recuperare un debito scolastico',
  inputMethod: 'milestone',
  brainDetectable: true,
},
```

---

## 4. Riepilogo Modifiche

| File | Modifica |
|------|----------|
| `src/hooks/useObjectives.tsx` | Invalidare cache check-in quando cambia visibilità |
| `src/components/onboarding/AboutYouStep.tsx` | Unificare fasce età in '<18' |
| `src/lib/objectiveTypes.ts` | Aggiungere 8 nuovi obiettivi scuola |
| `supabase/functions/ai-chat/index.ts` | Aggiornare rilevamento età per '<18' |

---

## Dettagli Tecnici

### Fix Cache Check-in
Il problema principale è che `ai-checkins` usa una cache "immutabile" per 24 ore:

```typescript
// ai-checkins/index.ts linea 243-256
if (existingCache?.cachedDate === today && existingCache?.fixedDailyList?.length > 0) {
  // Restituisce la lista FISSATA senza controllare le modifiche
  return new Response(JSON.stringify({ 
    checkins: existingCache.fixedDailyList,
    ...
  }));
}
```

Quando l'utente cambia `checkin_visibility` a "hidden", il database viene aggiornato ma la cache no. La soluzione è azzerare `ai_checkins_cache` nell'hook `useObjectives` quando viene modificata la visibilità.

### Nuova Fascia Età
La fascia '<18' sarà usata per:
1. Attivare il protocollo giovani di Aria
2. Mostrare "Scuola" invece di "Lavoro" nelle Life Areas
3. Prioritizzare obiettivi/abitudini scolastiche

### Obiettivi Scuola
I nuovi obiettivi coprono:
- **Tracking voti**: media generale, singole materie, verifiche
- **Frequenza**: giorni di presenza
- **Studio**: tempo giornaliero, compiti
- **Milestone**: interrogazioni, debiti, esami
