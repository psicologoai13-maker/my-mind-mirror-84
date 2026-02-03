-- Allow mood_value = 0 to indicate "no explicit mood check-in"
ALTER TABLE daily_checkins 
DROP CONSTRAINT IF EXISTS daily_checkins_mood_value_check;

ALTER TABLE daily_checkins 
ADD CONSTRAINT daily_checkins_mood_value_check 
CHECK (mood_value >= 0 AND mood_value <= 5);