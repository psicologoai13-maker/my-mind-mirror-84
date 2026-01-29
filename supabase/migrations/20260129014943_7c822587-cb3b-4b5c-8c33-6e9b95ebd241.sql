-- Add new columns for objective sync and input methods
ALTER TABLE user_objectives 
ADD COLUMN IF NOT EXISTS input_method text DEFAULT 'numeric',
ADD COLUMN IF NOT EXISTS linked_habit text,
ADD COLUMN IF NOT EXISTS linked_body_metric text,
ADD COLUMN IF NOT EXISTS preset_type text,
ADD COLUMN IF NOT EXISTS auto_sync_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_auto_sync_at timestamptz,
ADD COLUMN IF NOT EXISTS progress_source text DEFAULT 'manual';

-- Add comment for documentation
COMMENT ON COLUMN user_objectives.input_method IS 'auto_body, auto_habit, numeric, milestone, counter, time_based, session_detected';
COMMENT ON COLUMN user_objectives.preset_type IS 'Preset type key like lose_weight, save_money, or null for custom';
COMMENT ON COLUMN user_objectives.progress_source IS 'habit, session, checkin, or manual';