-- =============================================
-- ARIA V2.0 - ARIA Wrapped Data
-- =============================================

-- Tabella dati wrapped (riepilogo mensile/annuale)
CREATE TABLE IF NOT EXISTS public.aria_wrapped_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'yearly')),
  period_key TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- UNIQUE su (user_id, period_type, period_key)
ALTER TABLE public.aria_wrapped_data
  ADD CONSTRAINT aria_wrapped_data_unique UNIQUE (user_id, period_type, period_key);

-- RLS
ALTER TABLE public.aria_wrapped_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wrapped data"
  ON public.aria_wrapped_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wrapped data"
  ON public.aria_wrapped_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wrapped data"
  ON public.aria_wrapped_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wrapped data"
  ON public.aria_wrapped_data FOR DELETE
  USING (auth.uid() = user_id);
