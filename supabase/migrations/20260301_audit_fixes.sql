-- =============================================
-- AUDIT FIX 2.4 - Usa lifetime_points per il calcolo livello
-- =============================================
-- Il livello utente deve basarsi su lifetime_points (punti totali mai spesi)
-- e non su total_points (che può diminuire con gli acquisti).

CREATE OR REPLACE FUNCTION public.update_user_level_on_points_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_level INTEGER;
BEGIN
  -- Calcola il nuovo livello basato su lifetime_points
  SELECT COALESCE(MAX(level), 1) INTO v_new_level
  FROM public.gamification_levels
  WHERE points_required <= COALESCE(NEW.lifetime_points, NEW.total_points);

  -- Aggiorna user_profiles
  UPDATE public.user_profiles
  SET current_level = v_new_level
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;
