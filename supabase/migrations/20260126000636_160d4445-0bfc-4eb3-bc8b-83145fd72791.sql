
-- Fix: Add unique constraint on daily_life_areas so upsert works correctly
-- This ensures only ONE record per user+date+source
DO $$
BEGIN
  -- First, remove duplicates keeping only the most recent one per user+date+source
  DELETE FROM daily_life_areas dla1
  WHERE EXISTS (
    SELECT 1 FROM daily_life_areas dla2
    WHERE dla2.user_id = dla1.user_id
    AND dla2.date = dla1.date
    AND dla2.source = dla1.source
    AND dla2.updated_at > dla1.updated_at
  );
END $$;

-- Now add the unique constraint
ALTER TABLE daily_life_areas 
ADD CONSTRAINT daily_life_areas_user_date_source_unique 
UNIQUE (user_id, date, source);

-- Do the same for daily_emotions
DELETE FROM daily_emotions de1
WHERE EXISTS (
  SELECT 1 FROM daily_emotions de2
  WHERE de2.user_id = de1.user_id
  AND de2.date = de1.date
  AND de2.source = de1.source
  AND de2.updated_at > de1.updated_at
);

ALTER TABLE daily_emotions 
ADD CONSTRAINT daily_emotions_user_date_source_unique 
UNIQUE (user_id, date, source);

-- Do the same for daily_psychology
DELETE FROM daily_psychology dp1
WHERE EXISTS (
  SELECT 1 FROM daily_psychology dp2
  WHERE dp2.user_id = dp1.user_id
  AND dp2.date = dp1.date
  AND dp2.source = dp1.source
  AND dp2.updated_at > dp1.updated_at
);

ALTER TABLE daily_psychology 
ADD CONSTRAINT daily_psychology_user_date_source_unique 
UNIQUE (user_id, date, source);
