
-- Knowledge Base per Aria: documenti clinici e psicologici organizzati per topic
CREATE TABLE public.aria_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,           -- es. 'anxiety', 'depression', 'cbt_techniques'
  category TEXT NOT NULL,        -- es. 'clinical', 'techniques', 'pharmacology', 'conversational'
  title TEXT NOT NULL,           -- titolo leggibile
  content TEXT NOT NULL,         -- contenuto Markdown completo
  keywords TEXT[] DEFAULT '{}',  -- parole chiave per matching
  priority INTEGER DEFAULT 5,   -- 1-10, per ordinare i risultati
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index per ricerca rapida per topic e category
CREATE INDEX idx_kb_topic ON public.aria_knowledge_base(topic);
CREATE INDEX idx_kb_category ON public.aria_knowledge_base(category);
CREATE INDEX idx_kb_keywords ON public.aria_knowledge_base USING GIN(keywords);

-- RLS: lettura pubblica (usata dalle edge functions con service_role), nessun accesso utente diretto
ALTER TABLE public.aria_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON public.aria_knowledge_base
  FOR ALL
  USING (true)
  WITH CHECK (true);
