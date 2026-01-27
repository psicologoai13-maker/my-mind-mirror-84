-- Add cache column for AI-generated checkins (same pattern as ai_dashboard_cache)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS ai_checkins_cache jsonb DEFAULT NULL;