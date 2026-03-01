# ARIA AUDIT — PARTE 4: DATABASE E GAP RILEVATI

> Data analisi: 28 Febbraio 2026
> Branch: `claude/aria-functions-audit-o0F3N`
> Migrazioni analizzate: 66 file SQL
> Funzioni PL/pgSQL: 20 (distinte, versione finale)
> Trigger: 36

---

## SEZIONE A: FUNZIONI E TRIGGER PL/pgSQL

---

### 1. handle_new_user()

**Tipo:** TRIGGER FUNCTION
**Tabella:** `auth.users` → scrive su `user_profiles`
**Migrazione:** `20251224153218_*.sql`
**Trigger:** `on_auth_user_created` — AFTER INSERT ON `auth.users`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email)
  );
  RETURN NEW;
END;
$$;
```

**Problemi:**
1. **Non crea ruolo** — Non inserisce in `user_roles`. Il ruolo viene creato dal client, se lo fa
2. **Non genera connection_code** — Dipende dal trigger `set_connection_code` che esiste separatamente
3. **SECURITY DEFINER** — Corretto per scrivere su tabella con RLS
4. **raw_user_meta_data typo-resilient** — Se il campo non esiste, usa email come nome

---

### 2. has_role(UUID, app_role)

**Tipo:** FUNCTION (query)
**Tabella:** `user_roles`
**Migrazione:** `20251226031723_*.sql`

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

**Problemi:**
1. **Usata nelle RLS policies** — Se lenta, rallenta TUTTE le query con RLS dei dottori
2. **Nessun indice esplicito** — UNIQUE(user_id, role) serve ma potrebbe non bastare per grandi volumi

---

### 3. get_user_role(UUID)

**Tipo:** FUNCTION (query)
**Tabella:** `user_roles`
**Migrazione:** `20251226031723_*.sql`

```sql
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id LIMIT 1
$$;
```

**Problemi:**
1. **LIMIT 1 senza ORDER BY** — Se un utente ha più ruoli, restituisce risultato non deterministico
2. **Non usata nel codice edge functions** — L'app verifica i ruoli direttamente via query

---

### 4. generate_connection_code()

**Tipo:** FUNCTION (utility)
**Tabella:** Nessuna (genera codice)
**Migrazione:** `20251226031723_*.sql`

```sql
CREATE OR REPLACE FUNCTION public.generate_connection_code()
RETURNS VARCHAR(8)
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(8) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;
```

**Problemi:**
1. **Nessun check unicità** — Se genera codice duplicato, il UNIQUE constraint fa fallire l'INSERT
2. **Nessun retry loop** — In caso di collisione, errore non gestito
3. **NO SECURITY DEFINER** — Non necessario qui ma inconsistente con le altre
4. **Set di 31 caratteri, 8 posizioni** — 31^8 = ~852 miliardi, collisione improbabile ma non impossibile

---

### 5. set_connection_code()

**Tipo:** TRIGGER FUNCTION
**Tabella:** `user_profiles`
**Trigger:** `trigger_set_connection_code` — BEFORE INSERT ON `user_profiles`
**Migrazione:** `20251226031723_*.sql`

```sql
CREATE OR REPLACE FUNCTION public.set_connection_code()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.connection_code IS NULL THEN
    NEW.connection_code := public.generate_connection_code();
  END IF;
  RETURN NEW;
END;
$$;
```

**Problemi:**
1. **Solo su INSERT** — Se un utente ha connection_code NULL per qualche motivo, non viene rigenerato su UPDATE

---

### 6. find_patient_by_code(VARCHAR)

**Tipo:** FUNCTION (query)
**Tabella:** `user_profiles` JOIN `user_roles`
**Migrazione:** `20251226184046_*.sql` (versione aggiornata)

```sql
CREATE OR REPLACE FUNCTION public.find_patient_by_code(_code character varying)
RETURNS TABLE(user_id uuid, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT up.user_id, up.name
  FROM public.user_profiles up
  LEFT JOIN public.user_roles ur ON up.user_id = ur.user_id
  WHERE up.connection_code = UPPER(_code)
    AND (ur.role = 'patient' OR ur.role IS NULL)
$$;
```

**Problemi:**
1. **LEFT JOIN permissivo** — Utenti senza ruolo (ur.role IS NULL) trattati come pazienti
2. **Nessun check su chi chiama** — SECURITY DEFINER senza verificare che sia un dottore
3. **Espone nome utente** — Chiunque con un codice può vedere il nome del paziente

---

### 7. update_daily_tables_timestamp()

**Tipo:** TRIGGER FUNCTION (generica)
**Tabelle:** Usata su 7 tabelle: daily_emotions, daily_life_areas, daily_habits, body_metrics, user_habits_config, user_objectives, user_events
**Migrazione:** `20260122202425_*.sql`

```sql
CREATE OR REPLACE FUNCTION public.update_daily_tables_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
```

**Problemi:**
1. **Nessun problema** — Funzione semplice e corretta. Riutilizzata su molte tabelle.

---

### 8. update_user_data_change_timestamp()

**Tipo:** TRIGGER FUNCTION (cache invalidation)
**Tabelle:** Scattata su 10+ tabelle: daily_checkins, sessions, daily_emotions, daily_life_areas, daily_psychology, body_metrics, daily_habits, user_objectives, healthkit_data
**Migrazione:** `20260125222823_*.sql`

```sql
CREATE OR REPLACE FUNCTION public.update_user_data_change_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET last_data_change_at = now()
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Problemi:**
1. **Trigger su 10+ tabelle** — Ogni INSERT/UPDATE su qualsiasi tabella dati aggiorna user_profiles → hot spot di scrittura
2. **N trigger simultanei** — Se process-session scrive su 10 tabelle, questo trigger scatta 10 volte con 10 UPDATE su user_profiles
3. **DELETE non gestito** — `NEW.user_id` è NULL su DELETE ma `COALESCE(NEW.user_id, OLD.user_id)` gestisce. Tuttavia, il trigger è definito solo su INSERT OR UPDATE (non DELETE) tranne per user_objectives
4. **Performance** — Ogni modifica dati = query extra su user_profiles

---

### 9. generate_referral_code()

**Tipo:** FUNCTION (utility)
**Migrazione:** `20260128002119_*.sql`

```sql
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;
```

**Problemi:**
1. **Duplicazione codice** — Stessa logica di `generate_connection_code()` ma con 6 caratteri invece di 8
2. **Spazio collisione ridotto** — 31^6 = ~887 milioni. Molto più piccolo di connection_code
3. **Stessi problemi di unicità** — Nessun retry su collisione

---

### 10. set_referral_code()

**Tipo:** TRIGGER FUNCTION
**Tabella:** `user_profiles`
**Trigger:** `trigger_set_referral_code` — BEFORE INSERT ON `user_profiles`
**Migrazione:** `20260128002119_*.sql`

```sql
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;
```

**Problemi:**
1. **Stessi problemi di `set_connection_code()`**
2. **Due BEFORE INSERT trigger su user_profiles** — Ordine di esecuzione non garantito

---

### 11. add_reward_points(UUID, INTEGER)

**Tipo:** FUNCTION (write)
**Tabella:** `user_reward_points`
**Migrazione:** `20260128002119_*.sql`

```sql
CREATE OR REPLACE FUNCTION add_reward_points(p_user_id UUID, p_points INTEGER)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO user_reward_points (user_id, total_points, lifetime_points)
  VALUES (p_user_id, p_points, GREATEST(p_points, 0))
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_reward_points.total_points + p_points,
    lifetime_points = user_reward_points.lifetime_points + GREATEST(p_points, 0),
    updated_at = now();
END;
$$;
```

**Problemi:**
1. **Nessuna transazione log** — Non inserisce in `reward_transactions`. Chiamanti devono farlo separatamente
2. **total_points può andare negativo** — Nessun CHECK constraint. Se `redeem-points` deduce troppo: saldo negativo
3. **UPSERT atomico** — Questo è corretto e thread-safe grazie a ON CONFLICT

---

### 12. get_daily_metrics(UUID, DATE)

**Tipo:** FUNCTION (query complessa)
**Tabella:** Legge da 5 tabelle: daily_checkins, sessions, daily_emotions, daily_life_areas, daily_psychology
**Migrazione:** `20260204023046_*.sql` (versione finale, ridefinita 10+ volte)

```sql
-- Funzione troppo lunga (296 righe) — vedi migrazione completa
-- Aggrega metriche giornaliere da multiple tabelle in un unico JSON
-- Include 4 vitali, 20 emozioni, 9 aree di vita, 31 metriche psicologiche
-- Priorità: checkin > sessions per mood
-- Fallback energy: energy_score_detected → life_balance_scores.energy
```

**Problemi:**
1. **Ridefinita 10+ volte** — Stessa funzione in 10 migrazioni diverse. Ultima vince ma confusione enorme
2. **296 righe di SQL monolitico** — Impossibile da testare unitariamente
3. **Timezone hardcoded** — `AT TIME ZONE 'Europe/Rome'` — non funziona per utenti fuori Italia
4. **MAX aggregation** — Usa MAX() per unire più record dello stesso giorno. Se un'emozione è 8 al mattino e 2 alla sera, riporta solo 8
5. **COALESCE inconsistente** — Vitali base (joy, sadness, anger, fear, apathy) COALESCE a 0, estensioni (shame, jealousy, etc.) restano NULL
6. **`v_has_emotions` check parziale** — Controlla solo 5 emozioni base per determinare se ci sono emozioni, ignorando le 15 estese
7. **update_user_level BUG** — Nella funzione correlata, `WHERE id = NEW.user_id` dovrebbe essere `WHERE user_id = NEW.user_id`

---

### 13. update_correlation_timestamp()

**Tipo:** TRIGGER FUNCTION
**Tabella:** `user_correlations`
**Trigger:** `update_user_correlations_timestamp` — BEFORE UPDATE
**Migrazione:** `20260208204800_*.sql`

```sql
CREATE OR REPLACE FUNCTION public.update_correlation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
```

**Problemi:** Nessuno — duplica logica di `update_daily_tables_timestamp()`. Poteva riutilizzare quella.

---

### 14. update_habit_streak()

**Tipo:** TRIGGER FUNCTION
**Tabella:** `daily_habits` → `habit_streaks`
**Trigger:** `update_streak_on_habit_completion` — AFTER INSERT ON `daily_habits`
**Migrazione:** `20260208204800_*.sql`

```sql
CREATE OR REPLACE FUNCTION public.update_habit_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_last_date date;
  v_current_streak int;
  v_longest_streak int;
  v_broken_count int;
  v_total int;
BEGIN
  SELECT last_completion_date, current_streak, longest_streak, streak_broken_count, total_completions
  INTO v_last_date, v_current_streak, v_longest_streak, v_broken_count, v_total
  FROM public.habit_streaks
  WHERE user_id = NEW.user_id AND habit_type = NEW.habit_type;

  IF NOT FOUND THEN
    INSERT INTO public.habit_streaks (user_id, habit_type, current_streak, longest_streak, last_completion_date, total_completions)
    VALUES (NEW.user_id, NEW.habit_type, 1, 1, NEW.date, 1);
  ELSE
    IF NEW.date = v_last_date + 1 THEN
      v_current_streak := v_current_streak + 1;
      IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
      END IF;
    ELSIF NEW.date > v_last_date + 1 THEN
      v_current_streak := 1;
      v_broken_count := v_broken_count + 1;
    ELSIF NEW.date = v_last_date THEN
      NULL; -- Same day
    END IF;

    UPDATE public.habit_streaks
    SET current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_completion_date = GREATEST(v_last_date, NEW.date),
        streak_broken_count = v_broken_count,
        total_completions = v_total + 1,
        updated_at = now()
    WHERE user_id = NEW.user_id AND habit_type = NEW.habit_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Problemi:**
1. **Race condition** — SELECT + UPDATE non atomico. Due INSERT simultanei possono leggere stessa streak e aggiornarla in modo errato
2. **Incrementa total_completions anche su same day** — La condizione `v_last_date = NEW.date` fa NULL (skip streak update) ma il total_completions è sempre incrementato (UPDATE eseguito comunque)
3. **Data passata** — Se si inserisce un record per una data passata (es. ieri), il calcolo streak è errato: `NEW.date < v_last_date` non è gestito
4. **Solo INSERT** — Il trigger è solo su INSERT, non su UPDATE o DELETE. Se si modifica una data, la streak non viene ricalcolata

---

### 15. calculate_user_level(UUID)

**Tipo:** FUNCTION (query)
**Tabella:** `user_reward_points`, `gamification_levels`
**Migrazione:** `20260227130003_gamification_v2.sql`

```sql
CREATE OR REPLACE FUNCTION public.calculate_user_level(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total_points INTEGER;
  v_level INTEGER;
BEGIN
  SELECT COALESCE(total_points, 0) INTO v_total_points
  FROM public.user_reward_points WHERE user_id = p_user_id;

  IF v_total_points IS NULL THEN RETURN 1; END IF;

  SELECT COALESCE(MAX(level), 1) INTO v_level
  FROM public.gamification_levels
  WHERE points_required <= v_total_points;

  RETURN v_level;
END;
$$;
```

**Problemi:**
1. **Usa total_points non lifetime_points** — Il livello si basa sui punti spendibili, non su quelli guadagnati in totale. Riscattando premium, il livello SCENDE
2. **Dovrebbe usare lifetime_points** — Per evitare che spendere punti faccia scendere di livello

---

### 16. update_user_level_on_points_change()

**Tipo:** TRIGGER FUNCTION
**Tabella:** `user_reward_points` → `user_profiles`
**Trigger:** `trigger_update_user_level` — AFTER INSERT OR UPDATE ON `user_reward_points`
**Migrazione:** `20260227130003_gamification_v2.sql`

```sql
CREATE OR REPLACE FUNCTION public.update_user_level_on_points_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_new_level INTEGER;
BEGIN
  v_new_level := public.calculate_user_level(NEW.user_id);
  UPDATE public.user_profiles SET current_level = v_new_level
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;
```

**Problemi:**
1. **BUG CRITICO: `WHERE id = NEW.user_id`** — Dovrebbe essere `WHERE user_id = NEW.user_id`. La colonna `id` di user_profiles è l'UUID interno del profilo, NON lo user_id di auth. Questo UPDATE non matcherà mai nessun record (o matcherà il record sbagliato per coincidenza UUID)
2. **Livello scende** — Poiché usa `calculate_user_level` che legge `total_points`, il livello può scendere quando l'utente spende punti

---

### 17. award_exercise_points()

**Tipo:** TRIGGER FUNCTION
**Tabella:** `user_exercise_sessions` + `exercises`
**Trigger:** `trigger_award_exercise_points` — BEFORE INSERT ON `user_exercise_sessions`
**Migrazione:** `20260227130002_user_exercise_sessions.sql`

```sql
CREATE OR REPLACE FUNCTION public.award_exercise_points()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_points INTEGER;
BEGIN
  SELECT points_reward INTO v_points FROM public.exercises WHERE id = NEW.exercise_id;
  IF v_points IS NOT NULL AND v_points > 0 THEN
    NEW.points_awarded := v_points;
    PERFORM public.add_reward_points(NEW.user_id, v_points);
  END IF;
  RETURN NEW;
END;
$$;
```

**Problemi:**
1. **BEFORE INSERT modifica NEW** — Corretto per settare `points_awarded`, ma la chiamata a `add_reward_points` avviene PRIMA che il record sia inserito. Se l'INSERT fallisce, i punti sono già stati assegnati
2. **Nessun check duplicati** — Inserimenti ripetuti dello stesso esercizio assegnano punti multipli senza limite

---

### 18. update_challenge_progress(UUID, TEXT)

**Tipo:** FUNCTION (write)
**Tabella:** `user_challenges`, `user_achievements`
**Migrazione:** `20260227130004_user_challenges.sql`

```sql
CREATE OR REPLACE FUNCTION public.update_challenge_progress(p_user_id UUID, p_slug TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  SELECT * INTO v_challenge FROM public.user_challenges
  WHERE user_id = p_user_id AND challenge_slug = p_slug
    AND completed_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY started_at DESC LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.user_challenges SET current_count = current_count + 1 WHERE id = v_challenge.id;

  IF (v_challenge.current_count + 1) >= v_challenge.target_count THEN
    UPDATE public.user_challenges SET completed_at = now() WHERE id = v_challenge.id;
    IF v_challenge.points_reward IS NOT NULL AND v_challenge.points_reward > 0 THEN
      PERFORM public.add_reward_points(p_user_id, v_challenge.points_reward);
    END IF;
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (p_user_id, 'challenge_' || p_slug, jsonb_build_object(...))
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
END;
$$;
```

**Problemi:**
1. **Race condition** — SELECT + UPDATE non atomico. Due chiamate simultanee possono incrementare due volte
2. **Due UPDATE separati** — Prima incrementa, poi verifica e segna completato. Dovrebbe essere un singolo UPDATE con RETURNING
3. **Nessun log transazione** — Punti assegnati senza registro in `reward_transactions`

---

### 19. check_and_award_badges(UUID)

**Tipo:** FUNCTION (write)
**Tabella:** Legge da 7 tabelle, scrive su `user_achievements`
**Migrazione:** `20260227150000_badges_logic.sql`

```sql
-- Funzione di 143 righe che verifica 15 badge:
-- first_checkin, first_session, first_voice, first_diary, first_exercise,
-- streak_7, streak_30, level_5, sessions_10, sessions_50,
-- checkins_30, exercises_10, voice_10, diary_30days, points_1000, points_5000
```

**Problemi:**
1. **PERFORMANCE CRITICA** — Esegue 8 COUNT(*) queries su tabelle potenzialmente grandi ad OGNI check-in, sessione o diary entry (chiamata da tutti i trigger di punti)
2. **Nessun early-exit** — Anche se l'utente ha GIÀ tutti i badge, esegue comunque tutte le 8 query
3. **ON CONFLICT DO NOTHING** — Corretto per idempotenza, ma le query vengono eseguite inutilmente
4. **Metadata hardcoded** — Emoji e descrizioni badge in italiano hardcoded nel SQL. Non internazionalizzabile
5. **Cascata di trigger** — check-in → trigger_award_points_checkin → add_reward_points → trigger_update_user_level → check_and_award_badges → 8 query COUNT. Singolo check-in = ~15 query DB

---

### 20. calculate_diary_word_count()

**Tipo:** TRIGGER FUNCTION
**Tabella:** `diary_entries`
**Trigger:** `trigger_calculate_word_count` — BEFORE INSERT OR UPDATE
**Migrazione:** `20260227130005_diary_v2.sql`

```sql
CREATE OR REPLACE FUNCTION public.calculate_diary_word_count()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.content_text IS NOT NULL AND NEW.content_text <> '' THEN
    NEW.word_count := array_length(string_to_array(trim(NEW.content_text), ' '), 1);
  ELSE
    NEW.word_count := 0;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
```

**Problemi:**
1. **Conteggio parole impreciso** — Split su spazio singolo. Spazi multipli, tab, newline contati come parole vuote
2. **Sovrascrive sempre updated_at** — Anche se altri campi non cambiano

---

### 21. Trigger di gamificazione automatica (4 trigger)

**Migrazione:** `20260227150001_auto_points_triggers.sql`

| Trigger | Tabella | Evento | Punti |
|---------|---------|--------|-------|
| `award_points_checkin` | daily_checkins | AFTER INSERT | +5 base, +20 primo check-in |
| `award_points_session` | sessions | AFTER UPDATE (status→completed) | +15 chat (>3 msg), +25 voice, +30 primo voice |
| `award_points_diary` | diary_entries | AFTER INSERT | +10 |
| `check_streak_milestone` | habit_streaks | AFTER UPDATE | +50 (7 giorni), +200 (30 giorni) |

**Problemi comuni:**
1. **Cascata pesante** — Ogni trigger chiama `add_reward_points` → trigger `update_user_level` → `check_and_award_badges` (8 COUNT queries). Ogni check-in = ~20 query DB
2. **`award_points_checkin` conta record DOPO l'INSERT** — Il COUNT include il record appena inserito, quindi `count = 1` è corretto per il primo. OK
3. **`award_points_session` conta sessioni voice INCLUSA la corrente** — Stesso principio, corretto
4. **Nessun idempotency** — Se un record viene ri-inserito (es. dopo un errore e retry), i punti vengono ri-assegnati

---

## SEZIONE B: ELENCO TRIGGER COMPLETO

| # | Nome Trigger | Tabella | Evento | Funzione chiamata |
|---|---|---|---|---|
| 1 | on_auth_user_created | auth.users | AFTER INSERT | handle_new_user |
| 2 | trigger_set_connection_code | user_profiles | BEFORE INSERT | set_connection_code |
| 3 | trigger_set_referral_code | user_profiles | BEFORE INSERT | set_referral_code |
| 4 | update_daily_emotions_timestamp | daily_emotions | BEFORE UPDATE | update_daily_tables_timestamp |
| 5 | update_daily_life_areas_timestamp | daily_life_areas | BEFORE UPDATE | update_daily_tables_timestamp |
| 6 | update_daily_psychology_timestamp | daily_psychology | BEFORE UPDATE | update_daily_tables_timestamp |
| 7 | update_daily_habits_timestamp | daily_habits | BEFORE UPDATE | update_daily_tables_timestamp |
| 8 | update_body_metrics_timestamp | body_metrics | BEFORE UPDATE | update_daily_tables_timestamp |
| 9 | update_user_habits_config_timestamp | user_habits_config | BEFORE UPDATE | update_daily_tables_timestamp |
| 10 | update_user_objectives_timestamp | user_objectives | BEFORE UPDATE | update_daily_tables_timestamp |
| 11 | update_user_events_updated_at | user_events | BEFORE UPDATE | update_daily_tables_timestamp |
| 12 | update_user_correlations_timestamp | user_correlations | BEFORE UPDATE | update_correlation_timestamp |
| 13 | trigger_checkin_data_change | daily_checkins | AFTER INSERT/UPDATE | update_user_data_change_timestamp |
| 14 | trigger_session_data_change | sessions | AFTER INSERT/UPDATE | update_user_data_change_timestamp |
| 15 | trigger_emotions_data_change | daily_emotions | AFTER INSERT/UPDATE | update_user_data_change_timestamp |
| 16 | trigger_life_areas_data_change | daily_life_areas | AFTER INSERT/UPDATE | update_user_data_change_timestamp |
| 17 | trigger_psychology_data_change | daily_psychology | AFTER INSERT/UPDATE | update_user_data_change_timestamp |
| 18 | update_user_data_on_session_change | sessions | AFTER INSERT/UPDATE | update_user_data_change_timestamp |
| 19 | update_user_data_on_checkin_change | daily_checkins | AFTER INSERT/UPDATE | update_user_data_change_timestamp |
| 20 | update_user_data_on_emotions_change | daily_emotions | AFTER INSERT/UPDATE | update_user_data_change_timestamp |
| 21 | update_user_data_on_life_areas_change | daily_life_areas | AFTER INSERT/UPDATE | update_user_data_change_timestamp |
| 22 | update_user_data_on_psychology_change | daily_psychology | AFTER INSERT/UPDATE | update_user_data_change_timestamp |
| 23 | update_user_data_on_body_metrics_change | body_metrics | AFTER INSERT/UPDATE | update_user_data_change_timestamp |
| 24 | update_user_data_on_habits_change | daily_habits | AFTER INSERT/UPDATE | update_user_data_change_timestamp |
| 25 | update_objectives_data_change | user_objectives | AFTER INSERT/UPDATE/DELETE | update_user_data_change_timestamp |
| 26 | habits_update_user_data_change | daily_habits | AFTER INSERT/UPDATE | update_user_data_change_timestamp |
| 27 | body_metrics_update_user_data_change | body_metrics | AFTER INSERT/UPDATE | update_user_data_change_timestamp |
| 28 | healthkit_update_user_data_change | healthkit_data | AFTER INSERT/UPDATE | update_user_data_change_timestamp |
| 29 | update_streak_on_habit_completion | daily_habits | AFTER INSERT | update_habit_streak |
| 30 | trigger_update_user_level | user_reward_points | AFTER INSERT/UPDATE | update_user_level_on_points_change |
| 31 | trigger_award_exercise_points | user_exercise_sessions | BEFORE INSERT | award_exercise_points |
| 32 | trigger_calculate_word_count | diary_entries | BEFORE INSERT/UPDATE | calculate_diary_word_count |
| 33 | award_points_checkin | daily_checkins | AFTER INSERT | trigger_award_points_checkin |
| 34 | award_points_session | sessions | AFTER UPDATE | trigger_award_points_session |
| 35 | award_points_diary | diary_entries | AFTER INSERT | trigger_award_points_diary |
| 36 | check_streak_milestone | habit_streaks | AFTER UPDATE | trigger_check_streak_milestone |

**NOTA: TRIGGER DUPLICATI**
I seguenti trigger sono DUPLICATI (stessa funzione, stessa tabella, stesso evento da migrazioni diverse):
- `trigger_checkin_data_change` e `update_user_data_on_checkin_change` → entrambi su daily_checkins, AFTER INSERT/UPDATE → `update_user_data_change_timestamp`. **La funzione scatta DUE VOLTE.**
- `trigger_session_data_change` e `update_user_data_on_session_change` → entrambi su sessions
- `trigger_emotions_data_change` e `update_user_data_on_emotions_change` → entrambi su daily_emotions
- `trigger_life_areas_data_change` e `update_user_data_on_life_areas_change` → entrambi su daily_life_areas
- `trigger_psychology_data_change` e `update_user_data_on_psychology_change` → entrambi su daily_psychology
- `habits_update_user_data_change` e `update_user_data_on_habits_change` → entrambi su daily_habits
- `body_metrics_update_user_data_change` e `update_user_data_on_body_metrics_change` → entrambi su body_metrics

**Risultato:** 7 tabelle hanno DOPPIO trigger che aggiorna `user_profiles.last_data_change_at` due volte ad ogni modifica. Spreco di risorse.

---

## SEZIONE C: PROBLEMI E GAP RILEVATI

---

### C1. VALORI HARDCODED CHE DOVREBBERO ESSERE DINAMICI

| # | Valore | Dove | Problema |
|---|--------|------|----------|
| 1 | SHOP_ITEMS (5 item premium) | `redeem-points/index.ts`, `get-gamification-status/index.ts` | Array hardcoded con prezzi e durate. Modificare richiede redeploy |
| 2 | CHALLENGES (5 sfide) | `start-challenge/index.ts` | Array hardcoded. Aggiungere sfide richiede redeploy |
| 3 | Esercizi slug (`breathing-478`, `muscle-relaxation`, `box-breathing`, `mindfulness-1min`) | `home-context/index.ts` | 4 slug hardcoded per suggerimento home. Se rinominati in DB, il codice si rompe |
| 4 | Soglia ansia `> 6` | `home-context/index.ts` | Unico criterio per esercizio personalizzato |
| 5 | Target HealthKit (`steps=10000`, `sleep=8`) | `sync-healthkit/index.ts` | Obiettivi di salute hardcoded, non personalizzabili |
| 6 | Timezone `Europe/Rome` | `ai-checkins`, `get_daily_metrics`, `ai-chat`, `home-context`, `aria-push-notification` | Hardcoded ovunque. Non funziona per utenti fuori fuso CET |
| 7 | Lingua `it` (italiano) | `transcribe-diary-voice` (Whisper), tutti i prompt AI, badge metadata | Tutta l'app è monolingua italiana hardcoded |
| 8 | Cache 24h check-in | `ai-checkins/index.ts` | Durata cache immutabile |
| 9 | Periodo 30 giorni | `doctor-view-data`, `generate-clinical-report` | Periodo fisso non personalizzabile |
| 10 | Periodo 60 giorni correlazioni | `calculate-correlations/index.ts` | Finestra analisi fissa |
| 11 | Periodo 90 giorni pattern | `detect-emotion-patterns/index.ts` | Finestra analisi fissa |
| 12 | Modello AI `gemini-2.5-flash-preview-04-17` | Tutte le 13 funzioni con AI | Cambio modello = redeploy di 13 funzioni |
| 13 | Emoji e nomi badge | `20260227150000_badges_logic.sql` | Testi italiani hardcoded in SQL |
| 14 | Nomi livelli gamificazione | `20260227130003_gamification_v2.sql` | Testi italiani hardcoded in SQL |
| 15 | Soglie correlazione (`|r| >= 0.3`, campione min 5/10) | `calculate-correlations/index.ts` | Soglie statistiche hardcoded |
| 16 | Soglie pattern (`morning_dip diff>=1.5`, `weekend_boost diff>=1.0`) | `detect-emotion-patterns/index.ts` | Soglie euristiche hardcoded |
| 17 | Punti per attività (5 check-in, 15 chat, 25 voice, 10 diary) | `auto_points_triggers.sql` | Valori hardcoded nei trigger SQL |
| 18 | Streak milestone (7 e 30 giorni) | `auto_points_triggers.sql` | Solo 2 milestone hardcoded |
| 19 | Limite messaggi chat `> 3` per punti | `auto_points_triggers.sql` | Soglia arbitraria |
| 20 | APNs Team ID, Key ID | `aria-push-notification/index.ts` | Configurazione Apple hardcoded |

---

### C2. FUNZIONALITA DOCUMENTATE/PREVISTE MA NON IMPLEMENTATE

| # | Feature | Evidenza nel codice | Stato |
|---|---------|---------------------|-------|
| 1 | **Progressione esercizi (beginner → advanced)** | DB ha colonna `difficulty` con valori beginner/intermediate ma `home-context` suggerisce solo beginner | MAI implementato |
| 2 | **Sistema notifiche intelligenti** | Tabella `smart_notifications` con `priority`, `scheduled_for`, `context_data` ma nessun scheduler che le legge | Tabella creata, nessun cron job |
| 3 | **Esercizi con timer** | `user_exercise_sessions.duration_actual` esiste ma nessuna funzione di timer attiva | Solo logging passivo |
| 4 | **Mood tracking pre/post esercizio** | `user_exercise_sessions.mood_before/mood_after` registrati ma MAI analizzati per personalizzare suggerimenti | Solo storage, nessun uso |
| 5 | **Referral system** | Tabelle `user_referrals` con status, `referred_active_days` ma nessuna edge function per gestire referral | Solo struttura DB |
| 6 | **Sfide a tempo con scadenza** | `user_challenges.expires_at` settata ma nessun cron job controlla sfide scadute | Sfide scadute restano "attive" per sempre |
| 7 | **Internazionalizzazione** | Nessuna infrastruttura i18n. Tutto in italiano hardcoded | Bloccante per espansione internazionale |
| 8 | **Stripe/pagamento** | `premium_until`, `premium_type` in user_profiles ma solo "points" come tipo | Nessuna integrazione pagamento |
| 9 | **Sistema diari tematici V2** | Due sistemi: `thematic_diaries` (V1) e `diaries`+`diary_entries` (V2) coesistono | Migrazione incompleta, entrambi attivi |
| 10 | **Analisi contenuto diario** | `diary_entries` ha `mood_at_entry`, `word_count` ma nessuna analisi AI del contenuto | Solo storage |
| 11 | **Badge system V2** | `check_and_award_badges` ha 15 badge ma la UI del get-gamification-status li mostra come lista piatta | Nessuna categorizzazione o progressione |
| 12 | **Doctor annotations** | RLS policies permettono ai dottori di leggere dati ma nessuna funzione per scrivere note/annotazioni | Solo lettura |
| 13 | **Emotion patterns avanzati** | Solo 4 pattern (morning_dip, weekend_boost, monday_blues, anxiety_spikes) su possibili decine | Analisi primitiva |
| 14 | **HealthKit sleep quality** | `healthkit_data.sleep_quality_hk` salvato ma MAI usato nell'analisi AI o correlazioni | Solo storage |
| 15 | **Ciclo mestruale** | `healthkit_data.menstrual_cycle_phase` salvato ma MAI correlato con mood/emozioni | Solo storage |

---

### C3. CODICE DUPLICATO O INEFFICIENTE

| # | Descrizione | File coinvolti |
|---|-------------|----------------|
| 1 | **Triple-fallback auth (120+ righe)** copia-incollato in 15+ funzioni | Tutte le edge functions. Dovrebbe essere un modulo shared |
| 2 | **get_daily_metrics ridefinito 10+ volte** in migrazioni successive | 10 migrazioni diverse. Confusione su quale sia la versione corrente |
| 3 | **generate_connection_code / generate_referral_code** identiche tranne lunghezza | Due funzioni per la stessa logica (6 vs 8 char) |
| 4 | **update_daily_tables_timestamp / update_correlation_timestamp** identiche | Due funzioni identiche per `NEW.updated_at = now()` |
| 5 | **7 coppie di trigger duplicati** per cache invalidation | 7 tabelle con 2 trigger ciascuna che fanno la stessa cosa |
| 6 | **Inizializzazione Supabase client** ripetuta in ogni funzione | 29 funzioni × stesso boilerplate `createClient()` |
| 7 | **Inizializzazione Gemini** ripetuta in ogni funzione AI | 13 funzioni × stesso boilerplate `GoogleGenerativeAI()` |
| 8 | **Pattern CORS** ripetuto in ogni funzione | `Access-Control-Allow-Origin: *` in tutte le funzioni, nessun modulo condiviso |
| 9 | **process-session scrive su 10 tabelle sequenzialmente** | N+1 pattern con 10+ query UPDATE/INSERT individuali |
| 10 | **check_and_award_badges esegue 8 COUNT** anche se tutti i badge sono già sbloccati | Nessun early-exit basato su badge già ottenuti |

---

### C4. CODICE POTENZIALMENTE BUGGATO O INCOERENTE

| # | Bug/Incoerenza | Gravità | File |
|---|----------------|---------|------|
| 1 | **update_user_level: `WHERE id = NEW.user_id`** dovrebbe essere `WHERE user_id = NEW.user_id` | **CRITICO** — Il livello non si aggiorna MAI correttamente | `gamification_v2.sql` |
| 2 | **Wellness score: scala 1-10 nel prompt vs 0-100 nel DB** senza conversione | **ALTO** — DB salva 7 dove dovrebbe essere 70 | `ai-dashboard`, `migrations` |
| 3 | **get-diary-prompt: diary_entries caricate ma ignorate nel prompt** | **MEDIO** — 3 query DB sprecate | `get-diary-prompt/index.ts` |
| 4 | **redeem-points: check+deduct non atomici** | **ALTO** — Race condition, doppio riscatto possibile | `redeem-points/index.ts` |
| 5 | **elevenlabs-conversation-token: ZERO autenticazione** | **CRITICO** — Chiunque ottiene token ElevenLabs | `elevenlabs-conversation-token/index.ts` |
| 6 | **sync-healthkit auth method 3: scrive per qualsiasi user_id** | **CRITICO** — Chiunque può modificare dati salute di altri utenti | `sync-healthkit/index.ts` |
| 7 | **calculate-correlations: zero auth, accetta qualsiasi UUID** | **ALTO** — Accesso dati salute senza autenticazione | `calculate-correlations/index.ts` |
| 8 | **detect-emotion-patterns: energy_score_detected letto ma MAI usato** | **BASSO** — Spreco query | `detect-emotion-patterns/index.ts` |
| 9 | **aria-push-notification: zero auth, chiunque triggerare notifiche** | **CRITICO** — Spamming utenti | `aria-push-notification/index.ts` |
| 10 | **Trigger duplicati su 7 tabelle** — cache invalidation scatta 2 volte | **MEDIO** — Spreco performance | Migrazioni varie |
| 11 | **update_habit_streak: total_completions incrementato su same-day** | **BASSO** — Conteggio gonfiato | `20260208204800_*.sql` |
| 12 | **calculate_user_level usa total_points non lifetime_points** | **MEDIO** — Livello scende quando si spendono punti | `gamification_v2.sql` |
| 13 | **award_exercise_points: BEFORE INSERT chiama add_reward_points** | **BASSO** — Se INSERT fallisce, punti già assegnati | `user_exercise_sessions.sql` |
| 14 | **doctor-view-data: non blocca accesso senza relazione doctor-patient** | **ALTO** — Qualsiasi medico con token accede a qualsiasi paziente | `doctor-view-data/index.ts` |
| 15 | **Timezone Europe/Rome hardcoded in get_daily_metrics** | **MEDIO** — Metriche sbagliate per utenti fuori Italia | `get_daily_metrics` SQL |
| 16 | **get_daily_metrics: MAX aggregation** perde informazioni intragiornaliere | **BASSO** — Solo valore massimo, non media o trend | SQL function |
| 17 | **ai-chat system prompt ~30-50KB** — Potenziale truncation o costi eccessivi | **MEDIO** — Prompt enormi con 16 componenti dinamici | `ai-chat/index.ts` |
| 18 | **process-session: fire-and-forget** senza conferma di completamento | **MEDIO** — Se fallisce, nessuna notifica. Dati persi silenziosamente | `ai-chat/index.ts` → `process-session` |
| 19 | **ai_milestones: append senza deduplicazione** | **BASSO** — Stessa milestone aggiunta più volte | `update-objective-chat/index.ts` |
| 20 | **create-objective-chat e create-habit-chat: salvano nel client** | **MEDIO** — Zero persistence lato server. Se client crasha, dati persi | Funzioni chat di creazione |

---

### C5. FUNZIONALITA MANCANTI RISPETTO A UN'APP DI BENESSERE MENTALE COMPLETA

| # | Feature mancante | Impatto |
|---|------------------|---------|
| 1 | **Rate limiting su tutte le API** | Costi AI/API illimitati, rischio DDoS e abuso |
| 2 | **Modulo autenticazione condiviso** | 15+ copie della stessa logica auth, inconsistente |
| 3 | **Audit trail completo** | Nessun log chi-cosa-quando per accessi medico, modifiche dati, riscatti punti |
| 4 | **Cron job per sfide scadute** | Sfide scadute restano "attive" nel DB per sempre |
| 5 | **Cron job per notifiche smart** | Tabella `smart_notifications` mai processata automaticamente |
| 6 | **Validazione input server-side** | Quasi nessuna funzione valida range, tipo, formato degli input |
| 7 | **Transazioni DB atomiche** | `process-session` scrive 10 tabelle senza transazione. Fallimento parziale = dati inconsistenti |
| 8 | **Test automatizzati** | Zero test unitari o di integrazione nel repository |
| 9 | **Gestione errori centralizzata** | Ogni funzione ha la sua strategia di error handling (inconsistente) |
| 10 | **Logging strutturato** | Solo `console.log/error` sparsi. Nessun sistema di logging (Sentry, Datadog, etc.) |
| 11 | **Data export per l'utente (GDPR)** | Nessuna funzione per esportare tutti i dati dell'utente |
| 12 | **Account deletion (GDPR)** | Nessuna funzione per eliminare completamente un account e tutti i dati associati |
| 13 | **Encryption at rest per dati sensibili** | Sessioni terapeutiche, diari, dati salute mentale in plaintext |
| 14 | **Content Security Policy** | CORS `*` su tutte le funzioni |
| 15 | **Idempotency keys** | Nessuna funzione ha protezione contro richieste duplicate |
| 16 | **Webhook per integrazioni** | Nessun sistema per notificare sistemi esterni di eventi |
| 17 | **Backup e recovery documentato** | Nessuna strategia di backup visibile nel codice |
| 18 | **Migration rollback plan** | 66 migrazioni forward-only, nessuna strategia di rollback |
| 19 | **Multi-tenancy per cliniche** | Solo dottore singolo → paziente singolo |
| 20 | **Consenso informato tracciabile** | Nessun meccanismo per registrare consenso al trattamento AI dei dati |

---

## TABELLA RIEPILOGATIVA DATABASE

### Funzioni PL/pgSQL

| Funzione | Tipo | Tabella principale | Problemi |
|----------|------|--------------------|----------|
| handle_new_user | Trigger | auth.users → user_profiles | Non crea ruolo |
| has_role | Query | user_roles | Performance in RLS |
| get_user_role | Query | user_roles | LIMIT 1 senza ORDER BY |
| generate_connection_code | Utility | — | No unicità check |
| set_connection_code | Trigger | user_profiles | Solo INSERT |
| find_patient_by_code | Query | user_profiles + user_roles | LEFT JOIN permissivo |
| update_daily_tables_timestamp | Trigger | 7 tabelle | Nessuno |
| update_user_data_change_timestamp | Trigger | 10+ tabelle → user_profiles | Hot spot scrittura |
| generate_referral_code | Utility | — | Duplicato di connection_code |
| set_referral_code | Trigger | user_profiles | Duplicato logica |
| add_reward_points | Write | user_reward_points | total_points può andare negativo |
| get_daily_metrics | Query | 5 tabelle | **10x ridefinita**, timezone hardcoded |
| update_correlation_timestamp | Trigger | user_correlations | Duplicato di daily_tables_timestamp |
| update_habit_streak | Trigger | daily_habits → habit_streaks | Race condition, total_comp bug |
| calculate_user_level | Query | user_reward_points + levels | **Usa total_points non lifetime** |
| update_user_level_on_points_change | Trigger | user_reward_points → user_profiles | **BUG: WHERE id = user_id** |
| award_exercise_points | Trigger | user_exercise_sessions | Punti prima di INSERT |
| update_challenge_progress | Write | user_challenges | Race condition |
| check_and_award_badges | Write | 7 tabelle → user_achievements | **8 COUNT per ogni attività** |
| calculate_diary_word_count | Trigger | diary_entries | Conteggio impreciso |

### Statistiche Trigger

| Categoria | Conteggio | Note |
|-----------|:-:|---|
| Timestamp (updated_at) | 9 | 7 usano update_daily_tables_timestamp + 2 dedicati |
| Cache invalidation | 15 | Di cui **7 duplicati** (14 trigger per 7 tabelle, dovrebbero essere 7) |
| Gamificazione punti | 4 | Ognuno chiama check_and_award_badges (8 query) |
| Streak tracking | 1 | update_habit_streak |
| Auto-generazione codici | 2 | connection_code + referral_code |
| Livello utente | 1 | trigger_update_user_level |
| Esercizi punti | 1 | award_exercise_points |
| Word count | 1 | calculate_diary_word_count |
| Auth user setup | 1 | on_auth_user_created |
| **TOTALE** | **36** | Di cui 7 duplicati inutili |

### Top 5 Bug Critici

1. **`WHERE id = NEW.user_id` nel trigger livello** — Il livello utente non si aggiorna MAI
2. **elevenlabs-conversation-token senza auth** — Token ElevenLabs gratuiti per chiunque
3. **sync-healthkit scrive per qualsiasi user_id** — Modifica dati salute di altri utenti
4. **aria-push-notification senza auth** — Spam notifiche a tutti gli utenti
5. **redeem-points race condition** — Doppio riscatto premium possibile
