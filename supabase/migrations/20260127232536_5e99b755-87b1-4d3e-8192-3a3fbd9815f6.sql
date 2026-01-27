-- Add columns for real-time context awareness
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS location_permission_granted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS realtime_context_cache JSONB,
ADD COLUMN IF NOT EXISTS realtime_context_updated_at TIMESTAMPTZ;