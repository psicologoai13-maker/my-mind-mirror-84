-- Add new clinical analysis fields to sessions table
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS clinical_indices JSONB DEFAULT '{"rumination": null, "emotional_openness": null, "perceived_stress": null}'::jsonb,
ADD COLUMN IF NOT EXISTS sleep_quality INTEGER CHECK (sleep_quality IS NULL OR (sleep_quality >= 1 AND sleep_quality <= 10)),
ADD COLUMN IF NOT EXISTS specific_emotions JSONB DEFAULT '{"joy": 0, "sadness": 0, "anger": 0, "fear": 0, "apathy": 0}'::jsonb;

-- Comment on columns for documentation
COMMENT ON COLUMN public.sessions.clinical_indices IS 'Clinical indices (1-10): rumination, emotional_openness, perceived_stress';
COMMENT ON COLUMN public.sessions.sleep_quality IS 'Sleep quality score (1-10) inferred from conversation text';
COMMENT ON COLUMN public.sessions.specific_emotions IS 'Specific emotions breakdown in percentages: joy, sadness, anger, fear, apathy';