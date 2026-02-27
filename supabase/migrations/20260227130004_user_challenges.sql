-- =============================================
-- ARIA V2.0 - User Challenges
-- =============================================

-- Tabella sfide utente
CREATE TABLE IF NOT EXISTS public.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_slug TEXT NOT NULL,
  challenge_title TEXT,
  target_count INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  points_reward INTEGER,
  badge_id TEXT
);

-- RLS
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenges"
  ON public.user_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenges"
  ON public.user_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges"
  ON public.user_challenges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own challenges"
  ON public.user_challenges FOR DELETE
  USING (auth.uid() = user_id);

-- Funzione update_challenge_progress
CREATE OR REPLACE FUNCTION public.update_challenge_progress(p_user_id UUID, p_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  -- Trova la sfida attiva (non completata e non scaduta)
  SELECT * INTO v_challenge
  FROM public.user_challenges
  WHERE user_id = p_user_id
    AND challenge_slug = p_slug
    AND completed_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY started_at DESC
  LIMIT 1;

  -- Se non trovata, esci
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Incrementa current_count
  UPDATE public.user_challenges
  SET current_count = current_count + 1
  WHERE id = v_challenge.id;

  -- Controlla se raggiunge target_count
  IF (v_challenge.current_count + 1) >= v_challenge.target_count THEN
    -- Segna come completata
    UPDATE public.user_challenges
    SET completed_at = now()
    WHERE id = v_challenge.id;

    -- Aggiungi punti reward
    IF v_challenge.points_reward IS NOT NULL AND v_challenge.points_reward > 0 THEN
      PERFORM public.add_reward_points(p_user_id, v_challenge.points_reward);
    END IF;

    -- Inserisci achievement
    INSERT INTO public.user_achievements (user_id, achievement_id, metadata)
    VALUES (
      p_user_id,
      'challenge_' || p_slug,
      jsonb_build_object(
        'challenge_title', v_challenge.challenge_title,
        'target_count', v_challenge.target_count,
        'completed_at', now()::text
      )
    )
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
END;
$$;
