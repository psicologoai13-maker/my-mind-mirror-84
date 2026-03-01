-- ============================================================
-- P3 Fixes Batch 2 — 1 Marzo 2026
-- 1. Tabella rate_limits + funzioni SQL
-- 2. Cron job per sfide scadute
-- ============================================================

-- ============================================================
-- 1. RATE LIMITING
-- ============================================================

-- Tabella rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT NOW(),
  request_count integer NOT NULL DEFAULT 1,
  UNIQUE(user_id, function_name, window_start)
);

-- Indice per query veloci
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_function
ON public.rate_limits(user_id, function_name, window_start);

-- RLS: nessun accesso diretto dagli utenti
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Funzione per controllare rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_function_name TEXT,
  p_max_requests INTEGER DEFAULT 30,
  p_window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := date_trunc('hour', NOW()) +
    (EXTRACT(MINUTE FROM NOW())::INTEGER / p_window_minutes) * (p_window_minutes || ' minutes')::INTERVAL;

  -- Conta richieste nella finestra corrente
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND function_name = p_function_name
    AND window_start >= v_window_start;

  IF v_count >= p_max_requests THEN
    RETURN FALSE;  -- Rate limit raggiunto
  END IF;

  -- Incrementa contatore
  INSERT INTO public.rate_limits (user_id, function_name, window_start, request_count)
  VALUES (p_user_id, p_function_name, v_window_start, 1)
  ON CONFLICT (user_id, function_name, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1;

  RETURN TRUE;  -- OK, sotto il limite
END;
$$;

-- Funzione pulizia vecchi record
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$;

-- GRANT per service_role
GRANT ALL ON public.rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits TO service_role;

-- ============================================================
-- 2. CRON JOB PER SFIDE SCADUTE
-- ============================================================
-- NOTA: pg_cron e pg_net devono essere abilitati nel progetto Supabase.
-- Per abilitarli: Supabase Dashboard → Database → Extensions → pg_cron, pg_net.
-- Se non sono abilitati, il cron SQL sotto NON funzionerà.
-- In alternativa, usare un cron esterno (Vercel cron, GitHub Actions, etc.)
-- che chiama POST /functions/v1/cron-expire-challenges con header
-- Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>.
-- ============================================================

-- Cron job per sfide scadute — esegui ogni giorno alle 00:05
-- UNCOMMENT le righe seguenti dopo aver abilitato pg_cron e pg_net:
--
-- SELECT cron.schedule(
--   'expire-challenges-daily',
--   '5 0 * * *',
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/cron-expire-challenges',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
