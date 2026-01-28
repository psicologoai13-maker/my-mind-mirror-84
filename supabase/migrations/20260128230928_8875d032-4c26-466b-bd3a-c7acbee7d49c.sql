-- Aggiungere colonna per preferenze notifiche
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "checkin_reminder": true,
  "checkin_time": "09:00",
  "session_reminder": true,
  "daily_insights": true,
  "goal_completed": true,
  "app_updates": false
}'::jsonb;

-- Aggiungere colonna per preferenze aspetto
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS appearance_settings JSONB DEFAULT '{
  "theme": "system",
  "large_text": false,
  "reduce_motion": false
}'::jsonb;