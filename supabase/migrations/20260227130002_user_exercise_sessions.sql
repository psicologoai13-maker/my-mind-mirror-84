-- =============================================
-- ARIA V2.0 - User Exercise Sessions
-- =============================================

-- Tabella sessioni esercizi utente
CREATE TABLE IF NOT EXISTS public.user_exercise_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  duration_actual INTEGER,
  mood_before INTEGER,
  mood_after INTEGER,
  triggered_by TEXT,
  session_id UUID,
  points_awarded INTEGER DEFAULT 0
);

-- RLS
ALTER TABLE public.user_exercise_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exercise sessions"
  ON public.user_exercise_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise sessions"
  ON public.user_exercise_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise sessions"
  ON public.user_exercise_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercise sessions"
  ON public.user_exercise_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger: dopo INSERT, aggiungi punti reward dell'esercizio
CREATE OR REPLACE FUNCTION public.award_exercise_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INTEGER;
BEGIN
  -- Recupera i punti dell'esercizio
  SELECT points_reward INTO v_points
  FROM public.exercises
  WHERE id = NEW.exercise_id;

  IF v_points IS NOT NULL AND v_points > 0 THEN
    -- Aggiorna i punti nella sessione
    NEW.points_awarded := v_points;

    -- Aggiungi i punti all'utente
    PERFORM public.add_reward_points(NEW.user_id, v_points);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_exercise_points ON public.user_exercise_sessions;
CREATE TRIGGER trigger_award_exercise_points
  BEFORE INSERT ON public.user_exercise_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.award_exercise_points();
