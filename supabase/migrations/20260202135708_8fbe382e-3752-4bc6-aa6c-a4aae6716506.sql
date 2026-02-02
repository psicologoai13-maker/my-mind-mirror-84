-- Add AI-managed fields for milestone/qualitative objectives
-- These fields are ONLY updated by Aria (AI), not manually

-- AI-generated custom description based on conversation details
ALTER TABLE public.user_objectives 
ADD COLUMN IF NOT EXISTS ai_custom_description TEXT DEFAULT NULL;

-- AI-estimated progress for milestone objectives (0-100)
ALTER TABLE public.user_objectives 
ADD COLUMN IF NOT EXISTS ai_progress_estimate INTEGER DEFAULT NULL;

-- JSON array of detected milestones/achievements
-- Format: [{"milestone": "Creato profilo LinkedIn", "achieved_at": "2024-01-15", "note": "Primo passo!"}, ...]
ALTER TABLE public.user_objectives 
ADD COLUMN IF NOT EXISTS ai_milestones JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.user_objectives.ai_custom_description IS 'AI-generated description with user-specific details (e.g., brand name "Moda", domain "vestiti")';
COMMENT ON COLUMN public.user_objectives.ai_progress_estimate IS 'AI-estimated progress 0-100 for milestone/qualitative objectives';
COMMENT ON COLUMN public.user_objectives.ai_milestones IS 'JSON array of detected milestones: [{milestone, achieved_at, note}]';