-- V5.1: Add columns for cached Aria home message
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS aria_home_message text,
ADD COLUMN IF NOT EXISTS aria_home_message_at timestamptz;
