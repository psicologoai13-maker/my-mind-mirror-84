-- =============================================
-- ARIA V2.0 - Diary V2 (Diaries + Entries)
-- NON elimina thematic_diaries per compatibilità
-- =============================================

-- Tabella configurazione diari
CREATE TABLE IF NOT EXISTS public.diaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon_emoji TEXT,
  color_hex TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  weekly_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabella entries dei diari
CREATE TABLE IF NOT EXISTS public.diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  diary_id UUID NOT NULL REFERENCES public.diaries(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content_text TEXT,
  content_audio_url TEXT,
  content_transcript TEXT,
  entry_type TEXT DEFAULT 'text',
  prompt_used TEXT,
  mood_at_entry INTEGER,
  is_private BOOLEAN DEFAULT true,
  word_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS per diaries
ALTER TABLE public.diaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diaries"
  ON public.diaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diaries"
  ON public.diaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diaries"
  ON public.diaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own diaries"
  ON public.diaries FOR DELETE
  USING (auth.uid() = user_id);

-- RLS per diary_entries
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diary entries"
  ON public.diary_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diary entries"
  ON public.diary_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diary entries"
  ON public.diary_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own diary entries"
  ON public.diary_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger: calcola word_count su INSERT e UPDATE
CREATE OR REPLACE FUNCTION public.calculate_diary_word_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS trigger_calculate_word_count ON public.diary_entries;
CREATE TRIGGER trigger_calculate_word_count
  BEFORE INSERT OR UPDATE ON public.diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_diary_word_count();
