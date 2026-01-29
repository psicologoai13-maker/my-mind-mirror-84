# Piano: Fix Habits - COMPLETATO ✅

## Implementazioni Completate

### 1. ✅ HABIT_ALIASES per retrocompatibilità
- Mappatura nomi varianti: `no_smoking` → `cigarettes`, `social_time` → `social_media`, etc.
- Funzione `getHabitMeta()` con risoluzione alias

### 2. ✅ Range inputMethod per sigarette
- Nuovo tipo `range` con opzioni preimpostate: 0, 1-5, 6-10, 11-20, 20+
- UI con bottoni per selezione rapida

### 3. ✅ Flag requiresExternalSync
- Habits che richiedono dati esterni (passi, battito, social_time) nascoste su web
- `webFallback` per esercizio → toggle "Hai fatto esercizio oggi?"

### 4. ✅ HabitCard aggiornato
- Nuovo `RangeInput` component
- Usa `getHabitMeta()` per alias resolution
- Messaggio per habits che richiedono sync nativo

### 5. ✅ SmartCheckinSection aggiornato
- Supporto per responseType `range`
- Handler `handleRangeSubmit`

### 6. ✅ Edge function ai-checkins aggiornata
- Filtro `shouldShowHabitOnWeb()`
- Risoluzione alias con `resolveHabitType()`
- Metadata aggiornati per sigarette con rangeOptions

## Risultato
| Prima | Dopo |
|-------|------|
| social_time con 📊 e +/- | Nascosto (richiede sync esterno) |
| no_smoking con counter | Range: 0, 1-5, 6-10, 11-20, 20+ |
| Esercizio con timer | Toggle "Hai fatto esercizio?" |
| Icone fallback 📊 | Alias resolution + icone corrette |
