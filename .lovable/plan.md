
# Piano: Miglioramento Robustezza e Qualità Risposte di Aria

## ✅ COMPLETATO

### Modifiche Implementate:

#### 1. `supabase/functions/ai-chat/index.ts` ✅
- **REGOLE D'ORO** aggiunte in CIMA al prompt (max priorità)
- **DIVIETI ASSOLUTI** con lista chiara di cosa NON fare
- **CHECKLIST PRE-RISPOSTA** per auto-verifica
- Prompt condensato e riorganizzato per priorità
- Sezione obiettivi semplificata

#### 2. `supabase/functions/process-session/index.ts` ✅
- Migliorata estrazione `starting_value` per obiettivi body/finance
- Aggiunta logica per inferire starting_value dal contesto
- `ai_feedback` più specifico quando manca target O starting_value
- Formato migliorato per `custom_objectives_detected`

#### 3. `src/components/objectives/ObjectiveCard.tsx` ✅
- Rimosso "Parla con Aria per definirlo!"
- Aggiunto **bottone "Definisci traguardi"** per input manuale
- Messaggio area gialla più chiaro

#### 4. `src/components/objectives/TargetInputDialog.tsx` ✅ (NUOVO)
- Dialog per inserire manualmente starting_value e target_value
- UI semplice e mobile-friendly

---

## Risultato Atteso

Dopo queste modifiche:
1. ✅ Aria risponderà in modo più **breve e pertinente**
2. ✅ Non andrà più **off-topic** grazie alle regole in cima
3. ✅ Gli obiettivi saranno creati con **starting_value**
4. ✅ L'utente può **definire target manualmente** 
5. ✅ Il prompt ha priorità chiare (REGOLE D'ORO prima di tutto)
