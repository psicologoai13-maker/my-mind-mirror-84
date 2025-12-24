-- Add new columns for rich session analysis data
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS life_balance_scores jsonb DEFAULT '{"love": null, "work": null, "friendship": null, "energy": null, "growth": null}'::jsonb,
ADD COLUMN IF NOT EXISTS emotion_breakdown jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS key_events text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS insights text;

-- Update user_profiles life_areas_scores to include new categories
UPDATE public.user_profiles
SET life_areas_scores = jsonb_set(
  jsonb_set(life_areas_scores, '{energy}', 'null'::jsonb, true),
  '{growth}', 'null'::jsonb, true
)
WHERE life_areas_scores IS NOT NULL;