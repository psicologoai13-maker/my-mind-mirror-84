-- Add columns for automatic health data sync preparation
ALTER TABLE user_habits_config 
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_auto_sync_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN user_habits_config.data_source IS 'Source of habit data: manual, apple_health, google_fit';
COMMENT ON COLUMN user_habits_config.auto_sync_enabled IS 'Whether this habit syncs automatically from external source';
COMMENT ON COLUMN user_habits_config.last_auto_sync_at IS 'Last time this habit was synced from external source';