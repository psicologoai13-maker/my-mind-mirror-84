

# Fix: Aria non ricorda - long_term_memory non caricata

## Problema identificato

La funzione `elevenlabs-context` carica il contesto utente con 12 query parallele, ma nella query del profilo (`user_profiles`) manca il campo `long_term_memory`.

**Dati reali dal database:**
- `user_profiles.long_term_memory`: **34 ricordi** (viaggi a Madrid/Rio, lavoro, hobby, persone, etc.)
- `user_memories` (tabella strutturata): solo **2 ricordi** ("Simo", "Viaggio a Rio")

Aria vede solo 2 fatti invece di 34+. Ecco perche' non ricorda nulla.

## Causa tecnica

File `supabase/functions/elevenlabs-context/index.ts`, linea 584:

```text
ATTUALE (ROTTO):
.select('name, selected_goals, occupation_context, gender, birth_date, therapy_status, onboarding_answers')

MANCA: long_term_memory
```

Il campo `long_term_memory` non viene mai caricato, quindi alla linea 366 il check `ctx.profile.long_term_memory?.length > 0` e' sempre false (perche' il campo non esiste nel risultato).

Successivamente, alla linea 650, `long_term_memory` viene sovrascritto con `formattedMemory` (solo 2 voci dalla tabella strutturata), perdendo completamente i 34 ricordi legacy.

## Soluzione

### File: `supabase/functions/elevenlabs-context/index.ts`

1. **Aggiungere `long_term_memory` alla query del profilo** (linea 584):
   - Aggiungere il campo nella select: `'name, long_term_memory, selected_goals, ...'`

2. **Unire le due fonti di memoria** (dopo linea 620):
   - Caricare i ricordi legacy da `profile.long_term_memory` (34 voci)
   - Caricare i ricordi strutturati da `user_memories` (2 voci)
   - Unirli senza duplicati, dando priorita' ai tag strutturati
   - Limitare a 50-60 totali per non sovraccaricare il prompt

3. **Risultato atteso**: Aria vedra' tutti i 34+ ricordi (viaggi, lavoro, hobby, persone) piu' i 2 strutturati, per un totale di circa 36 fatti nel contesto.

Questa e' una fix chirurgica: una riga nella query e qualche riga per il merge delle memorie.
