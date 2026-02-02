-- Add columns for AI-driven habit creation and update methods
ALTER TABLE user_habits_config 
ADD COLUMN update_method TEXT DEFAULT 'checkin',
ADD COLUMN requires_permission BOOLEAN DEFAULT FALSE,
ADD COLUMN permission_granted BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN user_habits_config.update_method IS 'Method for updating habit: checkin, chat, auto_sync';
COMMENT ON COLUMN user_habits_config.requires_permission IS 'Whether habit requires external app permission';
COMMENT ON COLUMN user_habits_config.permission_granted IS 'Whether user has granted the required permission';