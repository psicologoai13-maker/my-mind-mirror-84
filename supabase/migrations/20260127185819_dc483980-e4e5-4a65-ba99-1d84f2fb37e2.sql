-- Add secondary emotions to daily_emotions table
ALTER TABLE public.daily_emotions 
  ADD COLUMN IF NOT EXISTS shame integer,
  ADD COLUMN IF NOT EXISTS jealousy integer,
  ADD COLUMN IF NOT EXISTS hope integer,
  ADD COLUMN IF NOT EXISTS frustration integer,
  ADD COLUMN IF NOT EXISTS nostalgia integer;

-- Add constraints for valid range (0-10)
ALTER TABLE public.daily_emotions 
  ADD CONSTRAINT check_shame_range CHECK (shame IS NULL OR (shame >= 0 AND shame <= 10)),
  ADD CONSTRAINT check_jealousy_range CHECK (jealousy IS NULL OR (jealousy >= 0 AND jealousy <= 10)),
  ADD CONSTRAINT check_hope_range CHECK (hope IS NULL OR (hope >= 0 AND hope <= 10)),
  ADD CONSTRAINT check_frustration_range CHECK (frustration IS NULL OR (frustration >= 0 AND frustration <= 10)),
  ADD CONSTRAINT check_nostalgia_range CHECK (nostalgia IS NULL OR (nostalgia >= 0 AND nostalgia <= 10));

-- Comment on new columns for clarity
COMMENT ON COLUMN public.daily_emotions.shame IS 'Vergogna - emozione secondaria (0-10)';
COMMENT ON COLUMN public.daily_emotions.jealousy IS 'Gelosia - emozione secondaria (0-10)';
COMMENT ON COLUMN public.daily_emotions.hope IS 'Speranza - emozione secondaria (0-10)';
COMMENT ON COLUMN public.daily_emotions.frustration IS 'Frustrazione - emozione secondaria (0-10)';
COMMENT ON COLUMN public.daily_emotions.nostalgia IS 'Nostalgia - emozione secondaria (0-10)';