-- Fix: Allow 0 values in daily_psychology constraints (AI returns 0 for "not detected")

-- Drop old constraints
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_appetite_changes_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_burnout_level_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_coping_ability_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_gratitude_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_guilt_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_irritability_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_loneliness_perceived_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_mental_clarity_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_rumination_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_self_efficacy_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_somatic_tension_check;
ALTER TABLE daily_psychology DROP CONSTRAINT IF EXISTS daily_psychology_sunlight_exposure_check;

-- Add new constraints allowing 0-10 range
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_appetite_changes_check CHECK (appetite_changes IS NULL OR (appetite_changes >= 0 AND appetite_changes <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_burnout_level_check CHECK (burnout_level IS NULL OR (burnout_level >= 0 AND burnout_level <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_coping_ability_check CHECK (coping_ability IS NULL OR (coping_ability >= 0 AND coping_ability <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_gratitude_check CHECK (gratitude IS NULL OR (gratitude >= 0 AND gratitude <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_guilt_check CHECK (guilt IS NULL OR (guilt >= 0 AND guilt <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_irritability_check CHECK (irritability IS NULL OR (irritability >= 0 AND irritability <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_loneliness_perceived_check CHECK (loneliness_perceived IS NULL OR (loneliness_perceived >= 0 AND loneliness_perceived <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_mental_clarity_check CHECK (mental_clarity IS NULL OR (mental_clarity >= 0 AND mental_clarity <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_rumination_check CHECK (rumination IS NULL OR (rumination >= 0 AND rumination <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_self_efficacy_check CHECK (self_efficacy IS NULL OR (self_efficacy >= 0 AND self_efficacy <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_somatic_tension_check CHECK (somatic_tension IS NULL OR (somatic_tension >= 0 AND somatic_tension <= 10));
ALTER TABLE daily_psychology ADD CONSTRAINT daily_psychology_sunlight_exposure_check CHECK (sunlight_exposure IS NULL OR (sunlight_exposure >= 0 AND sunlight_exposure <= 10));