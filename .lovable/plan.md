

# Audit Completo Metriche Estratte - Verifica Semantica

## Riepilogo Metriche Totali: ~66

| Categoria | Quantità | Stato |
|-----------|----------|-------|
| Vitali | 4 | Da verificare |
| Emozioni | 20 | Da verificare |
| Aree Vita | 9 | Da verificare |
| Deep Psychology | 32 | Da verificare |

---

## 1. VITALI (4 metriche)

| Metrica | Regole Attuali | Stato | Problema |
|---------|----------------|-------|----------|
| `mood` | Nessuna regola esplicita nel prompt | ⚠️ VAGO | Mancano keywords specifiche |
| `anxiety` | Solo inferenza da "preoccupato, nervoso" nei goal | ⚠️ VAGO | Mancano regole nel prompt principale |
| `energy` | Solo inferenza da "stanco, carico" nei goal | ⚠️ VAGO | Mancano regole nel prompt principale |
| `sleep` | Solo inferenza se obiettivo attivo | ⚠️ VAGO | Mancano regole nel prompt principale |

**Problema:** I VITALI non hanno regole semantiche dedicate nel prompt principale, solo nelle istruzioni per obiettivi. Questo potrebbe causare punteggi inconsistenti.

---

## 2. EMOZIONI BASE EKMAN (7 metriche)

| Emozione | Regole | Stato | Problema |
|----------|--------|-------|----------|
| `joy` | Nessuna regola esplicita | ❌ MANCA | Potrebbe essere inventata |
| `sadness` | Solo inferenza da mood basso | ⚠️ DEBOLE | Dovrebbe avere keywords |
| `anger` | Nessuna regola esplicita | ❌ MANCA | Zero keywords |
| `fear` | Solo correlazione con anxiety | ⚠️ DEBOLE | Dovrebbe avere keywords |
| `apathy` | "non sento niente", "vuoto" | ✅ OK | Regola presente |
| `disgust` | "mi fa schifo", "ripugnante" | ✅ OK | Regola presente |
| `surprise` | "non me l'aspettavo!", "incredibile" | ✅ OK | Regola presente |

---

## 3. EMOZIONI SECONDARIE (9 metriche)

| Emozione | Regole | Stato | Problema |
|----------|--------|-------|----------|
| `shame` | Nessuna regola esplicita | ❌ MANCA | Zero keywords |
| `jealousy` | Nessuna regola esplicita | ❌ MANCA | Zero keywords |
| `hope` | Nessuna regola esplicita | ❌ MANCA | Zero keywords |
| `frustration` | Solo correlazione con burnout | ⚠️ DEBOLE | Dovrebbe avere keywords |
| `nostalgia` | Solo correlazione con loneliness | ⚠️ DEBOLE | Dovrebbe avere keywords |
| `nervousness` | "sono nervoso", "agitato" | ✅ OK | Regola presente |
| `overwhelm` | "mi sento sopraffatto", "è troppo" | ✅ OK | Regola presente |
| `excitement` | "sono elettrizzato", "non vedo l'ora" | ✅ OK | Regola presente |
| `disappointment` | "sono deluso", "mi aspettavo di più" | ✅ OK | Regola presente |

---

## 4. EMOZIONI POSITIVE ESTESE (4 metriche)

| Emozione | Regole | Stato | Problema |
|----------|--------|-------|----------|
| `serenity` | "in pace", "sereno", "tranquillo" | ✅ OK | Regola presente |
| `pride` | "fiero di me", "ce l'ho fatta!" | ✅ OK | Regola presente |
| `affection` | "voglio bene", "mi sta a cuore" | ✅ OK | Regola presente |
| `curiosity` | "mi incuriosisce", "vorrei sapere" | ✅ OK | Regola presente |

---

## 5. AREE VITA (9 metriche)

| Area | Regole | Stato | Problema |
|------|--------|-------|----------|
| `work` | Keywords complete | ✅ OK | - |
| `school` | Keywords complete | ✅ OK | - |
| `love` | Keywords complete | ✅ OK | - |
| `family` | Keywords complete | ✅ OK | - |
| `health` | Keywords + regole strette | ✅ OK | - |
| `social` | Keywords complete | ✅ OK | - |
| `growth` | Keywords complete | ✅ OK | - |
| `leisure` | Keywords complete | ✅ OK | - |
| `finances` | Keywords complete | ✅ OK | - |

---

## 6. DEEP PSYCHOLOGY - COGNITIVI (6 metriche)

| Metrica | Regole | Stato | Problema |
|---------|--------|-------|----------|
| `rumination` | "Non riesco a smettere di pensare" | ✅ OK | - |
| `self_efficacy` | "ce la posso fare" vs "non sono capace" | ✅ OK | - |
| `mental_clarity` | "ho le idee chiare" vs "confuso" | ✅ OK | - |
| `concentration` | "riesco a concentrarmi" vs "mi distraggo" | ✅ OK | - |
| `dissociation` | "distaccato dalla realtà" | ✅ OK | - |
| `confusion` | "sono confuso", "nebbia" | ✅ OK | - |

---

## 7. DEEP PSYCHOLOGY - ATTIVAZIONE (4 metriche)

| Metrica | Regole | Stato | Problema |
|---------|--------|-------|----------|
| `burnout_level` | "esausto", "svuotato" + legato a lavoro | ✅ OK | - |
| `irritability` | "mi dà fastidio", "irascibile" | ✅ OK | - |
| `racing_thoughts` | "pensieri che corrono" | ✅ OK | - |
| `emotional_regulation` | "esplodo" vs "riesco a gestire" | ✅ OK | - |

---

## 8. DEEP PSYCHOLOGY - COMPORTAMENTALI (4 metriche)

| Metrica | Regole | Stato | Problema |
|---------|--------|-------|----------|
| `avoidance` | "evito", "non voglio affrontare" | ✅ OK | - |
| `social_withdrawal` | "non esco più", "mi isolo" | ✅ OK | - |
| `compulsive_urges` | "devo assolutamente", "impulso" | ✅ OK | - |
| `procrastination` | "rimando", "lo farò domani" | ✅ OK | - |

---

## 9. DEEP PSYCHOLOGY - FISIOLOGICI (3 metriche)

| Metrica | Regole | Stato | Problema |
|---------|--------|-------|----------|
| `somatic_tension` | "peso sul petto", "tensione muscolare" | ✅ OK | - |
| `appetite_changes` | "non mangio", "fame nervosa" | ✅ OK | - |
| `sunlight_exposure` | Regole strette anti-hallucination | ✅ OK | Corretto |

---

## 10. DEEP PSYCHOLOGY - EMOTIVI (6 metriche)

| Metrica | Regole | Stato | Problema |
|---------|--------|-------|----------|
| `guilt` | "è colpa mia", "avrei dovuto" | ✅ OK | - |
| `gratitude` | "sono grato", "fortunato" | ✅ OK | - |
| `motivation` | "sono motivato" vs "non ho voglia" | ✅ OK | - |
| `intrusive_thoughts` | "pensiero che torna", "ossessione" | ✅ OK | - |
| `self_worth` | "mi sento inutile" vs "sono fiero" | ✅ OK | - |
| `coping_ability` | "riesco a gestire" vs "sopraffatto" | ✅ OK | - |

---

## 11. DEEP PSYCHOLOGY - RISORSE (6 metriche)

| Metrica | Regole | Stato | Problema |
|---------|--------|-------|----------|
| `sense_of_purpose` | "ho uno scopo" vs "senza scopo" | ✅ OK | - |
| `life_satisfaction` | "sono soddisfatto" vs "insoddisfatto" | ✅ OK | - |
| `perceived_social_support` | "ho persone su cui contare" vs "solo" | ✅ OK | - |
| `resilience` | "mi rialzo sempre" vs "crollo" | ✅ OK | - |
| `mindfulness` | "vivo nel presente" vs "perso nei pensieri" | ✅ OK | - |
| `loneliness_perceived` | "mi sento solo anche tra la gente" | ✅ OK | - |

---

## 12. DEEP PSYCHOLOGY - SICUREZZA (3 metriche)

| Metrica | Regole | Stato | Problema |
|---------|--------|-------|----------|
| `suicidal_ideation` | "non voglio più vivere" | ✅ OK | Alert se > 5 |
| `hopelessness` | "non cambierà mai niente" | ✅ OK | Alert se > 7 |
| `self_harm_urges` | "voglia di farmi del male" | ✅ OK | Alert se > 5 |

---

## PROBLEMI CRITICI IDENTIFICATI

### Metriche SENZA regole semantiche (alto rischio hallucination):

| Metrica | Categoria | Azione Richiesta |
|---------|-----------|------------------|
| `mood` | Vitali | Aggiungere keywords |
| `anxiety` | Vitali | Aggiungere keywords |
| `energy` | Vitali | Aggiungere keywords |
| `sleep` | Vitali | Aggiungere keywords |
| `joy` | Emozioni | Aggiungere keywords |
| `sadness` | Emozioni | Aggiungere keywords |
| `anger` | Emozioni | Aggiungere keywords |
| `fear` | Emozioni | Aggiungere keywords |
| `shame` | Emozioni | Aggiungere keywords |
| `jealousy` | Emozioni | Aggiungere keywords |
| `hope` | Emozioni | Aggiungere keywords |
| `frustration` | Emozioni | Aggiungere keywords |
| `nostalgia` | Emozioni | Aggiungere keywords |

**Totale metriche a rischio: 13 su 66 (~20%)**

---

## Piano di Correzione

### Modifiche a `process-session/index.ts`:

```text
Aggiungere NUOVA sezione dopo dataHunterLifeAreas:

═══════════════════════════════════════════════
💓 VITALI - REGOLE SEMANTICHE (OBBLIGATORIE!)
═══════════════════════════════════════════════

**mood** (umore generale 1-10):
- BASSO (1-4): "mi sento giù", "triste", "depresso", "abbattuto", "giornata nera", "umore a terra"
- MEDIO (5-6): "così così", "normale", "né bene né male", "meh"
- ALTO (7-10): "mi sento bene", "felice", "contento", "ottimo umore", "alla grande"
- Se NON menzionato esplicitamente → null

**anxiety** (ansia 1-10):
- ALTA (7-10): "sono in ansia", "preoccupato", "agitato", "nervoso", "pensieri che girano", "non riesco a calmarmi"
- MEDIA (4-6): "un po' teso", "leggermente preoccupato"
- BASSA (1-3): "tranquillo", "sereno", "rilassato", "calmo"
- Se NON menzionato → null

**energy** (energia 1-10):
- BASSA (1-4): "sono stanco", "esausto", "senza forze", "spossato", "zero energie", "morto"
- MEDIA (5-6): "normale", "ok"
- ALTA (7-10): "pieno di energia", "carico", "attivo", "dinamico", "in forma"
- ATTENZIONE: Distingui tra stanchezza FISICA ed EMOTIVA
- Se NON menzionato → null

**sleep** (qualità sonno 1-10):
- SCARSO (1-4): "dormito male", "insonnia", "sveglio alle 3", "incubi", "non dormo"
- MEDIO (5-6): "dormito ok", "abbastanza"
- BUONO (7-10): "dormito benissimo", "riposato", "8 ore filate"
- ⚠️ SOLO se l'utente PARLA del sonno! Non inferire da stanchezza.
- Se NON menzionato → null

═══════════════════════════════════════════════
😊 EMOZIONI BASE - REGOLE SEMANTICHE
═══════════════════════════════════════════════

**joy** (gioia 0-10):
- RILEVA: "sono felice", "contento", "gioioso", "che bello!", "fantastico", "entusiasta", "evviva"
- ALTA (7-10): espressioni esplicite di felicità
- MEDIA (4-6): contentezza moderata, soddisfazione
- Se NON espressa → 0 (default per emozioni)

**sadness** (tristezza 0-10):
- RILEVA: "sono triste", "mi sento giù", "abbattuto", "sconsolato", "voglia di piangere", "malinconico"
- ALTA (7-10): pianto, disperazione
- MEDIA (4-6): malinconia, giù di morale
- Se NON espressa → 0

**anger** (rabbia 0-10):
- RILEVA: "sono arrabbiato", "furioso", "incazzato", "mi ha fatto arrabbiare", "sono furente"
- ALTA (7-10): rabbia esplicita, sfogo
- MEDIA (4-6): irritazione, fastidio
- Se NON espressa → 0

**fear** (paura 0-10):
- RILEVA: "ho paura", "sono terrorizzato", "mi spaventa", "timore", "mi terrorizza"
- ALTA (7-10): paura esplicita, terrore
- MEDIA (4-6): preoccupazione, apprensione
- Se NON espressa → 0

**shame** (vergogna 0-10):
- RILEVA: "mi vergogno", "che figura", "imbarazzato", "vorrei sparire", "che vergogna"
- Se NON espressa → 0

**jealousy** (gelosia 0-10):
- RILEVA: "sono geloso", "invidio", "lui/lei ha tutto", "perché a me no", "non è giusto"
- Se NON espressa → 0

**hope** (speranza 0-10):
- RILEVA: "spero", "forse andrà bene", "ho fiducia", "ottimista", "ce la faremo"
- Se NON espressa → 0

**frustration** (frustrazione 0-10):
- RILEVA: "che frustrazione", "non ce la faccio", "bloccato", "impantanato", "non funziona niente"
- Se NON espressa → 0

**nostalgia** (nostalgia 0-10):
- RILEVA: "mi manca", "bei tempi", "una volta", "rimpiango", "nostalgia di"
- Se NON espressa → 0
```

---

## Risultato Atteso

Dopo questa implementazione:
- **66 metriche** avranno regole semantiche complete
- **0 metriche** rimarranno senza keywords di riferimento
- Ogni metrica seguirà la regola: **"Se NON menzionato → null/0"**
- Riduzione drastica delle hallucinations

## File da Modificare

| File | Modifica |
|------|----------|
| `supabase/functions/process-session/index.ts` | Aggiungere sezione VITALI + EMOZIONI BASE con regole semantiche |

