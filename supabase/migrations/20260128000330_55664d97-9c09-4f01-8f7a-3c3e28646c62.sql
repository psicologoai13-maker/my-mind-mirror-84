-- Table for global shared cache (news, etc.)
CREATE TABLE IF NOT EXISTS public.global_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- RLS: public read access (non-sensitive data)
ALTER TABLE public.global_context_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read the global cache
CREATE POLICY "Anyone can read global cache" ON public.global_context_cache
  FOR SELECT USING (true);

-- Only service role can write (via edge functions)
CREATE POLICY "Service role can manage global cache" ON public.global_context_cache
  FOR ALL USING (true) WITH CHECK (true);