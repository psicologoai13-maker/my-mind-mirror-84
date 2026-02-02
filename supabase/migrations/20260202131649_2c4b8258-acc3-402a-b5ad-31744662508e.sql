-- Add checkin_visibility field to user_objectives
-- Values: 'permanent' (always visible), 'daily' (once per day), 'hidden' (only manual from Progressi)
ALTER TABLE public.user_objectives 
ADD COLUMN IF NOT EXISTS checkin_visibility text DEFAULT 'daily';

-- Add comment for documentation
COMMENT ON COLUMN public.user_objectives.checkin_visibility IS 'Controls visibility in Home check-in: permanent (always), daily (once per day), hidden (manual only)';