-- ═══════════════════════════════════════════════════════════════
-- ARIA Backend Audit Fixes - 2026-03-01
-- Migrazione unica con tutti i fix di sicurezza, correttezza e pulizia
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- FIX 2.1: Trigger livello utente — WHERE id → WHERE user_id
-- Bug: il trigger non trovava mai la riga in user_profiles perché
-- cercava WHERE id = NEW.user_id invece di WHERE user_id = NEW.user_id
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_user_level_on_points_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_level_id UUID;
  new_level_number INTEGER;
BEGIN
  -- Calcola il livello corretto basato sui punti
  SELECT id, level_number INTO new_level_id, new_level_number
  FROM public.gamification_levels
  WHERE points_required <= NEW.total_points
  ORDER BY points_required DESC
  LIMIT 1;

  -- Aggiorna il profilo utente con il nuovo livello
  IF new_level_id IS NOT NULL THEN
    UPDATE public.user_profiles
    SET current_level = new_level_number,
        current_level_id = new_level_id,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;  -- FIX: era "WHERE id = NEW.user_id"
  END IF;

  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- FIX 2.4: Aggiunta lifetime_points se non esiste
-- Bug: quando un utente spende punti, total_points scende e il livello
-- scende con lui. Il livello dovrebbe basarsi sui punti guadagnati totali.
-- ═══════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_reward_points' AND column_name = 'lifetime_points'
  ) THEN
    ALTER TABLE public.user_reward_points ADD COLUMN lifetime_points INTEGER DEFAULT 0;
    -- Inizializza lifetime_points = total_points per utenti esistenti
    UPDATE public.user_reward_points SET lifetime_points = total_points;
  END IF;
END $$;

-- FIX 2.4b: add_reward_points aggiorna anche lifetime_points
CREATE OR REPLACE FUNCTION public.add_reward_points(
  p_user_id UUID,
  p_points INTEGER,
  p_action TEXT DEFAULT 'generic',
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_reward_points (user_id, total_points, lifetime_points)
  VALUES (p_user_id, GREATEST(0, p_points), GREATEST(0, p_points))
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = GREATEST(0, user_reward_points.total_points + p_points),
    lifetime_points = CASE
      WHEN p_points > 0 THEN user_reward_points.lifetime_points + p_points
      ELSE user_reward_points.lifetime_points  -- NON decrementare su spesa
    END,
    updated_at = NOW();

  -- Log della transazione
  INSERT INTO public.reward_transactions (user_id, points, action, description)
  VALUES (p_user_id, p_points, p_action, p_description);
END;
$$;

-- FIX 2.4c: calculate_user_level usa lifetime_points
CREATE OR REPLACE FUNCTION public.calculate_user_level(p_user_id UUID)
RETURNS TABLE(level_number INTEGER, level_name TEXT, level_emoji TEXT, points_for_next INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_lifetime_points INTEGER;
BEGIN
  SELECT COALESCE(rp.lifetime_points, rp.total_points, 0)
  INTO user_lifetime_points
  FROM public.user_reward_points rp
  WHERE rp.user_id = p_user_id;

  IF NOT FOUND THEN
    user_lifetime_points := 0;
  END IF;

  RETURN QUERY
  SELECT gl.level_number, gl.name, gl.emoji,
    COALESCE(
      (SELECT gl2.points_required FROM public.gamification_levels gl2
       WHERE gl2.points_required > user_lifetime_points
       ORDER BY gl2.points_required ASC LIMIT 1),
      gl.points_required
    ) - user_lifetime_points AS points_for_next
  FROM public.gamification_levels gl
  WHERE gl.points_required <= user_lifetime_points
  ORDER BY gl.points_required DESC
  LIMIT 1;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- FIX 3.4: Migrazione diari V1 → V2
-- I diari V1 usano thematic_diaries con entries come jsonb array.
-- I diari V2 usano diaries + diary_entries.
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Per ogni thematic_diary, crea un diario V2 se non esiste già con lo stesso titolo
INSERT INTO public.diaries (user_id, title, color, icon, created_at, updated_at)
SELECT
  td.user_id,
  COALESCE(td.title, 'Diario importato'),
  COALESCE(td.color, '#7c3aed'),
  COALESCE(td.icon, '📔'),
  td.created_at,
  td.updated_at
FROM public.thematic_diaries td
WHERE NOT EXISTS (
  SELECT 1 FROM public.diaries d
  WHERE d.user_id = td.user_id AND d.title = td.title
)
ON CONFLICT DO NOTHING;

-- Step 2: Migra le entries dal jsonb array di V1 alle righe di diary_entries V2
-- Solo se la tabella thematic_diaries ha dati in entries
INSERT INTO public.diary_entries (diary_id, user_id, content_text, created_at)
SELECT
  d.id,
  td.user_id,
  entry->>'text',
  COALESCE((entry->>'created_at')::timestamptz, td.created_at)
FROM public.thematic_diaries td,
  jsonb_array_elements(COALESCE(td.entries, '[]'::jsonb)) AS entry
JOIN public.diaries d ON d.user_id = td.user_id AND d.title = COALESCE(td.title, 'Diario importato')
WHERE td.entries IS NOT NULL AND jsonb_array_length(td.entries) > 0
ON CONFLICT DO NOTHING;

-- Step 3: Rinomina thematic_diaries come backup (NON eliminare subito per sicurezza)
ALTER TABLE IF EXISTS public.thematic_diaries RENAME TO thematic_diaries_v1_backup;

-- Step 4: Rimuovi RLS e trigger dalla tabella backup
DROP POLICY IF EXISTS "Users can view their own thematic_diaries" ON public.thematic_diaries_v1_backup;
DROP POLICY IF EXISTS "Users can insert their own thematic_diaries" ON public.thematic_diaries_v1_backup;
DROP POLICY IF EXISTS "Users can update their own thematic_diaries" ON public.thematic_diaries_v1_backup;
DROP POLICY IF EXISTS "Users can delete their own thematic_diaries" ON public.thematic_diaries_v1_backup;

-- ═══════════════════════════════════════════════════════════════
-- FIX 3.5: Rimuovi trigger duplicati per cache invalidation
-- Queste tabelle hanno sia update_daily_tables_timestamp che
-- update_user_data_change_timestamp. Teniamo solo quest'ultimo.
-- ═══════════════════════════════════════════════════════════════
DO $$
DECLARE
  tbl TEXT;
  tables_with_duplicates TEXT[] := ARRAY[
    'daily_checkins',
    'daily_emotions',
    'daily_psychology',
    'daily_life_areas',
    'daily_habits',
    'body_metrics',
    'user_correlations'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_with_duplicates
  LOOP
    -- Prova a droppare il trigger duplicato (quello che chiama update_daily_tables_timestamp)
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trigger_update_%s_timestamp ON public.%I',
      tbl, tbl
    );
    -- Prova anche con il naming alternativo
    EXECUTE format(
      'DROP TRIGGER IF EXISTS update_%s_daily_timestamp ON public.%I',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- FIX 3.6: Rimuovi funzioni SQL duplicate
-- ═══════════════════════════════════════════════════════════════

-- generate_referral_code è identica a generate_connection_code (solo lunghezza diversa)
-- Il referral system non è mai stato implementato
DROP FUNCTION IF EXISTS public.generate_referral_code();
DROP FUNCTION IF EXISTS public.set_referral_code() CASCADE;
-- CASCADE rimuove anche il trigger

-- update_correlation_timestamp è identica a update_daily_tables_timestamp
DROP FUNCTION IF EXISTS public.update_correlation_timestamp() CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- FIX 3.8: Funzione atomica per riscatto punti
-- Bug: il check dei punti e la deduzione non sono atomici.
-- Due richieste simultanee possono entrambe passare il check.
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.atomic_redeem_points(
  p_user_id UUID,
  p_cost INTEGER,
  p_reward_type TEXT DEFAULT 'premium_month'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_points INTEGER;
  result jsonb;
BEGIN
  -- Lock della riga per prevenire race condition
  SELECT total_points INTO current_points
  FROM public.user_reward_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  IF current_points < p_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points', 'current_points', current_points);
  END IF;

  -- Deduzione atomica
  UPDATE public.user_reward_points
  SET total_points = total_points - p_cost,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log transazione
  INSERT INTO public.reward_transactions (user_id, points, action, description)
  VALUES (p_user_id, -p_cost, 'redeem', p_reward_type);

  RETURN jsonb_build_object(
    'success', true,
    'points_deducted', p_cost,
    'remaining_points', current_points - p_cost
  );
END;
$$;
